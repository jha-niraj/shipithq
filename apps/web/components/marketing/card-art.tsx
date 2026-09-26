/**
 * The animated art at the top of a module card, a feature page hero and a step
 * card (plan/web/revamp REV-75). One scene per module, each showing what that module
 * actually does, instead of the same stacked cards with a different label:
 *
 *   projects         a sprint board; a task card moves from Doing to Done
 *   practice         an editor; code types in, then the tests pass one by one
 *   ai               a resume; a scan line reads it and the ATS ring fills
 *   jobs             a stack of roles; the top one swipes and a match bar fills
 *   mock             a microphone; a live voice waveform
 *   hire-pipelines   rounds joined by a line; a candidate travels through the gates
 *   hire-questions   a question card; the options highlight in turn
 *   hire-jobs        a job post; the status flips to Live
 *   hire-candidates  a board; candidates move from Applied to Shortlisted
 *   hire-team        teammates join around a workspace
 *   uni-students     a roster; each student's readiness bar fills
 *   uni-classes      class tiles; an assignment drops into each in turn
 *   uni-faculty      a faculty card; its role chips switch
 *   uni-placements   a funnel: many in, eligible, shortlisted, one placed
 *   uni-analytics    bars rise beside a completion ring
 *   pricing          credit coins stack up
 *   compare          a balance settles
 *   about            a small team around a desk
 *   guides           an open book; its lines write in
 *   ideas            a bulb that lights, with a vote counting up
 *   changelog        a timeline; each release lands in turn
 *
 * Pure SVG and CSS keyframes, so it is a server component and ships no JS. Every
 * moving part uses `transform-box: fill-box` so transforms are relative to the shape.
 * `prefers-reduced-motion` freezes each scene on a finished frame.
 *
 * Colour is two inks: the card's ink and its surface. On the dark card they flip.
 */

export type ArtKind =
    | "projects" | "practice" | "ai" | "jobs" | "mock"
    | "hire-pipelines" | "hire-questions" | "hire-jobs" | "hire-candidates" | "hire-team"
    | "uni-students" | "uni-classes" | "uni-faculty" | "uni-placements" | "uni-analytics"
    | "pricing" | "compare" | "about" | "guides" | "ideas" | "changelog"

