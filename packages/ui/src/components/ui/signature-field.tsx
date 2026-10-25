"use client"

/**
 * SignatureField - THE way a signature is captured (plan/repo/ui/reui-components-2026-10-23.md 2.3).
 *
 * Two ways in, one thing out: Draw (the ReUI SignaturePad, undo / redo / clear, a signing line) or Upload (a PNG or
 * JPG of a scanned signature). Either way the caller receives a `File`, and what it does with it - upload to R2 through
 * the services upload, a server action, a joining record - is the caller's business. Nothing app-specific lives here.
 *
 * A drawn signature is exported as DARK ink (neutral-900) on a TRANSPARENT PNG, cropped to the ink, whatever the
 * theme: it is printed on white paper (report cards, ID cards, certificates), so white ink drawn in dark mode must not
 * be what is stored. On screen the ink follows the theme so it can be seen while drawing.
 *
 * Two ways to submit:
 * - the field's own "Use this signature" button calls `onSave(file)` (inline slots: ID card, joining, acknowledgement);
 * - a sheet with its own pinned footer passes `hideSave` and calls `ref.current.getFile()` from that footer.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react"
import { Check, ImageUp, PenLine, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Spinner } from "./spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import {
    SignaturePad,
    SignaturePadArea,
    SignaturePadClear,
    SignaturePadControls,
    SignaturePadGuide,
    SignaturePadPlaceholder,
    SignaturePadRedo,
    SignaturePadUndo,
    signaturePadToBlob,
    type SignaturePadStroke,
} from "./signature-pad"

/** The ink a drawn signature is stored in: neutral-900, the house "black". */
export const SIGNATURE_INK = "#171717"

const UPLOAD_TYPES = ["image/png", "image/jpeg"] as const
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export type SignatureFieldMode = "draw" | "upload"

export interface SignatureFieldHandle {
    /** The signature as it stands now (a drawn PNG or the chosen image), or null when there is none yet. */
    getFile: () => Promise<File | null>
    /** True when there is something to save. */
    hasValue: () => boolean
    clear: () => void
}

export interface SignatureFieldProps {
    /** Called with the drawn PNG or the uploaded image. Return false (or throw) to keep the field as it is. */
    onSave?: (file: File) => Promise<boolean | void> | boolean | void
    /** The signature already stored, already resolved to something an `<img>` can show (the app signs its R2 key). */
    current?: { src: string; label?: string | null } | null
    /** Fires when the field gains or loses something to save - lets a sheet enable its own Save button. */
    onDirtyChange?: (dirty: boolean) => void
    /** Hide the field's own save button (a sheet footer calls `getFile()` instead). */
    hideSave?: boolean
    saveLabel?: string
    /** Disables everything while the caller is saving through `getFile()`. */
    busy?: boolean
    disabled?: boolean
    /** The drawn file's name, without extension. */
    fileName?: string
    maxBytes?: number
    defaultMode?: SignatureFieldMode
    /** Shown under the pad. */
    hint?: string
    /** Height of the drawing area. */
    padClassName?: string
    className?: string
    ref?: Ref<SignatureFieldHandle>
}

