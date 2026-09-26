// ─────────────────────────────────────────────────────────────────────────────
// Shareable URLs.
//
// Every link a user copies out of the product is built here, for two reasons
// that both bit us:
//
//  1. `window.location.origin` is not available during a server render, and the
//     usual guard - `typeof window !== "undefined" ? window.location.origin : ""`
//     - silently degrades to a RELATIVE url rather than failing. A component
//     that renders one of these server-side hands the user "/profile/alice" to
//     paste into Slack. `NEXT_PUBLIC_BASE_URL` is available in both environments,
//     so the value is right on the first render with no browser global involved.
//
//  2. Even in the browser, `window.location.origin` is the origin the AUTHOR is
//     on, not the one the recipient can reach. Copying a share link from a
//     preview deploy or from localhost produced a link nobody else could open.
//     The canonical origin is a deploy-time fact, not a runtime one.
//
// The path builders exist because the paths were wrong: the share modal was
// handing out `/u/{username}` and the resume tab `/resume/{username}`, neither
// of which is a route in this app. Both 404'd for every recipient. Keeping the
// paths beside the route they name is what stops that recurring.
// ─────────────────────────────────────────────────────────────────────────────

/** This deploy's own public origin, with no trailing slash. */
export function appOrigin(): string {
    const configured = process.env.NEXT_PUBLIC_BASE_URL;
    if (configured) return configured.replace(/\/+$/, "");
    // Only reached when the env var is unset - a misconfiguration rather than a
    // supported mode. Prefer the live origin over the production guess, since a
    // link that works locally beats one that points at the wrong host entirely.
    if (typeof window !== "undefined") return window.location.origin;
    return "https://app.shipithq.com";
}

/** Absolute url for an app-relative path. */
export function absoluteUrl(path: string): string {
    return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** An Incidents case, or the index - app/(public)/incidents (plan/incidents INC-1). */
export function incidentUrl(slug?: string): string {
    return absoluteUrl(slug ? `/incidents/${encodeURIComponent(slug)}` : "/incidents");
}

/** A user's public profile - app/(main)/profile/[username]. */
export function publicProfileUrl(username: string): string {
    return absoluteUrl(`/profile/${encodeURIComponent(username)}`);
}

/** A user's published resume - app/(main)/ai/resume/[username]. */
export function publicResumeUrl(username: string): string {
    return absoluteUrl(`/ai/resume/${encodeURIComponent(username)}`);
}

/**
 * A user's public KnowMe assistant - app/(main)/knowme/[username].
 *
 * This is the link the product exists to hand out, and it was being built inline
 * from `NEXT_PUBLIC_APP_URL` in five places. That variable is not set in this
 * repo at all, so the dashboard fell back to a hardcoded `https://shipithq.com`
 * and the API docs, the chat CTA and the v1 route all rendered the literal string
 * `undefined/knowme/alice`. `NEXT_PUBLIC_BASE_URL` is the one this app actually
 * defines, in every environment, which is the whole reason this module exists.
 */
export function knowMeProfileUrl(username: string): string {
	return absoluteUrl(`/knowme/${encodeURIComponent(username)}`);
}

/** A shared resume draft by its share slug - app/(main)/r/[slug]. */
export function resumeShareUrl(shareSlug: string): string {
    return absoluteUrl(`/r/${encodeURIComponent(shareSlug)}`);
}


/**
 * Whether a `callbackUrl` from the query string is safe to navigate to.
 *
 * Only same-origin paths are allowed. Anything absolute ("https://evil.com"),
 * protocol-relative ("//evil.com") or backslash-smuggled ("/\evil.com") is an
 * open redirect: an attacker mails a link to our real sign-in page and the app
 * hands the freshly authenticated user straight to them.
 */
export function isSafeCallback(value: string | null | undefined): value is string {
	if (!value) return false;
	if (!value.startsWith("/")) return false;
	// "//host" and "/\host" are both read as protocol-relative by browsers.
	if (value.startsWith("//") || value.startsWith("/\\")) return false;
	return true;
}

/**
 * Where a brand-new account goes after sign-up: onboarding, carrying the page they
 * started from so onboarding hands them back to it (plan/ideas IDEA-1). The
 * destination rides in the URL, not only in sessionStorage, so it survives an OAuth
 * round trip, a magic link opened in another tab, or another device.
 */
export function onboardingUrlFor(callback: string | null | undefined): string {
	return isSafeCallback(callback) && callback !== "/home" && !callback.startsWith("/onboarding")
		? `/onboarding?callbackUrl=${encodeURIComponent(callback)}`
		: "/onboarding";
}
