import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // A lógica de redirecionamento principal é tratada no lado do cliente pelo hook useRequireAuth.
    // Este middleware principalmente define quais rotas são protegidas, com base no matcher abaixo.
    return NextResponse.next()
}
 
// O matcher define as rotas que acionam o middleware.
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    // Aplica a todas as sub-rotas de /setlists, EXCETO /setlists/[id]/offline
    '/setlists/(?!.*\\/offline$).*',
    '/tools/:path*', 
    '/pending-approval'
  ],
}
