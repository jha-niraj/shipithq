// A Claude Code hook (plan/ai-build AB-4): hands the hook's JSON to the agent and gets out of
// the way. It never blocks or fails Claude: any error is swallowed and it always exits 0.
let input = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (c) => { input += c })
process.stdin.on("end", async () => {
    try {
        await fetch("http://127.0.0.1:8080/hook", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: input,
            signal: AbortSignal.timeout(2000),
        })
    } catch { /* recording must never get in Claude's way */ }
    process.exit(0)
})
