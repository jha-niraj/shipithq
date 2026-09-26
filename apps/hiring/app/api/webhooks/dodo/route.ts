import { NextRequest, NextResponse } from "next/server"
import { handlePaymentWebhook } from "@/lib/payment-webhook"
import { verifyStandardWebhook } from "@/lib/webhook-signature"

/*
 * Dodo Payments webhook. Nothing is read from the body until its signature
 * checks out against DODO_PAYMENTS_WEBHOOK_KEY (plan/hiring-app HA-18): an
 * unsigned or forged POST used to mark payments paid.
 */
export async function POST(req: NextRequest) {
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY
    if (!secret) {
        console.error("Dodo webhook: DODO_PAYMENTS_WEBHOOK_KEY is not set; refusing every event")
        return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }
    const raw = await req.text()
    const ok = verifyStandardWebhook({
        secret,
        id: req.headers.get("webhook-id"),
        timestamp: req.headers.get("webhook-timestamp"),
        signature: req.headers.get("webhook-signature"),
        body: raw,
    })
    if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })

    try {
        const body = JSON.parse(raw) as { type?: string; event_type?: string; data?: Record<string, unknown>; payment?: Record<string, unknown> }
        const eventType = body.type || body.event_type
        if (eventType === "payment.succeeded" || eventType === "payment.failed") {
            const p = (body.data || body.payment || {}) as { payment_id?: string; id?: string; customer_id?: string; amount?: number; currency?: string; metadata?: Record<string, string> }
            const result = await handlePaymentWebhook({
                paymentId: (p.payment_id || p.id) ?? "",
                customerId: p.customer_id ?? "",
                amount: p.amount || 0,
                currency: p.currency || "INR",
                status: eventType === "payment.succeeded" ? "succeeded" : "failed",
                metadata: p.metadata,
            })
            if (!result.success) {
                console.error("Webhook handling failed:", result.error)
                return NextResponse.json({ error: result.error }, { status: 400 })
            }
        }
        return NextResponse.json({ received: true })
    } catch (error: unknown) {
        console.error("Webhook error:", error instanceof Error ? error.message : error)
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
}
