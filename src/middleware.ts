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
// A lookahead negativa (?!.*\/offline$) exclui qualquer caminho que termine em /offline.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    '/setlists/:path*(?!.*\/offline$)', // Protege setlists, mas não as páginas offline
    '/tools/:path*', 
    '/pending-approval',
    '/favicon.ico' // Adiciona o favicon ao matcher para que a lógica de exclusão funcione
  ],
}
