import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model: openai('mistralai/mistral-large-3-675b-instruct-2512') as any,
        baseURL: 'https://integrate.api.nvidia.com/v1',
        apiKey: process.env.NVIDIA_API_KEY,
        system: "Você é o Estrategista Mestre da Innovation.ia rodando na Vercel. Ajude o Eduardo a gerir o ecossistema Prosolution e Innovation.",
        messages,
    });

    return result.toDataStreamResponse();
}
