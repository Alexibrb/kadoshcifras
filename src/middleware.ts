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
    // A exceção para /offline não é mais necessária aqui, pois o layout offline não usa o useRequireAuth
    return NextResponse.next()
}
 
// O matcher define as rotas que acionam o middleware.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    '/setlists/:path*', 
    '/tools/:path*', 
    '/pending-approval'
  ],
}
