# Cognitive Workspace: Backend AI Streaming Implementation Guide

> **Audience:** Backend Engineering Teammate  
> **Target Files:** `backend/app/main.py` & `backend/app/services/chat_service.py`  
> **Goal:** Enable Server-Sent Events (SSE) token streaming for `/chat/stream` to deliver sub-250ms first-token responses to the frontend.

---

## 1. Overview

The frontend has already been updated to support SSE streaming with seamless backward-compatibility.
When a user submits a prompt:
1. The frontend attempts `POST /chat/stream`.
2. It listens to a `text/event-stream` body via `ReadableStream` and renders tokens word-by-word into the UI in real time.
3. If `/chat/stream` returns 404 or fails, it automatically falls back to the existing synchronous `POST /chat` JSON endpoint.

To complete the streaming loop, only **two files** in the FastAPI backend need minor additions.

---

## 2. File 1: `backend/app/services/chat_service.py`

Add a streaming generator function `generate_reply_stream()` that uses Groq's streaming completion:

```python
from collections.abc import Generator
import json

def generate_reply_stream(session_id: str, user_message: str) -> Generator[str, None, None]:
    """
    Stream tokens from Groq LLM as Server-Sent Events (SSE) formatted chunks.
    Saves conversation history to the session after the stream completes.
    """
    with _lock:
        history = list(_sessions.get(session_id, []))

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history[-MAX_HISTORY:]
    messages.append({"role": "user", "content": user_message})

    # Request streaming from Groq
    stream = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=messages,
        temperature=0.7,
        max_completion_tokens=2048,
        stream=True,
    )

    accumulated_reply: list[str] = []

    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            accumulated_reply.append(delta)
            # Send SSE data frame with payload
            payload = json.dumps({"chunk": delta, "session_id": session_id})
            yield f"data: {payload}\n\n"

    # Save full turn into memory history
    full_reply = "".join(accumulated_reply)
    with _lock:
        if session_id not in _sessions:
            _sessions[session_id] = []
        _sessions[session_id].append({"role": "user", "content": user_message})
        _sessions[session_id].append({"role": "assistant", "content": full_reply})

    # Signal completion
    yield "data: [DONE]\n\n"
```

---

## 3. File 2: `backend/app/main.py`

Import `StreamingResponse` from FastAPI and `generate_reply_stream` from the chat service, then add the `/chat/stream` route:

```python
from fastapi.responses import StreamingResponse
from app.services.chat_service import generate_reply, generate_reply_stream, get_or_create_session

@app.post("/chat/stream")
def chat_stream(req: ChatRequest):
    """
    SSE Streaming endpoint for LLM tokens.
    Delivers response chunks to the frontend in real time with <250ms first-token latency.
    """
    session_id = get_or_create_session(req.session_id)
    try:
        generator = generate_reply_stream(session_id, req.message)
        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Prevents Nginx/proxy buffer stalling
            },
        )
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment and try again.")
    except APIConnectionError:
        raise HTTPException(status_code=503, detail="Could not reach the AI service. Please try again.")
    except APIStatusError:
        raise HTTPException(status_code=502, detail="The AI service returned an error. Please try again.")
```

---

## 4. Verification & Testing

### Option A: Via cURL
Run this in PowerShell or terminal while the backend is running:
```bash
curl -N -X POST "http://127.0.0.1:8000/chat/stream" \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain LangGraph in 2 sentences"}'
```
You will immediately see chunks streaming back:
```
data: {"chunk": "Lang", "session_id": "..."}

data: {"chunk": "Graph is", "session_id": "..."}

...
data: [DONE]
```

### Option B: Via Frontend
Open `http://localhost:3000/chat`, type a question, and hit Enter.
The text will stream smoothly into the response bubble in real time!
