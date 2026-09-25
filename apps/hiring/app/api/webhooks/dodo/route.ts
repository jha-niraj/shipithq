import { NextRequest, NextResponse } from "next/server"
import { handlePaymentWebhook } from "@/lib/payment-webhook"

// DodoPayments Webhook Handler
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        
        // Extract webhook event type
        const eventType = body.type || body.event_type
        
        // Handle payment events
        if (eventType === "payment.succeeded" || eventType === "payment.failed") {
            const paymentData = body.data || body.payment
            
            const result = await handlePaymentWebhook({
                paymentId: paymentData.payment_id || paymentData.id,
                customerId: paymentData.customer_id,
                amount: paymentData.amount || 0,
                currency: paymentData.currency || "INR",
                status: eventType === "payment.succeeded" ? "succeeded" : "failed",
                metadata: paymentData.metadata,
            })

            if (!result.success) {
                console.error("Webhook handling failed:", result.error)
                return NextResponse.json(
                    { error: result.error },
                    { status: 400 }
                )
            }
        }

        // Always return 200 to acknowledge receipt
        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("Webhook error:", error)
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        )
    }
}

// Webhook verification (GET for health check)
export async function GET() {
    return NextResponse.json({ status: "Webhook endpoint active" })
}