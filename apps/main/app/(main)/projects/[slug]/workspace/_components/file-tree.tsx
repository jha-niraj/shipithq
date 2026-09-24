'use client'

import { useState } from 'react'
import { ChevronRight, FilePlus, FolderPlus, Lock, PanelRightClose, Pencil, Trash2 } from 'lucide-react'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { cn } from '@repo/ui/lib/utils'
import { FileIcon } from './file-icon'
import { buildTree, type TreeNode } from './workspace-model'

interface FileTreeProps {
    paths: string[]
    /** Folders the user made that hold no file yet. */
    emptyFolders: string[]
    readonly: ReadonlySet<string>
    dirty: ReadonlySet<string>
    active: string | null
    onOpen: (path: string) => void
    onCreate: (path: string) => Promise<boolean>
    onCreateFolder: (path: string) => boolean
    onRename: (from: string, to: string) => Promise<boolean>
    onDelete: (path: string) => Promise<boolean>
    /** Move a file into a folder ("" is the root). A move is a rename. */
    onMove: (from: string, toFolder: string) => Promise<boolean>
    onHide: () => void
}

const DRAG_TYPE = 'application/x-workspace-path'

type Draft = { kind: 'file' | 'folder'; parent: string } | null

/*
 * The explorer, on the RIGHT as in Niraj's VS Code screenshot (2026-09-23).
 *
 * New file and new folder from the header (at the root) or from any folder's
 * hover actions (inside it), named in place the way an editor does it. Delete
 * asks first, in an app dialog. Test files are read-only and show a lock: the
 * learner's job is to make them pass, not to edit them.
 *
 * A new folder exists only here until a file goes into it - the database
 * stores files, not folders, the same way git does not track an empty one.
 */
