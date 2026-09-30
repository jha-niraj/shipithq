"use client"

import { Logo } from "../logo"
import { HarbourScreen } from "./harbour-scene"

// ShipItHQ full-page loader (plan/jobs-polish JP-28): the harbour scene with the boat sailing
// in, then the logo mark and the "ShipItHQ" wordmark with a slow sweep across it, a small
// track, and an optional caption. Same world as the 404, signing in and signing out. Light
// and dark aware; still under `prefers-reduced-motion`.
//
// This is for FULL-PAGE transitions (auth flows, first paint of a heavy route) where a
// few hundred extra ms of wait deserves something to look at. It is NOT a replacement
// for per-section skeletons - a skeleton that shows the shape of the content arriving
// is strictly better inside an already-rendered page, so leave those alone.

const FONT_STACK =
    "var(--font-space-grotesk, 'Space Grotesk'), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export type ShipItHQLoaderProps = {
    /** Cover the viewport (default). Set false to render inline within a parent. */
    fullScreen?: boolean
    /** Optional caption under the wordmark, e.g. "Preparing your workspace". */
    label?: string
    className?: string
}

const STYLES = `
.bhq-root { --bhq-dim: #d4d4d4; --bhq-mid: #737373; --bhq-hot: #171717; }
.dark .bhq-root { --bhq-dim: #404040; --bhq-mid: #a3a3a3; --bhq-hot: #fafafa; }
.bhq-brand { display: flex; align-items: center; gap: .85rem; margin-top: 2rem; }
.bhq-logo { width: 48px; height: 48px; border-radius: 14px; box-shadow: 0 8px 28px -8px rgba(0,0,0,0.22);
    animation: bhq-logo 2.4s cubic-bezier(.5,0,.2,1) infinite; }
@keyframes bhq-logo { 0%, 100% { transform: scale(.94); opacity: .6 } 45% { transform: scale(1); opacity: 1 } }
.bhq-word {
    font-family: ${FONT_STACK}; font-weight: 600; letter-spacing: -0.03em; line-height: 1;
    font-size: clamp(1.75rem, 4vw, 2.4rem); white-space: nowrap; user-select: none;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
    background-image: linear-gradient(115deg, var(--bhq-dim) 0%, var(--bhq-dim) 36%, var(--bhq-hot) 47%, var(--bhq-hot) 53%, var(--bhq-dim) 64%, var(--bhq-dim) 100%);
    background-size: 220% 100%; animation: bhq-sweep 2.4s cubic-bezier(.45,0,.15,1) infinite;
}
@keyframes bhq-sweep { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
.bhq-track { position: relative; width: 96px; height: 3px; margin-top: 1.25rem; border-radius: 999px; background: var(--bhq-dim); overflow: hidden; }
.bhq-track-fill { position: absolute; inset: 0; width: 34%; border-radius: 999px; background: var(--bhq-hot); animation: bhq-track 1.7s cubic-bezier(.5,0,.2,1) infinite; }
@keyframes bhq-track { 0% { transform: translateX(-100%); } 100% { transform: translateX(294%); } }
.bhq-cap { margin-top: 1rem; font-family: ${FONT_STACK}; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--bhq-mid); }
@media (prefers-reduced-motion: reduce) {
    .bhq-logo, .bhq-word, .bhq-track-fill { animation: none !important; }
    .bhq-logo { transform: none !important; opacity: 1 !important; }
    .bhq-word { background-position: 50% 0 !important; }
}
`

export function ShipItHQLoader({ fullScreen = true, label, className = "" }: ShipItHQLoaderProps) {
    return (
        <HarbourScreen mode="arriving" fullScreen={fullScreen} className={`bhq-root ${className}`}>
            <style>{STYLES}</style>
            <div className="bhq-brand">
                {/* Inline SVG, not an <img src="/logo.svg">: the mark uses `currentColor` to
                    follow the theme, which never resolves through an <img> (it renders black
                    in both themes). */}
                <span aria-hidden className="bhq-logo flex items-center justify-center bg-neutral-900 dark:bg-white">
                    <Logo className="h-7 w-7 text-white dark:text-neutral-900" />
                </span>
                <span className="bhq-word">ShipItHQ</span>
            </div>
            <div className="bhq-track"><div className="bhq-track-fill" /></div>
            {label ? <p className="bhq-cap">{label}</p> : null}
        </HarbourScreen>
    )
}

export default ShipItHQLoader
