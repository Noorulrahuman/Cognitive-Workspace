import asyncio
import logging
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Import the centralized settings instance
from app.config.settings import settings

logger = logging.getLogger(__name__)


def create_research_agent() -> LlmAgent:
    """Factory to initialize and configure the research ADK agent."""
    return LlmAgent(
        name="research_agent",
        model="gemini-3.5-flash",
        instruction="You are a helpful research assistant.",
    )


# Expose default agent instance
root_agent = create_research_agent()


async def test_gemini() -> None:
    """Manual verification runner for testing the Gemini agent locally."""
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
    # Ensure standard logging output when run directly
    logging.basicConfig(level=logging.INFO)
    logger.info("Running Gemini agent test...")
    asyncio.run(test_gemini())