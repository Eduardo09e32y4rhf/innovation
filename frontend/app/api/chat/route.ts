import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Configuração para rodar na "Borda" (Edge), muito mais rápido na Vercel
export const runtime = 'edge';

export async function POST(req: Request) {
    const { messages } = await req.json();

    // Conectando ao seu Token da NVIDIA (definido no painel da Vercel)
    const result = await streamText({
        model: openai('mistralai/mistral-large-3-675b-instruct-2512'),
        description: 'Innovation IA - Mestre Estrategista',
        baseURL: 'https://integrate.api.nvidia.com/v1',
        apiKey: process.env.NVIDIA_API_KEY,
        system: "Você é o Estrategista Mestre da Innovation.ia. Seu objetivo é ajudar o Eduardo a escalar o ecossistema, unir a VPS com a Vercel e dominar o mercado de RH e Contabilidade. Use um tom executivo, visionário e técnico.",
        messages,
    });

    return result.toDataStreamResponse();
}
