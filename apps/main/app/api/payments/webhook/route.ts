import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db, users, payments, creditTransactions } from '@repo/db'
import { and, eq, inArray, sql } from 'drizzle-orm'

/**
 * Razorpay webhook.
 *
 * ── Why this route has to exist ──────────────────────────────────────────────
 * The browser path settles a payment in `handler` -> `/api/payments/verify`.
 * That call only happens if the tab is still alive when Razorpay hands control
 * back. It very often is not: the user closes the tab on the success screen,
 * the phone locks mid UPI handoff, the network drops on a train. In every one
 * of those cases the money is captured and, without this route, the credits are
 * NEVER granted and nothing in the system knows anything went wrong. The user
 * has paid for nothing and only a support ticket can find it.
 *
 * So settlement lives in two places on purpose, and in the ordinary case BOTH
 * run for the same payment.
 *
 * ── Idempotency ─────────────────────────────────────────────────────────────
 * `db` is neon-http and has no transactions, so "check then write" is not safe
 * here - `verify` and this route can be in flight at the same moment for the
 * same order, and both would read PENDING and both would grant.
 *
 * The guard is instead a single conditional UPDATE:
 *
 *     UPDATE payments SET status='COMPLETED' WHERE id=? AND status='PENDING'
 *
 * Postgres serialises that per row, so exactly one of the two racers gets a row
 * back. Credits are granted only by the one that did. The loser sees zero rows
 * and returns success without granting - which is the correct answer, because
 * the payment IS settled, just not by it.
 */

/** Razorpay signs the raw body with the webhook secret, not the API secret. */
function isSignatureValid(rawBody: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    // timingSafeEqual throws on a length mismatch, so that is checked first.
    // Comparing with === would leak the signature a byte at a time.
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

interface RazorpayEntity {
    id?: string
    order_id?: string
    status?: string
    amount?: number
    error_description?: string
    error_reason?: string
    payment_id?: string
}

interface RazorpayEvent {
    event?: string
    payload?: {
        payment?: { entity?: RazorpayEntity }
        order?: { entity?: RazorpayEntity }
        refund?: { entity?: RazorpayEntity }
    }
}

/**
 * Grant the credits for an order, exactly once.
 *
 * Returns whether THIS call was the one that settled it.
 */
async function settle(orderId: string, razorpayPaymentId: string | undefined): Promise<boolean> {
    const payment = await db.query.payments.findFirst({
        where: eq(payments.orderId, orderId),
    })
    if (!payment) {
        // An order we never wrote a row for. Nothing to settle, and retrying
        // will not change that - answer 200 so Razorpay stops redelivering.
        console.warn('[razorpay-webhook] no payment row for order', orderId)
        return false
    }
    if (payment.status === 'COMPLETED' || payment.status === 'REFUNDED') return false

    // Claimable from CANCELLED and FAILED too, not just PENDING.
    //
    // This is not defensive coding, it is a bug that bit: the browser reports an
    // abandoned checkout as CANCELLED, and on a page refresh mid-payment that
    // report can land AFTER Razorpay has already captured the money. If this
    // clause were `status='PENDING'` only, the row would be stuck at CANCELLED,
    // the capture event would match nothing, and a paid-for purchase would never
    // grant its credits.
    //
    // The client's CANCELLED is a guess about what the user did. A capture event
    // is Razorpay telling us the money moved. The second always wins. Only
    // COMPLETED and REFUNDED are terminal, and both are excluded above.
    const [claimed] = await db
        .update(payments)
        .set({
            status: 'COMPLETED',
            paymentId: razorpayPaymentId ?? payment.paymentId,
            completedAt: new Date(),
        })
        .where(
            and(
                eq(payments.id, payment.id),
                inArray(payments.status, ['PENDING', 'CANCELLED', 'FAILED']),
            ),
        )
        .returning({ id: payments.id })

    // Lost the race with `verify`, or with an earlier delivery of this same
    // event. The payment is settled; this call simply was not the settler.
    if (!claimed) return false
    // The account was deleted: the payment keeps its record, and there's no balance to credit.
    if (!payment.userId) return true

    await db
        .update(users)
        .set({ credits: sql`${users.credits} + ${payment.credits}` })
        .where(eq(users.id, payment.userId))

    await db.insert(creditTransactions).values({
        userId: payment.userId,
        currency: payment.currency,
        amount: payment.credits,
        type: 'PURCHASE',
        description: `Purchased ${payment.credits} credits via Razorpay`,
        paymentId: payment.id,
    })

    console.log(`[razorpay-webhook] settled ${orderId}: +${payment.credits} to ${payment.userId}`)
    return true
}

export async function POST(req: NextRequest) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) {
        // Refuse rather than fall through to processing unsigned posts. A
        // webhook endpoint that accepts anything when it is misconfigured is a
        // free credit generator for whoever finds it.
        console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set')
        return NextResponse.json({ message: 'Webhook not configured' }, { status: 500 })
    }

    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) {
        return NextResponse.json({ message: 'Missing signature' }, { status: 400 })
    }

    // The RAW body, before any JSON parsing. Re-serialising a parsed object
    // changes key order and whitespace, and the HMAC would never match.
    const rawBody = await req.text()

    if (!isSignatureValid(rawBody, signature, secret)) {
        console.error('[razorpay-webhook] invalid signature')
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
    }

    let event: RazorpayEvent
    try {
        event = JSON.parse(rawBody) as RazorpayEvent
    } catch {
        return NextResponse.json({ message: 'Malformed body' }, { status: 400 })
    }

    try {
        const name = event.event ?? ''
        const payment = event.payload?.payment?.entity
        const order = event.payload?.order?.entity
        const refund = event.payload?.refund?.entity

        switch (name) {
            // The two that mean "the money is ours". Both are handled because
            // which one arrives first depends on the payment method, and either
            // is sufficient - `settle` makes the second a no-op.
            case 'payment.captured':
            case 'order.paid': {
                const orderId = payment?.order_id ?? order?.id
                if (orderId) await settle(orderId, payment?.id)
                break
            }

            case 'payment.failed': {
                const orderId = payment?.order_id
                if (orderId) {
                    await db
                        .update(payments)
                        .set({
                            status: 'FAILED',
                            notes: {
                                outcome: 'FAILED',
                                reason: payment?.error_description ?? payment?.error_reason,
                                recordedAt: new Date().toISOString(),
                            },
                        })
                        // PENDING only: a captured payment that later has a
                        // failed attempt reported against it must not be
                        // walked back to FAILED after credits were granted.
                        .where(and(eq(payments.orderId, orderId), eq(payments.status, 'PENDING')))
                }
                break
            }

            case 'refund.created':
            case 'refund.processed': {
                const paymentId = refund?.payment_id
                if (paymentId) await clawBack(paymentId)
                break
            }

            default:
                // Everything else is subscribed-but-uninteresting. 200 so
                // Razorpay does not retry it for a day.
                break
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('[razorpay-webhook] handler error:', error)
        // 500 asks Razorpay to redeliver, which is what we want for a
        // transient database failure - the handlers above are idempotent, so a
        // redelivery is safe.
        return NextResponse.json({ message: 'Handler error' }, { status: 500 })
    }
}

