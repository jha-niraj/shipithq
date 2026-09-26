"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import {
    Check, ChevronDown, ChevronRight, Download, FileText, Folder, FolderInput, FolderOpen, FolderPlus, MoreVertical, Trash2, Upload, X,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { cn } from "@repo/ui/lib/utils"
import {
    createDocFolder, deleteDocFolder, deleteDocument, getDocumentUrl, listDocsTree, moveDocumentToFolder,
} from "@/actions/documents"
import type { DocFile, DocTree } from "@/lib/documents"

/*
 * The company's documents (plan/hiring-app HA-13), ported from gurukulhq's docs
 * explorer: the list with folders on the left, a preview on the right. Files
 * are private: the preview and Open use a signed link that lasts minutes.
 * Everything here is readable by the company's AI panel.
 */

function fmtBytes(b: number | null) {
    if (!b) return "-"
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
}
const isPdf = (f: DocFile) => (f.mimeType ?? "").includes("pdf") || /\.pdf$/i.test(f.name)

/** A name that ellipsises when it runs out of room, with the full name in a tooltip. */
function TruncatedName({ name, className }: { name: string; className?: string }) {
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild><span className={cn("min-w-0 max-w-full truncate", className)}>{name}</span></TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-[320px] break-words">{name}</TooltipContent>
        </Tooltip>
    )
}

