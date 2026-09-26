import { NextRequest } from "next/server"
import { requirePermission } from "@/lib/permissions"
import { r2Configured } from "@/lib/r2"
import { addDocument } from "@/lib/documents"

/*
 * Upload to the company's document library (plan/hiring-app HA-13): the
 * Documents page and the AI panel's attach button both post here (form field
 * "file", optional "folderId"). The reply is the panel's attachment shape, with
 * the document's id, so the question it's attached to can name it.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(req: NextRequest) {
    const auth = await requirePermission("use_ai")
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status === "unauthorized" ? 401 : 403 })
    if (!r2Configured()) return Response.json({ error: "Document storage isn't set up yet (R2)." }, { status: 503 })
    let file: File | null = null
    let folderId: string | null = null
    try {
        const form = await req.formData()
        const f = form.get("file")
        if (f instanceof File) file = f
        const fo = form.get("folderId")
        folderId = typeof fo === "string" && fo ? fo : null
    } catch {
        return Response.json({ error: "That upload was malformed." }, { status: 400 })
    }
    if (!file) return Response.json({ error: "No file was attached." }, { status: 400 })
    try {
        const r = await addDocument({ companyId: auth.ctx.companyId, userId: auth.ctx.userId, file, folderId })
        if (!r.ok) return Response.json({ error: r.error }, { status: r.status })
        return Response.json(r.doc)
    } catch (error: unknown) {
        console.error("[documents] upload failed:", error instanceof Error ? error.message : error)
        return Response.json({ error: "Couldn't save that file. Try again." }, { status: 500 })
    }
}
