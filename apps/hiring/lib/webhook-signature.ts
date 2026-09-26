import "server-only"
import { createHmac, timingSafeEqual } from "crypto"

/*
 * Standard Webhooks signature check, the scheme Dodo Payments signs with
 * (plan/hiring-app HA-18). The signed content is `${id}.${timestamp}.${body}`,
 * HMAC-SHA256 with the base64 secret after its `whsec_` prefix; the header
 * carries one or more `v1,<base64>` signatures separated by spaces. A request
 * more than five minutes old or new is refused, so a captured one can't be
 * replayed later.
 */

const TOLERANCE_SECONDS = 5 * 60

export function verifyStandardWebhook(input: { secret: string; id: string | null; timestamp: string | null; signature: string | null; body: string }): boolean {
    const { secret, id, timestamp, signature, body } = input
    if (!id || !timestamp || !signature) return false
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false
    let key: Buffer
    try { key = Buffer.from(secret.replace(/^whsec_/, ""), "base64") } catch { return false }
    const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest()
    return signature.split(" ").some((part) => {
        const [version, value] = part.split(",")
        if (version !== "v1" || !value) return false
        const given = Buffer.from(value, "base64")
        return given.length === expected.length && timingSafeEqual(given, expected)
    })
}
