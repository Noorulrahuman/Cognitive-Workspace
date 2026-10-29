import uuid
from threading import Lock

from app.agents.groq_config import DEFAULT_MODEL, client

SYSTEM_PROMPT = "You are a concise, helpful, and highly intelligent AI assistant."
MAX_HISTORY = 20  # keep only the last N messages (plus the system prompt)

_sessions: dict[str, list[dict]] = {}
_lock = Lock()


def get_or_create_session(session_id: str | None) -> str:
    """Return the given session id if it exists, otherwise start a new session."""
    with _lock:
        if session_id and session_id in _sessions:
            return session_id
        new_id = str(uuid.uuid4())
        _sessions[new_id] = []
        return new_id


def get_history(session_id: str) -> list[dict]:
    """Return the conversation history for a given session."""
    with _lock:
        if session_id not in _sessions:
            _sessions[session_id] = []
        return _sessions[session_id]


def generate_reply(session_id: str, user_message: str) -> str:
    """Send the conversation to Groq and return the reply. History is saved only on success."""
    with _lock:
        history = list(_sessions[session_id])

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history[-MAX_HISTORY:]
    messages.append({"role": "user", "content": user_message})

    completion = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=messages,
        temperature=0.7,
        max_completion_tokens=2048,
    )
    reply = completion.choices[0].message.content or ""

    with _lock:
        _sessions[session_id].append({"role": "user", "content": user_message})
        _sessions[session_id].append({"role": "assistant", "content": reply})
    return reply