const STYLES = `
.ca * { transform-box: fill-box; }
@keyframes ca-move { 0%,20% { transform: translate(0,0); } 45%,80% { transform: translate(var(--dx),0); } 100% { transform: translate(0,0); } }
@keyframes ca-fade { 0%,40% { opacity: 0; } 55%,85% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ca-grow { 0% { transform: scaleX(0); } 60%,100% { transform: scaleX(1); } }
@keyframes ca-pop { 0%,100% { transform: scale(0.6); opacity: 0.35; } 50% { transform: scale(1); opacity: 1; } }
@keyframes ca-scan { 0% { transform: translateY(0); } 100% { transform: translateY(96px); } }
@keyframes ca-ring { 0% { stroke-dashoffset: 132; } 70%,100% { stroke-dashoffset: 19; } }
@keyframes ca-wave { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
@keyframes ca-pulse { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
@keyframes ca-swipe { 0%,30% { transform: translate(0,0) rotate(0); opacity: 1; } 50% { transform: translate(-70px,-4px) rotate(-10deg); opacity: 0; } 51% { transform: translate(0,0); opacity: 0; } 70%,100% { opacity: 1; transform: translate(0,0); } }
@keyframes ca-travel { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
@keyframes ca-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes ca-flip { 0%,45% { opacity: 1; } 50%,95% { opacity: 0; } 100% { opacity: 1; } }
@keyframes ca-flip2 { 0%,45% { opacity: 0; } 50%,95% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ca-drop { 0% { transform: translateY(-40px); opacity: 0; } 35%,100% { transform: translateY(0); opacity: 1; } }
@keyframes ca-tilt { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(4deg); } }
@keyframes ca-glow { 0%,100% { opacity: 0.15; } 50% { opacity: 0.55; } }
@keyframes ca-join { 0%,15% { transform: translate(var(--dx),var(--dy)) scale(0.4); opacity: 0; } 45%,100% { transform: translate(0,0) scale(1); opacity: 1; } }
.ca-move { animation: ca-move 5s cubic-bezier(.6,0,.2,1) infinite; }
.ca-fade { animation: ca-fade 5s ease infinite; }
.ca-grow { transform-origin: left center; animation: ca-grow 3.2s cubic-bezier(.2,.7,.2,1) infinite alternate; }
.ca-pop { transform-origin: center; animation: ca-pop 2.4s ease-in-out infinite; }
.ca-scan { animation: ca-scan 2.8s ease-in-out infinite alternate; }
.ca-ring { stroke-dasharray: 132; animation: ca-ring 3.6s cubic-bezier(.2,.7,.2,1) infinite alternate; }
.ca-wave { transform-origin: center; animation: ca-wave 1.1s ease-in-out infinite; }
.ca-pulse { transform-origin: center; animation: ca-pulse 2s ease-out infinite; }
.ca-swipe { transform-origin: bottom center; animation: ca-swipe 4.5s ease-in-out infinite; }
.ca-travel { animation: ca-travel 4.5s cubic-bezier(.5,0,.5,1) infinite; }
.ca-blink { animation: ca-blink 1s steps(1) infinite; }
.ca-flip { animation: ca-flip 4s ease infinite; }
.ca-flip2 { animation: ca-flip2 4s ease infinite; }
.ca-drop { animation: ca-drop 3.6s cubic-bezier(.3,1.4,.5,1) infinite; }
.ca-tilt { transform-origin: center top; animation: ca-tilt 4s ease-in-out infinite; }
.ca-glow { animation: ca-glow 2.4s ease-in-out infinite; }
.ca-join { animation: ca-join 4s cubic-bezier(.2,.7,.2,1) infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .ca * { animation: none !important; }
  .ca .ca-fade, .ca .ca-flip2 { opacity: 1; }
  .ca .ca-flip { opacity: 0; }
}
`

/** Mounted once per page; duplicate <style> tags are harmless but this keeps them out. */
export function CardArtStyles() {
    return <style>{STYLES}</style>
}

type Ink = { fg: string; bg: string; soft: string; faint: string }

const d = (s: number) => ({ animationDelay: `${s}s` })

function Projects({ k }: { k: Ink }) {
    const cols = [{ x: 22, label: "To do" }, { x: 106, label: "Doing" }, { x: 190, label: "Done" }]
    return (
        <>
            {cols.map((c) => (
                <g key={c.label}>
                    <rect x={c.x} y={26} width={70} height={150} rx={10} fill={k.faint} />
                    <text x={c.x + 10} y={44} fontSize={10} fill={k.fg} opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{c.label}</text>
                </g>
            ))}
            <rect x={30} y={54} width={54} height={30} rx={6} fill={k.bg} stroke={k.fg} strokeWidth={1.4} />
            <rect x={30} y={92} width={54} height={30} rx={6} fill={k.bg} stroke={k.fg} strokeWidth={1.4} opacity={0.7} />
            <rect x={198} y={54} width={54} height={30} rx={6} fill={k.bg} stroke={k.fg} strokeWidth={1.4} />
            <path d="M210 69 l5 5 l10 -10" stroke={k.fg} strokeWidth={2} fill="none" strokeLinecap="round" />
            {/* the card that moves Doing -> Done */}
            <g className="ca-move" style={{ ["--dx" as string]: "84px" }}>
                <rect x={114} y={92} width={54} height={30} rx={6} fill={k.fg} />
                <rect x={122} y={102} width={30} height={3} rx={1.5} fill={k.bg} />
                <rect x={122} y={110} width={20} height={3} rx={1.5} fill={k.bg} opacity={0.7} />
            </g>
            <path className="ca-fade" d="M210 107 l5 5 l10 -10" stroke={k.fg} strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
    )
}

