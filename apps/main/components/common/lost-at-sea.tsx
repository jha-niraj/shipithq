/*
 * The 404 scene (plan/jobs-polish JP-17): a boat adrift at night, waves rolling under it, a
 * lighthouse beam sweeping the water looking for it, a blinking buoy, twinkling stars and a
 * "?" rising from the boat now and then. Pure SVG and CSS keyframes: no script, no request.
 *
 * The panel is night in BOTH themes, so its ink is constant too (CLAUDE.md: a surface that
 * doesn't change with the theme gets ink that doesn't either). Everything stops under
 * `prefers-reduced-motion`.
 */

const W = 600
const H = 340

/** A wave across twice the width, so sliding it one period left loops without a seam. */
function wave(y: number, amp: number, period: number) {
    let d = `M0 ${y} Q${period / 4} ${y - amp} ${period / 2} ${y}`
    for (let x = period; x <= W * 2 + period; x += period / 2) d += ` T${x} ${y}`
    return `${d} V${H} H0 Z`
}

const STARS: [number, number, number][] = [
    [40, 40, 1.4], [92, 118, 1], [168, 30, 1.2], [214, 92, 0.9], [262, 44, 1.5], [318, 120, 1],
    [352, 28, 1.1], [404, 76, 1.3], [436, 24, 0.9], [548, 52, 1.2], [580, 110, 1], [300, 70, 0.8],
    [24, 150, 0.9], [520, 150, 0.8],
]

const CSS = `
.las * { transform-box: fill-box; }
.las-star { animation: las-twinkle 3.2s ease-in-out infinite; transform-origin: center; }
@keyframes las-twinkle { 0%, 100% { opacity: .25; transform: scale(.8) } 50% { opacity: 1; transform: scale(1.15) } }
.las-cloud { animation: las-cloud 38s linear infinite; }
.las-cloud-2 { animation-duration: 52s; animation-delay: -20s; }
@keyframes las-cloud { from { transform: translateX(-160px) } to { transform: translateX(${W + 40}px) } }
.las-wave { animation: las-roll linear infinite; }
.las-wave-back { animation-duration: 16s; }
.las-wave-mid { animation-duration: 10s; }
.las-wave-front { animation-duration: 7s; }
@keyframes las-roll { from { transform: translateX(0) } to { transform: translateX(-120px) } }
.las-beam { transform-box: view-box; transform-origin: 470px 136px; animation: las-sweep 7s ease-in-out infinite alternate; }
@keyframes las-sweep { from { transform: rotate(-16deg) } to { transform: rotate(12deg) } }
.las-lamp { animation: las-lamp 1.8s ease-in-out infinite alternate; transform-origin: center; }
@keyframes las-lamp { from { opacity: .7 } to { opacity: 1 } }
.las-drift { animation: las-drift 13s ease-in-out infinite alternate; }
@keyframes las-drift { from { transform: translateX(-34px) } to { transform: translateX(26px) } }
.las-bob { animation: las-bob 3.4s ease-in-out infinite alternate; transform-origin: 50% 90%; }
@keyframes las-bob { 0% { transform: translateY(0) rotate(-5deg) } 100% { transform: translateY(-6px) rotate(5deg) } }
.las-ask { animation: las-ask 5.5s ease-out infinite; opacity: 0; }
@keyframes las-ask { 0%, 55% { opacity: 0; transform: translate(0, 0) } 65% { opacity: .95 } 100% { opacity: 0; transform: translate(10px, -26px) } }
.las-buoy { animation: las-bob 2.6s ease-in-out infinite alternate-reverse; transform-origin: 50% 100%; }
.las-blink { animation: las-blink 1.6s steps(1, end) infinite; }
@keyframes las-blink { 0%, 60% { opacity: 1 } 61%, 100% { opacity: .15 } }
@media (prefers-reduced-motion: reduce) { .las * { animation: none !important; } .las-ask { opacity: 0; } }
`

