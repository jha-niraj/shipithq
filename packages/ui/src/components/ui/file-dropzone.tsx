"use client"

import * as React from "react"
import { AlertCircle, Check, RotateCcw, Upload, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { formatBytes, useFileUpload, type FileWithPreview } from "../../hooks/use-file-upload"
import { FileTypeIcon } from "./file-type-icon"
import { Progress } from "./progress"
import { ScrollArea } from "./scroll-area"

/**
 * THE file picker (plan/repo/ui/reui-components-2026-10-23.md task 3.3): drag-drop or press to choose, then a queue
 * of the chosen files - each with a file-type icon, name, size, its own real upload progress, and remove / retry.
 * Built on `useFileUpload` (ReUI, `@repo/ui/hooks/use-file-upload`).
 *
 * Transport is the APP's job: pass `upload(file, onProgress, signal)` (apps/main wraps `uploadWithProgress` from
 * `lib/upload-with-progress.ts`). No app URL lives in packages/ui. Without `upload` it is a plain picker - the queue
 * shows the chosen files and `onFilesChange` hands them to the screen.
 *
 * Uploads run one at a time in the order chosen (a phone on school wifi does better with one stream than ten).
 */

export type DropzoneStatus = "queued" | "uploading" | "done" | "error"

export type DropzoneItem<T = unknown> = {
	id: string
	file: File
	status: DropzoneStatus
	/** 0-100, real bytes sent. */
	progress: number
	error?: string
	result?: T
}

export type FileDropzoneProps<T = unknown> = {
	/** Starts as soon as a file is added. Resolve with whatever the screen needs (the R2 key...); throw to fail the row. */
	upload?: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<T>
	/** One file finished. */
	onUploaded?: (result: T, file: File) => void
	/** Every file in the queue went through (done or failed) after an upload run. */
	onSettled?: (items: DropzoneItem<T>[]) => void
	/** The files now in the queue (picker mode, or to know what is chosen). */
	onFilesChange?: (files: File[]) => void
	/** The whole queue with statuses, on every change. */
	onItemsChange?: (items: DropzoneItem<T>[]) => void
	/** A file refused by accept / maxSize / maxFiles / `validate`. Shown under the drop area too. */
	onReject?: (errors: string[]) => void
	/** The screen's own check: return a message to refuse the file. */
	validate?: (file: File) => string | null
	accept?: string
	/** Bytes. */
	maxSize?: number
	multiple?: boolean
	maxFiles?: number
	disabled?: boolean
	/** Drop finished rows from the queue (the screen shows them its own way, e.g. a sheet list). */
	removeDone?: boolean
	/** Offer the remove button on each row (removing a row mid-upload cancels it). Default true. */
	removable?: boolean
	/** Main line in the drop area. */
	title?: React.ReactNode
	/** Second line (types, size limit). */
	hint?: React.ReactNode
	/** Replaces the default round upload chip in the drop area - e.g. an `IconStack` of the expected file types. */
	icon?: React.ReactNode
	/** Compact drop area (a row, not a tall box). */
	compact?: boolean
	className?: string
	/** Max height of the queue before it scrolls inside. */
	queueClassName?: string
	id?: string
	"aria-label"?: string
}

type RowState<T> = { status: DropzoneStatus; progress: number; error?: string; result?: T }

export function FileDropzone<T = unknown>({
	upload,
	onUploaded,
	onSettled,
	onFilesChange,
	onItemsChange,
	onReject,
	validate,
	accept = "*",
	maxSize,
	multiple = false,
	maxFiles,
	disabled = false,
	removeDone = false,
	removable = true,
	title,
	hint,
	icon,
	compact = false,
	className,
	queueClassName,
	id,
	"aria-label": ariaLabel,
}: FileDropzoneProps<T>) {
	const [rows, setRows] = React.useState<Record<string, RowState<T>>>({})
	// Bumped when an upload run ends, so the settled callback sees the final rows.
	const [settleTick, setSettleTick] = React.useState(0)
	const controllers = React.useRef(new Map<string, AbortController>())
	const chain = React.useRef<Promise<void>>(Promise.resolve())
	const pendingRuns = React.useRef(0)
	// Latest callbacks, so a long upload run calls the current ones rather than the ones from when it started.
	const cb = React.useRef({ upload, onUploaded, onSettled, onReject })
	cb.current = { upload, onUploaded, onSettled, onReject }
	// Rows removed (or replaced) while queued or uploading: a run skips them and drops late progress.
	const removed = React.useRef(new Set<string>())

	const patch = React.useCallback((rowId: string, next: Partial<RowState<T>>) => {
		setRows((all) => {
			if (removed.current.has(rowId)) return all
			const cur = all[rowId] ?? { status: "queued" as const, progress: 0 }
			return { ...all, [rowId]: { ...cur, ...next } }
		})
	}, [])

	const runOne = React.useCallback(
		async (rowId: string, file: File) => {
			const up = cb.current.upload
			if (!up || removed.current.has(rowId)) return
			const ctrl = new AbortController()
			controllers.current.set(rowId, ctrl)
			patch(rowId, { status: "uploading", progress: 0, error: undefined })
			try {
				const result = await up(file, (pct) => { if (!ctrl.signal.aborted) patch(rowId, { progress: pct }) }, ctrl.signal)
				if (ctrl.signal.aborted) return
				patch(rowId, { status: "done", progress: 100, result })
				cb.current.onUploaded?.(result, file)
			} catch (e) {
				if (ctrl.signal.aborted) return
				patch(rowId, { status: "error", error: e instanceof Error ? e.message : "The upload failed. Try again." })
			} finally {
				controllers.current.delete(rowId)
			}
		},
		[patch]
	)

	const enqueue = React.useCallback(
		(list: { id: string; file: File }[]) => {
			if (!cb.current.upload || list.length === 0) return
			pendingRuns.current += 1
			chain.current = chain.current
				.then(async () => {
					for (const it of list) await runOne(it.id, it.file)
				})
				.finally(() => {
					pendingRuns.current -= 1
					if (pendingRuns.current === 0) setSettleTick((n) => n + 1)
				})
		},
		[runOne]
	)

	const [state, actions] = useFileUpload({
		accept,
		maxSize,
		multiple,
		maxFiles,
		validate,
		onError: (errors) => cb.current.onReject?.(errors),
		onFilesAdded: (added) => {
			const fresh = added.filter((f): f is FileWithPreview & { file: File } => f.file instanceof File)
			setRows((all) => {
				// Single mode replaces the file: forget the old rows (and stop an upload still running).
				const base: Record<string, RowState<T>> = multiple ? { ...all } : {}
				for (const f of fresh) base[f.id] = { status: "queued", progress: 0 }
				return base
			})
			if (!multiple) {
				for (const [rowId, c] of controllers.current) { removed.current.add(rowId); c.abort() }
				for (const f of filesRef.current) removed.current.add(f.id)
			}
			enqueue(fresh.map((f) => ({ id: f.id, file: f.file })))
		},
	})
	const filesRef = React.useRef<FileWithPreview[]>(state.files)
	filesRef.current = state.files

	const items = React.useMemo<DropzoneItem<T>[]>(
		() =>
			state.files
				.filter((f): f is FileWithPreview & { file: File } => f.file instanceof File)
				.map((f) => {
					const r = rows[f.id] ?? { status: "queued" as const, progress: 0 }
					return { id: f.id, file: f.file, ...r }
				}),
		[state.files, rows]
	)

	// After a run: tell the screen, then drop finished rows if asked.
	React.useEffect(() => {
		if (settleTick === 0) return
		cb.current.onSettled?.(items)
		if (removeDone) for (const it of items) if (it.status === "done") remove(it.id)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per settled run
	}, [settleTick])

	const filesKey = items.map((i) => i.id).join("|")
	const lastFilesKey = React.useRef(filesKey)
	React.useEffect(() => {
		// Only on a real change: an empty queue on mount says nothing (a remounted picker must not wipe the screen's
		// chosen file), and a key compare survives StrictMode's double effect run.
		if (lastFilesKey.current === filesKey) return
		lastFilesKey.current = filesKey
		onFilesChange?.(items.map((i) => i.file))
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only when the set of files changes
	}, [filesKey])
	React.useEffect(() => {
		onItemsChange?.(items)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- every queue change
	}, [items])

	// Leaving the screen stops whatever is still uploading.
	React.useEffect(() => {
		const map = controllers.current
		return () => {
			for (const c of map.values()) c.abort()
		}
	}, [])

	const remove = (rowId: string) => {
		removed.current.add(rowId)
		controllers.current.get(rowId)?.abort()
		actions.removeFile(rowId)
		setRows((all) => {
			const next = { ...all }
			delete next[rowId]
			return next
		})
	}

	const retry = (it: DropzoneItem<T>) => {
		patch(it.id, { status: "queued", progress: 0, error: undefined })
		enqueue([{ id: it.id, file: it.file }])
	}

	const dragging = state.isDragging && !disabled
	const inputProps = actions.getInputProps({ disabled, id, "aria-label": ariaLabel ?? "Choose files" })

	return (
		<div className={cn("flex min-w-0 flex-col gap-3", className)}>
			<div
				role="button"
				tabIndex={disabled ? -1 : 0}
				aria-disabled={disabled || undefined}
				onClick={() => { if (!disabled) actions.openFileDialog() }}
				onKeyDown={(e) => {
					if (disabled) return
					if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actions.openFileDialog() }
				}}
				onDragEnter={actions.handleDragEnter}
				onDragLeave={actions.handleDragLeave}
				onDragOver={actions.handleDragOver}
				onDrop={(e) => {
					if (disabled) { e.preventDefault(); return }
					actions.handleDrop(e)
				}}
				className={cn(
					"flex w-full min-w-0 cursor-pointer items-center rounded-2xl border border-dashed border-neutral-300 bg-white text-center transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/60",
					compact ? "flex-row gap-3 px-4 py-3 text-left" : "flex-col justify-center gap-2 px-4 py-8",
					dragging && "border-neutral-500 bg-neutral-50 dark:border-neutral-500 dark:bg-neutral-800/60",
					disabled && "pointer-events-none cursor-not-allowed opacity-60"
				)}
			>
				<input {...inputProps} className="sr-only" />
				{icon ? (
					<span aria-hidden className="shrink-0">{icon}</span>
				) : (
					<span
						aria-hidden
						className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
					>
						<Upload className="size-4" />
					</span>
				)}
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
						{title ?? (dragging ? "Drop to add" : multiple ? "Drop files here, or press to choose" : "Drop a file here, or press to choose")}
					</span>
					{(hint || maxSize) && (
						<span className="text-xs text-neutral-500 dark:text-neutral-400">
							{hint ?? `Up to ${formatBytes(maxSize ?? 0, 0)}`}
						</span>
					)}
				</span>
			</div>

			{state.errors.length > 0 && (
				<ul className="flex flex-col gap-1" role="alert">
					{state.errors.map((err) => (
						<li key={err} className="flex min-w-0 items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
							<AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
							<span className="min-w-0">{err}</span>
						</li>
					))}
				</ul>
			)}

			{items.length > 0 && (
				<ScrollArea orientation="vertical" className="min-w-0" viewportClassName={cn("max-h-[22rem]", queueClassName)}>
					<ul className="flex min-w-0 flex-col gap-2">
						{items.map((it) => (
							<FileQueueRow
								key={it.id}
								item={it}
								hasUpload={!!upload}
								disabled={disabled}
								removable={removable}
								onRemove={() => remove(it.id)}
								onRetry={() => retry(it)}
							/>
						))}
					</ul>
				</ScrollArea>
			)}
		</div>
	)
}

