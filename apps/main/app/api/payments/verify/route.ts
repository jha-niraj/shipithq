import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@repo/auth';
import { db, users, payments, creditTransactions } from '@repo/db';
import { and, eq, inArray, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    const session = await getSession(req.headers);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({
            message: 'Missing payment verification details'
        }, { status: 400 });
    }

    try {
        // Verify the signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.error('Signature verification failed');
            return NextResponse.json({
                message: 'Payment verification failed: Invalid signature'
            }, { status: 400 });
        }

        // Fetch payment details from Razorpay
        console.log('Fetching payment details from Razorpay');
        const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { 'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!}:${process.env.RAZORPAY_KEY_SECRET!}`).toString('base64')}` },
        })
        if (!paymentRes.ok) {
            const err = await paymentRes.text()
            throw new Error(`Razorpay fetch error ${paymentRes.status}: ${err}`)
        }
        const paymentDetails = await paymentRes.json() as { id: string; status: string; order_id: string; amount: number; [key: string]: unknown }
        console.log('Payment details received:', {
            id: paymentDetails.id,
            status: paymentDetails.status,
            order_id: paymentDetails.order_id,
            amount: paymentDetails.amount
        });

        // Verify payment status
        if (paymentDetails.status !== 'captured') {
            console.log('Payment not captured, status:', paymentDetails.status);

            // Update payment status to failed
            await db.update(payments)
                .set({ status: 'FAILED' })
                .where(eq(payments.orderId, razorpay_order_id));

            return NextResponse.json({
                message: `Payment not captured. Status: ${paymentDetails.status}`
            }, { status: 400 });
        }

        // Find the payment in database
        const payment = await db.query.payments.findFirst({
            where: eq(payments.orderId, razorpay_order_id),
        });

        if (!payment) {
            console.log('Payment not found in database for order_id:', razorpay_order_id);
            return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
        }

        // Check if already processed
        if (payment.status === 'COMPLETED') {
            return NextResponse.json({
                success: true,
                message: 'Payment already processed',
                paymentId: payment.id,
                credits: payment.credits
            });
        }

        // Claim the payment with a CONDITIONAL update, not a bare one.
        //
        // The webhook settles the same order independently, and in the normal
        // case both run. `db` is neon-http and has no transactions, so the old
        // "read status, then write" here was a real race: both readers see
        // PENDING, both write COMPLETED, and the user is credited twice.
        //
        // Postgres serialises an UPDATE ... WHERE status='PENDING' per row, so
        // exactly one of the racers gets a row back, and only that one grants.
        const [updatedPayment] = await db.update(payments)
            .set({
                status: 'COMPLETED',
                paymentId: razorpay_payment_id,
                signature: razorpay_signature,
                completedAt: new Date(),
            })
            .where(and(
                eq(payments.id, payment.id),
                // CANCELLED/FAILED are claimable: a dismiss report can land
                // after the money was captured. See the note in the webhook.
                inArray(payments.status, ['PENDING', 'CANCELLED', 'FAILED']),
            ))
            .returning();

        // Zero rows means the webhook got there first. The payment IS settled
        // and the credits ARE granted, just not by this call - so this is a
        // success for the caller, not an error.
        if (!updatedPayment) {
            return NextResponse.json({
                success: true,
                message: 'Payment already processed',
                paymentId: payment.id,
                credits: payment.credits,
            });
        }
        console.log('Payment updated successfully');

        // Add credits to user account. A payment whose account was deleted keeps
        // its record (user id set null) and credits nobody.
        if (!payment.userId) {
            return NextResponse.json({ success: false, error: 'This account no longer exists.' }, { status: 410 })
        }
        await db.update(users)
            .set({ credits: sql`${users.credits} + ${payment.credits}` })
            .where(eq(users.id, payment.userId));

        console.log(`Credits added: ${payment.credits} to user ${payment.userId}`);

        // Create credit transaction record
        const [creditTransaction] = await db.insert(creditTransactions).values({
            userId: payment.userId,
            currency: payment.currency,
            amount: payment.credits,
            type: 'PURCHASE',
            description: `Purchased ${payment.credits} credits via Razorpay`,
            paymentId: payment.id,
        }).returning();

        if (!creditTransaction) throw new Error("Failed to create credit transaction")
        console.log('Credit transaction created:', creditTransaction.id);

        return NextResponse.json({
            success: true,
            paymentId: updatedPayment.id,
            razorpayPaymentId: razorpay_payment_id,
            credits: payment.credits,
            amount: payment.amount.toString(),
            currency: payment.currency,
            receipt: payment.receipt,
            completedAt: updatedPayment.completedAt,
        });
    } catch (err) {
        const error = err as Error;
        console.error('Payment verification error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json(
            {
                error: error.message || 'An unexpected error occurred during payment verification'
            },
            { status: 500 }
        );
    }
}
