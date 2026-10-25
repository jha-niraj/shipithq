'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import {
    ColorPicker,
    ColorPickerArea,
    ColorPickerContent,
    ColorPickerFields,
    ColorPickerPanel,
    ColorPickerSlider,
    ColorPickerSwatches,
    ColorPickerTrigger,
    getContrastRatio,
    type ColorPickerSwatchInput,
} from './color-picker';
import { cn } from '../../lib/utils';

/**
 * THE colour setting field, for every app (plan/repo/ui/reui-components-2026-10-23.md 2.6): the report builder, the
 * ID card designer and anything else a school colours. A ColorPicker popover: saturation area, hue, hex field, the
 * caller's presets, the last six colours picked (one list per `recentKey`), a contrast-on-white check and a reset.
 * The trigger follows every drag; `onChange` only fires when an interaction ends (`onValueCommit`), so a live
 * preview is not redrawn on every pointer move. A colour a school picks is DATA, so any hex is allowed; the chrome
 * stays neutral.
 */

const MIN_CONTRAST = 4.5;
const RECENT_MAX = 6;
const DEFAULT_RECENT_KEY = 'gk.recent-colours';

export const isHexColor = (v: string): boolean => /^#[0-9a-f]{6}$/i.test(v);

// ── Recent colours: one list per key, kept in memory and mirrored to localStorage ─────────────────
const EMPTY: string[] = [];
const recentByKey = new Map<string, string[]>();
const listeners = new Set<() => void>();

function readRecent(key: string): string[] {
    const cached = recentByKey.get(key);
    if (cached) return cached;
    let loaded: string[] = [];
    try {
        const raw = window.localStorage.getItem(key);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) loaded = parsed.filter((v): v is string => typeof v === 'string' && isHexColor(v)).slice(0, RECENT_MAX);
    } catch {
        // Storage blocked or corrupt: start empty, the in-memory list still works.
    }
    recentByKey.set(key, loaded);
    return loaded;
}

function pushRecent(key: string, hex: string) {
    const next = [hex, ...readRecent(key).filter((v) => v !== hex)].slice(0, RECENT_MAX);
    recentByKey.set(key, next);
    try {
        window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
        // Not persisted; this session still remembers it.
    }
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function useRecentColours(key: string): string[] {
    return useSyncExternalStore(subscribe, () => readRecent(key), () => EMPTY);
}

// ── The field ────────────────────────────────────────────────────────────────────────────────────

function ContrastWarning({ ratio }: { ratio: number }) {
    return (
        <p className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3 shrink-0" />Hard to read on white ({ratio.toFixed(1)}:1) - aim for 4.5:1
        </p>
    );
}

const ratioOnWhite = (hex: string) => getContrastRatio(hex, '#ffffff') ?? 21;

export function ColorField({ label, value, fallback, presets: presetList = [], recentKey = DEFAULT_RECENT_KEY, contrast, className, triggerClassName, onChange }: {
    label: string;
    /** Preset swatches (e.g. the house accents). The field's own default is added when it is not one of them. */
    presets?: ColorPickerSwatchInput[];
    /** localStorage key for the recent list - one per surface (reports, ID cards). */
    recentKey?: string;
    /** The stored '#rrggbb'. */
    value: string;
    /** What Reset goes back to. */
    fallback: string;
    /** Warn when the colour is under 4.5:1 on white (text colours). */
    contrast?: boolean;
    className?: string;
    triggerClassName?: string;
    onChange: (hex: string) => void;
}) {
    const labelId = useId();
    const recentColours = useRecentColours(recentKey);
    // The colour on screen while dragging; the stored value only moves on commit.
    const [live, setLive] = useState(value);
    useEffect(() => { setLive(value); }, [value]);

    const commit = (next: string | null) => {
        if (!next || !isHexColor(next)) { setLive(value); return; }
        const hex = next.toLowerCase();
        setLive(hex);
        if (hex === value.toLowerCase()) return;
        pushRecent(recentKey, hex);
        onChange(hex);
    };
    const reset = () => { setLive(fallback); if (value !== fallback) onChange(fallback); };

    const presets: ColorPickerSwatchInput[] = presetList.some((p) => (typeof p === 'string' ? p : p.value).toLowerCase() === fallback.toLowerCase())
        ? presetList
        : [{ value: fallback, label: 'Default' }, ...presetList];
    const storedRatio = ratioOnWhite(value);
    const liveRatio = ratioOnWhite(live);

    return (
        <div className={cn('min-w-0 space-y-1.5', className)}>
            <div className="flex items-center justify-between gap-2">
                <Label id={labelId} className="text-xs">{label}</Label>
                {value !== fallback && (
                    <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-neutral-600 hover:underline dark:text-neutral-300"><RotateCcw className="h-3 w-3" />Reset</button>
                )}
            </div>
            <ColorPicker
                value={live}
                format="hex"
                aria-labelledby={labelId}
                onValueChange={(v) => { if (v) setLive(v); }}
                onValueCommit={commit}
                onOpenChange={(open) => { if (!open) setLive(value); }}
            >
                <ColorPickerTrigger size="sm" className={cn('h-8 w-full rounded-xl font-mono text-xs', triggerClassName)} />
                <ColorPickerContent className="w-72">
                    <ColorPickerPanel>
                        <ColorPickerArea />
                        <ColorPickerSlider channel="hue" />
                        <ColorPickerFields formats={['hex']} />
                        <div className="space-y-1.5">
                            <p className="text-xs text-neutral-600 dark:text-neutral-300">Presets</p>
                            <ColorPickerSwatches colors={presets} shape="circle" />
                        </div>
                        {recentColours.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-xs text-neutral-600 dark:text-neutral-300">Recent</p>
                                <ColorPickerSwatches colors={recentColours} shape="circle" />
                            </div>
                        )}
                        {contrast && (
                            liveRatio < MIN_CONTRAST
                                ? <ContrastWarning ratio={liveRatio} />
                                : <p className="text-xs text-neutral-600 dark:text-neutral-300">{liveRatio.toFixed(1)}:1 on white - easy to read</p>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="justify-start text-xs" disabled={live === fallback} onClick={reset}>
                            <RotateCcw className="h-3.5 w-3.5" />Reset to default
                        </Button>
                    </ColorPickerPanel>
                </ColorPickerContent>
            </ColorPicker>
            {contrast && storedRatio < MIN_CONTRAST && <ContrastWarning ratio={storedRatio} />}
        </div>
    );
}
