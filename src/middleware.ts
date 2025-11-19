
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
    // Se a rota for a página de apresentação offline, permite o acesso sem verificação.
    if (request.nextUrl.pathname.endsWith('/offline')) {
        return NextResponse.next();
    }

    // Para todas as outras rotas protegidas pelo matcher, o comportamento padrão continua.
    // A lógica de redirecionamento principal é tratada no lado do cliente pelo hook useRequireAuth.
    return NextResponse.next()
}
 
// O matcher define as rotas que acionam o middleware.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    '/setlists/:path*', // Agora corresponde a todas as sub-rotas de /setlists
    '/tools/:path*', 
    '/pending-approval'
  ],
}
