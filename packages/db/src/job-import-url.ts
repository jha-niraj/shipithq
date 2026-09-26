/*
 * The dedup key for a pasted job link (plan/job-import JI-1, JI-6): the same
 * posting pasted twice, with tracking parameters or a trailing slash, is one
 * public import. No imports; Web Crypto works in the app and the worker.
 */

/** Tracking and share parameters that never change which posting a link is. */
const DROP = /^(utm_.+|ref|refid|referrer|source|src|trk|trkinfo|tracking.*|gclid|fbclid|mc_.+|originalsubdomain|lipi|currentjobid|eBP|refId|trackingId)$/i

export function normaliseJobUrl(input: string): string | null {
    let url: URL
    try { url = new URL(input.trim()) } catch { return null }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    url.protocol = "https:"
    url.hostname = url.hostname.toLowerCase().replace(/^(www\.|m\.|in\.|uk\.)(?=linkedin\.com$)/, "").replace(/^www\./, "")
    url.hash = ""
    for (const key of [...url.searchParams.keys()]) if (DROP.test(key)) url.searchParams.delete(key)
    // LinkedIn's many forms of one job ("/jobs/view/title-at-co-123/", "?currentJobId=123") collapse to its id.
    const li = url.hostname === "linkedin.com" && (url.pathname.match(/\/jobs\/view\/(?:[^/]*?-)?(\d{6,})\/?$/)?.[1] ?? input.match(/currentJobId=(\d{6,})/i)?.[1])
    if (li) return `https://linkedin.com/jobs/view/${li}`
    url.searchParams.sort()
    const path = url.pathname.replace(/\/+$/, "") || "/"
    const query = url.searchParams.toString()
    return `https://${url.hostname}${path}${query ? `?${query}` : ""}`
}

export async function jobUrlHash(normalised: string): Promise<string> {
    const bytes = new TextEncoder().encode(normalised)
    const digest = await crypto.subtle.digest("SHA-256", bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
