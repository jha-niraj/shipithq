/**
 * The AI build experiment's host server (plan/ai-build AB-2 to AB-5). Local only.
 *
 *  - POST /api/sessions starts a session: a bare git repo and an events file under
 *    .data/sessions/<id>/, and a Docker container with that folder mounted at /root/remote (out of the candidate's reach).
 *  - The browser reaches the container only through here: /s/<id>/pty (the terminal, a
 *    WebSocket) and /s/<id>/agent/* (files).
 *  - The replay reads only this side: the events file and the stored repo. It works after
 *    the container is gone, which is the point of storing the code outside it.
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { WebSocket, WebSocketServer } from "ws"

const run = promisify(execFile)
const PORT = Number(process.env.SANDBOX_PORT ?? 7070)
const IMAGE = "shipithq-sandbox:dev"
const ROOT = path.resolve(import.meta.dirname, "..")
const DATA = path.join(ROOT, ".data", "sessions")
const PUBLIC = path.join(ROOT, "public")
fs.mkdirSync(DATA, { recursive: true })

type Meta = { id: string; createdAt: string; status: "starting" | "running" | "ended" | "failed"; port?: number; container?: string; endedAt?: string; error?: string }

const dirOf = (id: string) => path.join(DATA, id)
const validId = (id: string) => /^[a-f0-9]{8}$/.test(id) && fs.existsSync(dirOf(id))
const readMeta = (id: string): Meta => JSON.parse(fs.readFileSync(path.join(dirOf(id), "meta.json"), "utf8"))
const writeMeta = (m: Meta) => fs.writeFileSync(path.join(dirOf(m.id), "meta.json"), JSON.stringify(m, null, 2))
const gitBare = (id: string, args: string[]) => run("git", ["--git-dir", path.join(dirOf(id), "repo.git"), ...args], { maxBuffer: 20 * 1024 * 1024 })

async function waitHealthy(port: number) {
    for (let i = 0; i < 60; i++) {
        try {
            const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) })
            if (r.ok) return
        } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error("the sandbox did not come up in 30 seconds")
}

/** A container for a session: new, or a fresh one for an existing session (resume). */
async function startContainer(m: Meta) {
    const name = `sbx-${m.id}`
    await run("docker", ["rm", "-f", name]).catch(() => {})
    await run("docker", [
        "run", "-d", "--name", name,
        "-p", "127.0.0.1::8080",
        "-v", `${dirOf(m.id)}:/root/remote`,
        "--memory", "2g", "--cpus", "2", "--pids-limit", "1024",
        "--label", "shipithq.sandbox=1",
        IMAGE,
    ])
    const { stdout } = await run("docker", ["port", name, "8080/tcp"])
    const port = Number(stdout.trim().split("\n")[0]!.split(":").pop())
    await waitHealthy(port)
    Object.assign(m, { status: "running", port, container: name })
    writeMeta(m)
}

async function createSession(): Promise<Meta> {
    const id = crypto.randomBytes(4).toString("hex")
    fs.mkdirSync(dirOf(id), { recursive: true })
    await run("git", ["init", "-q", "--bare", "-b", "main", path.join(dirOf(id), "repo.git")])
    fs.writeFileSync(path.join(dirOf(id), "events.jsonl"), "")
    const m: Meta = { id, createdAt: new Date().toISOString(), status: "starting" }
    writeMeta(m)
    try {
        await startContainer(m)
    } catch (e) {
        Object.assign(m, { status: "failed", error: String((e as Error).message) })
        writeMeta(m)
    }
    return m
}

async function endSession(id: string) {
    const m = readMeta(id)
    if (m.status === "running" && m.port) {
        // The last checkpoint, so nothing typed after Claude's last turn is lost.
        await fetch(`http://127.0.0.1:${m.port}/checkpoint`, { method: "POST", body: JSON.stringify({ message: "Submit" }) }).catch(() => {})
        await fetch(`http://127.0.0.1:${m.port}/hook`, { method: "POST", body: JSON.stringify({ hook_event_name: "SessionEnd" }) }).catch(() => {})
    }
    await run("docker", ["rm", "-f", `sbx-${id}`]).catch(() => {})
    Object.assign(m, { status: "ended", endedAt: new Date().toISOString(), port: undefined })
    writeMeta(m)
    return m
}

