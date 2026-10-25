/**
 * An empty chart (Niraj, 2026-10-18: "instead of showing this, do some SVG animation"). A faint outline of the chart's
 * own shape - bars or a line - slowly rising and settling, with the one-line reason over it. It is a picture of "no
 * data yet", never data: neutral, `aria-hidden`, and it stands still under `prefers-reduced-motion`.
 *
 * Every chart's empty state uses this, so "nothing recorded" looks the same everywhere.
 */

const BARS = [0.42, 0.68, 0.5, 0.82, 0.36, 0.6, 0.74, 0.46];

export function ChartEmpty({
    message, hint, kind = 'bars', height = 160,
}: {
    /** Leave out for a tiny chart whose card already says why (a trend card's 'Nothing recorded yet'). */
    message?: string;
    hint?: string;
    kind?: 'bars' | 'line';
    height?: number;
}) {
    return (
        <div className="relative min-w-0 overflow-hidden" style={{ height }}>
            <svg aria-hidden className="absolute inset-0 h-full w-full text-neutral-300 dark:text-neutral-700" viewBox="0 0 320 120" preserveAspectRatio="none">
                <style>{`
                    @keyframes gk-ghost-rise { 0%, 100% { transform: scaleY(0.55); } 50% { transform: scaleY(1); } }
                    @keyframes gk-ghost-draw { 0% { stroke-dashoffset: 520; } 55%, 100% { stroke-dashoffset: 0; } }
                    @keyframes gk-ghost-fade { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
                    .gk-ghost-bar { transform-box: fill-box; transform-origin: bottom; animation: gk-ghost-rise 2.8s ease-in-out infinite; }
                    .gk-ghost-line { stroke-dasharray: 520; animation: gk-ghost-draw 3.2s ease-in-out infinite alternate, gk-ghost-fade 3.2s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .gk-ghost-bar, .gk-ghost-line { animation: none; } }
                `}</style>
                {[30, 60, 90].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 5" strokeWidth="1" />)}
                {kind === 'bars' ? BARS.map((h, i) => (
                    <rect key={i} className="gk-ghost-bar" x={14 + i * 38} y={118 - h * 100} width="22" height={h * 100} rx="3"
                        fill="currentColor" fillOpacity="0.45" style={{ animationDelay: `${i * 0.18}s` }} />
                )) : (
                    <path className="gk-ghost-line" d="M4 92 C 40 70, 64 84, 96 62 S 150 40, 184 58 S 240 30, 272 38 S 304 24, 316 20"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                )}
                <line x1="0" x2="320" y1="118" y2="118" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
            </svg>
            {message && <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="rounded-full bg-card/85 px-3 py-1 text-sm font-medium text-neutral-700 backdrop-blur-[1px] dark:text-neutral-200">{message}</p>
                {hint && <p className="mt-1.5 max-w-xs rounded-md bg-card/85 px-2 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
            </div>}
        </div>
    );
}
