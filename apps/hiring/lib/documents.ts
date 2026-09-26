import "server-only"
import { and, asc, desc, eq, ilike, inArray } from "drizzle-orm"
import { db, companyDocFolders, companyDocuments } from "@repo/db"
import { deleteObject, putObject, signedUrl } from "@/lib/r2"

/*
 * A company's document library (plan/hiring-app HA-13). Every function takes the
 * company from the caller's context, so a document id alone never reaches
 * another company's file. Text is read on upload, inline.
 */

export const MAX_DOC_BYTES = 10 * 1024 * 1024
/** Text kept per document for the AI (about 12k tokens). */
export const MAX_DOC_CHARS = 50_000

type Kind = "pdf" | "docx" | "text"

export function kindOf(name: string, mime: string): Kind | null {
    if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf"
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.docx$/i.test(name)) return "docx"
    if (/^text\/(plain|markdown|csv)$/.test(mime) || /\.(txt|md|csv)$/i.test(name)) return "text"
    return null
}

const CONTENT_TYPE: Record<Kind, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", text: "text/plain; charset=utf-8" }

export async function extractText(kind: Kind, buffer: ArrayBuffer): Promise<string> {
    let text = ""
    if (kind === "pdf") {
        const { extractText: pdf } = await import("unpdf")
        // A copy: unpdf hands the buffer to a worker, which detaches it.
        const { text: t } = await pdf(new Uint8Array(buffer.slice(0)), { mergePages: true })
        text = Array.isArray(t) ? t.join("\n") : String(t ?? "")
    } else if (kind === "docx") {
        const mammoth = await import("mammoth")
        text = (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value ?? ""
    } else {
        text = new TextDecoder().decode(buffer)
    }
    return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

export type UploadResult = { ok: true; doc: { id: string; name: string; chars: number; truncated: boolean; text: string } } | { ok: false; status: number; error: string }

export async function addDocument(input: { companyId: string; userId: string; file: File; folderId: string | null }): Promise<UploadResult> {
    const { file } = input
    if (file.size === 0) return { ok: false, status: 400, error: "That file is empty." }
    if (file.size > MAX_DOC_BYTES) return { ok: false, status: 400, error: "That file is over 10 MB." }
    const kind = kindOf(file.name, file.type)
    if (!kind) return { ok: false, status: 415, error: "Upload a PDF, a Word document (.docx) or a text file." }
    if (input.folderId) {
        const [f] = await db.select({ id: companyDocFolders.id }).from(companyDocFolders).where(and(eq(companyDocFolders.id, input.folderId), eq(companyDocFolders.companyId, input.companyId)))
        if (!f) return { ok: false, status: 404, error: "That folder is gone." }
    }
    const buffer = await file.arrayBuffer()
    let text: string
    try {
        text = await Promise.race([
            extractText(kind, buffer),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 25_000)),
        ])
    } catch (error: unknown) {
        console.error("[documents] extraction failed:", error instanceof Error ? error.message : error)
        return { ok: false, status: 422, error: "Couldn't read that file. If it's a scanned PDF, upload a text-based export." }
    }
    if (!text) return { ok: false, status: 422, error: "No text found in that file. If it's a scan, OCR it first or paste the text." }
    const truncated = text.length > MAX_DOC_CHARS
    if (truncated) text = text.slice(0, MAX_DOC_CHARS)

    const name = file.name.replace(/[\u0000-\u001f]/g, "").slice(0, 200) || "Document"
    const id = crypto.randomUUID()
    const key = `company-docs/${input.companyId}/${id}-${name.replace(/[^\w.-]+/g, "_").slice(0, 80)}`
    await putObject(key, new Uint8Array(buffer), CONTENT_TYPE[kind])
    const [row] = await db.insert(companyDocuments).values({
        id, companyId: input.companyId, folderId: input.folderId, name, r2Key: key, mimeType: CONTENT_TYPE[kind], sizeBytes: file.size,
        text, chars: text.length, truncated, uploadedByUserId: input.userId,
    }).returning({ id: companyDocuments.id })
    return { ok: true, doc: { id: row!.id, name, chars: text.length, truncated, text } }
}

export interface DocFile { id: string; name: string; mimeType: string | null; sizeBytes: number | null; folderId: string | null; chars: number; truncated: boolean; createdAt: string }
export interface DocTree { folders: { id: string; name: string; files: DocFile[] }[]; looseFiles: DocFile[] }

