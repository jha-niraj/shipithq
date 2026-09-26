import { cn } from "@repo/ui/lib/utils"

/**
 * Case one in miniature (plan/incidents INC-8): the job runs, the page is refreshed at
 * 30 s, the work inside the request dies with nothing written. CSS only; reduced
 * motion shows that end state, still. Always on a dark surface, so its ink is fixed.
 */

const MOTION = `
@keyframes ca-run { 0% { width: 0 } 30%, 100% { width: 25% } }
@keyframes ca-dead { 0%, 30% { width: 0; opacity: 0 } 31% { opacity: 1 } 58%, 100% { width: 75%; opacity: 1 } }
@keyframes ca-gone { 0%, 30% { opacity: 0 } 34%, 100% { opacity: 1 } }
@keyframes ca-head { 0% { left: 0 } 30% { left: 25% } 58%, 100% { left: 100% } }
.ca-run { width: 25%; animation: ca-run 8s linear infinite; }
.ca-dead { width: 75%; animation: ca-dead 8s linear infinite; }
.ca-gone { animation: ca-gone 8s linear infinite; }
.ca-head { left: 100%; animation: ca-head 8s linear infinite; }
.ca-stripes { background-image: repeating-linear-gradient(115deg, rgba(0,0,0,.12) 0 6px, transparent 6px 12px); }
@media (prefers-reduced-motion: reduce) { .ca-run, .ca-dead, .ca-gone, .ca-head { animation: none; } }
`

function Lane({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-neutral-400">{label}</span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-white/[0.05]">{children}</div>
        </div>
    )
}

export function CaseArt({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn("rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10", className)}>
            <style>{MOTION}</style>
            <div className="flex gap-3">
                <span className="w-14 shrink-0" />
                <div className="relative h-4 flex-1 font-mono text-[9.5px] text-neutral-400">
                    {[0, 30, 60, 90, 120].map((v) => (
                        <span key={v} className={cn("absolute -translate-x-1/2", v === 30 && "text-white")} style={{ left: `${(v / 120) * 100}%` }}>{v}s</span>
                    ))}
                </div>
            </div>
            <div className="relative mt-2 space-y-2">
                <Lane label="Browser">
                    <span className="ca-run absolute inset-y-1 left-0 rounded-md bg-white/20" />
                    <span className="ca-gone absolute inset-y-1 left-[25%] right-1 flex items-center rounded-md border border-dashed border-white/20 px-2 font-mono text-[10px] text-neutral-400">refreshed</span>
                </Lane>
                <Lane label="The job">
                    <span className="ca-run ca-stripes absolute inset-y-1 left-0 rounded-md bg-white" />
                    <span className="ca-dead absolute inset-y-1 left-[25%] flex items-center overflow-hidden whitespace-nowrap rounded-md bg-rose-500/20 px-2 font-mono text-[10px] text-rose-300">killed, nothing written</span>
                </Lane>
                <div className="pointer-events-none absolute inset-y-0 left-[4.25rem] right-0">
                    <span className="absolute inset-y-0 left-[25%] w-px bg-rose-400" />
                    <span className="ca-head absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                </div>
            </div>
        </div>
    )
}
