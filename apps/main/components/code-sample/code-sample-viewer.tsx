"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, File, Folder, GitCompare } from "lucide-react"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css"
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown"
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml"
import { Button } from "@repo/ui/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { cn } from "@repo/ui/lib/utils"
import type { CodeSampleData, CodeSampleFile } from "@/lib/code-samples/load"
import { CodeSampleSkeleton } from "./code-sample-skeleton"
import { lineDiff, parseLines, type DiffLine } from "./line-diff"

/*
 * Read-only reference code (plan/long-jobs-vercel LJV-4): a file tree, the file highlighted,
 * a stage switch ("Inline", "With Workflow") and Compare, which diffs the open file between
 * a stage and the one before it. Used by incident chapters, Pathfinder days and projects.
 * Monochrome tokens (the palette has no blue or purple); emerald and rose only for the diff.
 */

SyntaxHighlighter.registerLanguage("tsx", tsx)
SyntaxHighlighter.registerLanguage("typescript", typescript)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("css", css)
SyntaxHighlighter.registerLanguage("markdown", markdown)
SyntaxHighlighter.registerLanguage("yaml", yaml)

const PRISM: Record<string, string> = { ts: "typescript", js: "typescript", tsx: "tsx", jsx: "tsx", json: "json", css: "css", markdown: "markdown", yaml: "yaml" }

const TOKENS = cn(
    "[&_.token.comment]:italic [&_.token.comment]:text-neutral-500 dark:[&_.token.comment]:text-neutral-400",
    "[&_.token.keyword]:font-semibold [&_.token.keyword]:text-neutral-950 dark:[&_.token.keyword]:text-white",
    "[&_.token.string]:text-neutral-600 dark:[&_.token.string]:text-neutral-400 [&_.token.template-string]:text-neutral-600 dark:[&_.token.template-string]:text-neutral-400",
    "[&_.token.function]:font-medium [&_.token.class-name]:font-medium [&_.token.tag]:font-medium",
    "[&_.token.punctuation]:text-neutral-500 [&_.token.operator]:text-neutral-500",
    "[&_.token.number]:text-neutral-600 [&_.token.boolean]:text-neutral-600 dark:[&_.token.number]:text-neutral-400 dark:[&_.token.boolean]:text-neutral-400",
)

export type CodeSampleRef = {
    sample: string
    stage?: string
    file?: string
    /** Lines to light, "12-20,31". */
    highlight?: string
    /** Open in Compare. */
    compare?: boolean
}

type Loaded = { success: true; data: CodeSampleData } | { success: false; error: string }

// One request per sample for the whole page: every viewer of it (and React's dev-mode
// second mount) shares the same promise. A failed load is forgotten so a later mount retries.
const loads = new Map<string, Promise<Loaded>>()
function loadSample(slug: string): Promise<Loaded> {
    let p = loads.get(slug)
    if (!p) {
        p = fetch(`/api/code-samples/${slug}`)
            .then(async (res): Promise<Loaded> => {
                const body = (await res.json()) as CodeSampleData | { error: string }
                return res.ok && !("error" in body) ? { success: true, data: body } : { success: false, error: "error" in body ? body.error : "The code could not be loaded" }
            })
            .catch((): Loaded => ({ success: false, error: "The code could not be loaded" }))
            .then((r) => {
                if (!r.success) loads.delete(slug)
                return r
            })
        loads.set(slug, p)
    }
    return p
}

/** Loads the sample, then shows it. A skeleton while it loads. */
export function CodeSample(props: CodeSampleRef & { className?: string }) {
    const [data, setData] = useState<CodeSampleData | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        let live = true
        loadSample(props.sample).then((r) => {
            if (!live) return
            if (r.success) setData(r.data)
            else setError(r.error)
        })
        return () => {
            live = false
        }
    }, [props.sample])
    if (error) return <p className="rounded-2xl border border-neutral-200 p-4 text-[14px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{error}.</p>
    if (!data) return <CodeSampleSkeleton />
    return <CodeSampleViewer data={data} stage={props.stage} file={props.file} highlight={props.highlight} compare={props.compare} className={props.className} />
}

type Mark = "added" | "removed" | "changed" | null
type TreeRow = { kind: "folder"; name: string; depth: number; key: string } | { kind: "file"; name: string; depth: number; path: string; mark: Mark }

/** Paths to rows: each folder once, before its contents; folders before files at each level. */
function treeRows(paths: string[], marks: Map<string, Mark>): TreeRow[] {
    const sorted = [...paths].sort((a, b) => {
        const pa = a.split("/"), pb = b.split("/")
        for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
            if (pa[i] === pb[i]) continue
            const aDir = i < pa.length - 1, bDir = i < pb.length - 1
            if (aDir !== bDir) return aDir ? -1 : 1
            return pa[i]!.localeCompare(pb[i]!)
        }
        return pa.length - pb.length
    })
    const rows: TreeRow[] = []
    const seen = new Set<string>()
    for (const path of sorted) {
        const parts = path.split("/")
        parts.slice(0, -1).forEach((name, depth) => {
            const key = parts.slice(0, depth + 1).join("/")
            if (!seen.has(key)) {
                seen.add(key)
                rows.push({ kind: "folder", name, depth, key })
            }
        })
        rows.push({ kind: "file", name: parts[parts.length - 1]!, depth: parts.length - 1, path, mark: marks.get(path) ?? null })
    }
    return rows
}

