"use client"

import dynamic from "next/dynamic"
import { useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"

export { SHADER_PALETTES, type ShaderPalette } from "./shader-palettes"
import { SHADER_PALETTES } from "./shader-palettes"

// Lazy-load the actual WebGL shader primitives on the client only. ShaderHeroBg /
// FeatureShaderBackground never render these during SSR anyway (they're gated behind an
// IntersectionObserver + client-only state, below), so a static top-level import of
// @paper-design/shaders-react was pulling its whole module graph into every server bundle
// for nothing. On Cloudflare Workers this was enough dead weight on cold isolates to blow
// straight through the Workers Free plan's 10ms CPU limit (Error 1102 "exceeded resource
// limits") on marketing pages that don't even show a WebGL canvas until scrolled into view.
// Re-exported so consuming apps (e.g. apps/main feature-shader-bg) get this for free too.
export const MeshGradient = dynamic(
    () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
    { ssr: false },
)
export const DotOrbit = dynamic(
    () => import("@paper-design/shaders-react").then((m) => m.DotOrbit),
    { ssr: false },
)

// Cap the shader's render resolution. These are soft, blurry gradients, so rendering at full
// device-pixel-ratio on a large/4K screen (millions of fragments per frame) is pure waste and a
// major cause of jank. ~720p worth of pixels looks identical for a gradient and is far cheaper.
const MAX_PIXELS = 1280 * 720

/**
 * Reusable animated mesh-gradient background.
 * - `light`: adds a soft top-left wash for dark text legibility.
 * - Respects prefers-reduced-motion (freezes animation).
 * - Base color paints instantly (SSR / before WebGL mounts) so there's no flash.
 * - PERFORMANCE: the WebGL canvas is only mounted while the section is on (or near) screen, and its
 *   resolution is capped (`maxPixelCount`) — so off-screen sections cost nothing and no single
 *   canvas burns the GPU at full 4K. This is what keeps multi-section pages smooth.
 */
export function ShaderHeroBg({
    colors,
    light = false,
    speed = 1,
    className,
}: {
    colors: readonly string[]
    light?: boolean
    speed?: number
    className?: string
}) {
    const reduced = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(false)
    // Fade the mesh in over the (instantly-painted) base colour, so it eases in with the
    // page content instead of popping in abruptly. Base colour stays instant → no flash.
    const [shown, setShown] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        // Skip the WebGL canvas entirely on phone-width screens. Compiling the shader and running
        // a per-frame rAF loop is real TBT / CPU / battery cost on mobile GPUs for a purely
        // decorative gradient, and the instant base colour + light wash below already approximate
        // it. Desktop/tablet keep the animated mesh. (prefers-reduced-motion is handled separately.)
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) return
        if (typeof IntersectionObserver === "undefined") { setActive(true); return }
        const io = new IntersectionObserver(
            (entries) => { for (const e of entries) setActive(e.isIntersecting) },
            // Mount a bit before it scrolls in and unmount once well past — avoids churn on scroll.
            { rootMargin: "300px 0px" },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

    // Start the fade only once the WebGL module has actually loaded and the canvas has had
    // a couple of frames to compile its shaders and paint a first frame. The previous version
    // flipped `shown` on the very next frame after mount - but MeshGradient is a lazy
    // `ssr:false` import that paints hundreds of ms later, so the 0->1 transition completed
    // against a blank canvas and the real gradient appeared at full opacity (the "pop").
    // Gating on the dynamic import's resolution + a double rAF ties the fade to the shader
    // being genuinely on screen, so it eases in instead of snapping.
    useEffect(() => {
        if (!active || reduced) { setShown(false); return }
        let cancelled = false
        let raf1 = 0
        let raf2 = 0
        import("@paper-design/shaders-react")
            .then(() => {
                if (cancelled) return
                raf1 = requestAnimationFrame(() => {
                    raf2 = requestAnimationFrame(() => { if (!cancelled) setShown(true) })
                })
            })
            .catch(() => { /* chunk failed to load - leave the calm base colour in place */ })
        return () => { cancelled = true; cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
    }, [active, reduced])

    return (
        <div
            ref={ref}
            aria-hidden
            className={cn("absolute inset-0 z-0 overflow-hidden", className)}
            style={{ background: colors[0] }}
        >
            {active && (
                <MeshGradient
                    style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        opacity: reduced ? 1 : (shown ? 1 : 0),
                        // Long, gentle ease so the mesh drifts in calmly over the base colour.
                        transition: reduced ? undefined : "opacity 1600ms ease-out",
                    }}
                    colors={colors as string[]}
                    distortion={0.8}
                    swirl={0.8}
                    grainMixer={1}
                    grainOverlay={0}
                    speed={reduced ? 0 : speed}
                    scale={1.15}
                    rotation={0}
                    offsetX={-0.14}
                    offsetY={-0.13}
                    minPixelRatio={1}
                    maxPixelCount={MAX_PIXELS}
                />
            )}
            {light && (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "radial-gradient(110% 90% at 18% 30%, rgba(255,253,247,0.55) 0%, transparent 55%)" }}
                />
            )}
        </div>
    )
}
