/**
 * ── Do NOT rename this to proxy.ts ──
 *
 * Next 16 deprecates the `middleware` convention in favour of `proxy`, and logs a warning
 * about it on every dev start. Ignore it. The Cloudflare adapter this app deploys through
 * does not support the `proxy.ts` convention, and `middleware.ts` is still fully supported by
 * Next 16. The same note is in the repo CLAUDE.md.
 */

import { NextRequest, NextResponse } from "next/server"
import { getCookieCache } from "better-auth/cookies"
import type { Session, User } from "better-auth"

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

/**
 * The session for this request, for routing decisions only.
 *
 * ── Why this is not just a fetch any more ──
 *
 * It used to be exactly one thing: `fetch("/api/auth/get-session")` with the request's
 * cookies forwarded. That is a full extra HTTP round trip, to this same server, on EVERY
 * navigation - which is the `GET /api/auth/get-session` line that appears once per page in
 * the dev log, and the 100-200ms of `proxy.ts` time attached to each one. In production it
 * is a second Worker invocation per page.
 *
 * `auth.ts` enables better-auth's cookie cache (`session.cookieCache`, 5 minutes), which
 * exists precisely so this check costs nothing. `getCookieCache` reads that signed cookie and
 * verifies it locally - no network, no database. The fetch is now only the cold path.
 *
 * ── The Set-Cookie bug this also fixes ──
 *
 * The old version threw away the response of its internal fetch except for the JSON body.
 * better-auth answers that call with a `Set-Cookie` refreshing the cookie cache, and often
 * the session cookie itself - `session.updateAge` is 24h, so an active user's 30-day session
 * is supposed to keep rolling forward. Discarding it meant:
 *
 *   - the cookie cache was refilled by the browser's own `useSession` calls and by nothing
 *     else, so navigations kept missing it and paying for a database lookup
 *   - the rolling refresh never reached the browser at all, so a session expired 30 days
 *     after sign-in no matter how active the user was
 *
 * The cold path now forwards those cookies onto the response it returns.
 *
 * Returning null means "not signed in" for routing purposes. That is the safe direction: the
 * worst case is redirecting a signed-in user to /signin, where middleware runs again with a
 * warm cache and bounces them back.
 */
async function getSessionFromRequest(
	request: NextRequest,
): Promise<{ session: SessionData | null; setCookie: string[] }> {
	// Warm path: local, signed-cookie read. No I/O at all.
	try {
		// The generic is better-auth's own Session/User, because that is what the constraint
		// on getCookieCache requires - a narrower local shape does not satisfy it.
		const cached = await getCookieCache<{
			session: Session
			user: User & { onboardingCompleted?: boolean }
			updatedAt: number
		}>(request, {
			cookiePrefix: "shipithq", // must match `advanced.cookiePrefix` in auth.ts
			secret: process.env.BETTER_AUTH_SECRET,
			isSecure: request.nextUrl.protocol === "https:",
		})
		if (cached?.user) {
			return {
				session: {
					user: {
						id: cached.user.id,
						email: cached.user.email,
						name: cached.user.name,
						image: cached.user.image ?? undefined,
						onboardingCompleted: cached.user.onboardingCompleted,
					},
					session: {
						id: cached.session.id,
						expiresAt: String(cached.session.expiresAt),
					},
				},
				setCookie: [],
			}
		}
	} catch {
		// A malformed or unverifiable cache cookie is not an error worth failing on - fall
		// through and ask the server, which will mint a correct one.
	}

	// Cold path: no cache cookie, or it did not verify.
	try {
		const res = await fetch(new URL("/api/auth/get-session", request.nextUrl.origin), {
			headers: { cookie: request.headers.get("cookie") ?? "" },
		})
		if (!res.ok) return { session: null, setCookie: [] }
		// getSetCookie() rather than get("set-cookie"): better-auth can send several, and
		// joining them into one comma-separated string corrupts any cookie whose Expires
		// attribute contains a comma - which every dated cookie does.
		const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []
		const body = (await res.json()) as SessionData | null
		return { session: body, setCookie }
	} catch {
		return { session: null, setCookie: [] }
	}
}

