/**
 * The animated pipeline in the /hire hero (plan/web/revamp REV-102): candidate dots
 * leave the applicant pool, pass through four rounds, and either stop at a hard gate
 * (they drop and fade) or reach the shortlist. It is the product's whole promise in
 * one picture, drawn with the pipeline builder's own labels (apps/hiring/types/
 * pipeline.ts, seed/hiring-pipelines.ts): Aptitude and Coding (DSA) are hard gates at
 * 60, System design and the voice round advisory.
 *
 * Pure SVG + CSS: each dot rides the same `offset-path`, some to the end, some only
 * to a gate. Reduced motion shows a still frame. Server component, no JS.
 */

const PATH = "M130 120 H 950"
// Where along the path (0..1) the two hard gates sit.
const GATE_1 = 0.26
const GATE_2 = 0.49

type Dot = { delay: number; fate: "pass" | "gate1" | "gate2" }

const DOTS: Dot[] = [
    { delay: 0, fate: "pass" },
    { delay: 0.8, fate: "gate1" },
    { delay: 1.6, fate: "gate2" },
    { delay: 2.4, fate: "pass" },
    { delay: 3.2, fate: "gate1" },
    { delay: 4.0, fate: "pass" },
    { delay: 4.8, fate: "gate2" },
    { delay: 5.6, fate: "gate1" },
    { delay: 6.4, fate: "pass" },
    { delay: 7.2, fate: "gate1" },
]

const ROUNDS = [
    { x: 190, title: "Aptitude", tag: "HARD 60" },
    { x: 380, title: "Coding (DSA)", tag: "HARD 60" },
    { x: 570, title: "System design", tag: "ADV" },
    { x: 760, title: "Voice round", tag: "ADV" },
]

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`

const STYLES = `
@keyframes gf-pass { 0% { offset-distance: 0%; opacity: 0; } 4% { opacity: 1; } 92% { offset-distance: 100%; opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
@keyframes gf-gate1 { 0% { offset-distance: 0%; opacity: 0; translate: 0 0; } 4% { opacity: 1; } 30% { offset-distance: ${pct(GATE_1)}; translate: 0 0; opacity: 1; } 45% { offset-distance: ${pct(GATE_1)}; translate: 0 34px; opacity: 0; } 100% { offset-distance: ${pct(GATE_1)}; opacity: 0; } }
@keyframes gf-gate2 { 0% { offset-distance: 0%; opacity: 0; translate: 0 0; } 4% { opacity: 1; } 52% { offset-distance: ${pct(GATE_2)}; translate: 0 0; opacity: 1; } 66% { offset-distance: ${pct(GATE_2)}; translate: 0 34px; opacity: 0; } 100% { offset-distance: ${pct(GATE_2)}; opacity: 0; } }
@keyframes gf-flash { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
@keyframes gf-count { 0%,20% { opacity: 0; transform: scale(0.4); } 30%,100% { opacity: 1; transform: scale(1); } }
.gf-dot { offset-path: path("${PATH}"); offset-rotate: 0deg; animation-duration: 8s; animation-iteration-count: infinite; animation-timing-function: linear; animation-fill-mode: both; }
.gf-pass { animation-name: gf-pass; }
.gf-gate1 { animation-name: gf-gate1; }
.gf-gate2 { animation-name: gf-gate2; }
.gf-flash { animation: gf-flash 2s ease-in-out infinite; }
.gf-count { transform-box: fill-box; transform-origin: center; animation: gf-count 8s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gf-dot { animation: none; offset-distance: 60%; opacity: 1; }
  .gf-flash, .gf-count { animation: none; opacity: 1; }
}
`

export function GateFlow() {
    return (
        <>
            <style>{STYLES}</style>
            <svg viewBox="0 36 1100 172" className="h-auto w-full" aria-hidden>
                {/* Applicant pool */}
                <text x="40" y="58" fill="#a3a3a3" fontSize="12" style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.12em" }}>APPLICANTS</text>
                {Array.from({ length: 12 }).map((_, i) => (
                    <circle key={i} cx={52 + (i % 4) * 16} cy={90 + Math.floor(i / 4) * 16} r="5" fill="#fafafa" opacity={0.35 + (i % 3) * 0.2} />
                ))}

                {/* The track */}
                <path d={PATH} stroke="#404040" strokeWidth="2" strokeDasharray="4 8" fill="none" />

                {/* Rounds */}
                {ROUNDS.map((r) => (
                    <g key={r.title}>
                        <rect x={r.x} y="88" width="140" height="64" rx="12" fill="#171717" stroke="#404040" strokeWidth="1.5" />
                        <text x={r.x + 16} y="116" fill="#fafafa" fontSize="15" fontWeight="600">{r.title}</text>
                        <text x={r.x + 16} y="138" fill={r.tag.startsWith("HARD") ? "#F2C9C4" : "#A8D5BA"} fontSize="11" style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.1em" }}>{r.tag}</text>
                    </g>
                ))}

                {/* Hard gates, just after the first two rounds */}
                {[GATE_1, GATE_2].map((g, i) => {
                    const x = 130 + (950 - 130) * g
                    return (
                        <g key={i} className="gf-flash" style={{ animationDelay: `${i}s` }}>
                            <line x1={x} x2={x} y1="76" y2="164" stroke="#F2C9C4" strokeWidth="2.5" strokeLinecap="round" />
                            <text x={x} y="190" textAnchor="middle" fill="#F2C9C4" fontSize="11" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>gate</text>
                        </g>
                    )
                })}

                {/* Candidates */}
                {DOTS.map((dot, i) => (
                    <circle key={i} r="7" fill={dot.fate === "pass" ? "#A8D5BA" : "#fafafa"} className={`gf-dot gf-${dot.fate}`} style={{ animationDelay: `${dot.delay}s` }} />
                ))}

                {/* Shortlist */}
                <rect x="960" y="72" width="120" height="96" rx="14" fill="#A8D5BA" />
                <text x="976" y="100" fill="#171717" fontSize="11" style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.12em" }}>SHORTLIST</text>
                {[0, 1, 2, 3].map((i) => (
                    <circle key={i} className="gf-count" cx={988 + i * 20} cy="140" r="7" fill="#171717" style={{ animationDelay: `${i * 2 + 1}s` }} />
                ))}
            </svg>
        </>
    )
}
