import asyncio
import os

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.config import settings

if settings.GEMINI_API_KEY is None:
    raise ValueError("GEMINI_API_KEY is missing from .env")

# ADK reads the key from the environment, so hand it over from settings (the only source of truth)
os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY.get_secret_value()

root_agent = LlmAgent(
    name="research_agent",
    model="gemini-3.5-flash",
    instruction="You are a helpful research assistant.",
)


async def test_gemini() -> None:
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name="gemini_test", user_id="anusha"
    )
    runner = Runner(
        agent=root_agent, app_name="gemini_test", session_service=session_service
    )
    message = types.Content(
        role="user", parts=[types.Part(text="Say hello in one short sentence.")]
    )

    async for event in runner.run_async(
        user_id="anusha", session_id=session.id, new_message=message
    ):
        if event.is_final_response() and event.content:
            print("Gemini response:", event.content.parts[0].text)


if __name__ == "__main__":
    asyncio.run(test_gemini())