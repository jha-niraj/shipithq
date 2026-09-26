// ─── Sarvam Doc AI (v1) core client - shared by every worker that OCRs ───────────
//
// The CURRENT Doc AI API (doc-ai/v1), not the deprecated doc-digitization/job/v1 or the
// legacy /parse/parsepdf endpoint. One async job:
//   1. submit          POST /doc-ai/v1/job/digitise        (ONE multipart request)
//   2. poll status     GET  /doc-ai/v1/job/{id}/status      -> { status, usage }
//   3. mint + fetch    GET  /doc-ai/v1/job/{id}/download-url -> { url, headers? }
//
// Digitise takes PDF / JPEG / PNG / ZIP-of-images (<= 50 MB) with a hard 10-page-per-job
// limit; a caller that needs more pages splits upstream and runs one job per part. This
// module is domain-neutral: it runs ONE job and returns the rendered output file(s). It
// knows nothing about PDFs-vs-page-splitting, R2, or the DB - those stay in each worker.

import { unzipSync } from "fflate"

const BASE = "https://api.sarvam.ai/doc-ai/v1"
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RETRIES = 6
// Terminal job states (lowercase in doc-ai/v1).
const TERMINAL = new Set(["completed", "partially_completed", "failed", "rejected"])

// Sarvam's hard per-job page ceiling. Exported so a caller that OCRs multi-page files can
// split into parts of this size before calling runDigitiseJob once per part.
export const SARVAM_PAGES_PER_JOB = 10

export type SarvamOutputFormat = "html" | "md"
// Gates Sarvam's vision model: "printed" for gazettes/acts, "handwritten" for student copies.
export type SarvamContentType = "printed" | "handwritten"

// Input shapes Sarvam accepts, detected from magic bytes (not extension) so a mislabeled
// upload still routes correctly.
export type DocKind = "pdf" | "png" | "jpg" | "zip"

export function detectDocKind(bytes: Uint8Array): DocKind {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf" // %PDF
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png" // PNG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg" // JPEG
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "zip" // PK..
    return "pdf"
}

export function contentTypeForKind(kind: DocKind): string {
    switch (kind) {
        case "png": return "image/png"
        case "jpg": return "image/jpeg"
        case "zip": return "application/zip"
        case "pdf": return "application/pdf"
    }
}

function extForKind(kind: DocKind): string {
    return kind === "jpg" ? "jpg" : kind
}

export interface SarvamJobOptions {
    apiKey: string
    language?: string // BCP-47, defaults to "ne-IN"
    outputFormat?: SarvamOutputFormat // defaults to "html"
    contentType?: SarvamContentType // defaults to "printed"
    autoOrient?: boolean // defaults to true (fixes rotated scans before OCR)
    // Optional overrides; derived from the detected doc kind when omitted.
    fileName?: string
    mime?: string
    // Progress logger; defaults to console.log. Pass a no-op to silence.
    log?: (message: string) => void
}

export interface SarvamOutputFile {
    name: string
    kind: "html" | "md" | "json" | "other"
    text: string
}

// The result of ONE digitise job.
export interface SarvamJobResult {
    jobId: string
    jobState: string
    pagesProcessed: number
    pagesSucceeded: number
    pagesFailed: number
    files: SarvamOutputFile[]
}

interface SubmitResponse { job_id: string }
interface JobStatusResponse {
    status: string
    usage?: { pages_processed?: number; pages_total?: number }
}
interface DownloadUrlResponse {
    url: string
    headers?: Record<string, string>
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sarvam rate-limits (~10 req/min) and a large corpus is many jobs, so 429/5xx are
// expected. Back off (honouring Retry-After) instead of failing the whole document.
function backoffMs(res: Response, attempt: number): number {
    const retryAfter = Number(res.headers.get("retry-after"))
    return Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(60_000, 2_000 * 2 ** attempt)
}

// Retrying fetch for IDEMPOTENT GETs (status / download-url). Returns the Response.
async function fetchWithRetry(url: string, init: RequestInit, label: string, log: (m: string) => void): Promise<Response> {
    let attempt = 0
    for (;;) {
        const res = await fetch(url, init)
        if (res.status !== 429 && res.status < 500) return res
        if (attempt >= MAX_RETRIES) return res
        const backoff = backoffMs(res, attempt)
        log(`[sarvam] ${label} HTTP ${res.status}; retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms`)
        await sleep(backoff)
        attempt++
    }
}

async function sarvamGet<T>(path: string, apiKey: string, label: string, log: (m: string) => void): Promise<T> {
    const res = await fetchWithRetry(`${BASE}${path}`, { headers: { "api-subscription-key": apiKey } }, label, log)
    if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(`Sarvam GET ${path} failed: HTTP ${res.status} ${detail}`)
    }
    return (await res.json()) as T
}

function classify(name: string): SarvamOutputFile["kind"] {
    const lower = name.toLowerCase()
    if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html"
    if (lower.endsWith(".md")) return "md"
    if (lower.endsWith(".json")) return "json"
    return "other"
}

function isZip(bytes: Uint8Array): boolean {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 // PK\x03\x04
}

interface ResolvedOptions {
    apiKey: string
    language: string
    outputFormat: SarvamOutputFormat
    contentType: SarvamContentType
    autoOrient: boolean
    fileName: string
    mime: string
    log: (message: string) => void
}