export function LostAtSea({ className }: { className?: string }) {
    return (
        <div className={className}>
            <style>{CSS}</style>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A small boat adrift at night while a lighthouse beam searches the water for it" className="las block h-auto w-full text-white">
                <defs>
                    <linearGradient id="las-beam" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0" stopColor="currentColor" stopOpacity=".55" />
                        <stop offset=".55" stopColor="currentColor" stopOpacity=".14" />
                        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <radialGradient id="las-glow">
                        <stop offset="0" stopColor="currentColor" stopOpacity=".9" />
                        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <mask id="las-moon">
                        <rect width={W} height={H} fill="white" />
                        <circle cx="130" cy="64" r="22" fill="black" />
                    </mask>
                    <clipPath id="las-tower"><polygon points="455,252 485,252 479,150 461,150" /></clipPath>
                </defs>

                {/* Sky */}
                {STARS.map(([x, y, r], i) => (
                    <circle key={i} className="las-star" cx={x} cy={y} r={r} fill="currentColor" style={{ animationDelay: `${(i * 0.37) % 3.2}s` }} />
                ))}
                <circle cx="118" cy="72" r="22" fill="currentColor" opacity=".92" mask="url(#las-moon)" />
                <g opacity=".12" fill="currentColor">
                    <path className="las-cloud" d="M0 96 q10 -16 28 -10 q10 -14 28 -4 q18 -2 18 12 z" />
                    <path className="las-cloud las-cloud-2" d="M0 140 q12 -14 30 -8 q14 -12 30 0 q14 0 14 8 z" />
                </g>

                {/* The beam, under everything on the water */}
                <g className="las-beam">
                    <polygon points="470,136 -40,52 -40,232" fill="url(#las-beam)" />
                </g>

                {/* Back and middle waves */}
                <path className="las-wave las-wave-back" d={wave(236, 5, 120)} fill="currentColor" opacity=".05" />
                <path className="las-wave las-wave-mid" d={wave(252, 7, 120)} fill="currentColor" opacity=".06" />

                {/* The lighthouse on its rock */}
                <path d="M430 262 q18 -18 40 -14 q26 -6 44 14 z" fill="currentColor" opacity=".35" />
                <polygon points="455,252 485,252 479,150 461,150" fill="currentColor" opacity=".9" />
                <g clipPath="url(#las-tower)" fill="black" opacity=".55">
                    <rect x="450" y="172" width="40" height="12" />
                    <rect x="450" y="206" width="40" height="12" />
                    <rect x="450" y="238" width="40" height="12" />
                </g>
                <rect x="455" y="146" width="30" height="5" rx="1" fill="currentColor" />
                <rect x="462" y="126" width="16" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <polygon points="457,127 483,127 470,112" fill="currentColor" />
                <circle cx="470" cy="136" r="16" fill="url(#las-glow)" className="las-lamp" />
                <circle cx="470" cy="136" r="4.5" fill="currentColor" />

                {/* The boat, drifting and bobbing, with a "?" now and then */}
                <g className="las-drift">
                    <g className="las-bob">
                        <line x1="250" y1="250" x2="250" y2="200" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M252 204 L252 244 L282 244 Z" fill="currentColor" opacity=".92" />
                        <path d="M248 212 L248 244 L228 244 Z" fill="currentColor" opacity=".55" />
                        <path d="M250 200 l12 3 l-12 3 z" fill="currentColor" />
                        <path d="M218 248 H286 L276 262 H228 Z" fill="currentColor" />
                        <text className="las-ask" x="262" y="194" fill="currentColor" fontSize="18" fontWeight="700" fontFamily="ui-sans-serif, system-ui, sans-serif">?</text>
                    </g>
                </g>

                {/* The buoy */}
                <g className="las-buoy">
                    <path d="M372 266 h16 l-3 -16 h-10 z" fill="currentColor" opacity=".85" />
                    <line x1="380" y1="250" x2="380" y2="240" stroke="currentColor" strokeWidth="1.5" />
                    <circle className="las-blink" cx="380" cy="238" r="3.2" fill="currentColor" />
                </g>

                {/* The front wave rolls over the hull's waterline */}
                <path className="las-wave las-wave-front" d={wave(262, 6, 120)} fill="currentColor" opacity=".07" />
                <path className="las-wave las-wave-front" d={wave(262, 6, 120).replace(/ V.*$/, "")} fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
            </svg>
        </div>
    )
}
