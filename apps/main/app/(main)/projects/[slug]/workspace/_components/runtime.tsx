'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    SandpackPreview, SandpackProvider, useSandpack, useSandpackConsole, useSandpackNavigation,
    type SandpackFiles,
} from '@codesandbox/sandpack-react'
import { useTheme } from '@repo/ui/components/themeprovider'
import { ExternalLink, RotateCw, Trash2 } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { excluded, runtimeIndexHtml, runtimePackageJson, runtimeTsconfig, toSandpackFiles } from './runtime-files'

/*
 * The in-browser runtime (plan/project-workspace WS-4).
 *
 * Sandpack's CLIENT bundler (CodeSandbox-hosted, decided 2026-09-24), not its
 * Vite template. The Vite template runs on Nodebox, which supports Vite 4 -
 * the starters are Vite 6 - and Sandpack's test runner (WS-5) only works with
 * the client bundler. So the project's files stay exactly as Vite has them, and
 * this adapter translates at the boundary:
 *   - the entry is `src/main.tsx`, from the project, not the template's;
 *   - the bundler reads `public/index.html`, so it gets the project's own
 *     `index.html` with Vite's `<script type="module" src="/src/main.tsx">`
 *     removed (the bundler injects its own);
 *   - dependencies are the project's `package.json` "dependencies" - the dev
 *     toolchain (vite, typescript, vitest) is not what the page runs on;
 *   - build config is not sent; tests are, for "Check task" (WS-5).
 *
 * One provider wraps the preview, the console and (WS-5) the tests, so they
 * share one sandbox. Edits reach it from the editor's buffers, not from saved
 * files, so the preview follows typing.
 */

const SYNC_DELAY_MS = 300

/**
 * The sandbox. Mounted once per project from its files; after that, changes to
 * `files` are pushed in by `FileSync` rather than remounting.
 */
export function RuntimeProvider({ files, children }: { files: Record<string, string>; children: React.ReactNode }) {
    const { resolvedTheme } = useTheme()
    const [initial] = useState(() => toSandpackFiles(files))
    const [deps] = useState(() => runtimePackageJson(files['/package.json']).deps)

    return (
        <SandpackProvider
            template="react-ts"
            files={initial}
            customSetup={{ entry: '/src/main.tsx', dependencies: deps }}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            options={{ recompileMode: 'delayed', recompileDelay: SYNC_DELAY_MS, autorun: true }}
        >
            <FileSync files={files} />
            {children}
        </SandpackProvider>
    )
}

/* Pushes what changed since the last push: new or edited files, and removals. */
function FileSync({ files }: { files: Record<string, string> }) {
    const { sandpack } = useSandpack()
    const sent = useRef<Record<string, string>>(files)

    useEffect(() => {
        const timer = setTimeout(() => {
            const changed: SandpackFiles = {}
            for (const [path, code] of Object.entries(files)) {
                if (excluded(path)) continue
                if (sent.current[path] !== code) changed[path] = code
            }
            if (files['/index.html'] !== sent.current['/index.html']) changed['/public/index.html'] = runtimeIndexHtml(files['/index.html'])
            if (files['/tsconfig.app.json'] !== sent.current['/tsconfig.app.json']) changed['/tsconfig.json'] = runtimeTsconfig(files['/tsconfig.app.json'])
            if (Object.keys(changed).length > 0) sandpack.updateFile(changed)
            for (const path of Object.keys(sent.current)) {
                if (!(path in files) && !excluded(path)) sandpack.deleteFile(path)
            }
            sent.current = files
        }, SYNC_DELAY_MS)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `sandpack` is stable per provider
    }, [files])

    return null
}

/** The running app, with a reload and an open-in-new-tab. Errors overlay the frame. */
export function PreviewPane({ closeButton }: { closeButton?: React.ReactNode }) {
    const { refresh } = useSandpackNavigation()
    const { sandpack } = useSandpack()
    const [url, setUrl] = useState<string | null>(null)

    useEffect(() => {
        const client = Object.values(sandpack.clients)[0] as { iframe?: HTMLIFrameElement } | undefined
        setUrl(client?.iframe?.src ?? null)
    }, [sandpack.clients, sandpack.status])

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-neutral-200 pl-3 pr-1.5 dark:border-neutral-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Preview</span>
                <span className={cn('ml-2 h-1.5 w-1.5 rounded-full', sandpack.status === 'running' ? 'bg-neutral-900 dark:bg-white' : 'animate-pulse bg-neutral-400')} title={sandpack.status} />
                <span className="flex-1" />
                <IconButton label="Reload the preview" onClick={() => refresh()}><RotateCw className="h-3.5 w-3.5" /></IconButton>
                {url && (
                    <a href={url} target="_blank" rel="noreferrer" aria-label="Open in a new tab" title="Open in a new tab" className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                )}
                {closeButton}
            </div>
            {/* Sandpack's own chrome is off; the frame fills the panel. */}
            <SandpackPreview
                className="min-h-0 flex-1 [&_iframe]:h-full [&_iframe]:w-full"
                style={{ height: '100%' }}
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                showRestartButton={false}
                showSandpackErrorOverlay
            />
        </div>
    )
}

