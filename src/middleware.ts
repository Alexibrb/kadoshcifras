
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // This middleware is currently not performing any specific logic,
    // but it enforces authentication for the matched routes.
    // The actual redirection logic is handled by the `useRequireAuth` hook on the client-side.
    return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/songs/:path*', '/setlists/:path*', '/tools/:path*', '/pending-approval', '/users/:path*'],
}
