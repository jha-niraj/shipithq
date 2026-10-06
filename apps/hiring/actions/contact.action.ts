'use server'

import { db, contactMessages } from '@repo/db'

/**
 * The hiring contact form (plan/web/story ST-1): it used to wait a second and say "sent"
 * without sending anything. It now stores the message in the same table as the marketing
 * site's form (`contact_submissions`), with the subject marked so the inbox can tell a
 * company's message from a student's. Same checks and limits as apps/web's action.
 */

export interface ContactInput {
    name: string
    email: string
    company?: string
    subject: string
    message: string
}

export interface ContactResult {
    success: boolean
    message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Bounded: an unbounded text column reachable from a public form is a free disk-fill.
const LIMITS = { name: 120, email: 254, company: 160, subject: 200, message: 5000 } as const

export async function submitHiringContact(input: ContactInput): Promise<ContactResult> {
    const name = input.name?.trim() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''
    const company = input.company?.trim() ?? ''
    const subject = input.subject?.trim() ?? ''
    const message = input.message?.trim() ?? ''

    if (!name || !email || !subject || !message) {
        return { success: false, message: 'Please fill in your name, email, subject and message.' }
    }
    if (!EMAIL_RE.test(email)) {
        return { success: false, message: 'Please enter a valid email address.' }
    }
    if (
        name.length > LIMITS.name ||
        email.length > LIMITS.email ||
        company.length > LIMITS.company ||
        subject.length > LIMITS.subject ||
        message.length > LIMITS.message
    ) {
        return { success: false, message: 'One of those fields is too long. Please shorten it.' }
    }

    try {
        await db.insert(contactMessages).values({
            name,
            email,
            subject: `[Hiring] ${subject}`,
            message: company ? `Company: ${company}\n\n${message}` : message,
        })
        return { success: true, message: "Thanks. We'll get back to you within two working days." }
    } catch (error: unknown) {
        console.error('hiring contact submission failed:', error)
        return { success: false, message: 'Something went wrong. Please email us directly instead.' }
    }
}