function Practice({ k }: { k: Ink }) {
    const lines = [52, 96, 74, 110, 60]
    return (
        <>
            <rect x={24} y={20} width={232} height={160} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <circle cx={40} cy={34} r={3} fill={k.fg} opacity={0.5} />
            <circle cx={50} cy={34} r={3} fill={k.fg} opacity={0.5} />
            <circle cx={60} cy={34} r={3} fill={k.fg} opacity={0.5} />
            <line x1={24} x2={256} y1={46} y2={46} stroke={k.fg} strokeWidth={1} opacity={0.2} />
            {lines.map((w, i) => (
                <rect key={i} className="ca-grow" style={d(i * 0.25)} x={42 + (i % 2) * 12} y={58 + i * 14} width={w} height={5} rx={2.5} fill={k.fg} opacity={0.75} />
            ))}
            <rect className="ca-blink" x={168} y={114} width={2} height={9} fill={k.fg} />
            <line x1={24} x2={256} y1={140} y2={140} stroke={k.fg} strokeWidth={1} opacity={0.2} />
            {Array.from({ length: 10 }).map((_, i) => (
                <circle key={i} className="ca-pop" style={d(i * 0.18)} cx={46 + i * 16} cy={160} r={5} fill={k.fg} />
            ))}
        </>
    )
}

