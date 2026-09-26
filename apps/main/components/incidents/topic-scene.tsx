import { cn } from "@repo/ui/lib/utils"
import type { IncidentTopicId } from "@/content/incidents"

/**
 * A small animated scene per topic (plan/incidents INC-12), for case cards that have no
 * scene of their own and for cases being written. Ink is `currentColor`, so a card sets
 * the colour; every motion is CSS and stops on a readable frame under reduced motion.
 */

const MOTION = `
.ts * { transform-box: fill-box; }
@keyframes ts-slide { 0% { transform: translateX(0); } 100% { transform: translateX(var(--d)); } }
@keyframes ts-fade { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes ts-pop { 0%, 40% { transform: scale(.6); opacity: 0; } 60%, 100% { transform: scale(1); opacity: 1; } }
@keyframes ts-drift { 0% { transform: translate(var(--x0), var(--y0)); } 60%, 100% { transform: translate(0, 0); } }
@keyframes ts-count { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
@keyframes ts-count2 { 0%, 45% { opacity: 0; } 50%, 95% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ts-shake { 0%, 70%, 100% { transform: rotate(0); } 75% { transform: rotate(-8deg); } 85% { transform: rotate(8deg); } }
.ts-slide { animation: ts-slide 3.6s linear infinite; }
.ts-fade { animation: ts-fade 2.4s ease-in-out infinite; }
.ts-pop { transform-origin: center; animation: ts-pop 3s cubic-bezier(.2,.7,.2,1) infinite alternate; }
.ts-drift { animation: ts-drift 4s cubic-bezier(.2,.7,.2,1) infinite alternate; }
.ts-count { animation: ts-count 3s steps(1) infinite; }
.ts-count2 { animation: ts-count2 3s steps(1) infinite; }
.ts-shake { transform-origin: center top; animation: ts-shake 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ts * { animation: none !important; } .ts .ts-count2 { opacity: 0; } }
`

export function TopicSceneStyles() {
    return <style>{MOTION}</style>
}

const d = (s: number) => ({ animationDelay: `${s}s` })

const SCENES: Record<IncidentTopicId, () => React.ReactElement> = {
    serverless: () => (
        <>
            <rect x={20} y={40} width={50} height={40} rx={8} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
            <rect x={170} y={30} width={90} height={60} rx={10} fill="none" stroke="currentColor" strokeWidth={1.5} />
            <line x1={70} y1={60} x2={170} y2={60} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 5" opacity={0.5} />
            {[0, 1.2, 2.4].map((t) => <circle key={t} className="ts-slide" cx={72} cy={60} r={4} fill="currentColor" style={{ ...d(t), ["--d" as string]: "94px" }} />)}
            <rect x={182} y={48} width={66} height={7} rx={3.5} fill="currentColor" opacity={0.15} />
            <rect className="ts-fade" x={182} y={48} width={40} height={7} rx={3.5} fill="currentColor" />
            <text x={182} y={76} fontSize={9} fill="currentColor" opacity={0.6} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>30 s</text>
        </>
    ),
    databases: () => (
        <>
            <rect x={60} y={20} width={160} height={84} rx={10} fill="none" stroke="currentColor" strokeWidth={1.5} />
            <line x1={60} y1={40} x2={220} y2={40} stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
            {[0, 1, 2].map((i) => <rect key={i} x={72} y={50 + i * 16} width={136} height={6} rx={3} fill="currentColor" opacity={0.2} />)}
            <g className="ts-pop"><rect x={176} y={24} width={36} height={12} rx={4} fill="currentColor" /></g>
            <text x={72} y={34} fontSize={8.5} fill="currentColor" opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>250M rows</text>
        </>
    ),
    queues: () => (
        <>
            <line x1={20} y1={90} x2={260} y2={90} stroke="currentColor" strokeWidth={1.5} opacity={0.4} />
            {[0, 1, 2, 3].map((i) => (
                <rect key={i} className="ts-slide" x={20} y={62} width={26} height={24} rx={5} fill="none" stroke="currentColor" strokeWidth={1.5} style={{ ...d(i * 0.9), ["--d" as string]: "210px" }} />
            ))}
            <circle cx={140} cy={36} r={14} fill="none" stroke="currentColor" strokeWidth={1.5} />
            <path d="M140 28 v8 l6 4" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </>
    ),
    auth: () => (
        <>
            <circle cx={110} cy={60} r={22} fill="none" stroke="currentColor" strokeWidth={1.5} />
            <circle cx={110} cy={60} r={7} fill="currentColor" />
            <line x1={132} y1={60} x2={200} y2={60} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            <line x1={184} y1={60} x2={184} y2={72} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            <line x1={198} y1={60} x2={198} y2={70} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            <circle className="ts-fade" cx={230} cy={40} r={8} fill="currentColor" opacity={0.4} />
        </>
    ),
    ai: () => (
        <>
            <circle cx={150} cy={62} r={34} fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray="3 5" opacity={0.5} />
            {[[-60, -30], [70, -26], [-50, 34], [66, 30], [8, -48], [-8, 46]].map(([x, y], i) => (
                <circle key={i} className="ts-drift" cx={150 + (i % 3) * 8 - 8} cy={62 + (i % 2) * 8 - 4} r={4.5} fill="currentColor" style={{ ...d(i * 0.2), ["--x0" as string]: `${x}px`, ["--y0" as string]: `${y}px` }} />
            ))}
            <text x={20} y={112} fontSize={9} fill="currentColor" opacity={0.6} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>similarity 0.92</text>
        </>
    ),
    frontend: () => (
        <>
            <rect x={70} y={34} width={140} height={52} rx={26} fill="none" stroke="currentColor" strokeWidth={1.5} />
            <path d="M104 52 c-6 -8 -18 -2 -14 6 l14 12 l14 -12 c4 -8 -8 -14 -14 -6 z" fill="currentColor" />
            <text className="ts-count" x={150} y={66} fontSize={18} fill="currentColor" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>11</text>
            <text className="ts-count2" x={150} y={66} fontSize={18} fill="currentColor" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>12</text>
            <line x1={90} y1={104} x2={190} y2={104} stroke="currentColor" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.4} />
        </>
    ),
    security: () => (
        <>
            <g className="ts-shake">
                <path d="M122 50 v-12 a18 18 0 0 1 36 0 v12" fill="none" stroke="currentColor" strokeWidth={4} />
                <rect x={112} y={50} width={56} height={46} rx={9} fill="currentColor" />
                <circle cx={140} cy={70} r={5} className="fill-white dark:fill-neutral-950" />
            </g>
            {[0, 1, 2].map((i) => <rect key={i} className="ts-fade" x={200} y={44 + i * 14} width={50} height={6} rx={3} fill="currentColor" style={d(i * 0.4)} />)}
        </>
    ),
}

export function TopicScene({ topic, className }: { topic: IncidentTopicId; className?: string }) {
    const Scene = SCENES[topic]
    return (
        <svg viewBox="0 0 280 120" aria-hidden className={cn("ts h-auto w-full", className)}>
            <Scene />
        </svg>
    )
}
