/*
 * The workspace's pure bits: tab persistence, languages, the file tree, and
 * which test file belongs to a task. No React here.
 */

/*
 * Virtual tabs: pages that open in the editor area like files but are not
 * files. Ids start with "@", which no real path can (those start with "/").
 * Niraj, 2026-09-24: "don't call this task.md, call it Task", and Quiz, Mock
 * interview, Resources, Errors and Standup open here too, as full pages.
 */
export const VIRTUAL_TABS = {
    '@ai': 'AI',
    '@task': 'Task',
    '@quiz': 'Quiz',
    '@mock': 'Mock interview',
    '@resources': 'Resources',
    '@errors': 'Errors',
    '@standup': 'Standup',
    '@final-quiz': 'Final quiz',
    '@final-mock': 'Final mock interview',
} as const
export type VirtualTab = keyof typeof VIRTUAL_TABS
export const TASK_TAB: VirtualTab = '@task'
export const AI_TAB: VirtualTab = '@ai'
/*
 * Nothing is pinned any more (Niraj, 2026-09-24, WS-20): the Project AI moved
 * out of the tab row into its own panel on the right, and every tab - Task
 * included - closes like any other. Kept as an empty list so callers that
 * ask "is this pinned?" keep working.
 */
export const PINNED_TABS: readonly string[] = []
export const isPinned = (tab: string) => PINNED_TABS.includes(tab)
/** Pinned tabs first, in their order; everything else after, deduplicated. */
export const withPinned = (tabs: readonly string[]) => [...PINNED_TABS, ...[...new Set(tabs)].filter((t) => !isPinned(t))]
export const isVirtual = (tab: string): tab is VirtualTab => Object.hasOwn(VIRTUAL_TABS, tab)
/** What a tab shows in the strip. */
export const tabLabel = (tab: string) => (isVirtual(tab) ? VIRTUAL_TABS[tab] : baseName(tab))

export interface SavedTabs {
    tabs: string[]
    active: string | null
}

const tabsKey = (projectId: string) => `workspace:tabs:${projectId}`

/*
 * Open tabs are remembered per project in localStorage (Niraj, 2026-09-23). A
 * per-viewer convenience, so browser storage is right; every access is guarded
 * because storage can be missing or throw, and the page must work without it.
 * Paths that no longer exist are dropped on the way in.
 */
export function loadTabs(projectId: string, existing: ReadonlySet<string>): SavedTabs {
    try {
        const raw = window.localStorage.getItem(tabsKey(projectId))
        if (!raw) return { tabs: [], active: null }
        const parsed = JSON.parse(raw) as Partial<SavedTabs>
        const tabs = (Array.isArray(parsed.tabs) ? parsed.tabs : [])
            // "TASK.md" was the task tab's id before 2026-09-24.
            .map((t) => (t === 'TASK.md' ? TASK_TAB : t))
            // The AI is a panel now, not a tab (WS-20): an old saved "@ai" tab is dropped.
            .filter((t): t is string => typeof t === 'string' && t !== AI_TAB && (isVirtual(t) || existing.has(t)))
        const storedActive = parsed.active === 'TASK.md' ? TASK_TAB : parsed.active
        const active = typeof storedActive === 'string' && tabs.includes(storedActive) ? storedActive : tabs[0] ?? null
        return { tabs: [...new Set(tabs)], active }
    } catch {
        return { tabs: [], active: null }
    }
}

export function saveTabs(projectId: string, value: SavedTabs): void {
    try {
        window.localStorage.setItem(tabsKey(projectId), JSON.stringify(value))
    } catch { /* not remembered; the page still works */ }
}

export function languageOf(path: string): string {
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
    switch (ext) {
        case 'ts': case 'tsx': return 'typescript'
        case 'js': case 'jsx': case 'mjs': case 'cjs': return 'javascript'
        case 'json': return 'json'
        case 'css': return 'css'
        case 'html': return 'html'
        case 'md': return 'markdown'
        default: return 'plaintext'
    }
}

export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

export interface TreeNode {
    name: string
    /** Full path for a file; the folder's path (no trailing slash) for a folder. */
    path: string
    children?: TreeNode[]
}