function redirectToSignIn(req: NextRequest): NextResponse {
	const url = new URL("/signin", req.nextUrl.origin)
	// pathname + search, not pathname alone - dropping the query string returns the
	// user to a bare route with their selection gone (e.g. /purchase without the
	// pack they picked on the pricing page).
	url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search)
	return NextResponse.redirect(url)
}

/**
 * The ONLY routes a signed-out visitor may see. Everything else under the
 * matcher requires a session. See CR-10 in plan/credits/tasks.md.
 *
 * ── Why this list is the public one, and not a `protectedRoutes` list ───────
 * It used to be the other way round: a four-entry `protectedRoutes` array
 * (`/home`, `/profile`, `/settings`, `/credits`) and a check of
 * `protectedRoutes.some(r => pathname.startsWith(r))`. Everything NOT in those
 * four was public - so Pathfinder, Projects, AI Tools, KnowMe and Jobs all
 * rendered the full application to a signed-out visitor, with the sidebar
 * offering them "Sign In" and "0 credits" over the top of it.
 *
 * Nothing was misconfigured. The DEFAULT was wrong: routes became public by
 * omission rather than by decision, so every module shipped since has been
 * exposed the moment it was added. Adding the missing paths would have fixed the
 * screenshot and left the next module to ship exposed in the same way.
 *
 * There was even a `_publicRoutes` array directly below listing what was meant
 * to be public. The underscore is the whole story: nothing read it. It was
 * documentation of an intent the code never implemented, and it is now gone.
 *
 * Adding to this list makes a page world-readable. That should be a decision
 * somebody makes on purpose, which is the point of putting it here.
 */
const PUBLIC_EXACT = new Set([
	'/signin',
	'/register',
	'/forgotpassword',
	'/resetpassword',
	'/error',
	// The pricing page, deliberately. Somebody has to be able to see what
	// credits cost before they sign up. Its History and Bounty actions live on
	// /credits, which is NOT public - see CR-11.
	'/purchase',
])

/**
 * Public SUBTREES. Prefix-matched, so everything beneath them is public too.
 * Kept separate from the exact set on purpose: a prefix match on '/signin'
 * would also open '/signin-anything', and that class of mistake is why the
 * original check was wrong.
 */
const PUBLIC_PREFIXES = [
	'/resetpassword/',
	'/purchase/',
]

/**
 * The child routes of /knowme that belong to the OWNER, and must stay behind the
 * session gate. Everything else one level under /knowme is a username.
 *
 * IMPORTANT: adding a page at `app/(main)/knowme/<segment>/` and forgetting to
 * list it here makes that page world-readable. The set has to be kept in step
 * with the directory by hand, because middleware runs on the edge and cannot
 * read the filesystem to derive it.
 */
const KNOWME_OWNER_SEGMENTS = new Set([
	'analytics',
	'settings',
	'onboarding',
])

/**
 * `/knowme/<username>` - the public persona.
 *
 * This is the ONE public page in the app whose path is not fixed, and it was
 * unreachable: CR-10's deny-by-default rule bounced every signed-out visitor to
 * /signin. The link the dashboard tells the owner that "anyone can open, no
 * account needed" asked for an account.
 *
 * It cannot be a `PUBLIC_PREFIXES` entry, because '/knowme/' would also open the
 * owner's own analytics and settings pages to the world. Exactly two segments,
 * and the second must not be one of the owner's.
 */
function isPublicKnowMeProfile(pathname: string): boolean {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length !== 2 || segments[0] !== 'knowme') return false
	return !KNOWME_OWNER_SEGMENTS.has(segments[1]!)
}

/**
 * `/profile/<username>` - the public one-pager (plan/profile PRF-12).
 *
 * Public by default (Niraj, 2026-09-25), so a shared link works for a recruiter
 * and for link-preview bots. Exactly two segments: `/profile` itself is the
 * owner's editor and stays behind the gate. Who may see WHAT is decided on the
 * server by `lib/profile/read.ts` (private -> not found, followers-only -> a
 * face and a Follow prompt), not here; this only lets the request reach it.
 */
function isPublicProfilePage(pathname: string): boolean {
	const segments = pathname.split('/').filter(Boolean)
	return segments.length === 2 && segments[0] === 'profile'
}

