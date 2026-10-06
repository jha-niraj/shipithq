import http from "node:http"
import { createApp } from "./app.js"

const port = Number(process.env.PORT ?? 3000)
http.createServer(createApp()).listen(port, () => {
    console.log(`Notes API on http://localhost:${port}`)
})
