// The sandbox agent (plan/ai-build AB-2, AB-4, AB-5). Runs as root inside the session's
// container and owns:
//   - the terminal: one bash PTY as the `candidate` user, shared by every browser tab;
//   - the files in /workspace (list, read, save; a save is recorded as a human edit);
//   - the recording: hook calls from Claude Code and the shell's command log become events,
//     appended to /root/remote/events.jsonl (a host folder, so it outlives the container);
//   - the code: a git commit after every Claude turn, pushed to /root/remote/repo.git, a host folder.
// /root/remote is inside root's home, so the candidate's shell cannot reach it.
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import os from "node:os"
import pty from "node-pty"
import { WebSocketServer } from "ws"

const run = promisify(execFile)
const WS = "/workspace"
// Inside /root (mode 700): a bind mount ignores its own chmod on Docker Desktop, so the
// folder the candidate cannot enter is what keeps the recording and the repo out of reach.
const REMOTE = "/root/remote"
const EVENTS = path.join(REMOTE, "events.jsonl")
const BARE = path.join(REMOTE, "repo.git")
const TEMPLATE = "/opt/template"
const CANDIDATE = { uid: 1000, gid: 1000 }
const CANDIDATE_ENV = { HOME: "/home/candidate", USER: "candidate", LOGNAME: "candidate", PATH: `/home/candidate/.local/bin:${process.env.PATH}`, TERM: "xterm-256color", LANG: "C.UTF-8", DISABLE_AUTOUPDATER: "1" }
const MAX_TEXT = 20_000

// ---- recording --------------------------------------------------------------------------
let seq = 0
try { seq = fs.readFileSync(EVENTS, "utf8").split("\n").filter(Boolean).length } catch { /* first start */ }

function clip(v) {
    if (v == null) return v
    const s = typeof v === "string" ? v : JSON.stringify(v)
    return s.length > MAX_TEXT ? { clipped: true, size: s.length, head: s.slice(0, MAX_TEXT) } : v
}

function record(type, data = {}) {
    seq += 1
    const line = JSON.stringify({ seq, ts: new Date().toISOString(), type, ...data })
    fs.appendFileSync(EVENTS, line + "\n")
}

// ---- git --------------------------------------------------------------------------------
const asCandidate = (args) => run("git", ["-C", WS, ...args], { uid: CANDIDATE.uid, gid: CANDIDATE.gid, env: CANDIDATE_ENV, maxBuffer: 20 * 1024 * 1024 })
const asRoot = (args) => run("git", args, { maxBuffer: 20 * 1024 * 1024 })

async function setupWorkspace() {
    const resumed = await asRoot(["--git-dir", BARE, "rev-parse", "--verify", "-q", "refs/heads/main"]).then(() => true, () => false)
    fs.mkdirSync(WS, { recursive: true })
    if (fs.readdirSync(WS).length === 0) {
        if (resumed) {
            // A new container for an existing session: the code comes back from the stored repo.
            await asRoot(["clone", "-q", BARE, WS])
            await asRoot(["-C", WS, "remote", "remove", "origin"])
        } else {
            await run("cp", ["-a", `${TEMPLATE}/.`, WS])
        }
        await run("chown", ["-R", "candidate:candidate", WS])
        if (!resumed) {
            await asCandidate(["init", "-q", "-b", "main"])
            await asCandidate(["add", "-A"])
            await asCandidate(["commit", "-q", "-m", "Start: the starter repo"])
            await push()
        }
    }
    const head = (await asCandidate(["rev-parse", "HEAD"])).stdout.trim()
    record(resumed ? "session.resumed" : "session.started", { head })
}

// Pushed by URL, not a remote name, so root never writes a tracking ref into the candidate's repo.
const push = () => asRoot(["-C", WS, "push", "-q", BARE, "HEAD:refs/heads/main"])

let turn = 0
let checkpointing = Promise.resolve()
function checkpoint(message) {
    // One at a time: a Stop hook and a submit can arrive together.
    checkpointing = checkpointing.then(async () => {
        await asCandidate(["add", "-A"])
        const dirty = await asCandidate(["diff", "--cached", "--quiet"]).then(() => false, () => true)
        if (!dirty) return null
        await asCandidate(["commit", "-q", "-m", message])
        const sha = (await asCandidate(["rev-parse", "HEAD"])).stdout.trim()
        const stat = (await asCandidate(["show", "--stat", "--format=", sha])).stdout.trim()
        await push()
        record("checkpoint", { sha, message, stat })
        return sha
    }).catch((e) => { record("error", { where: "checkpoint", message: String(e?.message ?? e) }); return null })
    return checkpointing
}

// ---- Claude Code hooks --------------------------------------------------------------------
const transcriptLines = new Map()
let lastPrompt = ""

/** Claude's own words since the last turn, read from its session transcript. */
function assistantTextSince(transcript) {
    try {
        const lines = fs.readFileSync(transcript, "utf8").split("\n").filter(Boolean)
        const from = transcriptLines.get(transcript) ?? 0
        transcriptLines.set(transcript, lines.length)
        const out = []
        for (const l of lines.slice(from)) {
            let e
            try { e = JSON.parse(l) } catch { continue }
            if (e.type !== "assistant") continue
            for (const c of e.message?.content ?? []) if (c.type === "text" && c.text?.trim()) out.push(c.text.trim())
        }
        return out.join("\n\n")
    } catch { return "" }
}