export function FileTree({ paths, emptyFolders, readonly, dirty, active, onOpen, onCreate, onCreateFolder, onRename, onDelete, onMove, onHide }: FileTreeProps) {
    const [open, setOpen] = useState<Record<string, boolean>>({ '/src': true, '/tests': true })
    const [draft, setDraft] = useState<Draft>(null)
    const [renaming, setRenaming] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    // The folder a dragged file is over ("" = the root), for the highlight.
    const [dropTarget, setDropTarget] = useState<string | null>(null)
    const tree = buildTree(paths, emptyFolders)

    /*
     * Drag a file onto a folder to move it there, or onto the empty space
     * below the tree to move it to the root (Niraj, 2026-09-24). Test files
     * are not draggable: they are read-only, and their place is fixed.
     */
    const dropHandlers = (folder: string) => ({
        onDragOver: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            if (dropTarget !== folder) setDropTarget(folder)
        },
        onDragLeave: (e: React.DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget((t) => (t === folder ? null : t))
        },
        onDrop: async (e: React.DragEvent) => {
            const from = e.dataTransfer.getData(DRAG_TYPE)
            setDropTarget(null)
            if (!from) return
            e.preventDefault()
            e.stopPropagation()
            const currentFolder = from.slice(0, from.lastIndexOf('/'))
            if (currentFolder === folder) return
            const ok = await onMove(from, folder)
            if (ok && folder) setOpen((o) => ({ ...o, [folder]: true }))
        },
    })

    const startDraft = (kind: 'file' | 'folder', parent: string) => {
        if (parent) setOpen((o) => ({ ...o, [parent]: true }))
        setDraft({ kind, parent })
    }

    const submitDraft = async (name: string) => {
        if (!draft) return
        const clean = name.replace(/^\/+|\/+$/g, '')
        if (!clean) return
        const full = `${draft.parent}/${clean}`
        const ok = draft.kind === 'file' ? await onCreate(full) : onCreateFolder(full)
        if (ok) {
            if (draft.kind === 'folder') setOpen((o) => ({ ...o, [full]: true }))
            setDraft(null)
        }
    }

    const draftRow = (parent: string, depth: number) =>
        draft && draft.parent === parent ? (
            <li className="flex items-center gap-1.5 pr-2" style={{ paddingLeft: 8 + depth * 12 + 18 }}>
                {draft.kind === 'folder'
                    ? <FolderPlus className="h-4 w-4 shrink-0 text-neutral-500" />
                    : <FilePlus className="h-4 w-4 shrink-0 text-neutral-500" />}
                <NameInput
                    placeholder={draft.kind === 'folder' ? 'folder name' : 'file name, e.g. utils.ts'}
                    onCancel={() => setDraft(null)}
                    onSubmit={submitDraft}
                />
            </li>
        ) : null

    const renderNode = (node: TreeNode, depth: number) => {
        const pad = { paddingLeft: 8 + depth * 12 }
        if (node.children) {
            const isOpen = open[node.path] ?? false
            return (
                <li key={node.path} {...dropHandlers(node.path)} className={cn(dropTarget === node.path && 'bg-neutral-200/60 outline outline-1 -outline-offset-1 outline-neutral-400 dark:bg-neutral-800/60 dark:outline-neutral-600')}>
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={() => setOpen((o) => ({ ...o, [node.path]: !isOpen }))}
                            style={pad}
                            className="flex h-[26px] w-full cursor-pointer items-center gap-1 pr-14 text-left text-[13px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
                        >
                            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform', isOpen && 'rotate-90')} />
                            <span className="truncate">{node.name}</span>
                        </button>
                        <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                            <IconAction label={`New file in ${node.name}`} onClick={() => startDraft('file', node.path)}><FilePlus className="h-3.5 w-3.5" /></IconAction>
                            <IconAction label={`New folder in ${node.name}`} onClick={() => startDraft('folder', node.path)}><FolderPlus className="h-3.5 w-3.5" /></IconAction>
                        </span>
                    </div>
                    {isOpen && (
                        <ul>
                            {draftRow(node.path, depth + 1)}
                            {node.children.map((c) => renderNode(c, depth + 1))}
                        </ul>
                    )}
                </li>
            )
        }

        const isReadonly = readonly.has(node.path)
        if (renaming === node.path) {
            return (
                <li key={node.path} className="flex items-center gap-1.5 pr-2" style={{ paddingLeft: 8 + depth * 12 + 18 }}>
                    <FileIcon path={node.path} />
                    <NameInput
                        initial={node.path.slice(1)}
                        onCancel={() => setRenaming(null)}
                        onSubmit={async (value) => {
                            const ok = await onRename(node.path, '/' + value.replace(/^\/+/, ''))
                            if (ok) setRenaming(null)
                        }}
                    />
                </li>
            )
        }
        return (
            <li key={node.path} className="group relative">
                <button
                    type="button"
                    onClick={() => onOpen(node.path)}
                    draggable={!isReadonly}
                    onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_TYPE, node.path)
                        e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDropTarget(null)}
                    style={{ paddingLeft: 8 + depth * 12 + 18 }}
                    className={cn(
                        'flex h-[26px] w-full cursor-pointer items-center gap-1.5 pr-14 text-left text-[13px] transition-colors',
                        active === node.path
                            ? 'bg-neutral-200/70 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                            : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                    )}
                >
                    <FileIcon path={node.path} />
                    <span className="truncate">{node.name}</span>
                    {dirty.has(node.path) && <span aria-label="Unsaved" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />}
                </button>
                <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                    {isReadonly ? (
                        <Lock aria-label="Read-only" className="h-3.5 w-3.5 text-neutral-400" />
                    ) : (
                        <>
                            <IconAction label={`Rename ${node.name}`} onClick={() => setRenaming(node.path)}><Pencil className="h-3.5 w-3.5" /></IconAction>
                            <IconAction label={`Delete ${node.name}`} onClick={() => setDeleting(node.path)}><Trash2 className="h-3.5 w-3.5" /></IconAction>
                        </>
                    )}
                </span>
            </li>
        )
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-neutral-200 pl-3 pr-1.5 dark:border-neutral-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Explorer</span>
                <span className="flex items-center gap-0.5">
                    <IconAction label="New file" onClick={() => startDraft('file', '')} alwaysVisible><FilePlus className="h-4 w-4" /></IconAction>
                    <IconAction label="New folder" onClick={() => startDraft('folder', '')} alwaysVisible><FolderPlus className="h-4 w-4" /></IconAction>
                    <IconAction label="Hide explorer (Ctrl/Cmd+Alt+B)" onClick={onHide} alwaysVisible><PanelRightClose className="h-4 w-4" /></IconAction>
                </span>
            </div>
            <ScrollArea reflow className="min-h-0 flex-1">
                <div
                    {...dropHandlers('')}
                    className={cn('min-h-full pb-10', dropTarget === '' && 'bg-neutral-200/40 dark:bg-neutral-800/40')}
                >
                <ul className="py-1">
                    {draftRow('', 0)}
                    {tree.map((n) => renderNode(n, 0))}
                </ul>
                {tree.length === 0 && !draft && (
                    <p className="px-3 py-4 text-xs text-neutral-500 dark:text-neutral-400">No files yet. Create one with the buttons above.</p>
                )}
                </div>
            </ScrollArea>

            <AlertDialog open={deleting !== null} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleting?.slice(1)}?</AlertDialogTitle>
                        <AlertDialogDescription>The file and its contents are removed from this project. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (deleting) await onDelete(deleting)
                                setDeleting(null)
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function IconAction({ label, onClick, children, alwaysVisible }: { label: string; onClick: () => void; children: React.ReactNode; alwaysVisible?: boolean }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={cn(
                'flex h-6 w-6 cursor-pointer items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-white',
                !alwaysVisible && 'opacity-0 group-hover:opacity-100'
            )}
        >
            {children}
        </button>
    )
}

function NameInput({ initial = '', placeholder, onSubmit, onCancel }: { initial?: string; placeholder?: string; onSubmit: (value: string) => void; onCancel: () => void }) {
    const [value, setValue] = useState(initial)
    return (
        <input
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) onSubmit(value.trim())
                if (e.key === 'Escape') onCancel()
            }}
            onBlur={onCancel}
            aria-label={placeholder ?? 'Name'}
            className="h-6 min-w-0 flex-1 rounded border border-neutral-400 bg-white px-1.5 font-mono text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
        />
    )
}