const MARK_LABEL: Record<Exclude<Mark, null>, string> = { added: "added", removed: "removed", changed: "changed" }

export function CodeSampleViewer({ data, stage: initialStage, file: initialFile, highlight, compare: initialCompare = false, className }: {
    data: CodeSampleData
    stage?: string
    file?: string
    highlight?: string
    compare?: boolean
    className?: string
}) {
    const stageIds = data.stages.map((s) => s.id)
    const [stage, setStage] = useState(initialStage && stageIds.includes(initialStage) ? initialStage : stageIds[stageIds.length - 1] ?? "")
    const [compare, setCompare] = useState(initialCompare && stageIds.length > 1)
    const codeRef = useRef<HTMLDivElement>(null)

    // Compare pairs the stage with the one before it (the first stage with the second).
    const idx = Math.max(0, stageIds.indexOf(stage))
    const pair: [string, string] | null = stageIds.length > 1 ? (idx > 0 ? [stageIds[idx - 1]!, stage] : [stage, stageIds[1]!]) : null

    const byStage = useMemo(() => {
        const m = new Map<string, Map<string, CodeSampleFile>>()
        for (const f of data.files) {
            if (!m.has(f.stage)) m.set(f.stage, new Map())
            m.get(f.stage)!.set(f.path, f)
        }
        return m
    }, [data.files])

    const { paths, marks } = useMemo(() => {
        const marks = new Map<string, Mark>()
        if (!compare || !pair) return { paths: [...(byStage.get(stage)?.keys() ?? [])], marks }
        const before = byStage.get(pair[0]) ?? new Map<string, CodeSampleFile>()
        const after = byStage.get(pair[1]) ?? new Map<string, CodeSampleFile>()
        const all = new Set([...before.keys(), ...after.keys()])
        for (const p of all) {
            const a = before.get(p), b = after.get(p)
            marks.set(p, !a ? "added" : !b ? "removed" : a.content !== b.content ? "changed" : null)
        }
        return { paths: [...all], marks }
    }, [byStage, compare, pair?.[0], pair?.[1], stage]) // eslint-disable-line react-hooks/exhaustive-deps

    const firstChanged = paths.find((p) => marks.get(p))
    const [file, setFile] = useState<string>(() => {
        const inStage = byStage.get(stage)
        if (initialFile && inStage?.has(initialFile)) return initialFile
        return [...(inStage?.keys() ?? [])][0] ?? ""
    })
    // A file that is not in this view: in Compare, the first changed one; else the first.
    const shown = paths.includes(file) ? file : (compare && firstChanged) || paths[0] || ""
    const missingNote = file && !paths.includes(file) ? `${file} is not in this stage.` : null

    const rows = useMemo(() => treeRows(paths, marks), [paths, marks])
    const lit = useMemo(() => (compare ? new Set<number>() : parseLines(highlight)), [compare, highlight])

    const current = byStage.get(stage)?.get(shown)
    const language = PRISM[(compare && pair ? (byStage.get(pair[1])?.get(shown) ?? byStage.get(pair[0])?.get(shown)) : current)?.language ?? ""] ?? "text"
    const diff: DiffLine[] | null = compare && pair ? lineDiff(byStage.get(pair[0])?.get(shown)?.content ?? "", byStage.get(pair[1])?.get(shown)?.content ?? "") : null
    const text = diff ? diff.map((d) => d.text).join("\n") : (current?.content ?? "").replace(/\n$/, "")
    const counts = diff ? { added: diff.filter((d) => d.kind === "added").length, removed: diff.filter((d) => d.kind === "removed").length } : null

    // Bring the first lit line into view when the narration (or a prop) lights it.
    useEffect(() => {
        const first = codeRef.current?.querySelector("[data-lit]")
        if (first && codeRef.current) codeRef.current.scrollTo({ top: Math.max(0, (first as HTMLElement).offsetTop - 48), behavior: "smooth" })
    }, [highlight, shown, stage])

    const stageNote = data.stages.find((s) => s.id === stage)?.note
    const label = (id: string) => data.stages.find((s) => s.id === id)?.label ?? id

    return (
        <figure className={cn("@container overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950", className)}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <p className="min-w-0 truncate font-mono text-[12.5px] text-neutral-700 dark:text-neutral-300" title={shown}>{shown || data.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                    {stageIds.length > 1 && (
                        <Tabs value={stage} onValueChange={setStage}>
                            <TabsList fit size="sm" aria-label="Stage">
                                {data.stages.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
                            </TabsList>
                        </Tabs>
                    )}
                    {pair && (
                        <Button type="button" size="sm" variant={compare ? "default" : "outline"} aria-pressed={compare} onClick={() => setCompare((c) => !c)} className="h-8 gap-1.5 px-2.5 text-[12.5px]">
                            <GitCompare className="size-3.5" aria-hidden /> Compare
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid @2xl:grid-cols-[14rem_minmax(0,1fr)]">
                <nav aria-label="Files" className="hidden max-h-[32rem] overflow-y-auto border-r border-neutral-200 py-2 @2xl:block dark:border-neutral-800">
                    <ul>
                        {rows.map((r) => r.kind === "folder" ? (
                            <li key={`d:${r.key}`} className="flex items-center gap-1.5 py-1 pr-2 text-[12.5px] text-neutral-500 dark:text-neutral-400" style={{ paddingLeft: 12 + r.depth * 14 }}>
                                <Folder className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{r.name}</span>
                            </li>
                        ) : (
                            <li key={`f:${r.path}`}>
                                <button type="button" onClick={() => setFile(r.path)} aria-current={r.path === shown ? "true" : undefined}
                                    className={cn("flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[12.5px] transition-colors",
                                        r.path === shown ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-900 dark:text-white" : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900/60",
                                        r.mark === "removed" && "line-through decoration-rose-500/70")}
                                    style={{ paddingLeft: 12 + r.depth * 14 }}>
                                    <File className="size-3.5 shrink-0 text-neutral-400" aria-hidden />
                                    <span className="min-w-0 truncate">{r.name}</span>
                                    {r.mark && (
                                        <span className={cn("ml-auto shrink-0 text-[10.5px] font-medium", r.mark === "added" ? "text-emerald-700 dark:text-emerald-400" : r.mark === "removed" ? "text-rose-700 dark:text-rose-400" : "text-neutral-500")}>
                                            {MARK_LABEL[r.mark]}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="min-w-0">
                    <div className="border-b border-neutral-200 p-3 @2xl:hidden dark:border-neutral-800">
                        <Select value={shown} onValueChange={setFile}>
                            <SelectTrigger aria-label="File" className="w-full font-mono text-[12.5px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {paths.slice().sort().map((p) => (
                                    <SelectItem key={p} value={p} className="font-mono text-[12.5px]">{p}{marks.get(p) ? `  (${MARK_LABEL[marks.get(p)!]})` : ""}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {compare && pair && (
                        <p className="border-b border-neutral-200 px-4 py-2 text-[12.5px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                            {label(pair[0])} to {label(pair[1])}
                            {counts && (counts.added || counts.removed)
                                ? <>: <span className="text-emerald-700 dark:text-emerald-400">{counts.added} added</span>, <span className="text-rose-700 dark:text-rose-400">{counts.removed} removed</span></>
                                : ": no change in this file"}
                        </p>
                    )}
                    {missingNote && !compare && <p className="border-b border-neutral-200 px-4 py-2 text-[12.5px] text-neutral-500 dark:border-neutral-800">{missingNote} Showing {shown}.</p>}
                    <div ref={codeRef} className={cn("relative max-h-[32rem] overflow-auto py-3 font-mono text-[12.5px] leading-6 text-neutral-800 dark:text-neutral-200", TOKENS)}>
                        <SyntaxHighlighter
                            language={language}
                            useInlineStyles={false}
                            // Always numbered: the library only passes lineProps a line number when it
                            // numbers lines. In Compare the numbers are hidden, not turned off.
                            showLineNumbers
                            wrapLines
                            PreTag="div"
                            lineNumberStyle={diff ? { display: "none" } : { minWidth: "2.75em", paddingRight: "1.25em", textAlign: "right", userSelect: "none", display: "inline-block", color: "inherit", opacity: 0.45 }}
                            lineProps={(n: number) => {
                                const kind = diff?.[n - 1]?.kind
                                const on = lit.has(n)
                                return {
                                    style: { display: "block" },
                                    ...(on ? { "data-lit": "" } : {}),
                                    className: cn(
                                        "min-w-fit pr-4",
                                        diff && "pl-6 relative before:absolute before:left-2 before:select-none before:text-neutral-400",
                                        kind === "added" && "bg-emerald-50 before:content-['+'] dark:bg-emerald-950/40",
                                        kind === "removed" && "bg-rose-50 before:content-['-'] dark:bg-rose-950/40",
                                        on && "bg-neutral-100 shadow-[inset_3px_0_0_0] shadow-neutral-900 dark:bg-neutral-900 dark:shadow-white",
                                    ),
                                }
                            }}
                            codeTagProps={{ className: "block" }}
                        >
                            {text || " "}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </div>

            {(stageNote || data.repoUrl) && (
                <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-2.5 text-[12.5px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                    <span>{compare && pair ? `What changed from ${label(pair[0])} to ${label(pair[1])}.` : stageNote}</span>
                    {data.repoUrl && (
                        <a href={data.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                            The repo <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                    )}
                </figcaption>
            )}
        </figure>
    )
}
