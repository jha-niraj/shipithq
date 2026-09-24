import { Fira_Code, Geist_Mono, JetBrains_Mono } from 'next/font/google'

/*
 * The editor's fonts, actually loaded (WS-3d).
 *
 * The first cut named "JetBrains Mono" and "Fira Code" in a font stack without
 * loading them, so on a machine without them installed every choice fell back
 * to the same system monospace and the Font setting looked broken. They come
 * from next/font now, and Monaco is given each one's real family name rather
 * than a CSS variable, because Monaco measures glyph widths itself.
 */
const geist = Geist_Mono({ subsets: ['latin'], display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap' })
const fira = Fira_Code({ subsets: ['latin'], display: 'swap' })

export type EditorFont = 'system' | 'geist' | 'jetbrains' | 'fira'

export const EDITOR_FONTS: Record<EditorFont, { label: string; stack: string; ligatures: boolean }> = {
    system: { label: 'System mono', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', ligatures: false },
    geist: { label: 'Geist Mono', stack: `${geist.style.fontFamily}, ui-monospace, monospace`, ligatures: false },
    jetbrains: { label: 'JetBrains Mono', stack: `${jetbrains.style.fontFamily}, ui-monospace, monospace`, ligatures: true },
    fira: { label: 'Fira Code', stack: `${fira.style.fontFamily}, ui-monospace, monospace`, ligatures: true },
}
