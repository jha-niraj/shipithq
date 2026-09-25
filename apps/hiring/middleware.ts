import { NextRequest, NextResponse } from "next/server"

type SessionUser = {
    id: string
    email: string
    name: string
    image?: string
}

type SessionData = {
    user: SessionUser
    session: { id: string; expiresAt: string }
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
    try {
        const res = await fetch(new URL("/api/auth/get-session", request.nextUrl.origin), {
            headers: { cookie: request.headers.get("cookie") ?? "" },
        })
        if (!res.ok) return null
        return (await res.json()) as SessionData
    } catch {
        return null
    }
}

// Pages a signed-out visitor may open. EVERYTHING else needs a session
// (plan/hiring-app HA-2). This used to be the opposite - a hand-written list of
// protected prefixes - and it went stale: /billing, /interview-config, /mock,
// /invoices and /transactions were never added, so they rendered for anyone.
// A new page is now protected by default; only a public one needs a line here.
const publicRoutes = [
    '/signin',
    '/register',
    '/verify',
    '/forgotpassword',
    '/resetpassword',
    '/invite',
    '/help',
    '/contactus',
    '/privacy',
    '/terms',
]

const isPublicPath = (pathname: string) =>
    pathname === '/' || publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

// API routes that should be excluded from auth checks
const apiRoutes = [
    '/api/auth',
    '/api/health',
    '/api/webhooks',
]

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // Allow API routes to pass through
    if (apiRoutes.some(route => nextUrl.pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Allow static files and Next.js internals
    if (
        nextUrl.pathname.startsWith('/_next/') ||
        nextUrl.pathname.startsWith('/api/') ||
        nextUrl.pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    const session = await getSessionFromRequest(req)
    const isLoggedIn = !!session?.user

    // Onboarding needs a session too, but it is where an un-onboarded user is sent.
    const isProtectedRoute = !isPublicPath(nextUrl.pathname)

    // If user is not logged in and trying to access protected route
    if (!isLoggedIn && isProtectedRoute) {
        const signInUrl = new URL('/signin', nextUrl.origin)
        signInUrl.searchParams.set('callbackUrl', nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
    }

    // Signed in: the entry pages go to Home. Whether this person has a company
    // yet is decided by the (main) layout from `company_member`, not here: the
    // `onboardingCompleted` flag is shared with apps/main and set by the
    // student onboarding, so it says nothing about hiring (plan/hiring-app HA-5).
    if (isLoggedIn && ['/', '/signin', '/register'].includes(nextUrl.pathname)) {
        return NextResponse.redirect(new URL('/home', nextUrl.origin))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         * - files with extensions (images, etc.)
         * - webhook endpoints
         */
        '/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico|public/|.*\\..*).*)',
    ],
}