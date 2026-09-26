/** "now", "5m", "3h", "2d ago", then a date, like the reference's meta row. */
export function relativeTime(iso: string, now = Date.now()): string {
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
    if (s < 60) return "now"
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86_400) return `${Math.floor(s / 3600)}h ago`
    if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}
