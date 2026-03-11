import os
import sys
from openai import OpenAI
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

# Configura o cliente da NVIDIA
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1", api_key=os.getenv("NVIDIA_API_KEY")
)

from services.innovation_independent_service import innovation_independent
import asyncio


def perguntar_estrategista(pergunta, persona="estrategia"):
    """
    Agora o ajuda.py utiliza o cérebro da Innovation Independent IA
    que orquestra múltiplas fontes de conhecimento.
    """
    # Como o ajuda.py roda em script síncrono, usamos o loop do asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        innovation_independent.pensar_e_responder(pergunta, persona)
    )


if __name__ == "__main__":
    if len(sys.argv) > 1:
        args = sys.argv[1:]
        persona = "rh" if "--rh" in args else "estrategia"
        if "--rh" in args:
            args.remove("--rh")

        pergunta = " ".join(args)
        if not pergunta:
            print('Uso: python ajuda.py [--rh] "Sua pergunta aqui"')
            sys.exit(0)

        print(f"\n--- [INNOVATION IA INDEPENDENTE] ---\n")
        print(f"Orquestrando NVIDIA, Gemini e Claude para responder...\n")
        print(perguntar_estrategista(pergunta, persona))
    else:
        print('Uso: python ajuda.py [--rh] "Sua pergunta aqui"')
