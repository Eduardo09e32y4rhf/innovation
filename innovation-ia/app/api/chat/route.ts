import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!process.env.NVIDIA_API_KEY) {
            return new Response(JSON.stringify({ error: "NVIDIA_API_KEY não configurada. Adicione-a nas variáveis de ambiente da Vercel." }), { status: 500 });
        }

        const nvidia = createOpenAI({
            baseURL: 'https://integrate.api.nvidia.com/v1',
            apiKey: process.env.NVIDIA_API_KEY,
        });

        const result = await streamText({
            model: nvidia('mistralai/mistral-large-3-675b-instruct-2512'),
            messages,
            system: "Você é o Estrategista Mestre da Innovation.ia. Ajude o Eduardo com foco em RH, Contabilidade e Estratégia.",
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
