import sys

from app.agents.groq_config import DEFAULT_MODEL, client

SYSTEM_PROMPT = "You are a concise, helpful, and highly intelligent AI assistant."
EXIT_COMMANDS = {"exit", "quit"}


def stream_reply(messages: list[dict], model: str) -> str:
    """Send the conversation to Groq, print tokens as they arrive, return the full reply."""
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_completion_tokens=2048,
        stream=True,
    )

    reply = ""
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content or ""
        reply += delta
        sys.stdout.write(delta)
        sys.stdout.flush()
    return reply


def run_chat(model: str = DEFAULT_MODEL) -> None:
    print(f"=== Groq Chat ({model}) ===")
    print("Type 'exit' or 'quit' to end the session.\n")

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in EXIT_COMMANDS:
            print("Goodbye!")
            break

        messages.append({"role": "user", "content": user_input})
        print("\nGroq: ", end="", flush=True)

        try:
            reply = stream_reply(messages, model)
        except KeyboardInterrupt:
            messages.pop()
            print("\n[Interrupted]\n")
            continue
        except Exception as e:
            messages.pop()  # don't keep the failed message in history
            print(f"\n[Error]: {e}\n")
            continue

        print("\n")
        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    run_chat()