export function DocsExplorer({ initialTree }: { initialTree: DocTree }) {
    const [tree, setTree] = useState<DocTree>(initialTree)
    const [search, setSearch] = useState("")
    const [pending, startTransition] = useTransition()
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [creatingFolder, setCreatingFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [uploadFolderId, setUploadFolderId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const allFiles = useMemo(() => [...tree.looseFiles, ...tree.folders.flatMap((f) => f.files)], [tree])
    const firstFile = tree.looseFiles[0] ?? tree.folders.find((f) => f.files.length > 0)?.files[0] ?? null

    // Select the first file by default, and keep the selection valid after refreshes.
    useEffect(() => {
        if (selectedId && allFiles.some((f) => f.id === selectedId)) return
        setSelectedId(firstFile?.id ?? null)
        if (firstFile) {
            const inFolder = tree.folders.find((f) => f.files.some((x) => x.id === firstFile.id))
            if (inFolder) setExpanded((prev) => new Set(prev).add(inFolder.id))
        }
    }, [allFiles, firstFile, selectedId, tree.folders])

    const selected = allFiles.find((f) => f.id === selectedId) ?? null

    useEffect(() => {
        let active = true
        if (!selected) { setPreviewUrl(null); return }
        setPreviewLoading(true)
        getDocumentUrl(selected.id)
            .then((r) => { if (active) setPreviewUrl(r.success ? r.data.url : null) })
            .finally(() => { if (active) setPreviewLoading(false) })
        return () => { active = false }
    }, [selected])

    const refresh = (q = search) => {
        startTransition(async () => {
            const r = await listDocsTree(q || undefined)
            if (r.success) setTree(r.data)
        })
    }

    // Debounced search.
    useEffect(() => {
        const t = setTimeout(() => refresh(search), 250)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const toggleFolder = (key: string) => setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key); else next.add(key)
        return next
    })

    const upload = (file: File, folderId: string | null) => {
        setUploading(true)
        const fd = new FormData()
        fd.append("file", file)
        if (folderId) fd.append("folderId", folderId)
        fetch("/api/ai/documents", { method: "POST", body: fd })
            .then((res) => res.json() as Promise<{ id?: string; error?: string }>)
            .then((data) => {
                if (data.id) {
                    toast.success("Uploaded. The AI can read it now.")
                    if (folderId) setExpanded((prev) => new Set(prev).add(folderId))
                    setSelectedId(data.id)
                    refresh()
                } else toast.error(data.error ?? "Upload failed")
            })
            .catch(() => toast.error("Upload failed"))
            .finally(() => setUploading(false))
    }

    const confirmUpload = () => {
        if (!pendingFile) return
        const file = pendingFile
        setPendingFile(null)
        upload(file, uploadFolderId)
    }

    const handleCreateFolder = () => {
        const name = newFolderName.trim()
        if (!name) { setCreatingFolder(false); return }
        startTransition(async () => {
            const r = await createDocFolder(name)
            if (r.success) { toast.success("Folder created"); setNewFolderName(""); setCreatingFolder(false); refresh(); setExpanded((prev) => new Set(prev).add(r.data.id)) }
            else toast.error(r.error)
        })
    }

    const handleMove = (fileId: string, folderId: string | null) => {
        startTransition(async () => {
            const r = await moveDocumentToFolder(fileId, folderId)
            if (r.success) { toast.success(folderId ? "Moved to folder" : "Moved to the top level"); refresh() }
            else toast.error(r.error)
        })
    }

    const handleDeleteFile = (fileId: string) => {
        startTransition(async () => {
            const r = await deleteDocument(fileId)
            if (r.success) { toast.success("Deleted"); if (selectedId === fileId) setSelectedId(null); refresh() }
            else toast.error(r.error)
        })
    }

    const handleDeleteFolder = (folderId: string) => {
        startTransition(async () => {
            const r = await deleteDocFolder(folderId)
            if (r.success) { toast.success("Folder removed; its files are kept"); refresh() }
            else toast.error(r.error)
        })
    }

    const isEmpty = tree.looseFiles.length === 0 && tree.folders.length === 0

    return (
        <TooltipProvider>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row">
                {/* ── Left: files and folders ── */}
                <div className="flex min-h-0 w-full flex-col gap-3 lg:w-1/3 lg:min-w-[280px] lg:max-w-[400px]">
                    <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" className="flex-1 gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? <InlineLoader size="sm" /> : <Upload className="h-3.5 w-3.5" />} Upload
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreatingFolder(true)}>
                            <FolderPlus className="h-3.5 w-3.5" /> Folder
                        </Button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.csv"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadFolderId(null); setPendingFile(f) } e.target.value = "" }} />
                    </div>

                    <div className="relative shrink-0">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="h-9 pr-8" aria-label="Search documents" />
                        {pending && <span className="absolute right-2.5 top-1/2 -translate-y-1/2"><InlineLoader size="sm" /></span>}
                    </div>

                    {creatingFolder && (
                        <div className="flex shrink-0 items-center gap-2.5">
                            <Input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") } }}
                                placeholder="Folder name" className="h-8 text-sm" aria-label="Folder name" />
                            <Button size="icon" aria-label="Create folder" className="h-9 w-9 shrink-0" onClick={handleCreateFolder}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" aria-label="Cancel" className="h-9 w-9 shrink-0" onClick={() => { setCreatingFolder(false); setNewFolderName("") }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                    )}

                    <div className="max-h-72 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:max-h-none dark:border-neutral-800 dark:bg-neutral-900">
                        {isEmpty ? (
                            <div className="px-6 py-10 text-center">
                                <p className="font-medium text-neutral-900 dark:text-white">No documents yet</p>
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Upload a JD or a hiring policy. Your company&apos;s AI reads them when answering and drafting.</p>
                            </div>
                        ) : (
                            // Radix wraps the viewport's children in a `display: table` box that grows to the
                            // widest name; pinning it to `block` makes the rows truncate at the column width.
                            <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:!block" orientation="vertical">
                                <div className="space-y-0.5 p-2">
                                    {tree.looseFiles.map((f) => (
                                        <FileRow key={f.id} file={f} selected={selectedId === f.id} onSelect={() => setSelectedId(f.id)} folders={tree.folders} onMove={handleMove} onDelete={handleDeleteFile} />
                                    ))}
                                    {tree.folders.map((fo) => {
                                        const open = expanded.has(fo.id)
                                        return (
                                            <div key={fo.id}>
                                                <div className="group flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                    <button type="button" onClick={() => toggleFolder(fo.id)} aria-expanded={open} className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left">
                                                        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
                                                        {open ? <FolderOpen className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-300" /> : <Folder className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-300" />}
                                                        <TruncatedName name={fo.name} className="text-sm font-medium text-neutral-800 dark:text-neutral-200" />
                                                        <span className="shrink-0 text-xs text-neutral-500">{fo.files.length}</span>
                                                    </button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button aria-label={`Actions for ${fo.name}`} className="shrink-0 cursor-pointer rounded p-1 text-neutral-500 opacity-100 hover:text-neutral-800 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:text-neutral-200"><MoreVertical className="h-3.5 w-3.5" /></button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleDeleteFolder(fo.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete folder (keep files)</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {open && (
                                                    <div className="ml-2 min-w-0 border-l border-neutral-100 pl-1 dark:border-neutral-800">
                                                        {fo.files.length === 0
                                                            ? <p className="px-3 py-2 text-xs text-neutral-500">Empty. Move files here.</p>
                                                            : fo.files.map((f) => (
                                                                <FileRow key={f.id} file={f} selected={selectedId === f.id} onSelect={() => setSelectedId(f.id)} folders={tree.folders} onMove={handleMove} onDelete={handleDeleteFile} />
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>

                {/* ── Right: the preview ── */}
                <div className="min-h-[24rem] min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:min-h-0 dark:border-neutral-800 dark:bg-neutral-950">
                    {!selected ? (
                        <div className="flex h-full items-center justify-center p-6 text-center">
                            <div>
                                <p className="font-medium text-neutral-900 dark:text-white">No document selected</p>
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Pick a file to preview it here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col">
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <TruncatedName name={selected.name} className="text-sm font-semibold text-neutral-900 dark:text-white" />
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {fmtBytes(selected.sizeBytes)} · {selected.chars.toLocaleString("en-IN")} characters the AI can read{selected.truncated ? " (the rest was cut)" : ""}
                                    </p>
                                </div>
                                {previewUrl && (
                                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                                        <Download className="h-3.5 w-3.5" /> Open
                                    </Button>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 bg-neutral-50 dark:bg-neutral-900/40">
                                {previewLoading ? (
                                    <div className="h-full p-3"><Shimmer className="h-full w-full rounded-lg" /></div>
                                ) : !previewUrl ? (
                                    <div className="flex h-full items-center justify-center p-6 text-sm text-neutral-600 dark:text-neutral-400">Couldn&apos;t load a preview. Try Open.</div>
                                ) : isPdf(selected) ? (
                                    <iframe title={selected.name} src={previewUrl} className="h-full w-full" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                                        <FileText className="h-10 w-10 text-neutral-400" />
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300">No preview for this kind of file.</p>
                                        <Button size="sm" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Open</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Choosing a folder for an upload ── */}
                <Dialog open={!!pendingFile} onOpenChange={(o) => { if (!o) setPendingFile(null) }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Choose a folder</DialogTitle>
                            <DialogDescription>{pendingFile ? `"${pendingFile.name}" ` : ""}goes into the folder you pick. Leave it at the top level to file it later.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="-mx-1 px-1" viewportClassName="max-h-64">
                            <div className="space-y-1 py-1">
                                {[{ id: null as string | null, name: "Top level (no folder)", count: null as number | null }, ...tree.folders.map((f) => ({ id: f.id as string | null, name: f.name, count: f.files.length as number | null }))].map((o) => (
                                    <button key={o.id ?? "root"} type="button" onClick={() => setUploadFolderId(o.id)}
                                        className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                                            uploadFolderId === o.id ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
                                        {o.id ? <Folder className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-400" /> : <FileText className="h-4 w-4 shrink-0 text-neutral-500" />}
                                        <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">{o.name}</span>
                                        {o.count !== null && <span className="shrink-0 text-xs text-neutral-500">{o.count}</span>}
                                        {uploadFolderId === o.id && <Check className="h-4 w-4 shrink-0 text-neutral-900 dark:text-white" />}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPendingFile(null)}>Cancel</Button>
                            <Button onClick={confirmUpload} className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}

function FileRow({ file, selected, onSelect, folders, onMove, onDelete }: {
    file: DocFile
    selected: boolean
    onSelect: () => void
    folders: { id: string; name: string }[]
    onMove: (fileId: string, folderId: string | null) => void
    onDelete: (fileId: string) => void
}) {
    return (
        <div className={cn("group flex min-w-0 items-center gap-1 rounded-lg pr-1", selected ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
            <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5 text-left">
                <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                <TruncatedName name={file.name} className="text-sm text-neutral-800 dark:text-neutral-200" />
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button aria-label={`Actions for ${file.name}`} className="shrink-0 cursor-pointer rounded p-1 text-neutral-500 opacity-100 hover:text-neutral-800 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:text-neutral-200"><MoreVertical className="h-3.5 w-3.5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to folder</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {file.folderId && <DropdownMenuItem onClick={() => onMove(file.id, null)}>Top level (no folder)</DropdownMenuItem>}
                            {folders.filter((fo) => fo.id !== file.folderId).map((fo) => <DropdownMenuItem key={fo.id} onClick={() => onMove(file.id, fo.id)}>{fo.name}</DropdownMenuItem>)}
                            {folders.length === 0 && <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(file.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
