'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
    AlertTriangle, ArrowLeft, Book, Brain, ChevronDown, ChevronUp, Code2, FlaskConical, GraduationCap, ListTodo,
    Mic, MonitorPlay, Presentation, Sparkles, PanelBottom, PanelLeft, PanelRight, PanelRightClose, PanelRightOpen, Play, TerminalSquare, X,
} from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { isSetupSprint, sprintLabel } from '@/lib/projects/sprints'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/components/ui/tooltip'
import { createFile, deleteFile, renameFile, saveFile, type WorkspaceFile } from '@/actions/(main)/projects/workspace.action'
import { saveTaskNote, updateTaskStatus } from '@/actions/(main)/projects/project.action'
import ResourcesList from '@/components/projects/resources-list'
import ErrorsTab from '@/components/projects/errors-tab'
import DailyStandupTab from '../../_components/daily-standup-tab'
import { useMonaco } from '@monaco-editor/react'
import { WORKSPACE_EDITOR } from '@/lib/projects/flags'
import { AiAssistant } from './ai-assistant'
import { configureCompiler, loadWorkspaceTypes, syncProjectModels, type MonacoLike } from './editor-types'
import { ConsoleCount, ConsolePane, PreviewPane, RuntimeProvider, TestBridge, type RunTests, type TestRun } from './runtime'
import { TestsPanel } from './tests-panel'
import { CodePane } from './code-pane'
import { EditorSettingsMenu } from './editor-settings'
import { EditorTabs } from './editor-tabs'
import { FileTree } from './file-tree'
import { FullPage } from './sprint-pages'
import { FinalMockTab, SprintMockTab } from './sprint-mock'
import { FinalQuizTab, SprintQuizTab } from './sprint-quiz'
import { TaskBrief } from './task-brief'
import { TaskPanel, type SprintPage } from './task-panel'
import {
    AI_TAB, DEFAULT_EDITOR_SETTINGS, TASK_TAB, baseName, foldersOf, isPinned, isVirtual, languageOf, loadEditorSettings,
    loadTabs, saveEditorSettings, saveTabs, withPinned, type EditorSettings, type VirtualTab,
} from './workspace-model'

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'

export interface WorkspaceTask {
    id: string
    number: number
    title: string
    description: string[]
    criteria: string[]
    hints: string[]
    estimatedTime: string | null
    difficulty: string
    /** The test file that checks this task (WS-5); null means ticked by hand. */
    testPath: string | null
    status: string
    /** The learner's note on finishing it (plan/project-repos RP-6). */
    note: string | null
}

export interface WorkspaceSprint {
    id: string
    number: number
    name: string
    goal: string
    tasks: WorkspaceTask[]
}

type BottomPanel = 'tests' | 'console'

const AUTOSAVE_MS = 800

interface WorkspaceClientProps {
    project: { id: string; slug: string; title: string; forkedFrom: { slug: string; title: string } | null; runtime: 'browser' | 'server' }
    sprints: WorkspaceSprint[]
    initialFiles: WorkspaceFile[]
    currentUserId: string
    userCredits: number
}

/*
 * The project workspace (plan/project-workspace WS-3, WS-3b): tasks on the
 * left, the editor with real tabs in the middle, the running preview beside it,
 * the explorer on the right, tests and console underneath.
 *
 * Tabs hold files AND pages: Task, the sprint's Quiz and Mock interview,
 * Resources, Errors and Standup open in the editor area at full size, while
 * the task list stays on the left (Niraj, 2026-09-24).
 *
 * Where you are lives in the URL (?task, ?sprint, ?file, ?bottom); which tabs
 * are open lives in localStorage, per project.
 */
