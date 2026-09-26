import "server-only"
import crypto from "crypto"

/** What a token lets the caller do on the worker: start a job, or resume one paused on "wait". */
export type WorkerTokenAction = "start_job" | "resume_job"

/** Signed HMAC token the worker verifies with Web Crypto. Scoped to one job and one action, for 5 minutes. */
export function issueWorkerToken(userId: string, jobId: string, action: WorkerTokenAction): string {
    const secret = process.env.WORKER_SECRET
    if (!secret) throw new Error("Worker secret not configured")
    const now = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({ userId, action, jobId, iat: now, exp: now + 300 })
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url")
    return `${Buffer.from(payload).toString("base64url")}.${signature}`
}
