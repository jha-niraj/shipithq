import "server-only"
import { unstable_cache } from "next/cache"
import { eq } from "drizzle-orm"
import { db, codeSamples, codeSampleFiles, type CodeSampleStage } from "@repo/db"

/*
 * Reference code for the read-only viewer (plan/long-jobs-vercel LJV-4), written only by
 * `pnpm script code-samples`. Read through GET /api/code-samples/<slug>, not a server
 * action: actions run one at a time per page, so a read queued behind a slow action left
 * the viewer on its skeleton. Cached for an hour; a reseed shows within the hour.
 */

export type CodeSampleFile = { stage: string; path: string; language: string; content: string }
export type CodeSampleData = {
    slug: string
    title: string
    summary: string
    repoUrl: string | null
    stages: CodeSampleStage[]
    files: CodeSampleFile[]
}

async function load(slug: string): Promise<CodeSampleData | null> {
    const [sample] = await db.select().from(codeSamples).where(eq(codeSamples.slug, slug))
    if (!sample) return null
    const files = await db
        .select({ stage: codeSampleFiles.stage, path: codeSampleFiles.path, language: codeSampleFiles.language, content: codeSampleFiles.content })
        .from(codeSampleFiles)
        .where(eq(codeSampleFiles.sampleId, sample.id))
    files.sort((a, b) => a.path.localeCompare(b.path))
    return { slug: sample.slug, title: sample.title, summary: sample.summary, repoUrl: sample.repoUrl, stages: sample.stages, files }
}

export const loadCodeSample = unstable_cache(load, ["code-sample"], { revalidate: 3600 })

export const isSampleSlug = (slug: unknown): slug is string => typeof slug === "string" && /^[a-z0-9-]{1,80}$/.test(slug)
