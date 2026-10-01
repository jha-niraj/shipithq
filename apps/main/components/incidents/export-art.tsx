import { cn } from "@repo/ui/lib/utils"

/**
 * Case three in miniature (plan/long-jobs-vercel LJV-6): a 14-minute export run three
 * ways. Inline dies at 300 s with a 504; in after() it runs on until 800 s and stops with
 * the row still processing; as a workflow its ten steps fill to the end. CSS only;
 * reduced motion shows the end state, still. Always on a dark surface, so its ink is fixed.
 */

// 14 minutes = 840 s across the lane: 300 s at 35.7%, 800 s at 95.2%.
const MOTION = `
@keyframes ea-inline { 0% { width: 0 } 36%, 100% { width: 35.7% } }
@keyframes ea-504 { 0%, 36% { opacity: 0 } 39%, 100% { opacity: 1 } }
@keyframes ea-after { 0% { width: 0 } 95%, 100% { width: 95.2% } }
@keyframes ea-stuck { 0%, 95% { opacity: 0 } 97%, 100% { opacity: 1 } }
@keyframes ea-wf { 0% { clip-path: inset(0 100% 0 0) } 100% { clip-path: inset(0 0 0 0) } }
@keyframes ea-head { 0% { left: 0 } 100% { left: 100% } }
.ea-inline { width: 35.7%; animation: ea-inline 9s linear infinite; }
.ea-504 { animation: ea-504 9s linear infinite; }
.ea-after { width: 95.2%; animation: ea-after 9s linear infinite; }
.ea-stuck { animation: ea-stuck 9s linear infinite; }
.ea-sent { animation: ea-stuck 9s linear infinite; }
.ea-wf { animation: ea-wf 9s linear infinite; }
.ea-head { left: 100%; animation: ea-head 9s linear infinite; }
.ea-steps { background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.85) 0 calc(10% - 3px), transparent calc(10% - 3px) 10%); }
@media (prefers-reduced-motion: reduce) { .ea-inline, .ea-504, .ea-after, .ea-stuck, .ea-sent, .ea-wf, .ea-head { animation: none; } }
`

function Lane({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-mono text-[9.5px] text-neutral-400">{label}</span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-white/[0.05]">{children}</div>
        </div>
    )
}

export function ExportArt({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn("rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10", className)}>
            <style>{MOTION}</style>
            <div className="flex gap-3">
                <span className="w-14 shrink-0" />
                <div className="relative h-4 flex-1 font-mono text-[9.5px] text-neutral-400">
                    {[{ v: 0, t: "0" }, { v: 300, t: "300s" }, { v: 800, t: "800s" }].map(({ v, t }) => (
                        <span key={v} className={cn("absolute", v === 0 ? "" : "-translate-x-1/2 text-white")} style={{ left: `${(v / 840) * 100}%` }}>{t}</span>
                    ))}
                </div>
            </div>
            <div className="relative mt-2 space-y-2">
                <Lane label="Inline">
                    <span className="ea-inline absolute inset-y-1 left-0 rounded-md bg-white/80" />
                    <span className="ea-504 absolute inset-y-1 left-[36.5%] flex items-center rounded-md bg-rose-500/20 px-2 font-mono text-[10px] text-rose-300">504</span>
                </Lane>
                <Lane label="after()">
                    <span className="ea-after absolute inset-y-1 left-0 rounded-md bg-white/35" />
                    <span className="ea-stuck absolute inset-y-1 left-1 flex items-center px-1 font-mono text-[10px] text-white">stopped, still processing</span>
                </Lane>
                <Lane label="Workflow">
                    <span className="ea-wf ea-steps absolute inset-y-1 left-0 right-0 rounded-md" />
                    <span className="ea-sent absolute inset-y-1 right-1 flex items-center rounded-md bg-emerald-950 px-2 font-mono text-[10px] text-emerald-200">sent</span>
                </Lane>
                <div className="pointer-events-none absolute inset-y-0 left-[4.25rem] right-0">
                    <span className="absolute inset-y-0 left-[35.7%] w-px bg-rose-400" />
                    <span className="absolute inset-y-0 left-[95.2%] w-px bg-rose-400/60" />
                    <span className="ea-head absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                </div>
            </div>
        </div>
    )
}
