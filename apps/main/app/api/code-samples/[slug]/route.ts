import { NextResponse } from "next/server"
import { isSampleSlug, loadCodeSample } from "@/lib/code-samples/load"

// Public reference code for the read-only viewer (plan/long-jobs-vercel LJV-4).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    if (!isSampleSlug(slug)) return NextResponse.json({ error: "Unknown code sample" }, { status: 404 })
    try {
        const data = await loadCodeSample(slug)
        if (!data) return NextResponse.json({ error: "Unknown code sample" }, { status: 404 })
        return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } })
    } catch (error: unknown) {
        const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : ""
        console.error("code-samples GET", error instanceof Error ? `${error.message}${cause}` : error)
        return NextResponse.json({ error: "The code could not be loaded" }, { status: 500 })
    }
}
