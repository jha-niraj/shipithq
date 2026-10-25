import * as React from "react"
import {
	File as FileIcon,
	FileArchive,
	FileAudio,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	Presentation,
	type LucideIcon,
} from "lucide-react"

import { cn } from "../../lib/utils"

/**
 * An icon for a file by its kind (ReUI file-type idea), read from the MIME type and/or the name's extension.
 * Neutral ink only - no coloured fills: the name and size beside it carry the meaning (AGENTS.md colour rule).
 */

export type FileKind = "pdf" | "image" | "sheet" | "doc" | "slides" | "audio" | "video" | "archive" | "other"

const EXT: Record<string, FileKind> = {
	pdf: "pdf",
	png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", heic: "image", heif: "image", svg: "image", bmp: "image", avif: "image",
	csv: "sheet", tsv: "sheet", xls: "sheet", xlsx: "sheet", ods: "sheet", numbers: "sheet",
	doc: "doc", docx: "doc", odt: "doc", rtf: "doc", txt: "doc", md: "doc", pages: "doc",
	ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
	mp3: "audio", wav: "audio", m4a: "audio", aac: "audio", ogg: "audio", oga: "audio", flac: "audio", weba: "audio",
	mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video", m4v: "video",
	zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
}

/** The kind of a file from its MIME type and/or name. The MIME type wins when it is specific. */
export function fileKind(input: { type?: string | null; name?: string | null }): FileKind {
	const mime = (input.type ?? "").split(";")[0]!.trim().toLowerCase()
	if (mime === "application/pdf") return "pdf"
	if (mime.startsWith("image/")) return "image"
	if (mime.startsWith("audio/")) return "audio"
	if (mime.startsWith("video/")) return "video"
	if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") return "sheet"
	if (mime.includes("presentation") || mime.includes("powerpoint")) return "slides"
	if (mime.includes("wordprocessing") || mime === "application/msword" || mime.startsWith("text/")) return "doc"
	if (mime.includes("zip") || mime.includes("compressed") || mime.includes("x-tar")) return "archive"
	const ext = (input.name ?? "").toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1]
	return (ext && EXT[ext]) || "other"
}

const ICONS: Record<FileKind, LucideIcon> = {
	pdf: FileText,
	image: FileImage,
	sheet: FileSpreadsheet,
	doc: FileText,
	slides: Presentation,
	audio: FileAudio,
	video: FileVideo,
	archive: FileArchive,
	other: FileIcon,
}

/** A short word for the kind, for screen readers and meta lines ("PDF", "Spreadsheet"...). */
export const FILE_KIND_LABEL: Record<FileKind, string> = {
	pdf: "PDF",
	image: "Image",
	sheet: "Spreadsheet",
	doc: "Document",
	slides: "Slides",
	audio: "Audio",
	video: "Video",
	archive: "Archive",
	other: "File",
}

type FileTypeIconProps = {
	/** A File, or anything with a MIME `type` and/or a `name`. */
	file?: { type?: string | null; name?: string | null }
	/** Or pass the kind directly. */
	kind?: FileKind
	/** `chip` draws the icon in a small neutral rounded square (for list rows); `bare` is the glyph alone. */
	variant?: "chip" | "bare"
	className?: string
	iconClassName?: string
}

export function FileTypeIcon({ file, kind, variant = "chip", className, iconClassName }: FileTypeIconProps) {
	const k = kind ?? fileKind(file ?? {})
	const Icon = ICONS[k]
	if (variant === "bare") {
		return <Icon aria-label={FILE_KIND_LABEL[k]} className={cn("size-4 shrink-0 text-neutral-500 dark:text-neutral-400", className, iconClassName)} />
	}
	return (
		<span
			role="img"
			aria-label={FILE_KIND_LABEL[k]}
			className={cn(
				"relative grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
				className
			)}
		>
			<Icon aria-hidden className={cn("size-4", iconClassName)} />
		</span>
	)
}