export async function docsTree(companyId: string, search?: string): Promise<DocTree> {
    const [folders, files] = await Promise.all([
        db.select().from(companyDocFolders).where(eq(companyDocFolders.companyId, companyId)).orderBy(asc(companyDocFolders.name)),
        db.select({ id: companyDocuments.id, name: companyDocuments.name, mimeType: companyDocuments.mimeType, sizeBytes: companyDocuments.sizeBytes, folderId: companyDocuments.folderId, chars: companyDocuments.chars, truncated: companyDocuments.truncated, createdAt: companyDocuments.createdAt })
            .from(companyDocuments)
            .where(and(eq(companyDocuments.companyId, companyId), search ? ilike(companyDocuments.name, `%${search}%`) : undefined))
            .orderBy(desc(companyDocuments.createdAt)),
    ])
    const toFile = (f: (typeof files)[number]): DocFile => ({ ...f, createdAt: f.createdAt.toISOString() })
    return {
        folders: folders.map((fo) => ({ id: fo.id, name: fo.name, files: files.filter((f) => f.folderId === fo.id).map(toFile) })),
        looseFiles: files.filter((f) => !f.folderId).map(toFile),
    }
}

export async function docUrl(companyId: string, id: string): Promise<string | null> {
    const [d] = await db.select({ key: companyDocuments.r2Key }).from(companyDocuments).where(and(eq(companyDocuments.id, id), eq(companyDocuments.companyId, companyId)))
    return d ? signedUrl(d.key) : null
}

export async function removeDocument(companyId: string, id: string): Promise<boolean> {
    const [d] = await db.delete(companyDocuments).where(and(eq(companyDocuments.id, id), eq(companyDocuments.companyId, companyId))).returning({ key: companyDocuments.r2Key })
    if (!d) return false
    await deleteObject(d.key).catch((e: unknown) => console.error("[documents] R2 delete failed:", e))
    return true
}

export async function moveDocument(companyId: string, id: string, folderId: string | null): Promise<boolean> {
    if (folderId) {
        const [f] = await db.select({ id: companyDocFolders.id }).from(companyDocFolders).where(and(eq(companyDocFolders.id, folderId), eq(companyDocFolders.companyId, companyId)))
        if (!f) return false
    }
    const rows = await db.update(companyDocuments).set({ folderId }).where(and(eq(companyDocuments.id, id), eq(companyDocuments.companyId, companyId))).returning({ id: companyDocuments.id })
    return rows.length > 0
}

export async function createFolder(companyId: string, name: string): Promise<string | null> {
    const clean = name.trim().slice(0, 80)
    if (!clean) return null
    const [f] = await db.insert(companyDocFolders).values({ companyId, name: clean }).returning({ id: companyDocFolders.id })
    return f?.id ?? null
}

/** Removes the folder; its files move to the root. */
export async function removeFolder(companyId: string, id: string): Promise<boolean> {
    const rows = await db.delete(companyDocFolders).where(and(eq(companyDocFolders.id, id), eq(companyDocFolders.companyId, companyId))).returning({ id: companyDocFolders.id })
    return rows.length > 0
}

/** For the AI: the library's names, and one document's text by id or name. */
export async function docsForAi(companyId: string) {
    return db.select({ id: companyDocuments.id, name: companyDocuments.name, chars: companyDocuments.chars, folderId: companyDocuments.folderId, createdAt: companyDocuments.createdAt })
        .from(companyDocuments).where(eq(companyDocuments.companyId, companyId)).orderBy(desc(companyDocuments.createdAt)).limit(200)
}

export async function docText(companyId: string, ref: { id?: string; name?: string }) {
    const where = ref.id ? eq(companyDocuments.id, ref.id) : ilike(companyDocuments.name, `%${ref.name ?? ""}%`)
    const rows = await db.select({ id: companyDocuments.id, name: companyDocuments.name, text: companyDocuments.text, truncated: companyDocuments.truncated })
        .from(companyDocuments).where(and(eq(companyDocuments.companyId, companyId), where)).limit(3)
    return rows
}

/** Attachments on one question: only this company's documents, by id. */
export async function docsByIds(companyId: string, ids: string[]) {
    if (!ids.length) return []
    return db.select({ id: companyDocuments.id, name: companyDocuments.name, text: companyDocuments.text, chars: companyDocuments.chars, truncated: companyDocuments.truncated })
        .from(companyDocuments).where(and(eq(companyDocuments.companyId, companyId), inArray(companyDocuments.id, ids)))
}


