
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // Este middleware atualmente não executa nenhuma lógica específica,
    // mas impõe a verificação de autenticação para as rotas correspondentes.
    // A lógica real de redirecionamento é tratada no lado do cliente pelo hook useRequireAuth.
    return NextResponse.next()
}
 
// Veja "Matching Paths" abaixo para saber mais
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/songs/:path*', 
    '/setlists', // Protege a página de listagem de repertórios
    '/setlists/new', // Protege a página de criação
    '/setlists/:id', // Protege a página de edição de um repertório específico
    '/tools/:path*', 
    '/pending-approval'
  ],
}
