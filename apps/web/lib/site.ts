// Single source of truth for the marketing site's own origin and the authenticated
// app's origin.
//
// Before this file existed, `NEXT_PUBLIC_WEB_URL` and `NEXT_PUBLIC_BASE_URL` were used
// interchangeably across layout/sitemap/robots/blog metadata. Mixing them silently
// produced canonical URLs, sitemap URLs and JSON-LD `@id`s that disagreed with each
// other, which is the single fastest way to lose an index. Everything reads SITE now.

/** This marketing site's canonical, no-trailing-slash origin (shipithq.com). */
export const SITE = (
    process.env.NEXT_PUBLIC_WEB_URL ?? "https://www.shipithq.com"
).replace(/\/$/, "");

/**
 * The authenticated product deploy (app.shipithq.com). The marketing site never
 * renders auth UI or reads a session - it only deep-links here. Anything that needs
 * a logged-in user lives behind this origin.
 */
export const APP_URL = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:6001"
).replace(/\/$/, "");

/** Canonical CTA destinations on the app. Keep every "Get started"/"Sign in" here. */
export const APP_LINKS = {
    // The app's sign-up route is /register - /signup does not exist and 404s.
    signup: `${APP_URL}/register`,
    signin: `${APP_URL}/signin`,
    dashboard: `${APP_URL}/home`,
    // Incidents (plan/incidents INC-6): public in the app, readable signed out.
    incidents: `${APP_URL}/incidents`,
} as const;

/**
 * The hiring product (hire.shipithq.com) - apps/hiring, for companies. Like APP_URL, it is
 * only ever linked to with a plain <a>: /hire is its marketing page on this site, and
 * everything behind a login lives on that origin (plan/hiring-app HA-3).
 */
export const HIRING_URL = (
    process.env.NEXT_PUBLIC_HIRING_URL ?? "http://localhost:6004"
).replace(/\/$/, "");

/** Canonical CTA destinations on the hiring app. */
export const HIRING_LINKS = {
    signup: `${HIRING_URL}/register`,
    signin: `${HIRING_URL}/signin`,
    help: `${HIRING_URL}/help`,
    contact: `${HIRING_URL}/contactus`,
} as const;

/**
 * The university product (uni.shipithq.com) - apps/uni. Linked to like the other two:
 * /uni is its marketing page on this site (plan/web/revamp REV-31).
 */
export const UNI_URL = (
    process.env.NEXT_PUBLIC_UNI_URL ?? "http://localhost:6003"
).replace(/\/$/, "");

/** Canonical CTA destinations on the university app. */
export const UNI_LINKS = {
    signup: `${UNI_URL}/register`,
    signin: `${UNI_URL}/signin`,
} as const;

/** Public brand identity reused by metadata, JSON-LD and the footer. */
export const BRAND = {
    name: "ShipItHQ",
    legalName: "ShipItHQ",
    tagline: "The Engineering Intelligence Suite",
    logo: `${SITE}/icon-512.png`,
    email: "niraj@getcreatr.com",
    social: {
        twitter: "https://x.com/shipithq",
        github: "https://github.com/jha-niraj",
        linkedin: "https://www.linkedin.com/company/shipithq",
    },
} as const;

/** Absolute URL helper - JSON-LD and OG tags must never emit relative paths. */
export function abs(path: string): string {
    return path.startsWith("http") ? path : `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}
