'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { priceOf } from '@/lib/credits/pricing'

// ─────────────────────────────────────────────────────────────────────────────
// Building a resume from a user's public profiles.
//
// The action here is a DISPATCHER as of RES-9. The scraping and the model call
// live in `apps/worker/src/jobs/resume-import.ts`; what is left in this file is
// input validation and a job id.
//
// It is worth being specific about why, because "it calls an LLM" undersells it.
// Before a model was reached at all, the inline version made up to four Exa
// `/contents` fetches each carrying a `livecrawlTimeout` of 10 seconds, plus six
// GitHub REST round trips, and only then ran a gpt-4o pass over 8,000
// characters. A Cloudflare request does not stay open that long - and
// `withCredits` had already taken 20 credits by the time it found out. Under an
// alarm the same work finishes, and a job that dies refunds, because the app
// settles or releases the hold on the first terminal status it sees.
//
// What the user notices: the button returns immediately and the list fills in
// when the job lands, instead of a spinner that sometimes never resolves.
// ─────────────────────────────────────────────────────────────────────────────

interface ImportDispatchResult {
    success: boolean
    jobId?: string
    error?: string
    code?: string
    required?: number
    available?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// The Import with AI sheet (plan/resume RES-23): LinkedIn + GitHub username,
// optionally Twitter and a portfolio site. The only import path since
// 2026-09-25, when the old dialog's "combined" variant was removed.
//
// GitHub is read through the REST API, which is why the job carries
// `githubUsername`: it gets repo names, star counts and languages instead of
// whatever the profile page happens to render.
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileImportInput {
    linkedinUrl: string
    githubUsername: string
    twitterHandle?: string
    portfolioUrl?: string
    templateSlug?: string
}

export async function importProfileAndCreateDraft(input: ProfileImportInput): Promise<ImportDispatchResult> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        if (!input.linkedinUrl?.trim() && !input.githubUsername?.trim()) {
            return { success: false, error: 'Add a LinkedIn URL or a GitHub username to import from.' }
        }

        return await dispatchImport({
            // The old code named the draft from the model's output
            // (`${content.header.name} AI-Generated Resume`), which is not
            // available until the job has run. A fixed name is used instead and
            // the user can rename it; the alternative - letting the job set the
            // name - would mean the row the user opens is titled differently from
            // the toast that told them it was ready.
            name: 'AI-Generated Resume',
            templateSlug: input.templateSlug ?? 'clean-minimal',
            linkedinUrl: input.linkedinUrl?.trim() || undefined,
            githubUsername: input.githubUsername?.trim() || undefined,
            twitterHandle: input.twitterHandle?.trim() || undefined,
            portfolioUrl: input.portfolioUrl?.trim() || undefined,
        })
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Profile import failed' }
    }
}

/**
 * One dispatch path for both, so the price, the ledger reason and the
 * insufficient-credit shape cannot drift between two screens that do the same
 * thing.
 */
async function dispatchImport(input: Record<string, unknown>): Promise<ImportDispatchResult> {
    const started = await startBackgroundJob('resume_import', input, {
        cost: priceOf('resume_import'),
        reason: 'Resume import: profiles and links',
    })

    if (!started.success) {
        return {
            success: false,
            error: started.error ?? 'Could not start the import',
            code: started.code,
            required: started.required,
            available: started.available,
        }
    }

    return { success: true, jobId: started.jobId }
}
