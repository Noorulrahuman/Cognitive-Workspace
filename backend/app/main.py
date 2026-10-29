from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from fastapi.responses import StreamingResponse
import json, asyncio

from groq import APIConnectionError, APIStatusError, RateLimitError
from pydantic import BaseModel, Field

from app.config import settings
from app.agents.groq_config import client
from app.services.chat_service import generate_reply, get_or_create_session, get_history


app = FastAPI(
    title="Cognitive Workspace API",
    version="0.1.0",
    description="Backend services powering Cognitive Workspace"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """Lightweight liveness probe (sub-millisecond response)."""
    return {"status": "ok", "service": "Cognitive Workspace Backend"}


# Plain `def` (not async): the Groq client is synchronous, so FastAPI runs this in a thread pool
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    session_id = get_or_create_session(req.session_id)
    try:
        reply = generate_reply(session_id, req.message)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment and try again.")
    except APIConnectionError:
        raise HTTPException(status_code=503, detail="Could not reach the AI service. Please try again.")
    except APIStatusError:
        raise HTTPException(status_code=502, detail="The AI service returned an error. Please try again.")
    return ChatResponse(reply=reply, session_id=session_id)



@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Streams LLM tokens using Server-Sent Events (SSE).
    Frontend connects using ReadableStream reader.
    """
    session_id = get_or_create_session(req.session_id)
    history = get_history(session_id)
    history.append({"role": "user", "content": req.message})

    async def token_generator():
        try:
            # Yield session_id so frontend maintains session state
            yield f"data: {json.dumps({'session_id': session_id})}\n\n"

            # Enable streaming in Groq client
            stream = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=history,
                temperature=0.7,
                max_tokens=2048,
                stream=True  # <--- Enable streaming
            )

            full_reply = ""
            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    full_reply += token
                    # Format as standard SSE data line
                    payload = json.dumps({"token": token})
                    yield f"data: {payload}\n\n"
                    await asyncio.sleep(0)  # yield event loop

            # Save completed turn to conversational history
            history.append({"role": "assistant", "content": full_reply})
            
            # Send [DONE] signal to terminate client reader cleanly
            yield "data: [DONE]\n\n"
        except Exception as err:
            err_payload = json.dumps({"error": str(err)})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Prevents reverse proxy buffering
            "X-Session-ID": session_id,
        }
    )

app.include_router(api_router, prefix="/api/v1")
