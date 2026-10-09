
import os
from dotenv import load_dotenv
from google.adk.agents import LlmAgent

# Load environment variables from backend/.env
load_dotenv()

# Check whether the API key exists
if not os.getenv("GEMINI_API_KEY"):
    raise ValueError("GEMINI_API_KEY is missing from .env")

# Initialize the ADK agent
root_agent = LlmAgent(
    name="research_agent",
    model="gemini-3.5-flash",
    instruction="You are a helpful research assistant."
)

print("Gemini configuration initialized successfully")



import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types


async def test_gemini():
    session_service = InMemorySessionService()

    session = await session_service.create_session(
        app_name="gemini_test",
        user_id="anusha",
    )

    runner = Runner(
        agent=root_agent,
        app_name="gemini_test",
        session_service=session_service,
    )

    message = types.Content(
        role="user",
        parts=[types.Part(text="Say hello in one short sentence.")],
    )

    async for event in runner.run_async(
        user_id="anusha",
        session_id=session.id,
        new_message=message,
    ):
        if event.is_final_response() and event.content:
            print("Gemini response:")
            print(event.content)


if __name__ == "__main__":
    asyncio.run(test_gemini())