function readEvents(id: string, after = 0) {
    return fs.readFileSync(path.join(dirOf(id), "events.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.seq > after)
}

// ---- http -------------------------------------------------------------------------------
const json = (res: http.ServerResponse, code: number, v: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(v)) }
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" }

function serveStatic(res: http.ServerResponse, file: string) {
    const abs = path.join(PUBLIC, file)
    if (!abs.startsWith(PUBLIC) || !fs.existsSync(abs)) return json(res, 404, { error: "not found" })
    res.writeHead(200, { "content-type": TYPES[path.extname(abs)] ?? "application/octet-stream" })
    fs.createReadStream(abs).pipe(res)
}

/** Files go through to the session's container. */
function proxyAgent(req: http.IncomingMessage, res: http.ServerResponse, port: number, rest: string) {
    const up = http.request({ host: "127.0.0.1", port, path: rest, method: req.method, headers: { "content-type": req.headers["content-type"] ?? "text/plain" } }, (r) => {
        res.writeHead(r.statusCode ?? 502, { "content-type": r.headers["content-type"] ?? "application/json" })
        r.pipe(res)
    })
    up.on("error", () => json(res, 502, { error: "the sandbox is not reachable" }))
    req.pipe(up)
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://host")
    const p = url.pathname
    try {
        if (req.method === "GET" && (p === "/" || p === "/index.html")) return serveStatic(res, "index.html")
        if (req.method === "GET" && p === "/replay") return serveStatic(res, "replay.html")

        if (p === "/api/sessions" && req.method === "POST") return json(res, 200, await createSession())
        if (p === "/api/sessions" && req.method === "GET") {
            const all = fs.readdirSync(DATA).filter(validId).map(readMeta).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            return json(res, 200, all)
        }

        const s = p.match(/^\/api\/sessions\/([a-f0-9]{8})(\/.*)?$/)
        if (s) {
            const [, id, sub = ""] = s
            if (!validId(id!)) return json(res, 404, { error: "no such session" })
            if (sub === "" && req.method === "GET") return json(res, 200, readMeta(id!))
            if (sub === "/end" && req.method === "POST") return json(res, 200, await endSession(id!))
            if (sub === "/resume" && req.method === "POST") {
                const m = readMeta(id!)
                m.status = "starting"
                writeMeta(m)
                await startContainer(m)
                return json(res, 200, m)
            }
            if (sub === "/events" && req.method === "GET") return json(res, 200, readEvents(id!, Number(url.searchParams.get("after") ?? 0)))
            if (sub === "/commits" && req.method === "GET") {
                const out = await gitBare(id!, ["log", "--reverse", "--format=%H%x09%cI%x09%s", "main"]).then((r) => r.stdout, () => "")
                return json(res, 200, out.split("\n").filter(Boolean).map((l) => { const [sha, at, subject] = l.split("\t"); return { sha, at, subject } }))
            }
            const show = sub.match(/^\/commits\/([a-f0-9]{7,40})$/)
            if (show && req.method === "GET") {
                const { stdout } = await gitBare(id!, ["show", "--no-color", "--stat", "--patch", "--format=%H%n%s%n%cI", show[1]!])
                return json(res, 200, { text: stdout.length > 400_000 ? stdout.slice(0, 400_000) + "\n[clipped]" : stdout })
            }
            const tree = sub.match(/^\/tree\/([a-f0-9]{7,40})$/)
            if (tree && req.method === "GET") {
                const { stdout } = await gitBare(id!, ["ls-tree", "-r", "--name-only", tree[1]!])
                return json(res, 200, stdout.split("\n").filter(Boolean))
            }
            const file = sub.match(/^\/file\/([a-f0-9]{7,40})$/)
            if (file && req.method === "GET") {
                const rel = String(url.searchParams.get("path") ?? "")
                if (!rel || rel.startsWith("-")) return json(res, 400, { error: "bad path" })
                const { stdout } = await gitBare(id!, ["show", `${file[1]}:${rel}`])
                return json(res, 200, { content: stdout })
            }
        }

        const a = p.match(/^\/s\/([a-f0-9]{8})\/agent(\/.*)$/)
        if (a) {
            const [, id, rest] = a
            if (!validId(id!)) return json(res, 404, { error: "no such session" })
            const m = readMeta(id!)
            if (m.status !== "running" || !m.port) return json(res, 409, { error: "the session is not running" })
            return proxyAgent(req, res, m.port, rest! + url.search)
        }
        json(res, 404, { error: "not found" })
    } catch (e) {
        json(res, 500, { error: String((e as Error).message) })
    }
})

// The terminal: browser socket <-> container socket.
const wss = new WebSocketServer({ noServer: true })
server.on("upgrade", (req, socket, head) => {
    const m = new URL(req.url ?? "/", "http://host").pathname.match(/^\/s\/([a-f0-9]{8})\/pty$/)
    if (!m || !validId(m[1]!)) return socket.destroy()
    const meta = readMeta(m[1]!)
    if (meta.status !== "running" || !meta.port) return socket.destroy()
    wss.handleUpgrade(req, socket, head, (browser) => {
        const up = new WebSocket(`ws://127.0.0.1:${meta.port}/pty`)
        const pending: string[] = []
        up.on("open", () => { for (const msg of pending.splice(0)) up.send(msg) })
        up.on("message", (d) => browser.send(String(d)))
        up.on("close", () => browser.close())
        up.on("error", () => browser.close())
        browser.on("message", (d) => (up.readyState === WebSocket.OPEN ? up.send(String(d)) : pending.push(String(d))))
        browser.on("close", () => up.close())
    })
})

server.listen(PORT, "127.0.0.1", () => console.log(`AI build sandbox on http://localhost:${PORT}`))
