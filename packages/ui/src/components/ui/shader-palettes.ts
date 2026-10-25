// Pure data - zero dependencies. Split out of hero-shader-bg.tsx so importing the palette
// list (e.g. from a Server Component) never drags the client-only @paper-design/shaders-react
// module graph along with it.
//
// IMPORT THIS FILE DIRECTLY FROM A SERVER COMPONENT:
//
//     import { SHADER_PALETTES } from '@repo/ui/components/ui/shader-palettes'
//
// NOT via hero-shader-bg's re-export. That file carries 'use client', and a plain value
// re-exported from a client module reaches a Server Component as a CLIENT REFERENCE, not as the
// array - so `SHADER_PALETTES.pine` is undefined there and `colors[0]` throws at render. The
// symptom is a 500 on the page with "Cannot read properties of undefined (reading '0')" pointing
// inside ShaderHeroBg, which reads like a bug in the shader and is not one.
//
// This file needs its own entry in package.json `exports`: it is `.ts`, and the
// `./components/ui/*` wildcard only resolves `.tsx`.

// Premium brand palettes for the animated mesh gradient (Paper Shaders).
// Strictly no blue / purple / brown - greens, rose, platinum, champagne only.
// Shared across apps via @repo/ui so the @paper-design shader dep lives in ONE place.
export const SHADER_PALETTES = {
    champagne: ["#FBF8EF", "#EDE8D0", "#E4D4A6", "#C29B47"], // light - landing + footer (LANDING ONLY)
    pearl: ["#FBFAF7", "#EFEDE5", "#D8D5C8", "#A7A89C"],      // light - neutral cream wash (landing hero)
    emerald: ["#06100c", "#0a1f17", "#136046", "#34b481"],   // dark - features
    rose: ["#120a0d", "#251018", "#7e2a44", "#cf6587"],       // dark - feature details
    platinum: ["#0a0a0c", "#15151a", "#33333d", "#8a8a96"],   // dark - pricing
    goldNoir: ["#0a0a0a", "#161510", "#b89a4a", "#e8d39a"],   // dark - compare (champagne on black)
    // ── Additional on-brand dark palettes (greens / rose / gold / neutral / teal only -
    //    strictly NO blue / purple / brown) for the marketing & company page heroes. ──
    forest: ["#06130d", "#0b2417", "#13643f", "#39bd7a"],     // deep green
    pine: ["#040d0a", "#0a1c15", "#0f4e38", "#34a06f"],       // pine green
    teal: ["#04100f", "#08201d", "#0e5b52", "#2bb6a4"],       // brand teal-green
    mint: ["#06110e", "#0c231e", "#1d7b66", "#5cd3b2"],       // mint
    sage: ["#0b0e0b", "#161d16", "#3d563d", "#8aa98a"],       // muted sage
    wine: ["#120709", "#250e14", "#7a2536", "#c75d72"],       // deep rose / wine
    blush: ["#130a0d", "#251017", "#92465b", "#dd9aaa"],      // lighter rose
    slate: ["#0a0a0c", "#161619", "#3a3a42", "#9a9aa6"],      // cool neutral
    champagneDark: ["#0c0a06", "#1a160e", "#8a6f2e", "#d8c084"], // dark champagne / gold
} as const

export type ShaderPalette = keyof typeof SHADER_PALETTES
