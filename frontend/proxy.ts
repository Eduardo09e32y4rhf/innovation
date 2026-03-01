import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Rotas que exigem autenticação.
 * O middleware redireciona para /login se não houver token.
 */
const PROTECTED_PATHS = [
    '/dashboard',
    '/chat-ia',
    '/finance',
    '/finance-advanced',
    '/ats',
    '/projects',
    '/projects-advanced',
    '/support',
    '/onboarding',
    '/csc',
    '/rh',
];

/**
 * NOTE: Em Next.js com localStorage, o token não é acessível no middleware
 * (que roda no Edge, antes do JS do cliente).
 * Por isso usamos um cookie 'auth_token' para validação no middleware.
 * O cliente deve setar esse cookie no login: document.cookie = `auth_token=${token}; path=/; max-age=86400`
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));

    if (!isProtected) {
        return NextResponse.next();
    }

    // Check cookie-based token for server-side route protection
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon
         * - Public pages: /login, /register, /jobs, /pricing, /status, /termos
         */
        '/((?!_next/static|_next/image|favicon|login|register|jobs|pricing|status|termos|forgot-password|reset-password).*)',
    ],
};
