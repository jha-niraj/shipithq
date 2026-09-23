// ─────────────────────────────────────────────────────────────────────────────
// Sarvam AI, end to end (plan/practice-workspace, PW-4): say a line, then listen
// to it. A round trip proves both halves against the real API with the real key.
//
//   cd apps/main && node --env-file=.env --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/sarvam.ts
// ─────────────────────────────────────────────────────────────────────────────

import { isSarvamConfigured, synthesize, transcribe, SARVAM_SPEAKER, SARVAM_TTS_MODEL } from "@repo/ai/sarvam"

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
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
