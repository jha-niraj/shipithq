// ─────────────────────────────────────────────────────────────────────────────
// Sarvam Voice Agents, server half (plan/voice VO-3): a signed session URL, and
// the transcript of one real call. Make a call in the agent's test console,
// copy its interaction id from Call Logs, and pass it as the last argument.
//
//   cd apps/main && node --env-file=.env --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/sarvam-agents.ts [interactionId]
// ─────────────────────────────────────────────────────────────────────────────

import { agentConfig, signedUrl, fetchTranscript } from "@repo/sarvamai/agents"

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }

try {
    const c = agentConfig()
    check("the four SARVAM_AGENTS_* keys are set", c !== null)
    if (!c) throw new Error("Set SARVAM_AGENTS_API_KEY, _ORG_ID, _WORKSPACE_ID and _APP_ID in apps/main/.env")

    const url = await signedUrl()
    let parsed: Record<string, unknown> = {}
    if (url.ok) { try { parsed = JSON.parse(url.body) as Record<string, unknown> } catch { /* shown below */ } }
    const wss = Object.values(parsed).find((v) => typeof v === "string" && v.startsWith("wss://")) as string | undefined
    check("a signed WebSocket URL comes back", url.ok && Boolean(wss), url.ok ? `keys: ${Object.keys(parsed).join(", ")}` : url.error)

    const id = process.argv[2]
    if (id) {
        const t = await fetchTranscript(id)
        check("the call's transcript is read", t.ok && t.ready, !t.ok ? t.error : t.ready ? `${t.turns.length} turns` : "not ready yet")
        if (t.ok && t.ready) {
            console.log("\nRaw shape (record this in plan/voice VO-3):\n" + JSON.stringify(t.raw, null, 2).slice(0, 2500))
            console.log("\nNormalised:\n" + t.turns.map((x) => `${x.role}: ${x.text}`).join("\n"))
        }
    } else {
        console.log("SKIP  transcript: pass an interaction id from the dashboard's Call Logs")
    }
} catch (e: unknown) {
    fail++
    console.log("ERROR", e instanceof Error ? e.message : e)
} finally {
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
