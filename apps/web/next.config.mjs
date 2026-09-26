/* global process */

// apps/web is the PUBLIC MARKETING SITE (shipithq.com). It has no auth, no session and
// no product UI. The authenticated product lives on a separate deploy (app.shipithq.com,
// apps/main). Any app/auth path that still lands on the marketing host is 307'd across to
// the app, preserving the query string so deep links (?callbackUrl=…, ?plan=…) survive
// the hop and old inbound links never 404.
//
// Deploy target: Cloudflare Workers via @opennextjs/cloudflare (see wrangler.jsonc and
// open-next.config.ts). That is why the security/cache headers live HERE and not in
// public/_headers - `_headers` is a Cloudflare *Pages* feature and is silently ignored by
// a Workers deploy, so headers declared there would never actually be sent.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:6001";

// Paths owned by the app, not the marketing site.
//
// EVERY ENTRY MUST RESOLVE ON THE APP. This list is a redirect table, so a path pointing
// at a route that does not exist produces a 404 *after* a redirect hop - which is strictly
// worse than not redirecting, because the visitor lands on the app's error page with no
// way back into the marketing site. Nine of these were doing exactly that, audited on
// 2026-08-21 by requesting each target:
//
//   /signup /verify /dashboard /sharecredits /referrals /chat /leaderboard
//   /achievements /feedback
//
// Two were real aliases and are now redirected to the route that exists (see APP_ALIASES).
// The other seven belong to modules that were removed from the product - Chat/Inbox,
// referrals, achievements and the rest - so they are gone from this list entirely. They now
// 404 on the MARKETING site, which is the better outcome: that page has navigation back
// into the rest of the site, and the app's does not.
//
// If you add a path here, request it against the app first.
const APP_PATHS = [
    "/signin", "/register", "/onboarding",
    "/forgotpassword", "/resetpassword", "/error",
    "/home", "/profile", "/settings",
    "/purchase", "/transactions",
    "/ai", "/practice", "/mock", "/pathfinder",
    "/projects", "/knowme",
    "/jobs",
];

// Paths people type or link that are NOT what the app calls the route.
//
// `/signup` is the important one: it is the most-guessed sign-up URL on any site, the
// app's route is `/register`, and it was redirecting to `${APP_URL}/signup` - a 404 at the
// end of a redirect. `lib/site.ts` already sends our own CTAs to `/register`; this covers
// everyone who typed it, bookmarked it, or followed an old link.
const APP_ALIASES = [
    { from: "/signup", to: "/register" },
    { from: "/dashboard", to: "/home" },
];

// JSON-LD structured data is emitted inline on every page, so script-src needs
// 'unsafe-inline'. Tailwind + Next inject inline styles, hence the same for style-src.
//
// static.cloudflareinsights.com is Cloudflare Web Analytics, which the platform injects
// automatically on Cloudflare-hosted sites. Without it allowlisted the beacon is blocked
// on every page load, producing a console error and a CSP entry in the DevTools Issues
// panel - both of which Lighthouse scores against Best Practices. The beacon also POSTs
// its payload, hence the connect-src entry.
//
// Fonts are self-hosted: next/font/google downloads them at build time, so no
// fonts.googleapis.com / fonts.gstatic.com entries are needed at runtime.
const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://static.cloudflareinsights.com https://cloudflareinsights.com",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    // @repo/ui and @repo/db are workspace packages that ship raw .ts/.tsx from src/ with no
    // build step, so Next has to compile them itself.
    transpilePackages: ["@repo/ui", "@repo/db"],

    images: {
        unoptimized: true,
    },

    // Marketing-only public config. Deliberately no BETTER_AUTH_URL / NEXT_PUBLIC_AUTH_URL:
    // this site never talks to the auth API, it only links to the app origin.
    env: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_HIRING_URL: process.env.NEXT_PUBLIC_HIRING_URL,
        NEXT_PUBLIC_UNI_URL: process.env.NEXT_PUBLIC_UNI_URL,
        NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    },

    async redirects() {
        return [
            // Legacy singular blog path from before the marketing split. Permanent so any
            // existing backlink or indexed URL keeps its equity instead of 404ing.
            // /contact was folded into the About page as an anchored section.
            { source: "/contact", destination: "/aboutus#contact", permanent: true },
            { source: "/blog", destination: "/blogs", permanent: true },
            { source: "/blog/:path*", destination: "/blogs/:path*", permanent: true },
            // Retired one-off post that predated the content system (Razorpay tutorial,
            // off-topic for this site). Send its equity to the blog index.
            { source: "/blogs/integratingrazorpay", destination: "/blogs", permanent: true },
            ...APP_PATHS.flatMap((p) => ([
                { source: p, destination: `${APP_URL}${p}`, permanent: false },
                { source: `${p}/:path*`, destination: `${APP_URL}${p}/:path*`, permanent: false },
            ])),
            // Aliases resolve to the app's real route name rather than echoing the path.
            ...APP_ALIASES.map(({ from, to }) => (
                { source: from, destination: `${APP_URL}${to}`, permanent: false }
            )),
        ];
    },

    async headers() {
        return [
            { source: "/(.*)", headers: securityHeaders },
            // Fingerprinted build assets never change under a given hash - cache them hard so
            // repeat visitors and crawlers do not re-fetch them. Safe because the filenames are
            // content-hashed; a new build produces new URLs.
            //
            // PRODUCTION ONLY. `headers()` runs in dev too, and Turbopack's dev chunk
            // names are not content-hashed the way production filenames are - so in dev
            // this told the browser to pin a dev chunk for a year and never revalidate
            // it. A browser that does that keeps serving chunks from an older
            // dependency tree after you reinstall, which surfaces as Turbopack's
            // "module factory is not available" and needs a manual cache clear to
            // escape. Next warns about custom Cache-Control on /_next for this reason.
            ...(process.env.NODE_ENV === "production"
                ? [{
                    source: "/_next/static/(.*)",
                    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
                }]
                : []),
            // Generated OG cards and static brand assets: long-lived but revalidatable.
            {
                source: "/og/(.*)",
                headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
            },
            {
                source: "/llms.txt",
                headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }],
            },
        ];
    },

    reactStrictMode: true,
};

export default nextConfig;
