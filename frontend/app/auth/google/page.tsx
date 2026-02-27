'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Processando login...');

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) {
            setStatus('Código de autenticação não encontrado.');
            return;
        }

        const handleCallback = async () => {
            try {
                // Determine API URL (using env or fallback similar to api.ts)
                const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

                const response = await axios.post(`${baseURL}/auth/google-callback`, null, {
                    params: { code }
                });

                const { access_token, role, is_new_user } = response.data;

                if (access_token) {
                    localStorage.setItem('token', access_token);

                    if (is_new_user || role === 'candidate') {
                         router.push('/onboarding/company');
                    } else {
                         router.push('/dashboard');
                    }
                } else {
                    setStatus('Falha ao receber token de acesso.');
                }
            } catch (error) {
                console.error('Google Callback Error:', error);
                setStatus('Erro ao processar login com Google.');
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
            <p className="text-zinc-400">{status}</p>
        </div>
    );
}
