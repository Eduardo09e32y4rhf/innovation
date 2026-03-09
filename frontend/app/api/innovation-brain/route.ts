import { NextResponse } from 'next/server';

/**
 * Endpoint de IA Autônoma (Innovation IA) rodando exclusivamente na Vercel.
 * Este cérebro é responsável por orquestrar NVIDIA, Gemini e se comunicar com o Claude.
 */

export async function POST(req: Request) {
    try {
        const { message, category = 'geral' } = await req.json();

        // 1. Orquestração NVIDIA (Mistral Large 3) - Fonte Razão
        const nvidiaApiKey = process.env.NVIDIA_API_KEY;
        const nvidiaUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

        const nvidiaResponse = await fetch(nvidiaUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${nvidiaApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mistralai/mistral-large-3-675b-instruct-2512",
                messages: [{ role: "user", content: `Aja como a INNOVATION IA (RH & Contábil). Pergunta: ${message}` }],
                temperature: 0.15,
                max_tokens: 2048
            })
        });

        const nvidiaData = await nvidiaResponse.json();
        const answer = nvidiaData.choices?.[0]?.message?.content || "Erro ao processar razão na NVIDIA.";

        // 2. Notificação opcional para a VPS (Alimentação do Chat Innovation)
        const vpsApiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (vpsApiUrl) {
            // Tenta enviar o aprendizado para a VPS de forma assíncrona (fire and forget)
            fetch(`${vpsApiUrl}/innovation-ia/sync-knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, answer, source: 'Vercel-Brain' })
            }).catch(e => console.error("Erro ao sincronizar com VPS:", e));
        }

        return NextResponse.json({
            agent: "Innovation IA (Vercel Brain)",
            status: "Orchestrated",
            answer: answer
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