/**
 * Reverse a settled purchase after a refund.
 *
 * Same conditional-update guard as `settle`, in the other direction: only a row
 * currently COMPLETED can move to REFUNDED, so a repeated delivery of the same
 * refund event cannot deduct the credits twice.
 */
async function clawBack(razorpayPaymentId: string): Promise<void> {
    const payment = await db.query.payments.findFirst({
        where: eq(payments.paymentId, razorpayPaymentId),
    })
    if (!payment) {
        console.warn('[razorpay-webhook] no payment row for refund', razorpayPaymentId)
        return
    }

    const [claimed] = await db
        .update(payments)
        .set({ status: 'REFUNDED' })
        .where(and(eq(payments.id, payment.id), eq(payments.status, 'COMPLETED')))
        .returning({ id: payments.id })
    if (!claimed) return
    // The account was deleted: nothing to take credits back from.
    if (!payment.userId) return

    // Credits can go negative here, and deliberately so: the alternative is
    // clamping at zero, which silently forgives a refund taken after the
    // credits were spent. A negative balance is visible and can be settled by
    // support; a quietly absorbed one cannot.
    await db
        .update(users)
        .set({ credits: sql`${users.credits} - ${payment.credits}` })
        .where(eq(users.id, payment.userId))

    await db.insert(creditTransactions).values({
        userId: payment.userId,
        currency: payment.currency,
        amount: -payment.credits,
        type: 'SPEND',
        description: `Refund: ${payment.credits} credits reversed`,
        paymentId: payment.id,
    })

    console.log(`[razorpay-webhook] clawed back ${payment.credits} from ${payment.userId}`)
}
