// ─────────────────────────────────────────────────────────────────────────────
// Sarvam AI, end to end (plan/practice-workspace, PW-4): say a line, then listen
// to it. A round trip proves both halves against the real API with the real key.
//
//   cd apps/main && node --env-file=.env --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/sarvam.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
    isSarvamConfigured, synthesize, transcribe, SARVAM_SPEAKER, SARVAM_TTS_MODEL,
    synthesizeStream, translate, identifyLanguage, createBatchJob, uploadBatchFiles, startBatchJob, batchStatus, batchResults,
} from "@repo/sarvamai/speech"

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }

const SPOKEN = "I think we can use a hash map to count how many times each number appears."

try {
    check("the key is configured", isSarvamConfigured())

    const said = await synthesize({ text: SPOKEN })
    check(`${SARVAM_TTS_MODEL} returns audio as ${SARVAM_SPEAKER}`, said.success, said.success ? `${Math.round(said.audioBase64.length / 1024)} KB of base64` : said.error)
    if (!said.success) throw new Error(said.error)

    const bytes = Buffer.from(said.audioBase64, "base64")
    check("the audio decodes to a WAV file", bytes.length > 8000 && bytes.subarray(0, 4).toString() === "RIFF", `${bytes.length} bytes, header ${bytes.subarray(0, 4).toString()}`)

    const heard = await transcribe({ audio: new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), filename: "speech.wav" })
    check("it transcribes back", heard.success, heard.success ? heard.text : heard.error)
    if (heard.success) {
        const words = ["hash", "map", "count", "number"]
        const got = heard.text.toLowerCase()
        const found = words.filter((w) => got.includes(w))
        check("the words come back", found.length >= 3, `${found.length}/4 of ${words.join(", ")} in "${heard.text}"`)
    }

    const empty = await synthesize({ text: "   " })
    check("an empty line is refused rather than sent", !empty.success)

    const tiny = await transcribe({ audio: new Blob([], { type: "audio/wav" }) })
    check("an empty clip transcribes to nothing, not an error", tiny.success && tiny.text === "")

    // plan/voice VO-2: the utilities added with the move to @repo/sarvamai.
    const wav = new Blob([new Uint8Array(bytes)], { type: "audio/wav" })
    const v3 = await transcribe({ audio: wav, filename: "speech.wav", model: "saaras:v3", mode: "transcribe" })
    check("saaras:v3 transcribes", v3.success && /hash/i.test(v3.text), v3.success ? v3.text : v3.error)

    const t0 = Date.now()
    const streamed = await synthesizeStream({ text: SPOKEN })
    check("the stream answers", streamed.success, streamed.success ? streamed.mimeType : streamed.error)
    if (streamed.success) {
        const reader = streamed.stream.getReader()
        let firstAt = 0, total = 0, head: Uint8Array | null = null
        for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            if (!firstAt) { firstAt = Date.now() - t0; head = value }
            total += value.length
        }
        // mp3: an ID3 tag, or a frame sync (0xFFE).
        const isMp3 = head !== null && ((head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) || (head[0] === 0xff && (head[1]! & 0xe0) === 0xe0))
        check("it streams mp3", isMp3 && total > 4000, `first bytes after ${firstAt} ms, ${total} bytes in all`)
    }

    const hi = await translate({ text: "Tell me about a time you disagreed with your team.", source: "en-IN", target: "hi-IN" })
    check("it translates into Hindi", hi.success && /[\u0900-\u097F]/.test(hi.text), hi.success ? hi.text : hi.error)
    if (hi.success) {
        const lid = await identifyLanguage(hi.text)
        check("it recognises Hindi", lid.success && lid.language === "hi-IN", lid.success ? `${lid.language} ${lid.script}` : lid.error)
    }

    const job = await createBatchJob({ languageCode: "en-IN", withDiarization: true, numSpeakers: 1 })
    check("a batch job is created", job.success, job.success ? job.jobId : job.error)
    if (job.success) {
        const up = await uploadBatchFiles(job.jobId, [{ name: "speech.wav", audio: wav }])
        check("its audio uploads", up.success, up.success ? "" : up.error)
        const started = await startBatchJob(job.jobId)
        check("it starts", started.success, started.success ? started.state : started.error)
        let status = null as Awaited<ReturnType<typeof batchStatus>> | null
        const until = Date.now() + 180_000
        while (Date.now() < until) {
            status = await batchStatus(job.jobId)
            if (!status.success || status.status.state === "Completed" || status.status.state === "Failed") break
            await new Promise((r) => setTimeout(r, 5000))
        }
        const done = status?.success && status.status.state === "Completed"
        check("it completes", Boolean(done), status?.success ? `${status.status.state} ${status.status.error}` : status?.error)
        if (done && status?.success) {
            const out = await batchResults(job.jobId, status.status.outputs)
            const text = out.success ? JSON.stringify(out.files) : ""
            check("the result has the words and a speaker", out.success && /hash/i.test(text) && /speaker/i.test(text), out.success ? text.slice(0, 200) : out.error)
        }
    }
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
