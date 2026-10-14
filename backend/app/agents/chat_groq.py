import sys
from app.agents.groq_config import client, DEFAULT_MODEL

def run_chat(model: str = DEFAULT_MODEL):
    print(f"=== Starting Groq Chat ({model}) ===")
    print("Type 'exit' or 'quit' to end the session.\n")

    # Conversation history with system prompt
    messages = [
        {
            "role": "system",
            "content": "You are a concise, helpful, and highly intelligent AI assistant.",
        }
    ]

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit"):
                print("Exiting chat. Goodbye!")
                break

            # Append the user's message
            messages.append({"role": "user", "content": user_input})

            print(f"\nGroq: ", end="", flush=True)

            # Request completion with real-time token streaming
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_completion_tokens=2048,
                stream=True,
            )

            assistant_reply = ""
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                assistant_reply += delta
                sys.stdout.write(delta)
                sys.stdout.flush()

            print("\n")

            # Store the assistant reply in history for multi-turn context
            messages.append({"role": "assistant", "content": assistant_reply})

        except KeyboardInterrupt:
            print("\nSession interrupted. Exiting.")
            break
        except Exception as e:
            print(f"\n[Error]: {e}\n")

if __name__ == "__main__":
    run_chat()