/** Folders first, then files, each alphabetical - the order VS Code uses. */
export function buildTree(paths: readonly string[], emptyFolders: readonly string[] = []): TreeNode[] {
    const root: TreeNode = { name: '', path: '', children: [] }
    // An empty folder has no file to carry it, so it is walked as a path whose
    // last segment is a folder: a trailing "/" marks it.
    for (const path of [...paths, ...emptyFolders.map((f) => f + '/')]) {
        const isFolderPath = path.endsWith('/')
        const parts = path.split('/').filter(Boolean)
        let node = root
        parts.forEach((part, i) => {
            const isFile = i === parts.length - 1 && !isFolderPath
            const at = '/' + parts.slice(0, i + 1).join('/')
            node.children ??= []
            let child = node.children.find((c) => c.name === part && !!c.children === !isFile)
            if (!child) {
                child = isFile ? { name: part, path: at } : { name: part, path: at, children: [] }
                node.children.push(child)
            }
            node = child
        })
    }
    const sort = (nodes: TreeNode[]): TreeNode[] =>
        nodes
            .sort((a, b) => (!!b.children === !!a.children ? a.name.localeCompare(b.name) : a.children ? -1 : 1))
            .map((n) => (n.children ? { ...n, children: sort(n.children) } : n))
    return sort(root.children ?? [])
}


// ── Editor settings ──────────────────────────────────────────────────────────

export const EDITOR_FONT_KEYS = ['system', 'geist', 'jetbrains', 'fira'] as const

export interface EditorSettings {
    fontSize: number
    fontFamily: (typeof EDITOR_FONT_KEYS)[number]
    wordWrap: boolean
    minimap: boolean
    lineNumbers: boolean
    tabSize: 2 | 4
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    fontSize: 13, fontFamily: 'system', wordWrap: false, minimap: false, lineNumbers: true, tabSize: 2,
}

const SETTINGS_KEY = 'workspace:editor-settings'

export function loadEditorSettings(): EditorSettings {
    try {
        const raw = window.localStorage.getItem(SETTINGS_KEY)
        if (!raw) return DEFAULT_EDITOR_SETTINGS
        const parsed = JSON.parse(raw) as Partial<EditorSettings>
        const merged = { ...DEFAULT_EDITOR_SETTINGS, ...parsed }
        // Guard every field: a hand-edited or stale value must not break the editor.
        return {
            fontSize: Number.isFinite(merged.fontSize) ? Math.min(22, Math.max(10, merged.fontSize)) : 13,
            // 'menlo' was an option before WS-3d; it was the Mac system font anyway.
            fontFamily: (EDITOR_FONT_KEYS as readonly string[]).includes(merged.fontFamily) ? merged.fontFamily : 'system',
            wordWrap: !!merged.wordWrap,
            minimap: !!merged.minimap,
            lineNumbers: merged.lineNumbers !== false,
            tabSize: merged.tabSize === 4 ? 4 : 2,
        }
    } catch {
        return DEFAULT_EDITOR_SETTINGS
    }
}

export function saveEditorSettings(settings: EditorSettings): void {
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* not remembered */ }
}

/** Every folder that holds a file, e.g. "/src" and "/src/lib" for "/src/lib/a.ts". */
export function foldersOf(paths: readonly string[]): string[] {
    const out = new Set<string>()
    for (const p of paths) {
        const parts = p.split('/').filter(Boolean)
        for (let i = 1; i < parts.length; i++) out.add('/' + parts.slice(0, i).join('/'))
    }
    return [...out]
}

/*
 * The Project AI panel (WS-20): open by default, and how wide, remembered per
 * browser. Guarded like the tabs: storage can be missing or throw.
 */
export const AI_PANEL_DEFAULT = 40
export const AI_PANEL_MIN = 25
export const AI_PANEL_MAX = 55

export function loadAiPanel(): { open: boolean; size: number } {
    try {
        const open = window.localStorage.getItem('workspace:ai-open') !== '0'
        const size = Number(window.localStorage.getItem('workspace:ai-size'))
        return { open, size: size >= AI_PANEL_MIN && size <= AI_PANEL_MAX ? size : AI_PANEL_DEFAULT }
    } catch {
        return { open: true, size: AI_PANEL_DEFAULT }
    }
}

export function saveAiPanel(value: { open?: boolean; size?: number }): void {
    try {
        if (value.open !== undefined) window.localStorage.setItem('workspace:ai-open', value.open ? '1' : '0')
        if (value.size !== undefined) window.localStorage.setItem('workspace:ai-size', String(Math.round(value.size)))
    } catch { /* not remembered; the page still works */ }
}