export function WorkspaceClient({ project, sprints: initialSprints, initialFiles, currentUserId, userCredits }: WorkspaceClientProps) {
    const searchParams = useSearchParams()

    // ── Files ────────────────────────────────────────────────────────────────
    const [files, setFiles] = useState<Record<string, WorkspaceFile>>(
        () => Object.fromEntries(initialFiles.map((f) => [f.path, f]))
    )
    // Text the editor holds that has not been saved. Only real differences live
    // here: an edit that matches the saved text removes the entry.
    const [buffers, setBuffers] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(0)
    const [saveError, setSaveError] = useState(false)
    const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const [emptyFolders, setEmptyFolders] = useState<string[]>([])
    // The latest files, for callbacks that outlive a render: a save timer set
    // while an earlier save was in flight must send the NEW version stamp, or
    // every quick second edit reads as "changed in another tab".
    const filesRef = useRef(files)
    filesRef.current = files

    const paths = useMemo(() => Object.keys(files).sort(), [files])
    const pathSet = useMemo(() => new Set(paths), [paths])
    const readonly = useMemo(() => new Set(paths.filter((p) => files[p]!.isReadonly)), [paths, files])
    const dirty = useMemo(() => new Set(Object.keys(buffers).filter((p) => files[p])), [buffers, files])
    // What the runtime runs: the editor's text where there is unsaved text, the
    // saved file otherwise - so the preview follows typing, not saving (WS-4).
    const liveFiles = useMemo(() => {
        const out: Record<string, string> = {}
        for (const [path, f] of Object.entries(files)) out[path] = buffers[path] ?? f.content
        return out
    }, [files, buffers])
    // Code is written on the learner's machine in V1 (plan/project-repos RP-2):
    // with the editor off, nothing below that runs code - Monaco, the runtime,
    // the explorer, tests, console - is mounted at all.
    const editorOn = WORKSPACE_EDITOR
    const runsInBrowser = editorOn && project.runtime === 'browser'
    // An empty folder stops being "empty" the moment a file lands in it.
    const shownEmptyFolders = useMemo(() => {
        const held = new Set(foldersOf(paths))
        return emptyFolders.filter((f) => !held.has(f))
    }, [emptyFolders, paths])

    // ── Tasks ────────────────────────────────────────────────────────────────
    const [sprints, setSprints] = useState(initialSprints)
    const allTasks = useMemo(() => sprints.flatMap((sp) => sp.tasks.map((t) => ({ sprint: sp, task: t }))), [sprints])
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
    const current = allTasks.find((x) => x.task.id === activeTaskId) ?? null
    // Which sprint the Quiz and Mock interview tabs are showing.
    const [pageSprintId, setPageSprintId] = useState<string | null>(null)
    // Never Setup: it has no quiz or mock interview (plan/project-repos RP-3).
    const buildSprints = useMemo(() => sprints.filter((sp) => !isSetupSprint(sp.number)), [sprints])
    const pageSprint = buildSprints.find((sp) => sp.id === pageSprintId)
        ?? buildSprints.find((sp) => sp.id === current?.sprint.id)
        ?? buildSprints[0] ?? null

    // ── Layout ───────────────────────────────────────────────────────────────
    const [tabs, setTabs] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<string | null>(null)
    const [sideOpen, setSideOpen] = useState(true)
    const [previewOpen, setPreviewOpen] = useState(true)
    const [explorerOpen, setExplorerOpen] = useState(true)
    const [bottom, setBottom] = useState<BottomPanel>('tests')
    const [bottomOpen, setBottomOpen] = useState(true)
    const [settings, setSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS)
    const restored = useRef(false)
    // The editor's open tabs are kept under their own key while it is off, so
    // turning it back on finds the file tabs where the learner left them.
    const tabsStore = editorOn ? project.id : `${project.id}:control`

    // Restore once: localStorage for the open tabs and editor settings, the URL
    // for where you are. The URL wins for the active tab; stored tabs come back.
    useEffect(() => {
        setSettings(loadEditorSettings())
        const saved = loadTabs(tabsStore, editorOn ? pathSet : NO_FILES)
        let nextTabs = saved.tabs
        let nextActive = saved.active

        const urlFile = searchParams.get('file')
        if (urlFile && ((editorOn && pathSet.has(urlFile)) || isVirtual(urlFile))) {
            if (!nextTabs.includes(urlFile)) nextTabs = [...nextTabs, urlFile]
            nextActive = urlFile
        }
        const urlTask = allTasks.find((x) => x.task.id === searchParams.get('task'))
        const firstOpen = allTasks.find((x) => x.task.status !== 'COMPLETED') ?? allTasks[0]
        setActiveTaskId((urlTask ?? firstOpen)?.task.id ?? null)
        const urlSprint = searchParams.get('sprint')
        if (urlSprint && sprints.some((sp) => sp.id === urlSprint)) setPageSprintId(urlSprint)

        // A first visit: the brief, and the file you will most likely edit.
        if (nextTabs.filter((t) => !isPinned(t)).length === 0 && !nextActive) {
            nextTabs = editorOn ? ['/src/App.tsx', '/src/App.jsx'].filter((p) => pathSet.has(p)).slice(0, 1) : []
            nextActive = TASK_TAB
        }
        // The AI and the Task tab are pinned: always there, always first.
        nextTabs = withPinned(nextTabs)
        setTabs(nextTabs)
        setActiveTab(nextActive ?? nextTabs[0] ?? null)

        const urlBottom = searchParams.get('bottom')
        if (urlBottom === 'console' || urlBottom === 'tests') setBottom(urlBottom)
        restored.current = true
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on first render
    }, [])

    useEffect(() => {
        if (restored.current) saveTabs(tabsStore, { tabs, active: activeTab })
    }, [tabsStore, tabs, activeTab])

    const updateSettings = (next: EditorSettings) => {
        setSettings(next)
        saveEditorSettings(next)
    }

    const isSprintPage = activeTab === '@quiz' || activeTab === '@mock'

    // Written with the history API, not the router: the router would refetch
    // the server component on every click (same as the board, PJ-17).
    useEffect(() => {
        if (!restored.current) return
        const params = new URLSearchParams(window.location.search)
        const put = (k: string, v: string | null) => (v ? params.set(k, v) : params.delete(k))
        put('task', activeTaskId)
        put('sprint', isSprintPage ? pageSprint?.id ?? null : null)
        put('file', activeTab)
        put('bottom', !editorOn || bottom === 'tests' ? null : bottom)
        params.delete('panel')
        const next = params.toString()
        if (next !== window.location.search.replace(/^\?/, '')) {
            window.history.replaceState(window.history.state, '', next ? `?${next}` : window.location.pathname)
        }
    }, [activeTaskId, activeTab, bottom, isSprintPage, pageSprint?.id])

    // ── Tab actions ──────────────────────────────────────────────────────────
    const openTab = useCallback((tab: string) => {
        setTabs((t) => (t.includes(tab) ? t : [...t, tab]))
        setActiveTab(tab)
    }, [])

    const closeTab = useCallback((tab: string) => {
        if (isPinned(tab)) return
        setTabs((t) => {
            const i = t.indexOf(tab)
            const next = t.filter((x) => x !== tab)
            setActiveTab((a) => (a === tab ? next[Math.min(i, next.length - 1)] ?? null : a))
            return next
        })
    }, [])

    const openSprintPage = (kind: SprintPage, sprintId: string) => {
        setPageSprintId(sprintId)
        openTab(kind === 'quiz' ? '@quiz' : '@mock')
    }

    // ── Saving ───────────────────────────────────────────────────────────────
    const persist = useCallback(async (path: string, content: string) => {
        const file = filesRef.current[path]
        if (!file || file.isReadonly) return
        setSaving((n) => n + 1)
        const result = await saveFile(project.id, path, content, file.updatedAt)
        setSaving((n) => n - 1)
        if (result.success) {
            setSaveError(false)
            setFiles((f) => ({ ...f, [path]: result.data }))
            // Saved: drop the buffer, unless the user has typed on since.
            setBuffers((b) => {
                if (b[path] !== content) return b
                const { [path]: _saved, ...rest } = b
                return rest
            })
        } else if (result.conflict) {
            // Another tab saved this file. Keep what is in THIS editor, adopt the
            // newer version stamp, and say so: the next save is a deliberate overwrite.
            setFiles((f) => ({ ...f, [path]: { ...result.conflict!, content: result.conflict!.content } }))
            toast.error(`${baseName(path)} was changed in another tab. Save again to keep this version.`)
        } else {
            setSaveError(true)
            toast.error(result.error)
        }
    }, [project.id])

    const edit = useCallback((path: string, content: string) => {
        clearTimeout(saveTimers.current[path])
        // Matching the saved text is not a change (and must never schedule a save).
        if (filesRef.current[path]?.content === content) {
            setBuffers((b) => {
                if (!(path in b)) return b
                const { [path]: _same, ...rest } = b
                return rest
            })
            return
        }
        setBuffers((b) => ({ ...b, [path]: content }))
        saveTimers.current[path] = setTimeout(() => void persist(path, content), AUTOSAVE_MS)
    }, [persist])

    const saveNow = useCallback(() => {
        if (!activeTab || isVirtual(activeTab)) return
        const content = buffers[activeTab]
        if (content === undefined) return
        clearTimeout(saveTimers.current[activeTab])
        void persist(activeTab, content)
    }, [activeTab, buffers, persist])

    // VS Code's keys: Cmd/Ctrl+S saves, +W closes the tab, +B the tasks,
    // +J the tests and console, +Alt+B the explorer.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return
            // `code`, not `key`: with Alt held, macOS turns B into "∫".
            if (e.code === 'KeyW' && activeTab) { e.preventDefault(); closeTab(activeTab) }
            else if (e.code === 'KeyB' && !e.altKey) { e.preventDefault(); setSideOpen((o) => !o) }
            else if (!editorOn) return
            else if (e.code === 'KeyS') { e.preventDefault(); saveNow() }
            else if (e.code === 'KeyB') { e.preventDefault(); setExplorerOpen((o) => !o) }
            else if (e.code === 'KeyJ') { e.preventDefault(); setBottomOpen((o) => !o) }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [saveNow, closeTab, activeTab, editorOn])

    // Leaving with unsaved edits asks first.
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirty.size > 0) e.preventDefault() }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [dirty])

    // ── Explorer actions ─────────────────────────────────────────────────────
    const onCreate = async (path: string) => {
        const result = await createFile(project.id, path)
        if (!result.success) { toast.error(result.error); return false }
        setFiles((f) => ({ ...f, [result.data.path]: result.data }))
        openTab(result.data.path)
        return true
    }
    const onCreateFolder = (path: string) => {
        const clean = '/' + path.split('/').filter(Boolean).join('/')
        if (clean === '/' || pathSet.has(clean) || foldersOf(paths).includes(clean) || emptyFolders.includes(clean)) {
            toast.error('Something with that name already exists.')
            return false
        }
        setEmptyFolders((f) => [...f, clean])
        return true
    }
    const onRename = async (from: string, to: string) => {
        const result = await renameFile(project.id, from, to)
        if (!result.success) { toast.error(result.error); return false }
        setFiles((f) => {
            const { [from]: _old, ...rest } = f
            return { ...rest, [result.data.path]: result.data }
        })
        setBuffers((b) => {
            const { [from]: moved, ...rest } = b
            return moved === undefined ? rest : { ...rest, [result.data.path]: moved }
        })
        setTabs((t) => t.map((x) => (x === from ? result.data.path : x)))
        setActiveTab((a) => (a === from ? result.data.path : a))
        return true
    }
    const onMove = (from: string, toFolder: string) => onRename(from, `${toFolder}/${baseName(from)}`)
    const onDelete = async (path: string) => {
        const result = await deleteFile(project.id, path)
        if (!result.success) { toast.error(result.error); return false }
        clearTimeout(saveTimers.current[path])
        setFiles((f) => { const { [path]: _gone, ...rest } = f; return rest })
        setBuffers((b) => { const { [path]: _gone, ...rest } = b; return rest })
        closeTab(path)
        return true
    }

    // ── Task actions ─────────────────────────────────────────────────────────
    const selectTask = (taskId: string) => {
        setActiveTaskId(taskId)
        openTab(TASK_TAB)
    }
    const patchTask = (id: string, patch: Partial<WorkspaceTask>) =>
        setSprints((sps) => sps.map((sp) => ({ ...sp, tasks: sp.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })))
    const setTaskStatus = async (id: string, before: string, status: TaskStatus, note?: string) => {
        patchTask(id, { status })
        const result = await updateTaskStatus(id, status, note)
        if (!result.success) { patchTask(id, { status: before }); toast.error(result.error || 'Could not update the task') }
        else if (note) patchTask(id, { note })
        return result.success
    }
    const setStatus = async (status: TaskStatus, note?: string) =>
        current ? setTaskStatus(current.task.id, current.task.status, status, note) : false
    const saveNote = async (note: string) => {
        if (!current) return false
        const result = await saveTaskNote(current.task.id, note)
        if (!result.success) { toast.error(result.error); return false }
        patchTask(current.task.id, { note: result.data.note })
        return true
    }

    // ── Check task (WS-5) ────────────────────────────────────────────────────
    const runnerRef = useRef<RunTests | null>(null)
    const registerRunner = useCallback((run: RunTests | null) => { runnerRef.current = run }, [])
    const [checking, setChecking] = useState(false)
    const [lastRun, setLastRun] = useState<TestRun | null>(null)

    /*
     * Runs the task's test file against the editor's current text. All green
     * marks THAT task Done (decided 2026-09-24) - the one that was checked, even
     * if the learner switched tasks while it ran. A failing run never changes a
     * task that is already Done.
     */
    const checkTask = async () => {
        if (!current || !testPath || checking) return
        const runner = runnerRef.current
        if (!runner) { toast.error('The runtime is still starting. Try again in a moment.'); return }
        const { id, status: before, title } = current.task
        setBottomOpen(true)
        setBottom('tests')
        setChecking(true)
        try {
            const run = await runner(testPath)
            setLastRun(run)
            const green = !run.fileError && run.tests.length > 0 && run.tests.every((t) => t.status === 'pass')
            if (green && before !== 'COMPLETED') {
                if (await setTaskStatus(id, before, 'COMPLETED')) toast.success(`All tests pass. "${title}" is done.`)
            }
        } finally {
            setChecking(false)
        }
    }

    // The task's own test, if its file still exists (a learner can't delete a
    // read-only test, but a copy made before it existed would not have it).
    const testPath = current?.task.testPath && pathSet.has(current.task.testPath) ? current.task.testPath : null
    const doneCount = allTasks.filter((x) => x.task.status === 'COMPLETED').length
    const activeSprintPage = isSprintPage && pageSprint ? { kind: (activeTab === '@quiz' ? 'quiz' : 'mock') as SprintPage, sprintId: pageSprint.id } : null
    const saveLabel = saving > 0 ? 'Saving' : saveError ? 'Could not save' : dirty.size > 0 ? 'Unsaved changes' : 'All changes saved'

    const renderVirtual = (tab: VirtualTab) => {
        switch (tab) {
            case '@ai':
                return null // rendered outside the scroll area: it pins its own input row
            case '@task':
                return current
                    ? <TaskBrief sprint={current.sprint} task={current.task} testPath={editorOn ? testPath : null} onOpenFile={openTab} onStatus={setStatus} onSaveNote={saveNote} onCheck={runsInBrowser ? checkTask : undefined} checking={checking} />
                    : <Empty title="No task selected" body="Pick one from Tasks on the left." />
            case '@quiz':
                return pageSprint ? <SprintQuizTab sprint={pageSprint} /> : <Empty title="No sprints yet" body="A quiz belongs to a sprint." />
            case '@mock':
                return null // rendered outside the scroll area: it pins its own input row
            case '@final-quiz':
                return <FinalQuizTab projectId={project.id} title={project.title} sprints={sprints} />
            case '@final-mock':
                return null // rendered outside the scroll area: it pins its own input row
            case '@resources':
                return <FullPage title="Resources"><ResourcesList projectId={project.id} currentUserId={currentUserId} isCreator /></FullPage>
            case '@errors':
                return <FullPage><ErrorsTab projectId={project.id} isEnrolled isCreator /></FullPage>
            case '@standup':
                return <FullPage><DailyStandupTab projectId={project.id} projectSlug={project.slug} projectTitle={project.title} userCredits={userCredits} /></FullPage>
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Below lg there is not room for an editor worth using. */}
            <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center lg:hidden">
                <Code2 className="h-8 w-8 text-neutral-500" />
                <div>
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">The workspace needs a bigger screen</h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Open it on a laptop or desktop. Your progress and the plan are on the project page.</p>
                </div>
                <Link href={`/projects/${project.slug}`} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:text-white">
                    Back to the project
                </Link>
            </div>

            <div className="hidden h-screen min-h-0 flex-col bg-white text-neutral-900 dark:bg-black dark:text-neutral-100 lg:flex">
                {/* Title bar */}
                <header className="flex h-11 shrink-0 items-center gap-3 border-b border-neutral-200 px-3 dark:border-neutral-800">
                    <Link
                        href={`/projects/${project.slug}`}
                        className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{project.title}</span>
                    </Link>
                    {project.forkedFrom && (
                        <span className="hidden truncate text-xs text-neutral-500 xl:inline">your copy of {project.forkedFrom.title}</span>
                    )}
                    <div className="mx-auto min-w-0 max-w-md truncate text-center text-xs text-neutral-500 dark:text-neutral-400">
                        {activeTab === AI_TAB
                            ? <span className="text-neutral-800 dark:text-neutral-200">Project AI</span>
                            : isSprintPage && pageSprint
                            ? <>{sprintLabel(pageSprint.number)} · <span className="text-neutral-800 dark:text-neutral-200">{activeTab === '@quiz' ? 'Quiz' : 'Mock interview'}</span></>
                            : current ? <>{sprintLabel(current.sprint.number)} · <span className="text-neutral-800 dark:text-neutral-200">{current.task.title}</span></> : 'No task selected'}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{doneCount}/{allTasks.length} done</span>
                    {/* Layout toggles, as in VS Code's title bar. */}
                    <span className="flex shrink-0 items-center gap-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                        <LayoutToggle label="Tasks (Ctrl/Cmd+B)" on={sideOpen} onClick={() => setSideOpen((o) => !o)}><PanelLeft className="h-4 w-4" /></LayoutToggle>
                        {editorOn && <LayoutToggle label="Tests and console (Ctrl/Cmd+J)" on={bottomOpen} onClick={() => setBottomOpen((o) => !o)}><PanelBottom className="h-4 w-4" /></LayoutToggle>}
                        {editorOn && <LayoutToggle label="Explorer (Ctrl/Cmd+Alt+B)" on={explorerOpen} onClick={() => setExplorerOpen((o) => !o)}><PanelRight className="h-4 w-4" /></LayoutToggle>}
                    </span>
                </header>

                <div className="flex min-h-0 flex-1">
                    {/* Activity rail: Tasks shows and hides the list; the rest open tabs. */}
                    <TooltipProvider delayDuration={200}>
                        <nav
                            aria-label="Workspace"
                            className={cn(
                                'flex w-12 shrink-0 flex-col items-center gap-1 border-r border-neutral-200 pt-2 dark:border-neutral-800',
                                // Next's dev badge sits over this corner in development
                                // only; leave it room so the last rail buttons stay clickable.
                                process.env.NODE_ENV === 'development' ? 'pb-14' : 'pb-2'
                            )}
                        >
                            <RailButton label={sideOpen ? 'Hide tasks (Ctrl/Cmd+B)' : 'Show tasks (Ctrl/Cmd+B)'} active={sideOpen} onClick={() => setSideOpen((o) => !o)}><ListTodo className="h-5 w-5" /></RailButton>
                            <span className="my-1 h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
                            {([
                                { tab: '@ai', label: 'Project AI', icon: Sparkles },
                                { tab: '@quiz', label: 'Sprint quiz', icon: Brain },
                                { tab: '@mock', label: 'Sprint mock interview', icon: MonitorPlay },
                                { tab: '@resources', label: 'Resources', icon: Book },
                                { tab: '@errors', label: 'Errors', icon: AlertTriangle },
                                { tab: '@standup', label: 'Daily standup', icon: Mic },
                            ] as const).map(({ tab, label, icon: Icon }) => (
                                <RailButton key={tab} label={label} active={activeTab === tab} onClick={() => openTab(tab)}><Icon className="h-5 w-5" /></RailButton>
                            ))}
                            <span className="flex-1" />
                            {/* The project's final gates, at the foot of the rail
                                (Niraj, 2026-09-24), in place of the board link. */}
                            <span className="mb-1 h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
                            {/* Tabs here too, not links away (Niraj, 2026-09-24). */}
                            <RailButton label="Final quiz" active={activeTab === '@final-quiz'} onClick={() => openTab('@final-quiz')}><GraduationCap className="h-5 w-5" /></RailButton>
                            <RailButton label="Final mock interview" active={activeTab === '@final-mock'} onClick={() => openTab('@final-mock')}><Presentation className="h-5 w-5" /></RailButton>
                        </nav>
                    </TooltipProvider>

                    <PanelGroup orientation="horizontal" id="workspace-columns" className="flex min-h-0 min-w-0 flex-1">
                        {sideOpen && (
                            <>
                                <Panel id="side" defaultSize="16%" minSize="11%" maxSize="32%" className="flex min-w-0 flex-col border-r border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950">
                                    <TaskPanel
                                        sprints={sprints}
                                        activeTaskId={activeTaskId}
                                        activeSprintPage={activeSprintPage}
                                        onSelect={selectTask}
                                        onOpenSprintPage={openSprintPage}
                                    />
                                </Panel>
                                <Handle />
                            </>
                        )}

                        {/* Centre: editor + preview over tests/console */}
                        <Panel id="centre" minSize="35%" className="flex min-w-0 flex-col">
                            <RuntimeBoundary enabled={runsInBrowser} files={liveFiles}>
                            <PanelGroup orientation="vertical" id="workspace-centre" className="flex min-h-0 flex-1 flex-col">
                                <Panel id="editor" minSize="30%" className="flex min-h-0 flex-col">
                                    <PanelGroup orientation="horizontal" id="workspace-editor" className="flex min-h-0 flex-1">
                                        <Panel id="code" minSize="30%" className="flex min-w-0 flex-col">
                                            <EditorTabs
                                                tabs={tabs}
                                                active={activeTab}
                                                dirty={dirty}
                                                readonly={readonly}
                                                onSelect={setActiveTab}
                                                onClose={closeTab}
                                                onReorder={(next) => setTabs(withPinned(next))}
                                                trailing={editorOn && (
                                                    <>
                                                        <EditorSettingsMenu value={settings} onChange={updateSettings} />
                                                        <StripButton
                                                            label={previewOpen ? 'Hide preview' : 'Show preview'}
                                                            onClick={() => setPreviewOpen((o) => !o)}
                                                        >
                                                            {previewOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                                                        </StripButton>
                                                    </>
                                                )}
                                            />
                                            <div className="min-h-0 flex-1">
                                                {activeTab === AI_TAB ? (
                                                    <AiAssistant projectId={project.id} sprints={sprints} currentTaskId={activeTaskId} onPlanChanged={setSprints} />
                                                ) : activeTab === '@final-mock' ? (
                                                    <FinalMockTab projectId={project.id} title={project.title} sprints={sprints} />
                                                ) : activeTab === '@mock' ? (
                                                    pageSprint ? <SprintMockTab sprint={pageSprint} /> : <Empty title="No sprints yet" body="A mock interview belongs to a sprint." />
                                                ) : activeTab && isVirtual(activeTab) ? (
                                                    <ScrollArea reflow className="h-full">{renderVirtual(activeTab)}</ScrollArea>
                                                ) : editorOn && activeTab && files[activeTab] ? (
                                                    <CodePane
                                                        path={activeTab}
                                                        initialValue={buffers[activeTab] ?? files[activeTab]!.content}
                                                        readOnly={files[activeTab]!.isReadonly}
                                                        settings={settings}
                                                        onChange={edit}
                                                    />
                                                ) : (
                                                    <Empty title="Nothing open" body={editorOn ? 'Open a file from the explorer, or a task from the list.' : 'Open a task from the list, or a page from the rail.'} />
                                                )}
                                            </div>
                                        </Panel>
                                        {editorOn && previewOpen && (
                                            <>
                                                <Handle />
                                                <Panel id="preview" defaultSize="38%" minSize="20%" className="flex min-w-0 flex-col border-l border-neutral-200 dark:border-neutral-800">
                                                    {runsInBrowser ? (
                                                        <PreviewPane closeButton={<StripButton label="Close preview" onClick={() => setPreviewOpen(false)}><X className="h-4 w-4" /></StripButton>} />
                                                    ) : (
                                                        <>
                                                            <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-neutral-200 pl-3 pr-1.5 dark:border-neutral-800">
                                                                <Play className="h-3.5 w-3.5 text-neutral-500" />
                                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Preview</span>
                                                                <StripButton label="Close preview" onClick={() => setPreviewOpen(false)} className="ml-auto"><X className="h-4 w-4" /></StripButton>
                                                            </div>
                                                            <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
                                                                <Empty title="This project runs outside the browser" body="It needs a server, which the workspace does not run yet. You can still read and edit the code and work through the tasks." />
                                                            </div>
                                                        </>
                                                    )}
                                                </Panel>
                                            </>
                                        )}
                                    </PanelGroup>
                                </Panel>
                                {/* Closed, it leaves a bar in its own place to bring it back,
                                    rather than a link in the far corner (Niraj, 2026-09-24). */}
                                {editorOn && !bottomOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setBottomOpen(true)}
                                        title="Show tests and console (Ctrl/Cmd+J)"
                                        className="flex h-8 shrink-0 cursor-pointer items-center gap-3 border-t border-neutral-200 px-3 text-xs text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-950 dark:hover:text-white"
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        <span className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Tests</span>
                                        <span className="flex items-center gap-1.5"><TerminalSquare className="h-3.5 w-3.5" /> Console</span>
                                        <span className="ml-auto font-mono text-[10px] text-neutral-400">Ctrl/Cmd+J</span>
                                    </button>
                                )}
                                {editorOn && bottomOpen && <Handle vertical />}
                                {editorOn && bottomOpen && (
                                    <Panel id="bottom" defaultSize="26%" minSize="12%" className="flex min-h-0 flex-col border-t border-neutral-200 dark:border-neutral-800">
                                        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-neutral-200 px-2 dark:border-neutral-800">
                                            {([['tests', 'Tests', FlaskConical], ['console', 'Console', TerminalSquare]] as const).map(([key, label, Icon]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setBottom(key)}
                                                    className={cn(
                                                        'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                                                        bottom === key ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                                                    )}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                    {label}
                                                    {key === 'console' && runsInBrowser && <ConsoleCount />}
                                                </button>
                                            ))}
                                            <StripButton label="Hide panel (Ctrl/Cmd+J)" onClick={() => setBottomOpen(false)} className="ml-auto"><ChevronDown className="h-4 w-4" /></StripButton>
                                        </div>
                                        {bottom === 'console' && runsInBrowser ? (
                                            <div className="min-h-0 flex-1"><ConsolePane /></div>
                                        ) : (
                                            <ScrollArea reflow className="min-h-0 flex-1">
                                                <div className={cn(bottom === 'tests' ? '' : 'p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400')}>
                                                    {bottom === 'tests'
                                                        ? <TestsPanel testPath={testPath} checking={checking} run={lastRun} runsInBrowser={runsInBrowser} />
                                                        : <>This project does not run in the browser, so there is no console.</>}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </Panel>
                                )}
                            </PanelGroup>
                            {editorOn && <EditorTypesSync files={liveFiles} />}
                            {runsInBrowser && <TestBridge register={registerRunner} />}
                            {/* With the preview closed, the sandbox still needs a live
                                client, or tests could not run: it stays mounted,
                                off-screen, instead of unmounting. */}
                            {runsInBrowser && !previewOpen && (
                                <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 h-[600px] w-[800px] overflow-hidden opacity-0">
                                    <PreviewPane />
                                </div>
                            )}
                            </RuntimeBoundary>
                        </Panel>
                        {editorOn && explorerOpen && <Handle />}

                        {/* Explorer, on the right; hidden from its header, the title
                            bar or Ctrl/Cmd+Alt+B. */}
                        {editorOn && explorerOpen && (
                        <Panel id="explorer" defaultSize="16%" minSize="11%" maxSize="32%" className="flex min-w-0 flex-col border-l border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950">
                            <FileTree
                                paths={paths}
                                emptyFolders={shownEmptyFolders}
                                readonly={readonly}
                                dirty={dirty}
                                active={activeTab}
                                onOpen={openTab}
                                onCreate={onCreate}
                                onCreateFolder={onCreateFolder}
                                onRename={onRename}
                                onDelete={onDelete}
                                onMove={onMove}
                                onHide={() => setExplorerOpen(false)}
                            />
                        </Panel>
                        )}
                    </PanelGroup>
                </div>

                {/* Status bar: what the editor is doing, so only with the editor. */}
                {editorOn && <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-neutral-200 bg-neutral-50 px-3 text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', saveError ? 'bg-red-500' : saving > 0 || dirty.size > 0 ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-400')} />
                        {saveLabel}
                    </span>
                    {activeTab && !isVirtual(activeTab) && <span className="truncate font-mono">{activeTab.slice(1)}</span>}
                    <span className="ml-auto flex items-center gap-4">
                        {activeTab && !isVirtual(activeTab) && <span>{languageOf(activeTab)}</span>}
                        {activeTab && !isVirtual(activeTab) && <span>Spaces: {settings.tabSize}</span>}

                    </span>
                </footer>}
            </div>
        </>
    )
}

function RailButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    onClick={onClick}
                    className={cn(
                        'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors',
                        active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    )}
                >
                    {active && <span aria-hidden className="absolute -left-1 top-2 bottom-2 w-0.5 rounded-full bg-neutral-900 dark:bg-white" />}
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    )
}

const NO_FILES: ReadonlySet<string> = new Set()

/*
 * Real types in the editor (WS-11): load them once, follow the project's
 * tsconfig.app.json, and keep a model for every source file. A component, not
 * hooks in the workspace, so Monaco is never fetched while the editor is off.
 */
function EditorTypesSync({ files }: { files: Record<string, string> }) {
    const monaco = useMonaco() as unknown as MonacoLike | null
    const [typesReady, setTypesReady] = useState(false)
    const tsconfig = files['/tsconfig.app.json']
    useEffect(() => {
        if (!monaco) return
        let live = true
        void loadWorkspaceTypes(monaco).then((ok) => { if (live) setTypesReady(ok) })
        return () => { live = false }
    }, [monaco])
    useEffect(() => {
        if (monaco) configureCompiler(monaco, tsconfig, typesReady)
    }, [monaco, tsconfig, typesReady])
    useEffect(() => {
        if (!monaco) return
        const timer = setTimeout(() => syncProjectModels(monaco, files), 250)
        return () => clearTimeout(timer)
    }, [monaco, files])
    return null
}

