import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignora solicitações para o favicon para evitar conflito com rotas dinâmicas
    if (pathname === '/favicon.ico') {
        return NextResponse.next();
    }
    
    // A lógica de redirecionamento principal é tratada no lado do cliente pelo hook useRequireAuth.
    // Este middleware principalmente define quais rotas são protegidas.
    return NextResponse.next()
}
 
// O matcher define as rotas que acionam o middleware.
// Usamos uma expressão regular com "negative lookahead" para excluir as rotas que terminam com /offline.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    // Aplica a todas as sub-rotas de /setlists, EXCETO /setlists/qualquercoisa/offline
    '/setlists/((?!offline).*)',
    '/tools/:path*', 
    '/pending-approval'
  ],
}