type LogEntry = ReturnType<typeof useSandpackConsole>['logs'][number]

function formatLog(entry: LogEntry): string {
    return (entry.data ?? [])
        .map((d) => (typeof d === 'string' ? d : JSON.stringify(d, null, 2)))
        .join(' ')
}

/** The app's console output, newest last. */
export function ConsolePane() {
    const { logs, reset } = useSandpackConsole({ resetOnPreviewRestart: true, showSyntaxError: true, maxMessageCount: 500 })
    const endRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [logs.length])

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-neutral-200 px-3 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <span>{logs.length === 0 ? 'Nothing logged yet' : `${logs.length} message${logs.length === 1 ? '' : 's'}`}</span>
                <IconButton label="Clear the console" onClick={reset}><Trash2 className="h-3.5 w-3.5" /></IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                    <p className="p-4 text-neutral-500 dark:text-neutral-400">console.log from your app shows here.</p>
                ) : logs.map((entry) => (
                    <pre
                        key={entry.id}
                        className={cn(
                            'whitespace-pre-wrap break-words border-b border-neutral-100 px-4 py-1.5 dark:border-neutral-900',
                            entry.method === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                                : entry.method === 'warn' ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
                                    : 'text-neutral-800 dark:text-neutral-200'
                        )}
                    >
                        {formatLog(entry)}
                    </pre>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    )
}

/** The console's message count, for the bottom panel's tab label. */
export function ConsoleCount() {
    const { logs } = useSandpackConsole({ resetOnPreviewRestart: true, maxMessageCount: 500 })
    const errors = useMemo(() => logs.filter((l) => l.method === 'error').length, [logs])
    if (logs.length === 0) return null
    return (
        <span className={cn(
            'rounded-full px-1.5 text-[10px] tabular-nums',
            errors > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
        )}>
            {logs.length}
        </span>
    )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
            {children}
        </button>
    )
}

// ── Tests (WS-5) ─────────────────────────────────────────────────────────────

export interface TestCase { name: string; blocks: string[]; status: 'pass' | 'fail'; error?: string }
export interface TestRun {
    path: string
    status: 'done' | 'error'
    tests: TestCase[]
    /** The file failed to load (a syntax error, a missing export), or the run timed out. */
    fileError?: string
}
export type RunTests = (path: string) => Promise<TestRun>

const TEST_TIMEOUT_MS = 60_000

type TestMessage = {
    type: string
    event?: string
    path?: string
    error?: { message?: string } | string
    test?: { name: string; blocks?: string[]; status: string; path: string; errors?: { message?: string }[] }
}

/*
 * Runs ONE task's tests in the sandbox the preview uses, with the editor's
 * current text (the files are synced from the buffers).
 *
 * Verified against Sandpack's real client bundler (2026-09-24, headless
 * harness): "run-tests" for one path runs EVERY test file, so results are kept
 * by `test.path`; a file that cannot load arrives as `file_error`; the run ends
 * with `total_test_end`. It waits for the bundler to be running first, and gives
 * up after a minute rather than hanging "Check task".
 */
export function TestBridge({ register }: { register: (run: RunTests | null) => void }) {
    const { sandpack, dispatch, listen } = useSandpack()
    const statusRef = useRef(sandpack.status)
    statusRef.current = sandpack.status

    useEffect(() => {
        const run: RunTests = async (path) => {
            const deadline = Date.now() + TEST_TIMEOUT_MS
            while (statusRef.current !== 'running' && Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 200))
            }
            return new Promise<TestRun>((resolve) => {
                const tests: TestCase[] = []
                let fileError: string | undefined
                const finish = (result: TestRun) => { clearTimeout(timer); unsubscribe(); resolve(result) }
                const timer = setTimeout(
                    () => finish({ path, status: 'error', tests, fileError: 'The tests did not finish within a minute. Check for an infinite loop, then run them again.' }),
                    Math.max(1000, deadline - Date.now())
                )
                const unsubscribe = listen((raw) => {
                    const msg = raw as unknown as TestMessage
                    if (msg.type !== 'test') return
                    if (msg.event === 'test_end' && msg.test?.path === path) {
                        tests.push({
                            name: msg.test.name,
                            blocks: msg.test.blocks ?? [],
                            status: msg.test.status === 'pass' ? 'pass' : 'fail',
                            error: msg.test.errors?.[0]?.message?.split('\n')[0],
                        })
                    }
                    if (msg.event === 'file_error' && msg.path === path) {
                        fileError = typeof msg.error === 'string' ? msg.error : msg.error?.message ?? 'The test file could not be loaded.'
                    }
                    if (msg.event === 'total_test_end') finish({ path, status: fileError ? 'error' : 'done', tests, fileError })
                })
                dispatch({ type: 'run-tests', path } as never)
            })
        }
        register(run)
        return () => register(null)
    }, [dispatch, listen, register])

    return null
}
