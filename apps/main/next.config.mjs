/* global process */
/** @type {import('next').NextConfig} */
const nextConfig = {
    // @repo/* ship raw .tsx/.ts source (their exports point straight at ./src/**),
    // so Next has to compile them as app source. Without this, Turbopack treats
    // them as external packages and compiles them - and their dependency chain,
    // framer-motion -> motion-dom -> next/dist/build/polyfills/process.js - on a
    // separate path from the app's own graph. The two graphs then disagree about
    // module identity across an HMR rebuild, which surfaces as
    // "module factory is not available" pointing at a @repo/ui file.
    // uni, hiring and web already set this; main and admin did not.
    transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth", "@repo/email", "@repo/ai"],
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },

    // Expose to the browser (needed for auth redirects and client-side auth calls)
    env: {
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },

    // The marketing surface now lives on the web deploy (shipithq.com). Any stale
    // marketing path that lands on the app host is bounced back to web so old
    // links + shared URLs keep working.
    async redirects() {
        const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
        const marketingPaths = [
            "/aboutus", "/blogs", "/privacypolicy", "/termsofservice", "/pricing",
        ];
        return [
            ...marketingPaths.flatMap((p) => ([
                { source: p, destination: `${WEB_URL}${p}`, permanent: false },
                { source: `${p}/:path*`, destination: `${WEB_URL}${p}/:path*`, permanent: false },
            ])),

            // The interview assistant lives at /ai/interviewassistant. For a long time the
            // whole module linked to itself as /ai/jobinterviewassistant - 20 links across 9
            // files - so that URL is in browser histories, bookmarks and anything already
            // shared. The links are canonical now; this catches what is already out there.
            //
            // Not permanent: a 308 is cached by the browser forever, and this is a mistake
            // being cleaned up rather than a deliberate, settled move.
            { source: "/ai/jobinterviewassistant", destination: "/ai/interviewassistant", permanent: false },
            { source: "/ai/jobinterviewassistant/:path*", destination: "/ai/interviewassistant/:path*", permanent: false },

            // The project workspace replaced the sprint board, the tasks page and
            // the standalone quiz and mock pages (plan/project-workspace, deleted
            // 2026-09-24). Old links and bookmarks land in the workspace, the quiz
            // and mock on their own tabs. Not permanent, for the same reason as above.
            { source: "/projects/:slug/sprints", destination: "/projects/:slug/workspace", permanent: false },
            { source: "/projects/:slug/tasks", destination: "/projects/:slug/workspace", permanent: false },
            { source: "/projects/:slug/quiz", destination: "/projects/:slug/workspace?file=%40final-quiz", permanent: false },
            { source: "/projects/:slug/aimock", destination: "/projects/:slug/workspace?file=%40final-mock", permanent: false },
        ];
    },

    // These packages must NOT be bundled into the Cloudflare Worker bundle.
    // @prisma/client - migrated to Drizzle; remaining imports are type-only (erased at compile time)
    // @react-pdf/renderer - uses canvas rendering, not compatible with Workers bundling
    // mammoth - uses Node.js fs/Buffer for DOCX parsing; already on server actions only
    // `sass` is listed here (not just externalised in a bundler hook) because
    // @excalidraw/excalidraw resolves it as an optional peer dep, which used to pull
    // ~4 MB of dead weight into the Cloudflare Worker. serverExternalPackages is
    // bundler-agnostic, so it keeps working now that Turbopack is the default.
    serverExternalPackages: ["@prisma/client", "prisma", "@react-pdf/renderer", "mammoth", "sass"],

    // Next 16 builds with Turbopack by default, so the old `webpack(config)` hook no
    // longer runs. Everything it did is either gone or expressed declaratively now:
    //
    //   raw-loader for *.md   - dropped. The blog content moved to apps/web; this app
    //                           has no .md imports left (verified by grep).
    //   ignoreWarnings/unpdf  - dropped. That was cosmetic webpack noise suppression.
    //   sass server external  - now covered by serverExternalPackages above.
    //   resolve.fallback      - replaced by the alias below.
    //
    // pdfjs-dist reaches for the optional Node-only `canvas` package. In the browser it
    // is never actually used, so it is aliased to an empty module rather than allowed to
    // fail resolution during the client build.
    turbopack: {
        resolveAlias: {
            canvas: { browser: "./lib/empty-module.js" },
        },
    },

    reactStrictMode: true,

};

export default nextConfig;
