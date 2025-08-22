import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname
    
    // Proteger a página de aprovação pendente
    if (path.startsWith('/pending-approval')) {
        const hasSession = request.cookies.has('firebase-session-cookie'); // Exemplo, o nome do cookie pode variar
        if (!hasSession) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/songs/:path*', '/setlists/:path*', '/tools/:path*', '/pending-approval'],
}