function resolveOptions(bytes: Uint8Array, options: SarvamJobOptions): ResolvedOptions {
    const kind = detectDocKind(bytes)
    return {
        apiKey: options.apiKey,
        language: options.language ?? "ne-IN",
        outputFormat: options.outputFormat ?? "html",
        contentType: options.contentType ?? "printed",
        autoOrient: options.autoOrient ?? true,
        fileName: options.fileName ?? `document.${extForKind(kind)}`,
        mime: options.mime ?? contentTypeForKind(kind),
        log: options.log ?? ((m: string) => console.log(m)),
    }
}

// Submit one digitise job (multipart). FormData is rebuilt per attempt because a sent body
// is consumed and cannot be replayed. Returns the job id.
async function submitDigitise(bytes: Uint8Array, opts: ResolvedOptions): Promise<string> {
    let attempt = 0
    for (;;) {
        const form = new FormData()
        // .slice() copies into a fresh, non-shared ArrayBuffer, sidestepping the ArrayBufferLike
        // vs ArrayBuffer mismatch the strict DOM lib flags on a raw Uint8Array BlobPart.
        form.append("file", new Blob([bytes.slice().buffer as ArrayBuffer], { type: opts.mime }), opts.fileName)
        form.append("language", opts.language)
        form.append("output_format", opts.outputFormat)
        form.append("content_type", opts.contentType)
        form.append("auto_orient", opts.autoOrient ? "true" : "false")
        // Do NOT set content-type manually: fetch derives the multipart boundary from the body.
        const res = await fetch(`${BASE}/job/digitise`, {
            method: "POST",
            headers: { "api-subscription-key": opts.apiKey },
            body: form,
        })
        if (res.ok) return ((await res.json()) as SubmitResponse).job_id
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
            const backoff = backoffMs(res, attempt)
            opts.log(`[sarvam] digitise HTTP ${res.status}; retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms`)
            await sleep(backoff)
            attempt++
            continue
        }
        const detail = await res.text().catch(() => "")
        throw new Error(`Sarvam digitise submit failed: HTTP ${res.status} ${detail}`)
    }
}

// Run ONE Sarvam digitise job end to end: submit -> poll until terminal -> mint download
// url -> fetch + parse the rendered output file(s). This is the whole shared "calling part".
export async function runDigitiseJob(bytes: Uint8Array, options: SarvamJobOptions): Promise<SarvamJobResult> {
    const opts = resolveOptions(bytes, options)
    const startedAt = Date.now()
    const jobId = await submitDigitise(bytes, opts)
    // Short job id: 8 chars is enough to tell two concurrent jobs apart in a live tail.
    const tag = `[sarvam] ${opts.fileName} ${jobId.slice(0, 8)}`
    const since = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    opts.log(`${tag} · submitted ${(bytes.byteLength / 1024).toFixed(0)}KB`)

    // Poll until terminal. Log a state change the moment it happens, else a heartbeat every
    // 5th poll (15s) so a stuck job still shows a pulse instead of going silent.
    let status: JobStatusResponse | null = null
    let lastState = ""
    let polls = 0
    const deadline = Date.now() + POLL_TIMEOUT_MS
    for (;;) {
        status = await sarvamGet<JobStatusResponse>(`/job/${jobId}/status`, opts.apiKey, `status ${jobId}`, opts.log)
        polls++
        if (status.status !== lastState) {
            opts.log(`${tag} · ${status.status} · ${since()}`)
            lastState = status.status
        } else if (polls % 5 === 0) {
            opts.log(`${tag} · still ${status.status} · ${since()}`)
        }
        if (TERMINAL.has(status.status)) break
        if (Date.now() > deadline) throw new Error(`Sarvam job ${jobId} timed out in state ${status.status}`)
        await sleep(POLL_INTERVAL_MS)
    }
    if (status.status === "failed" || status.status === "rejected") {
        throw new Error(`Sarvam job ${jobId} ${status.status}`)
    }
    const usage = status.usage ?? {}
    const total = usage.pages_total ?? 0
    const processed = usage.pages_processed ?? 0

    // Mint the download URL and fetch the rendered output.
    const link = await sarvamGet<DownloadUrlResponse>(`/job/${jobId}/download-url`, opts.apiKey, `download-url ${jobId}`, opts.log)
    const dl = await fetch(link.url, { headers: link.headers ?? {} })
    if (!dl.ok) throw new Error(`Sarvam download failed: HTTP ${dl.status}`)
    const raw = new Uint8Array(await dl.arrayBuffer())
    opts.log(`${tag} · downloaded ${(raw.byteLength / 1024).toFixed(0)}KB · ${processed}/${total} pages · ${since()} total`)

    const files: SarvamOutputFile[] = []
    if (isZip(raw)) {
        const entries = unzipSync(raw)
        for (const [innerName, innerBytes] of Object.entries(entries)) {
            if (innerName.endsWith("/")) continue
            files.push({ name: innerName, kind: classify(innerName), text: new TextDecoder().decode(innerBytes) })
        }
    } else {
        files.push({ name: `document.${opts.outputFormat}`, kind: opts.outputFormat, text: new TextDecoder().decode(raw) })
    }

    return {
        jobId,
        jobState: status.status,
        pagesProcessed: processed,
        pagesSucceeded: processed,
        pagesFailed: Math.max(0, total - processed),
        files,
    }
}

// Concatenate every output file of a chosen kind (html/md/json) across a job's files.
export function pickOutputText(files: SarvamOutputFile[], kind: SarvamOutputFile["kind"]): string {
    return files.filter((f) => f.kind === kind).map((f) => f.text).join("\n")
}

// Strip HTML tags to plain text so a quality gate / structurer can score Sarvam's output on
// a plain-text basis. Block-level tags become newlines so headings survive on their own line.
export function sarvamHtmlToText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}
