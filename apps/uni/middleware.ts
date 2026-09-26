import { NextRequest, NextResponse } from "next/server"

type SessionUser = {
    id: string
    email: string
    name: string
    image?: string
    onboardingCompleted?: boolean
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

function redirectToSignIn(req: NextRequest): NextResponse {
    const url = new URL("/signin", req.nextUrl.origin)
    url.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(url)
}

// Protected routes that require authentication
const protectedRoutes = [
    // '/home' is the signed-in dashboard and was missing from this list, so it
    // rendered for logged-out visitors instead of bouncing them to /signin.
    '/home',
    '/dashboard',
    '/settings',
    '/profile',
    '/students',
    '/faculty',
    '/classes',
    '/departments',
    '/assignments',
    '/analytics',
    '/billing',
    '/placements',
    '/university',
]

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
    const isLoggedIn = !!session
    const onboardingCompleted = session?.user?.onboardingCompleted ?? false

    console.log(`[University] Middleware: ${nextUrl.pathname}, isLoggedIn: ${isLoggedIn}, onboarding: ${onboardingCompleted}`)

    // Check if current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route =>
        nextUrl.pathname.startsWith(route)
    )

    // If user is not logged in and trying to access protected route
    if (!isLoggedIn && isProtectedRoute) {
        return redirectToSignIn(req)
    }

    // Handle post-login redirection logic
    if (isLoggedIn) {
        // Check onboarding status
        if (!onboardingCompleted && nextUrl.pathname !== '/onboarding' && nextUrl.pathname !== '/verify') {
            // Redirect to onboarding if not completed (except verify and onboarding itself)
            return NextResponse.redirect(new URL('/onboarding', nextUrl.origin))
        }

        // If onboarding is completed and user tries to access onboarding page, redirect to dashboard
        if (onboardingCompleted && nextUrl.pathname === '/onboarding') {
            return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
        }

        // If user is trying to access signin/register, redirect based on onboarding status
        if (nextUrl.pathname === '/signin' || nextUrl.pathname === '/register') {
            const redirectUrl = onboardingCompleted ? '/dashboard' : '/onboarding'
            return NextResponse.redirect(new URL(redirectUrl, nextUrl.origin))
        }

        // For the root path, redirect authenticated users based on onboarding status
        if (nextUrl.pathname === '/') {
            const redirectUrl = onboardingCompleted ? '/dashboard' : '/onboarding'
            return NextResponse.redirect(new URL(redirectUrl, nextUrl.origin))
        }
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
