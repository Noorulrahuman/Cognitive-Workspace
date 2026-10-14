import asyncio

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.gemini_config import root_agent

APP_NAME = "cognitive_workspace"
USER_ID = "cli_user"


async def main() -> None:
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID)
    runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)

    print("Chat with Gemini. Type 'exit' to quit.\n")
    while True:
        text = (await asyncio.to_thread(input, "You: ")).strip()
        if text.lower() in {"exit", "quit"}:
            break
        if not text:
            continue

        message = types.Content(role="user", parts=[types.Part(text=text)])
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session.id, new_message=message
        ):
            if event.is_final_response() and event.content and event.content.parts:
                print("Gemini:", event.content.parts[0].text, "\n")


if __name__ == "__main__":
    asyncio.run(main())