function Ai({ k }: { k: Ink }) {
    return (
        <>
            <rect x={36} y={18} width={120} height={164} rx={8} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <circle cx={58} cy={42} r={10} fill={k.faint} stroke={k.fg} strokeWidth={1.2} />
            <rect x={74} y={36} width={60} height={5} rx={2.5} fill={k.fg} />
            <rect x={74} y={46} width={40} height={4} rx={2} fill={k.fg} opacity={0.5} />
            {[68, 80, 92, 112, 124, 136, 156, 168].map((y, i) => (
                <rect key={y} x={50} y={y} width={i % 3 === 2 ? 60 : 92} height={4} rx={2} fill={k.fg} opacity={0.45} />
            ))}
            <rect className="ca-scan" x={40} y={62} width={112} height={14} rx={3} fill={k.fg} opacity={0.12} />
            <g transform="translate(206 100)">
                <circle r={21} fill="none" stroke={k.fg} strokeWidth={6} opacity={0.12} />
                <circle className="ca-ring" r={21} fill="none" stroke={k.fg} strokeWidth={6} strokeLinecap="round" transform="rotate(-90)" />
                <text x={0} y={5} textAnchor="middle" fontSize={14} fontWeight={600} fill={k.fg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>86</text>
            </g>
            <text x={206} y={144} textAnchor="middle" fontSize={9} fill={k.fg} opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>ATS</text>
        </>
    )
}

function Jobs({ k }: { k: Ink }) {
    return (
        <>
            <rect x={78} y={40} width={132} height={120} rx={12} fill={k.faint} transform="rotate(6 144 100)" />
            <rect x={74} y={36} width={132} height={120} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.2} opacity={0.8} transform="rotate(-4 140 96)" />
            <g className="ca-swipe">
                <rect x={70} y={30} width={140} height={130} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
                <rect x={86} y={46} width={22} height={22} rx={6} fill={k.fg} />
                <rect x={116} y={48} width={70} height={6} rx={3} fill={k.fg} />
                <rect x={116} y={60} width={46} height={4} rx={2} fill={k.fg} opacity={0.5} />
                <rect x={86} y={84} width={100} height={4} rx={2} fill={k.fg} opacity={0.35} />
                <rect x={86} y={94} width={80} height={4} rx={2} fill={k.fg} opacity={0.35} />
                <rect x={86} y={120} width={108} height={8} rx={4} fill={k.fg} opacity={0.15} />
                <rect className="ca-grow" x={86} y={120} width={82} height={8} rx={4} fill={k.fg} />
                <text x={86} y={146} fontSize={9} fill={k.fg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>76% match</text>
            </g>
        </>
    )
}

function Mock({ k }: { k: Ink }) {
    const bars = [18, 34, 52, 70, 44, 62, 30, 56, 40, 24, 46, 20]
    return (
        <>
            <circle className="ca-pulse" cx={62} cy={100} r={26} fill="none" stroke={k.fg} strokeWidth={1.5} />
            <circle className="ca-pulse" style={d(1)} cx={62} cy={100} r={26} fill="none" stroke={k.fg} strokeWidth={1.5} />
            <circle cx={62} cy={100} r={26} fill={k.fg} />
            <rect x={56} y={86} width={12} height={20} rx={6} fill={k.bg} />
            <path d="M51 100 a11 11 0 0 0 22 0 M62 111 v6" stroke={k.bg} strokeWidth={2} fill="none" strokeLinecap="round" />
            {bars.map((h, i) => (
                <rect key={i} className="ca-wave" style={d(i * 0.09)} x={112 + i * 12} y={100 - h / 2} width={6} height={h} rx={3} fill={k.fg} />
            ))}
        </>
    )
}

function HirePipelines({ k }: { k: Ink }) {
    const nodes = [40, 106, 172, 238]
    const path = "M40 100 L238 100"
    return (
        <>
            <path d={path} stroke={k.fg} strokeWidth={2} strokeDasharray="4 6" opacity={0.4} />
            {nodes.map((x, i) => (
                <g key={x}>
                    <circle cx={x} cy={100} r={18} fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
                    <text x={x} y={104} textAnchor="middle" fontSize={11} fontWeight={600} fill={k.fg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{i + 1}</text>
                    <text x={x} y={138} textAnchor="middle" fontSize={8} fill={k.fg} opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{i < 2 ? "HARD" : "ADV"}</text>
                </g>
            ))}
            <circle className="ca-travel" r={7} fill={k.fg} style={{ offsetPath: `path("${path}")` } as React.CSSProperties} />
        </>
    )
}

function HireQuestions({ k }: { k: Ink }) {
    return (
        <>
            <rect x={56} y={30} width={168} height={142} rx={12} fill={k.faint} transform="rotate(5 140 100)" />
            <rect x={52} y={26} width={168} height={146} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <text x={68} y={48} fontSize={9} fill={k.fg} opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>Q 7 / 20</text>
            <rect x={68} y={58} width={120} height={6} rx={3} fill={k.fg} />
            <rect x={68} y={70} width={80} height={6} rx={3} fill={k.fg} opacity={0.6} />
            {["A", "B", "C"].map((l, i) => (
                <g key={l}>
                    <rect className="ca-pop" style={{ ...d(i * 0.8), animationDuration: "2.4s" }} x={66} y={88 + i * 24} width={138} height={18} rx={5} fill={k.fg} opacity={0.15} />
                    <rect x={66} y={88 + i * 24} width={138} height={18} rx={5} fill="none" stroke={k.fg} strokeWidth={1.2} />
                    <text x={74} y={100 + i * 24} fontSize={9} fontWeight={600} fill={k.fg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{l}</text>
                    <rect x={88} y={95 + i * 24} width={60 + i * 18} height={4} rx={2} fill={k.fg} opacity={0.5} />
                </g>
            ))}
        </>
    )
}

function HireJobs({ k }: { k: Ink }) {
    return (
        <>
            <rect x={40} y={28} width={200} height={144} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <rect x={56} y={44} width={28} height={28} rx={7} fill={k.fg} />
            <rect x={94} y={46} width={90} height={7} rx={3.5} fill={k.fg} />
            <rect x={94} y={60} width={60} height={5} rx={2.5} fill={k.fg} opacity={0.5} />
            {[88, 100, 112].map((y, i) => <rect key={y} x={56} y={y} width={i === 2 ? 110 : 160} height={4} rx={2} fill={k.fg} opacity={0.35} />)}
            <line x1={40} x2={240} y1={134} y2={134} stroke={k.fg} strokeWidth={1} opacity={0.2} />
            <g className="ca-flip">
                <rect x={56} y={144} width={52} height={16} rx={8} fill="none" stroke={k.fg} strokeWidth={1.2} />
                <text x={82} y={155} textAnchor="middle" fontSize={8} fill={k.fg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>DRAFT</text>
            </g>
            <g className="ca-flip2">
                <rect x={56} y={144} width={52} height={16} rx={8} fill={k.fg} />
                <circle className="ca-pop" cx={66} cy={152} r={3} fill={k.bg} />
                <text x={86} y={155} textAnchor="middle" fontSize={8} fill={k.bg} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>LIVE</text>
            </g>
            <rect x={176} y={144} width={48} height={16} rx={5} fill={k.fg} opacity={0.12} />
        </>
    )
}

function HireCandidates({ k }: { k: Ink }) {
    const cols = [{ x: 22, label: "Applied" }, { x: 106, label: "Review" }, { x: 190, label: "Shortlist" }]
    return (
        <>
            {cols.map((c) => (
                <g key={c.label}>
                    <rect x={c.x} y={26} width={70} height={150} rx={10} fill={k.faint} />
                    <text x={c.x + 10} y={44} fontSize={9} fill={k.fg} opacity={0.7} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{c.label}</text>
                </g>
            ))}
            {[0, 1, 2].map((i) => (
                <g key={i}>
                    <circle cx={42} cy={70 + i * 32} r={10} fill={k.bg} stroke={k.fg} strokeWidth={1.3} opacity={0.8} />
                    <rect x={56} y={67 + i * 32} width={26} height={5} rx={2.5} fill={k.fg} opacity={0.4} />
                </g>
            ))}
            <g className="ca-move" style={{ ["--dx" as string]: "168px" }}>
                <circle cx={42} cy={134} r={10} fill={k.fg} />
                <rect x={56} y={131} width={26} height={5} rx={2.5} fill={k.fg} />
            </g>
            <circle cx={210} cy={70} r={10} fill={k.fg} />
            <rect x={224} y={67} width={26} height={5} rx={2.5} fill={k.fg} />
        </>
    )
}

function HireTeam({ k }: { k: Ink }) {
    const seats = [
        { x: 140, y: 42, dx: "0px", dy: "-30px" },
        { x: 202, y: 100, dx: "30px", dy: "0px" },
        { x: 140, y: 158, dx: "0px", dy: "30px" },
        { x: 78, y: 100, dx: "-30px", dy: "0px" },
    ]
    return (
        <>
            <circle cx={140} cy={100} r={58} fill="none" stroke={k.fg} strokeWidth={1.2} strokeDasharray="3 6" opacity={0.4} />
            <rect x={116} y={78} width={48} height={44} rx={10} fill={k.fg} />
            <path d="M128 100 h24 M140 88 v24" stroke={k.bg} strokeWidth={2.4} strokeLinecap="round" />
            {seats.map((s, i) => (
                <g key={i} className="ca-join" style={{ ...d(i * 0.5), ["--dx" as string]: s.dx, ["--dy" as string]: s.dy }}>
                    <circle cx={s.x} cy={s.y} r={15} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
                    <circle cx={s.x} cy={s.y - 4} r={4.5} fill={k.fg} />
                    <path d={`M${s.x - 8} ${s.y + 9} a8 7 0 0 1 16 0`} fill={k.fg} />
                </g>
            ))}
        </>
    )
}


const MONO_FONT = { fontFamily: "var(--font-geist-mono), monospace" }

function Pricing({ k }: { k: Ink }) {
    return (
        <>
            {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} className="ca-drop" style={d(i * 0.35)}>
                    <ellipse cx={110} cy={160 - i * 16} rx={34} ry={10} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
                    <path d={`M76 ${160 - i * 16} v6 a34 10 0 0 0 68 0 v-6`} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
                </g>
            ))}
            <rect x={170} y={52} width={80} height={96} rx={10} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <text x={184} y={80} fontSize={10} fill={k.fg} opacity={0.7} style={MONO_FONT}>CREDITS</text>
            <text x={184} y={112} fontSize={26} fontWeight={600} fill={k.fg} style={MONO_FONT}>100</text>
            <rect className="ca-grow" x={184} y={126} width={52} height={5} rx={2.5} fill={k.fg} />
        </>
    )
}

function Compare({ k }: { k: Ink }) {
    return (
        <>
            <path d="M140 40 v130 M110 172 h60" stroke={k.fg} strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={140} cy={40} r={6} fill={k.fg} />
            <g className="ca-tilt" style={{ transformBox: "view-box", transformOrigin: "140px 48px" } as React.CSSProperties}>
                <line x1={60} x2={220} y1={48} y2={48} stroke={k.fg} strokeWidth={2.4} strokeLinecap="round" />
                <path d="M60 48 l-22 50 h44 z" fill="none" stroke={k.fg} strokeWidth={1.4} />
                <path d="M220 48 l-22 50 h44 z" fill="none" stroke={k.fg} strokeWidth={1.4} />
                <path d="M38 98 a22 10 0 0 0 44 0" fill={k.fg} />
                <path d="M198 98 a22 10 0 0 0 44 0" fill={k.faint} stroke={k.fg} strokeWidth={1.4} />
            </g>
        </>
    )
}

function About({ k }: { k: Ink }) {
    const people = [70, 140, 210]
    return (
        <>
            <rect x={36} y={130} width={208} height={12} rx={6} fill={k.fg} />
            {people.map((x, i) => (
                <g key={x} className="ca-pop" style={{ ...d(i * 0.4), animationDuration: "3s" }}>
                    <circle cx={x} cy={78} r={16} fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
                    <path d={`M${x - 26} 128 a26 22 0 0 1 52 0`} fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
                </g>
            ))}
            <rect x={122} y={112} width={36} height={18} rx={3} fill={k.bg} stroke={k.fg} strokeWidth={1.2} />
            <rect className="ca-blink" x={128} y={118} width={12} height={2} fill={k.fg} />
        </>
    )
}

function Guides({ k }: { k: Ink }) {
    return (
        <>
            <path d="M140 52 C 110 40 70 40 40 52 V 162 C 70 150 110 150 140 162 Z" fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
            <path d="M140 52 C 170 40 210 40 240 52 V 162 C 210 150 170 150 140 162 Z" fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
            {[70, 84, 98, 112, 126].map((y, i) => (
                <rect key={y} className="ca-grow" style={d(i * 0.3)} x={56} y={y} width={i === 4 ? 44 : 68} height={4} rx={2} fill={k.fg} opacity={0.6} />
            ))}
            {[70, 84, 98, 112, 126].map((y, i) => (
                <rect key={y} className="ca-grow" style={d(1.5 + i * 0.3)} x={156} y={y} width={i === 2 ? 40 : 68} height={4} rx={2} fill={k.fg} opacity={0.6} />
            ))}
        </>
    )
}

function Ideas({ k }: { k: Ink }) {
    return (
        <>
            <circle className="ca-glow" cx={110} cy={86} r={52} fill={k.fg} />
            <path d="M94 124 a32 32 0 1 1 32 0 v14 h-32 z" fill={k.bg} stroke={k.fg} strokeWidth={1.8} />
            <path d="M98 146 h24 M101 154 h18" stroke={k.fg} strokeWidth={2} strokeLinecap="round" />
            <path d="M104 118 l6 -16 l6 16" stroke={k.fg} strokeWidth={1.6} fill="none" />
            <rect x={178} y={70} width={52} height={60} rx={10} fill={k.bg} stroke={k.fg} strokeWidth={1.6} />
            <path d="M196 92 l8 -8 l8 8" stroke={k.fg} strokeWidth={2} fill="none" strokeLinecap="round" />
            <g className="ca-flip"><text x={204} y={116} textAnchor="middle" fontSize={14} fontWeight={600} fill={k.fg} style={MONO_FONT}>41</text></g>
            <g className="ca-flip2"><text x={204} y={116} textAnchor="middle" fontSize={14} fontWeight={600} fill={k.fg} style={MONO_FONT}>42</text></g>
        </>
    )
}

function Changelog({ k }: { k: Ink }) {
    const rows = [44, 84, 124, 164]
    return (
        <>
            <line x1={70} x2={70} y1={30} y2={180} stroke={k.fg} strokeWidth={1.6} opacity={0.4} />
            {rows.map((y, i) => (
                <g key={y} className="ca-drop" style={d(i * 0.45)}>
                    <circle cx={70} cy={y} r={7} fill={i === 0 ? k.fg : k.bg} stroke={k.fg} strokeWidth={1.6} />
                    <rect x={90} y={y - 10} width={140} height={20} rx={6} fill={k.bg} stroke={k.fg} strokeWidth={1.2} />
                    <rect x={100} y={y - 2} width={i % 2 ? 70 : 100} height={4} rx={2} fill={k.fg} opacity={0.6} />
                </g>
            ))}
        </>
    )
}

function UniStudents({ k }: { k: Ink }) {
    const rows = [0.82, 0.55, 0.94, 0.4, 0.7]
    return (
        <>
            <rect x={30} y={22} width={220} height={156} rx={12} fill={k.faint} />
            <text x={44} y={42} fontSize={9} fill={k.fg} opacity={0.7} style={MONO_FONT}>Roster · readiness</text>
            {rows.map((w, i) => (
                <g key={i}>
                    <circle cx={52} cy={62 + i * 24} r={8} fill={k.bg} stroke={k.fg} strokeWidth={1.3} />
                    <rect x={66} y={58 + i * 24} width={52} height={5} rx={2.5} fill={k.fg} opacity={0.45} />
                    <rect x={130} y={57 + i * 24} width={106} height={8} rx={4} fill={k.fg} opacity={0.1} />
                    <rect className="ca-grow" x={130} y={57 + i * 24} width={106 * w} height={8} rx={4} fill={k.fg} style={d(i * 0.25)} />
                </g>
            ))}
        </>
    )
}

function UniClasses({ k }: { k: Ink }) {
    const tiles = [{ x: 40, y: 70 }, { x: 110, y: 70 }, { x: 180, y: 70 }, { x: 40, y: 130 }, { x: 110, y: 130 }, { x: 180, y: 130 }]
    return (
        <>
            <rect x={112} y={16} width={56} height={30} rx={8} fill={k.fg} />
            <path d="M124 31 h32 M124 38 h20" stroke={k.bg} strokeWidth={2.4} strokeLinecap="round" />
            {tiles.map((t, i) => (
                <g key={i}>
                    <rect x={t.x} y={t.y} width={60} height={44} rx={9} fill={k.faint} />
                    <rect x={t.x + 10} y={t.y + 10} width={26} height={4} rx={2} fill={k.fg} opacity={0.5} />
                    <g className="ca-drop" style={d(i * 0.35)}>
                        <rect x={t.x + 10} y={t.y + 22} width={40} height={12} rx={4} fill={k.fg} />
                        <path d={`M${t.x + 16} ${t.y + 28} l3 3 l6 -6`} stroke={k.bg} strokeWidth={1.6} fill="none" strokeLinecap="round" />
                    </g>
                </g>
            ))}
        </>
    )
}

function UniFaculty({ k }: { k: Ink }) {
    return (
        <>
            <rect x={60} y={30} width={160} height={140} rx={14} fill={k.faint} />
            <circle cx={140} cy={70} r={20} fill={k.bg} stroke={k.fg} strokeWidth={1.5} />
            <circle cx={140} cy={64} r={7} fill={k.fg} />
            <path d="M127 83 a13 11 0 0 1 26 0" fill={k.fg} />
            <rect x={104} y={102} width={72} height={6} rx={3} fill={k.fg} opacity={0.55} />
            <g className="ca-flip">
                <rect x={92} y={122} width={96} height={24} rx={12} fill={k.fg} />
                <text x={140} y={138} fontSize={10} textAnchor="middle" fill={k.bg} style={MONO_FONT}>Class teacher</text>
            </g>
            <g className="ca-flip2">
                <rect x={92} y={122} width={96} height={24} rx={12} fill={k.bg} stroke={k.fg} strokeWidth={1.4} />
                <text x={140} y={138} fontSize={10} textAnchor="middle" fill={k.fg} style={MONO_FONT}>Placement cell</text>
            </g>
        </>
    )
}

function UniPlacements({ k }: { k: Ink }) {
    const stages = [{ x: 30, n: 7, label: "Students" }, { x: 110, n: 4, label: "Eligible" }, { x: 190, n: 2, label: "Shortlist" }]
    return (
        <>
            {stages.map((s) => (
                <g key={s.label}>
                    <rect x={s.x} y={30} width={60} height={140} rx={10} fill={k.faint} />
                    <text x={s.x + 30} y={48} fontSize={8.5} textAnchor="middle" fill={k.fg} opacity={0.7} style={MONO_FONT}>{s.label}</text>
                    {Array.from({ length: s.n }, (_, i) => (
                        <circle key={i} cx={s.x + 18 + (i % 2) * 24} cy={66 + Math.floor(i / 2) * 22} r={7} fill={k.bg} stroke={k.fg} strokeWidth={1.2} opacity={0.75} />
                    ))}
                </g>
            ))}
            <g className="ca-move" style={{ ["--dx" as string]: "160px" }}>
                <circle cx={48} cy={154} r={8} fill={k.fg} />
            </g>
            <g className="ca-fade">
                <circle cx={220} cy={132} r={12} fill={k.fg} />
                <path d="M214 132 l4 4 l8 -8" stroke={k.bg} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
        </>
    )
}

function UniAnalytics({ k }: { k: Ink }) {
    const bars = [52, 78, 64, 98, 86]
    return (
        <>
            <line x1={30} y1={168} x2={170} y2={168} stroke={k.fg} strokeWidth={1.2} opacity={0.4} />
            {bars.map((h, i) => (
                <rect key={i} className="ca-wave" x={40 + i * 26} y={168 - h} width={16} height={h} rx={4} fill={k.fg} opacity={0.35 + i * 0.13} style={{ ...d(i * 0.15), transformOrigin: "bottom", animationDuration: "3s" }} />
            ))}
            <circle cx={218} cy={100} r={21} fill="none" stroke={k.fg} strokeWidth={6} opacity={0.12} />
            <circle className="ca-ring" cx={218} cy={100} r={21} fill="none" stroke={k.fg} strokeWidth={6} strokeLinecap="round" transform="rotate(-90 218 100)" />
            <text x={218} y={104} fontSize={10} textAnchor="middle" fill={k.fg} style={MONO_FONT}>86%</text>
        </>
    )
}


const SCENES: Record<ArtKind, (p: { k: Ink }) => React.ReactElement> = {
    projects: Projects,
    practice: Practice,
    ai: Ai,
    jobs: Jobs,
    mock: Mock,
    "hire-pipelines": HirePipelines,
    "hire-questions": HireQuestions,
    "hire-jobs": HireJobs,
    "hire-candidates": HireCandidates,
    "hire-team": HireTeam,
    "uni-students": UniStudents,
    "uni-classes": UniClasses,
    "uni-faculty": UniFaculty,
    "uni-placements": UniPlacements,
    "uni-analytics": UniAnalytics,
    pricing: Pricing,
    compare: Compare,
    about: About,
    guides: Guides,
    ideas: Ideas,
    changelog: Changelog,
}

export function CardArt({ kind, dark = false, className }: { kind: ArtKind; dark?: boolean; className?: string }) {
    const Scene = SCENES[kind]
    const k: Ink = dark
        ? { fg: "#fafafa", bg: "#171717", soft: "#404040", faint: "rgba(255,255,255,0.08)" }
        : { fg: "#171717", bg: "#ffffff", soft: "#d4d4d4", faint: "rgba(0,0,0,0.06)" }
    return (
        <svg viewBox="0 0 280 200" className={`ca h-auto w-full ${className ?? ""}`} aria-hidden>
            <Scene k={k} />
        </svg>
    )
}
