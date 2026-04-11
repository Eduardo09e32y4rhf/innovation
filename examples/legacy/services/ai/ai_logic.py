import os
import asyncio
from google import genai
from anthropic import Anthropic
from key_manager import ai_key_manager
from schemas import ChatMessage

SYSTEM_PROMPT = (
    """Você é o assistente inteligente da Innovation.ia..."""  # Abrevied for now
)


async def ask_gemini(question: str, history: list[ChatMessage], model_name: str):
    active_keys = ai_key_manager.get_all_active_keys()

    for api_key in active_keys:
        try:
            client = genai.Client(api_key=api_key)
            chat_history = []
            for msg in history:
                chat_history.append(
                    {
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [{"text": msg.content}],
                    }
                )

            response = client.models.generate_content(
                model=model_name,
                contents=chat_history
                + [{"role": "user", "parts": [{"text": question}]}],
                config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.7},
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                ai_key_manager.mark_as_exhausted(api_key)
                continue
            raise e
    return "Todas as chaves falharam."


async def ask_gemini_stream(question: str, history: list[ChatMessage], model_name: str):
    active_keys = ai_key_manager.get_all_active_keys()
    for api_key in active_keys:
        try:
            client = genai.Client(api_key=api_key)
            chat_history = []
            for msg in history:
                chat_history.append(
                    {
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [{"text": msg.content}],
                    }
                )

            stream = client.models.generate_content_stream(
                model=model_name,
                contents=chat_history
                + [{"role": "user", "parts": [{"text": question}]}],
                config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.7},
            )
            for chunk in stream:
                if chunk.text:
                    yield f"data: {chunk.text.replace(chr(10), '[NEWLINE]')}\n\n"
            yield "data: [DONE]\n\n"
            return
        except Exception:
            continue
    yield "data: [ERROR] Falha em todas as chaves\n\n"
