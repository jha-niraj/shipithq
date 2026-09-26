/*
 * The focused layout for taking a hiring round (plan/hiring-rounds HR-13,
 * decided by Niraj 2026-09-25): no sidebar and no AI panel, just the page. The
 * runner draws its own slim top bar. Signed-in only, like every route not in
 * the middleware's public list.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">{children}</div>
}
