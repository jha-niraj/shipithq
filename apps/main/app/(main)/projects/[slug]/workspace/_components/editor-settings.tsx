'use client'

import { Minus, Plus, Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover'
import { cn } from '@repo/ui/lib/utils'
import { EDITOR_FONTS } from './editor-fonts'
import { DEFAULT_EDITOR_SETTINGS, EDITOR_FONT_KEYS, type EditorSettings } from './workspace-model'

/*
 * VS Code's editor settings, the handful people actually change (Niraj,
 * 2026-09-24): font, size, tab size, wrap, minimap, line numbers. Remembered
 * per viewer in localStorage by the page.
 */
export function EditorSettingsMenu({ value, onChange }: { value: EditorSettings; onChange: (next: EditorSettings) => void }) {
    const set = <K extends keyof EditorSettings>(key: K, v: EditorSettings[K]) => onChange({ ...value, [key]: v })

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Editor settings"
                    title="Editor settings"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                    <Settings2 className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
                <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">Editor</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Saved for you on this browser.</p>
                </div>
                <div className="space-y-4 px-4 py-4">
                    <Row label="Font">
                        <div className="grid grid-cols-2 gap-1">
                            {EDITOR_FONT_KEYS.map((f) => (
                                <Choice key={f} active={value.fontFamily === f} onClick={() => set('fontFamily', f)}>
                                    <span style={{ fontFamily: EDITOR_FONTS[f].stack }}>{EDITOR_FONTS[f].label}</span>
                                </Choice>
                            ))}
                        </div>
                    </Row>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Font size</span>
                        <div className="flex items-center gap-1">
                            <Stepper label="Smaller" onClick={() => set('fontSize', Math.max(10, value.fontSize - 1))}><Minus className="h-3.5 w-3.5" /></Stepper>
                            <span className="w-8 text-center font-mono text-sm tabular-nums text-neutral-900 dark:text-white">{value.fontSize}</span>
                            <Stepper label="Larger" onClick={() => set('fontSize', Math.min(22, value.fontSize + 1))}><Plus className="h-3.5 w-3.5" /></Stepper>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">Tab size</span>
                            <div className="flex gap-1">
                                {([2, 4] as const).map((n) => (
                                    <Choice key={n} active={value.tabSize === n} onClick={() => set('tabSize', n)}>{n} spaces</Choice>
                                ))}
                            </div>
                        </div>
                        {/* Said out loud, because otherwise it looks broken: the
                            starter files are already indented with spaces, and a
                            tab size does not rewrite existing lines - in VS Code
                            either. */}
                        <p className="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                            For the Tab key and new lines. Existing lines keep their indentation.
                        </p>
                    </div>
                    <Toggle label="Word wrap" checked={value.wordWrap} onChange={(v) => set('wordWrap', v)} />
                    <Toggle label="Minimap" checked={value.minimap} onChange={(v) => set('minimap', v)} />
                    <Toggle label="Line numbers" checked={value.lineNumbers} onChange={(v) => set('lineNumbers', v)} />
                </div>
                <div className="border-t border-neutral-200 px-4 py-2 dark:border-neutral-800">
                    <button type="button" onClick={() => onChange(DEFAULT_EDITOR_SETTINGS)} className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                        Reset to defaults
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
            {children}
        </div>
    )
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'cursor-pointer rounded-md border px-2 py-1.5 text-xs transition-colors',
                active
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
            )}
        >
            {children}
        </button>
    )
}

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" aria-label={label} onClick={onClick} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300">
            {children}
        </button>
    )
}

/*
 * One button per row, role="switch" (WS-3d). The first cut wrapped a Radix
 * Switch in a <label>, and the switches were reported as doing nothing. The row
 * as a single button leaves exactly one element that can receive the click.
 */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
            <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
            <span
                aria-hidden
                className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    checked ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                )}
            >
                <span className={cn(
                    'block h-4 w-4 rounded-full bg-white shadow transition-transform dark:bg-neutral-900',
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
            </span>
        </button>
    )
}
