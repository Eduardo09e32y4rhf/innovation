'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthService } from '../../../services/api';

function GoogleCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const code = searchParams.get('code');

    useEffect(() => {
        if (!code) return;

        const processLogin = async () => {
            try {
                const data = await AuthService.googleCallback(code);
                if (data.access_token) {
                    localStorage.setItem('token', data.access_token);

                    if (data.is_new_user) {
                        router.push('/onboarding/company');
                    } else {
                        router.push('/dashboard');
                    }
                }
            } catch (err) {
                console.error("Google Callback Error:", err);
                router.push('/login?error=google_auth_failed');
            }
        };

        processLogin();
    }, [code, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <p className="animate-pulse">Autenticando com Google...</p>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Carregando...</div>}>
            <GoogleCallback />
        </Suspense>
    );
}