/** One row of the queue. Exported for screens that keep their own queue but want the same row. */
export function FileQueueRow<T>({
	item,
	hasUpload = true,
	disabled = false,
	removable = true,
	onRemove,
	onRetry,
}: {
	item: DropzoneItem<T>
	hasUpload?: boolean
	disabled?: boolean
	removable?: boolean
	onRemove?: () => void
	onRetry?: () => void
}) {
	const { file, status, progress, error } = item
	const sent = Math.round((file.size * progress) / 100)
	return (
		<li className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
			<FileTypeIcon file={file} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{hasUpload && status === "uploading" ? (
					<Progress
						size="sm"
						value={progress}
						label={file.name}
						valueLabel={`${formatBytes(sent, 1)} of ${formatBytes(file.size, 1)}`}
					/>
				) : (
					<>
						<span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{file.name}</span>
						<span
							className={cn(
								"flex min-w-0 items-center gap-1 text-xs",
								status === "error" ? "text-rose-600 dark:text-rose-400" : "text-neutral-500 dark:text-neutral-400"
							)}
						>
							{status === "error" ? (
								<span className="min-w-0 truncate">{error ?? "The upload failed."}</span>
							) : (
								<>
									<span className="shrink-0">{formatBytes(file.size, 1)}</span>
									{hasUpload && status === "queued" && <span className="truncate">· waiting</span>}
									{hasUpload && status === "done" && (
										<span className="flex items-center gap-1 truncate">
											· <Check className="size-3 shrink-0" aria-hidden /> uploaded
										</span>
									)}
								</>
							)}
						</span>
					</>
				)}
			</div>
			{status === "error" && onRetry && (
				<button
					type="button"
					onClick={onRetry}
					disabled={disabled}
					aria-label={`Try ${file.name} again`}
					className="grid size-7 shrink-0 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
				>
					<RotateCcw className="size-3.5" />
				</button>
			)}
			{removable && onRemove && (
				<button
					type="button"
					onClick={onRemove}
					disabled={disabled}
					aria-label={status === "uploading" ? `Cancel ${file.name}` : `Remove ${file.name}`}
					className="grid size-7 shrink-0 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
				>
					<X className="size-3.5" />
				</button>
			)}
		</li>
	)
}
