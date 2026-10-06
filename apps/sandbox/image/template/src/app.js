// The request handler, kept apart from the server so tests can call it directly.
const notes = [
    { id: 1, title: "Welcome", body: "This is the first note." },
]

export function createApp() {
    return async function handle(req, res) {
        const url = new URL(req.url, "http://localhost")

        if (req.method === "GET" && url.pathname === "/notes") {
            return send(res, 200, notes)
        }

        send(res, 404, { error: "Not found" })
    }
}

function send(res, status, value) {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(value))
}