/* The sandbox wraps the centre only for a project the browser can run. */
function RuntimeBoundary({ enabled, files, children }: { enabled: boolean; files: Record<string, string>; children: React.ReactNode }) {
    return enabled ? <RuntimeProvider files={files}>{children}</RuntimeProvider> : <>{children}</>
}

function LayoutToggle({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={on}
            title={label}
            onClick={onClick}
            className={cn(
                'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900',
                on ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'
            )}
        >
            {children}
        </button>
    )
}

function StripButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={cn('flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white', className)}
        >
            {children}
        </button>
    )
}

/* A 1px border with a wider invisible hit area - a 1px drag target is not a target. */
function Handle({ vertical }: { vertical?: boolean }) {
    return (
        <PanelResizeHandle className={cn('group relative shrink-0 outline-none', vertical ? 'h-px w-full' : 'w-px')}>
            <span className={cn('absolute', vertical ? '-top-1.5 -bottom-1.5 inset-x-0 cursor-row-resize' : 'inset-y-0 -left-1.5 -right-1.5 cursor-col-resize')} />
            <span className={cn(
                'absolute bg-transparent transition-colors group-hover:bg-neutral-400 group-data-[resize-handle-state=drag]:bg-neutral-900 dark:group-hover:bg-neutral-600 dark:group-data-[resize-handle-state=drag]:bg-white',
                vertical ? 'inset-x-0 top-0 h-px' : 'inset-y-0 left-0 w-px'
            )} />
        </PanelResizeHandle>
    )
}

function Empty({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{body}</p>
        </div>
    )
}
