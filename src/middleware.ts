import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignora solicitações para o favicon para evitar conflito com rotas dinâmicas
    if (pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // Se o caminho terminar com /offline, permite o acesso público.
    if (pathname.endsWith('/offline')) {
        return NextResponse.next();
    }
    
    // A lógica de redirecionamento principal é tratada no lado do cliente pelo hook useRequireAuth.
    // Este middleware principalmente define quais rotas são protegidas.
    return NextResponse.next()
}
 
// O matcher define as rotas que acionam o middleware.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    '/setlists/:path*', // Protege todas as rotas de setlists, a lógica no middleware exclui a offline
    '/tools/:path*', 
    '/pending-approval'
  ],
}
