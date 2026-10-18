from fastapi import FastAPI, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

from groq import APIConnectionError, APIStatusError, RateLimitError
from pydantic import BaseModel, Field

from app.config import settings
from app.services.chat_service import generate_reply, get_or_create_session


app = FastAPI(
    title="Cognitive Workspace API",
    version="0.1.0",
    description="Backend services powering Cognitive Workspace"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


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

app.include_router(api_router, prefix="/api/v1")