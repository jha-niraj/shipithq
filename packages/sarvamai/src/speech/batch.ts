import { sarvamFetch, sarvamJson, type SarvamResult } from "./client"
import type { SttMode } from "./stt"

// Batch speech to text with speakers (plan/voice VO-2): long audio (up to two
// hours) and diarization, as an async job. Create, upload each file to its
// signed URL, start, poll, then download the JSON results. Minutes of waiting,
// so it is only ever called from the worker (CLAUDE.md "Long-running work").

export type BatchState = "Accepted" | "Pending" | "Running" | "Completed" | "Failed"

export async function createBatchJob(input: {
    languageCode?: string
    mode?: SttMode
    withDiarization?: boolean
    numSpeakers?: number
    withTimestamps?: boolean
}): Promise<SarvamResult<{ jobId: string }>> {
    const r = await sarvamJson<{ job_id?: string }>("/speech-to-text/job/v1", {
        job_parameters: {
            model: "saaras:v3",
            language_code: input.languageCode ?? "en-IN",
            mode: input.mode ?? "transcribe",
            with_timestamps: input.withTimestamps ?? false,
            with_diarization: input.withDiarization ?? false,
            ...(input.numSpeakers ? { num_speakers: input.numSpeakers } : {}),
        },
    }, "batch-create", "Could not start the transcription job.")
    if (!r.success) return r
    return r.data.job_id ? { success: true, jobId: r.data.job_id } : { success: false, error: "Could not start the transcription job." }
}

/** Upload the job's audio: one signed URL per file name, then a PUT of the bytes. */
export async function uploadBatchFiles(jobId: string, files: { name: string; audio: Blob }[]): Promise<SarvamResult<object>> {
    const r = await sarvamJson<{ upload_urls?: Record<string, { file_url: string }> }>("/speech-to-text/job/v1/upload-files", {
        job_id: jobId, files: files.map((f) => f.name),
    }, "batch-upload", "Could not upload the audio.")
    if (!r.success) return r
    for (const f of files) {
        const url = r.data.upload_urls?.[f.name]?.file_url
        if (!url) return { success: false, error: `No upload link for ${f.name}.` }
        // The signed URLs are Azure blob URLs, which need the blob type header.
        const put = await fetch(url, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": f.audio.type || "application/octet-stream" }, body: f.audio })
        if (!put.ok) return { success: false, error: `Upload of ${f.name} failed (${put.status}).` }
    }
    return { success: true }
}

export async function startBatchJob(jobId: string): Promise<SarvamResult<{ state: BatchState }>> {
    const r = await sarvamJson<{ job_state?: BatchState }>(`/speech-to-text/job/v1/${encodeURIComponent(jobId)}/start`, {}, "batch-start", "Could not start the transcription job.")
    if (!r.success) return r
    return { success: true, state: r.data.job_state ?? "Accepted" }
}

export interface BatchStatus {
    state: BatchState
    error: string
    /** Output file names, ready once the job is Completed. */
    outputs: string[]
}

export async function batchStatus(jobId: string): Promise<SarvamResult<{ status: BatchStatus }>> {
    try {
        const res = await sarvamFetch(`/speech-to-text/job/v1/${encodeURIComponent(jobId)}/status`, { method: "GET" })
        if (!res.ok) return { success: false, error: `Could not read the job (${res.status}).`, unavailable: res.status === 401 || res.status === 403 }
        const d = (await res.json()) as { job_state?: BatchState; error_message?: string; job_details?: { outputs?: { file_name: string }[] }[] }
        return {
            success: true,
            status: {
                state: d.job_state ?? "Pending",
                error: d.error_message ?? "",
                outputs: (d.job_details ?? []).flatMap((t) => (t.outputs ?? []).map((o) => o.file_name)),
            },
        }
    } catch (error: unknown) {
        console.error("[sarvam/batch-status] failed:", error)
        return { success: false, error: "Could not read the job." }
    }
}

/** Download a completed job's result files, parsed as JSON (transcript, and diarized_transcript when asked for). */
export async function batchResults(jobId: string, outputs: string[]): Promise<SarvamResult<{ files: Record<string, unknown> }>> {
    if (!outputs.length) return { success: true, files: {} }
    const r = await sarvamJson<{ download_urls?: Record<string, { file_url: string }> }>("/speech-to-text/job/v1/download-files", {
        job_id: jobId, files: outputs,
    }, "batch-download", "Could not download the transcript.")
    if (!r.success) return r
    const files: Record<string, unknown> = {}
    for (const name of outputs) {
        const url = r.data.download_urls?.[name]?.file_url
        if (!url) continue
        const res = await fetch(url)
        if (!res.ok) return { success: false, error: `Download of ${name} failed (${res.status}).` }
        const text = await res.text()
        try { files[name] = JSON.parse(text) } catch { files[name] = text }
    }
    return { success: true, files }
}
