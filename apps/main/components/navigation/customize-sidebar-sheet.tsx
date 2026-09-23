"use client";

// Ported from gurukulhq's navigation (2026-09-22). ShipItHQ saves pins per device
// (see sidebar.tsx), so this sheet is unchanged apart from its copy.

import { useEffect, useMemo, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@repo/ui/components/ui/sheet";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select";
import { toast } from "@repo/ui/components/ui/sonner";
import { GripVertical, Plus, X, Search, RotateCcw, Lock, Pin } from "lucide-react";
import {
    computeDefaultPrimary, SIDEBAR_PRESETS, SIDEBAR_PRIMARY_CAP, SIDEBAR_LOCKED_PATHS,
    type FlatDestination,
} from "@/lib/navigation";

/*
 * The paths this sheet will not let anyone unpin or reorder, in their fixed order.
 *
 * Read from `navigation.ts` rather than restated here: `resolveSidebarPrimary` forces the same
 * list to the front of the rail, and two copies would let the sheet offer a choice the rail then
 * silently overrides - which reads as the setting not saving.
 */
const LOCKED = SIDEBAR_LOCKED_PATHS;
const isLocked = (path: string) => LOCKED.includes(path);

function label(dest: FlatDestination) {
    return dest.section ? `${dest.name} · ${dest.section}` : dest.name;
}

// One draggable pinned row. Uses drag controls so only the grip handle initiates
// the drag (the ✕ button and the rest stay clickable/scrollable).
function PinnedRow({ dest, onRemove }: { dest: FlatDestination; onRemove: () => void }) {
    const controls = useDragControls();
    const Icon = dest.icon;
    return (
        <Reorder.Item
            value={dest.path}
            dragListener={false}
            dragControls={controls}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2"
        >
            <button
                type="button"
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab touch-none text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
            <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-100">{label(dest)}</span>
            <button
                type="button"
                onClick={onRemove}
                className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                aria-label={`Remove ${dest.name}`}
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </Reorder.Item>
    );
}

/** The mobile bottom bar shows four links beside the centre action. */
const MOBILE_PIN_CAP = 4;

export function CustomizeSidebarSheet({
    open,
    onOpenChange,
    allDestinations,
    pinnedPaths,
    saving,
    onSave,
    onReset,
    variant = 'desktop',
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    allDestinations: FlatDestination[];        // already permission-filtered
    pinnedPaths: string[] | null;              // null/empty = smart default
    saving: boolean;
    onSave: (paths: string[]) => void;
    onReset: () => void;                        // revert to the dynamic smart default ([])
    /**
     * Which bar is being edited.
     *
     * The same sheet, because the interaction is identical - pick, order, save. Only the CAP and
     * the wording differ: a bottom bar holds four, a rail holds many more, and telling a phone user
     * they can pin eight when four will show is a promise the UI cannot keep.
     */
    variant?: 'desktop' | 'mobile';
}) {
    const cap = variant === 'mobile' ? MOBILE_PIN_CAP : SIDEBAR_PRIMARY_CAP;
    const byPath = useMemo(
        () => new Map<string, FlatDestination>(allDestinations.map((d) => [d.path, d])),
        [allDestinations],
    );
    const defaultPaths = useMemo(() => computeDefaultPrimary(allDestinations), [allDestinations]);

    // Working copy of pins (paths). Seeded from saved prefs, else the smart default.
    const [pins, setPins] = useState<string[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!open) return;
        const seed = (pinnedPaths && pinnedPaths.length > 0) ? pinnedPaths : defaultPaths;
        // Keep only paths that still exist/are permitted; Home always first.
        const kept = seed.filter((p) => !isLocked(p) && byPath.has(p));
        setPins([...LOCKED.filter((p) => byPath.has(p)), ...kept].slice(0, cap));
        setSearch("");
    }, [open, pinnedPaths, defaultPaths, byPath]);

    // The locked head keeps its own order; only the tail is draggable.
    const lockedHead = LOCKED.filter((p) => pins.includes(p));
    const tail = pins.filter((p) => !isLocked(p));
    const setTail = (next: string[]) => setPins([...lockedHead, ...next]);

    const atCap = pins.length >= cap;

    const available = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allDestinations
            .filter((d) => !isLocked(d.path) && !pins.includes(d.path))
            .filter((d) => !q || label(d).toLowerCase().includes(q))
            .sort((a, b) => (a.section || "").localeCompare(b.section || "") || a.name.localeCompare(b.name));
    }, [allDestinations, pins, search]);

    const addPin = (path: string) => {
        if (atCap) { toast.error(`You can pin up to ${cap} items`); return; }
        setPins((prev) => (prev.includes(path) ? prev : [...prev, path]));
    };
    const removePin = (path: string) => setPins((prev) => prev.filter((p) => p !== path));

    const applyPreset = (key: string) => {
        const preset = SIDEBAR_PRESETS.find((p) => p.key === key);
        if (!preset) return;
        const source = preset.paths ?? defaultPaths;          // null = smart default
        // A preset replaces the TAIL only - the locked head survives every preset, which is the
        // whole point of it being locked.
        const kept = source.filter((p) => !isLocked(p) && byPath.has(p));
        setPins([...LOCKED.filter((p) => byPath.has(p)), ...kept].slice(0, cap));
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col sm:w-[48vw] sm:min-w-[460px] sm:max-w-[760px] overflow-hidden">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2"><Pin className="h-4 w-4" /> Customize sidebar</SheetTitle>
                    <SheetDescription>
                        Pin the pages you use most. Whichever module you are in opens under its own row,
                        and everything else stays one keystroke away in search (⌘K).
                    </SheetDescription>
                </SheetHeader>

                {/* Preset + reset */}
                <div className="flex items-center gap-2 pt-4">
                    <Select onValueChange={applyPreset}>
                        <SelectTrigger className="h-9 flex-1 rounded-lg text-sm">
                            <SelectValue placeholder="Start from a preset…" />
                        </SelectTrigger>
                        <SelectContent>
                            {SIDEBAR_PRESETS.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                    <span className="font-medium">{p.label}</span>
                                    <span className="ml-2 text-xs text-neutral-500">{p.description}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onReset} disabled={saving}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                </div>

                <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1 px-6 min-w-0">
                    <div className="space-y-5 py-4">
                        {/* Pinned */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                    Pinned <span className="text-neutral-400">({pins.length}/{cap})</span>
                                </p>
                                <span className="text-[11px] text-neutral-400">drag to reorder</span>
                            </div>
                            <div className="space-y-1.5">
                                {lockedHead.map((path, i) => (
                                    <div key={path} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
                                        <Lock className="h-3.5 w-3.5 text-neutral-400" />
                                        <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200">
                                            {byPath.get(path)?.name ?? path}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                                            {i === 0 ? 'always first' : 'always pinned'}
                                        </span>
                                    </div>
                                ))}
                                <Reorder.Group axis="y" values={tail} onReorder={setTail} className="space-y-1.5">
                                    {tail.map((path) => {
                                        const dest = byPath.get(path);
                                        if (!dest) return null;
                                        return <PinnedRow key={path} dest={dest} onRemove={() => removePin(path)} />;
                                    })}
                                </Reorder.Group>
                                {tail.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-neutral-400">
                                        Nothing pinned yet - add from below.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Available */}
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Available</p>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search pages…"
                                    className="h-9 rounded-lg pl-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                {available.map((d) => {
                                    const Icon = d.icon;
                                    return (
                                        <button
                                            key={d.path}
                                            type="button"
                                            onClick={() => addPin(d.path)}
                                            disabled={atCap}
                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Plus className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                            <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                                            <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200">{label(d)}</span>
                                        </button>
                                    );
                                })}
                                {available.length === 0 && (
                                    <p className="px-1 py-3 text-center text-xs text-neutral-400">
                                        {search ? "No matching pages" : "Everything you can access is pinned"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">Cancel</Button>
                    <Button onClick={() => onSave(pins)} disabled={saving} className="flex-1">
                        {saving ? "Saving…" : "Save layout"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