/**
 * `/r/<slug>` - a resume its owner made public (plan/resume RES-24), and the PDF
 * behind its Download button. The hub has always called these "share links", and
 * both were behind the gate. The route and the loader refuse a draft that is not
 * `is_public`, so opening the gate here exposes nothing private.
 */
function isPublicResume(pathname: string): boolean {
	const s = pathname.split('/').filter(Boolean)
	if (s.length === 2 && s[0] === 'r') return true
	return s.length === 4 && s[0] === 'api' && s[1] === 'resume' && s[2] === 'pdf'
}

function isPublicRoute(pathname: string): boolean {
	if (PUBLIC_EXACT.has(pathname)) return true
	if (isPublicKnowMeProfile(pathname)) return true
	if (isPublicProfilePage(pathname)) return true
	if (isPublicResume(pathname)) return true
	return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

// API routes that should be excluded from auth checks
const apiRoutes = [
	'/api/auth',
	'/api/health',
	'/api/user',
	'/api/webhooks',
	// Razorpay posts here server to server with no session cookie. Without this
	// line CR-10's deny-by-default rule redirects it to /signin, Razorpay sees a
	// 307 instead of a 200, and every webhook retries and then gives up - which
	// silently disables the only path that grants credits when the buyer closes
	// the tab before verify runs. The route authenticates itself by HMAC on the
	// raw body; a session would be meaningless here.
	'/api/payments/webhook',
]

const PRODUCTION_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.shipithq.com'

export default async function middleware(req: NextRequest) {
	const { nextUrl } = req
	const pathname = nextUrl.pathname

	// Pass through static assets and Next.js internals
	if (
		pathname.startsWith('/_next/') ||
		pathname.includes('.') ||
		apiRoutes.some(r => pathname.startsWith(r))
	) {
		return NextResponse.next()
	}

	// Noindex non-production deployments so staging/preview URLs don't pollute
	// Google's index. This only sets a header - it must NOT return early, or every
	// auth redirect below (sign-in gate, onboarding gate) would be dead on
	// localhost and preview deploys, which is exactly where they get tested.
	const isProduction = req.nextUrl.origin === PRODUCTION_ORIGIN
	const noindex = !isProduction

	const { session, setCookie } = await getSessionFromRequest(req)

	// Every response leaves through here, so the refreshed cookies from the cold path are
	// forwarded exactly once and cannot be forgotten on a branch. `append`, not `set`: there
	// can be more than one, and `set` would keep only the last.
	const finish = (res: NextResponse) => {
		if (noindex) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
		for (const c of setCookie) res.headers.append('set-cookie', c)
		return res
	}

	const isLoggedIn = !!session?.user
	const onboardingCompleted = session?.user?.onboardingCompleted ?? false

	// DENY BY DEFAULT. `/` is excluded because a signed-out visitor there belongs
	// on the marketing site, not bounced into a sign-in form.
	if (!isLoggedIn && pathname !== '/' && !isPublicRoute(pathname)) {
		return finish(redirectToSignIn(req))
	}

	if (isLoggedIn) {
		if (!onboardingCompleted && pathname !== '/onboarding') {
			// Carry where they were headed, so someone who signed up from a pricing
			// CTA lands back on their pack once setup is done instead of on /home.
			const url = new URL('/onboarding', nextUrl.origin)
			if (pathname !== '/home') {
				url.searchParams.set('callbackUrl', pathname + nextUrl.search)
			}
			return finish(NextResponse.redirect(url))
		}
		if (onboardingCompleted && pathname === '/onboarding') {
			return finish(NextResponse.redirect(new URL('/home', nextUrl.origin)))
		}
		if (pathname === '/signin' || pathname === '/register') {
			return finish(NextResponse.redirect(new URL(onboardingCompleted ? '/home' : '/onboarding', nextUrl.origin)))
		}
		if (pathname === '/') {
			return finish(NextResponse.redirect(new URL(onboardingCompleted ? '/home' : '/onboarding', nextUrl.origin)))
		}
		if (pathname === '/dashboard' || pathname === '/explore') {
			return finish(NextResponse.redirect(new URL('/home', nextUrl.origin)))
		}
	}

	return finish(NextResponse.next())
}

export const config = {
	// More specific matcher to avoid catching static files and API routes
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