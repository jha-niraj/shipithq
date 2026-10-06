import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { createApp } from "../src/app.js"

/** Starts the app on a free port for one test and returns its base URL. */
async function start(t) {
    const server = http.createServer(createApp())
    await new Promise((resolve) => server.listen(0, resolve))
    t.after(() => server.close())
    return `http://localhost:${server.address().port}`
}

test("GET /notes lists the notes", async (t) => {
    const base = await start(t)
    const res = await fetch(`${base}/notes`)
    assert.equal(res.status, 200)
    const notes = await res.json()
    assert.ok(Array.isArray(notes))
    assert.equal(notes[0].title, "Welcome")
})

test("an unknown route is a 404", async (t) => {
    const base = await start(t)
    const res = await fetch(`${base}/nope`)
    assert.equal(res.status, 404)
})