function onHook(h) {
    const base = { claudeSession: h.session_id }
    switch (h.hook_event_name) {
        case "SessionStart":
            record("claude.started", { ...base, source: h.source })
            break
        case "UserPromptSubmit":
            lastPrompt = String(h.prompt ?? "")
            record("prompt", { ...base, text: clip(lastPrompt) })
            break
        case "PreToolUse":
            record("tool.start", { ...base, id: h.tool_use_id, tool: h.tool_name, input: clip(h.tool_input) })
            break
        case "PostToolUse":
            record("tool.end", { ...base, id: h.tool_use_id, tool: h.tool_name, input: clip(h.tool_input), response: clip(h.tool_response), ms: h.duration_ms })
            break
        case "Stop": {
            if (h.stop_hook_active) break
            const text = h.transcript_path ? assistantTextSince(h.transcript_path) : ""
            record("turn.end", { ...base, text: clip(text) })
            turn += 1
            const first = lastPrompt.split("\n")[0].slice(0, 72) || "a turn"
            void checkpoint(`Turn ${turn}: ${first}`)
            break
        }
        default:
            record("hook", { ...base, event: h.hook_event_name })
    }
}

// ---- files ------------------------------------------------------------------------------
const SKIP = new Set([".git", "node_modules", ".next", "dist", ".cache"])

function inWorkspace(p) {
    const abs = path.resolve(WS, String(p ?? "").replace(/^\/+/, ""))
    if (abs !== WS && !abs.startsWith(WS + "/")) throw new Error("outside the workspace")
    return abs
}

function listFiles() {
    const out = []
    const walk = (dir, rel) => {
        for (const d of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
            if (SKIP.has(d.name) || out.length > 2000) continue
            const r = rel ? `${rel}/${d.name}` : d.name
            out.push({ path: r, dir: d.isDirectory() })
            if (d.isDirectory()) walk(path.join(dir, d.name), r)
        }
    }
    walk(WS, "")
    return out
}

async function saveFile(rel, content) {
    const abs = inWorkspace(rel)
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : ""
    if (before === content) return
    const tmp = path.join(os.tmpdir(), `before-${Date.now()}`)
    fs.writeFileSync(tmp, before)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
    fs.chownSync(abs, CANDIDATE.uid, CANDIDATE.gid)
    const diff = await run("git", ["diff", "--no-index", "--no-color", tmp, abs]).then((r) => r.stdout, (e) => e.stdout ?? "")
    fs.rmSync(tmp, { force: true })
    record("human.edit", { path: rel, diff: clip(diff.replace(tmp, `a/${rel}`).replace(abs, `b/${rel}`)) })
}

// ---- terminal ---------------------------------------------------------------------------
let term = null
let scrollback = ""
const clients = new Set()

function ensureTerm() {
    if (term) return term
    term = pty.spawn("bash", ["-l"], { name: "xterm-256color", cols: 120, rows: 32, cwd: WS, env: CANDIDATE_ENV, uid: CANDIDATE.uid, gid: CANDIDATE.gid })
    term.onData((d) => {
        scrollback = (scrollback + d).slice(-200_000)
        for (const c of clients) c.send(d)
    })
    term.onExit(() => { term = null; for (const c of clients) c.send("\r\n[the shell exited; reconnect for a new one]\r\n") })
    return term
}

// ---- http -------------------------------------------------------------------------------
function body(req) {
    return new Promise((resolve, reject) => {
        let b = ""
        req.setEncoding("utf8")
        req.on("data", (c) => { b += c; if (b.length > 5_000_000) req.destroy() })
        req.on("end", () => resolve(b))
        req.on("error", reject)
    })
}
const json = (res, code, v) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(v)) }

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://agent")
    try {
        if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, seq })
        if (req.method === "POST" && url.pathname === "/hook") {
            const raw = await body(req)
            json(res, 200, { ok: true })
            try { onHook(JSON.parse(raw)) } catch (e) { record("error", { where: "hook", message: String(e?.message ?? e) }) }
            return
        }
        if (req.method === "POST" && url.pathname === "/command") {
            const cmd = (await body(req)).trim()
            if (cmd) record("human.command", { command: clip(cmd) })
            return json(res, 200, { ok: true })
        }
        if (req.method === "GET" && url.pathname === "/files") return json(res, 200, { files: listFiles() })
        if (req.method === "GET" && url.pathname === "/file") {
            const abs = inWorkspace(url.searchParams.get("path"))
            const st = fs.statSync(abs)
            if (st.size > 1_000_000) return json(res, 413, { error: "too large to open" })
            return json(res, 200, { content: fs.readFileSync(abs, "utf8") })
        }
        if (req.method === "PUT" && url.pathname === "/file") {
            await saveFile(url.searchParams.get("path"), await body(req))
            return json(res, 200, { ok: true })
        }
        if (req.method === "POST" && url.pathname === "/checkpoint") {
            const { message } = JSON.parse((await body(req)) || "{}")
            const sha = await checkpoint(String(message || "Checkpoint"))
            return json(res, 200, { sha })
        }
        json(res, 404, { error: "not found" })
    } catch (e) {
        json(res, 400, { error: String(e?.message ?? e) })
    }
})

const wss = new WebSocketServer({ noServer: true })
server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url, "http://agent").pathname !== "/pty") return socket.destroy()
    wss.handleUpgrade(req, socket, head, (ws) => {
        const t = ensureTerm()
        clients.add(ws)
        if (scrollback) ws.send(scrollback)
        ws.on("message", (m) => {
            let msg
            try { msg = JSON.parse(String(m)) } catch { return }
            if (msg.t === "i" && typeof msg.d === "string") ensureTerm().write(msg.d)
            if (msg.t === "r" && msg.c > 0 && msg.r > 0) { try { t.resize(Math.min(msg.c, 400), Math.min(msg.r, 200)) } catch { /* exited */ } }
        })
        ws.on("close", () => clients.delete(ws))
    })
})

await setupWorkspace()
server.listen(8080, "0.0.0.0", () => console.log("sandbox agent on :8080"))