export function SignatureField({
    onSave,
    current,
    onDirtyChange,
    hideSave = false,
    saveLabel = "Use this signature",
    busy = false,
    disabled = false,
    fileName = "signature",
    maxBytes = DEFAULT_MAX_BYTES,
    defaultMode = "draw",
    hint,
    padClassName,
    className,
    ref,
}: SignatureFieldProps) {
    const [mode, setMode] = useState<SignatureFieldMode>(defaultMode)
    // Held here, not inside the pad, so switching to Upload and back keeps the drawing.
    const [strokes, setStrokes] = useState<SignaturePadStroke[]>([])
    const [picked, setPicked] = useState<File | null>(null)
    const [pickError, setPickError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const pickedUrl = useMemo(() => (picked ? URL.createObjectURL(picked) : null), [picked])
    useEffect(() => () => { if (pickedUrl) URL.revokeObjectURL(pickedUrl) }, [pickedUrl])

    const dirty = mode === "draw" ? strokes.length > 0 : picked !== null
    const onDirtyRef = useRef(onDirtyChange)
    useEffect(() => { onDirtyRef.current = onDirtyChange })
    useEffect(() => { onDirtyRef.current?.(dirty) }, [dirty])

    const getFile = async (): Promise<File | null> => {
        if (mode === "upload") return picked
        if (strokes.length === 0) return null
        const blob = await signaturePadToBlob(strokes, { color: SIGNATURE_INK, padding: 12, scale: 3, type: "image/png" })
        if (!blob) return null
        return new File([blob], `${fileName}.png`, { type: "image/png" })
    }

    const clearAll = () => {
        setStrokes([])
        setPicked(null)
        setPickError(null)
        if (fileRef.current) fileRef.current.value = ""
    }

    useImperativeHandle(ref, () => ({ getFile, hasValue: () => dirty, clear: clearAll }))

    const pick = (file: File | undefined) => {
        setPickError(null)
        if (!file) return
        if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) {
            setPickError("Choose a PNG or JPG image.")
            return
        }
        if (file.size > maxBytes) {
            setPickError(`That image is too large - the limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`)
            return
        }
        setPicked(file)
    }

    const save = async () => {
        if (!onSave) return
        const file = await getFile()
        if (!file) return
        setSaving(true)
        try {
            const result = await onSave(file)
            if (result !== false) clearAll()
        } catch {
            // The caller reports its own failure; the drawing stays so it can be retried.
        } finally {
            setSaving(false)
        }
    }

    const locked = disabled || busy || saving

    return (
        <div className={cn("flex min-w-0 flex-col gap-3", className)}>
            {current?.src && (
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                    {/* White chip in both themes: the stored ink is dark, made for paper. */}
                    <div className="flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={current.src} alt="Current signature" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Current signature</p>
                        <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{current.label || "In use now"}</p>
                    </div>
                </div>
            )}

            <Tabs value={mode} onValueChange={(v) => setMode(v === "upload" ? "upload" : "draw")}>
                <TabsList fit variant="segmented" size="sm">
                    <TabsTrigger value="draw" disabled={locked}>
                        <PenLine className="mr-1.5 h-3.5 w-3.5" />
                        Draw
                    </TabsTrigger>
                    <TabsTrigger value="upload" disabled={locked}>
                        <ImageUp className="mr-1.5 h-3.5 w-3.5" />
                        Upload
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="draw">
                    <SignaturePad value={strokes} onValueChange={setStrokes} disabled={locked} className="w-full">
                        <SignaturePadArea
                            className={cn(
                                "relative h-40 w-full rounded-xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white",
                                padClassName,
                            )}
                        >
                            <SignaturePadGuide className="border-neutral-300 text-neutral-400 dark:border-neutral-600" />
                            <SignaturePadPlaceholder className="text-neutral-400 dark:text-neutral-500">
                                Sign here with a mouse, finger or stylus
                            </SignaturePadPlaceholder>
                            <SignaturePadControls>
                                <SignaturePadUndo className="rounded-lg" />
                                <SignaturePadRedo className="rounded-lg" />
                                <SignaturePadClear className="rounded-lg" />
                            </SignaturePadControls>
                        </SignaturePadArea>
                    </SignaturePad>
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {hint ?? "Saved as dark ink on a clear background, so it prints cleanly on any document."}
                    </p>
                </TabsContent>

                <TabsContent value="upload">
                    {picked && pickedUrl ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <div className="flex h-28 w-60 max-w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={pickedUrl} alt="Chosen signature" className="max-h-full max-w-full object-contain" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setPicked(null); if (fileRef.current) fileRef.current.value = "" }}
                                    disabled={locked}
                                    aria-label="Remove image"
                                    className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <p className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">{picked.name}</p>
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={locked}
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
                            className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 text-center transition-colors hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950/40 dark:hover:border-neutral-500"
                        >
                            <ImageUp className="h-6 w-6 text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Drop an image here, or click to choose</span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                PNG or JPG, up to {Math.round(maxBytes / (1024 * 1024))} MB. Dark ink on white prints best.
                            </span>
                        </button>
                    )}
                    {pickError && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{pickError}</p>}
                    <input
                        ref={fileRef}
                        type="file"
                        accept={UPLOAD_TYPES.join(",")}
                        className="hidden"
                        onChange={(e) => pick(e.target.files?.[0])}
                    />
                </TabsContent>
            </Tabs>

            {!hideSave && onSave && (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-xl"
                        disabled={!dirty || locked}
                        onClick={() => void save()}
                    >
                        {saving || busy ? <Spinner className="mr-1.5 size-3.5" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                        {saveLabel}
                    </Button>
                    {dirty && (
                        <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl" disabled={locked} onClick={clearAll}>
                            Start again
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
