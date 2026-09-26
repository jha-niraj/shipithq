"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/permissions"
import { createFolder, docUrl, docsTree, moveDocument, removeDocument, removeFolder, type DocTree } from "@/lib/documents"

/*
 * The company document library (plan/hiring-app HA-13), for members with "use
 * AI". Every call is scoped to the member's company.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function company(): Promise<string | null> {
    const auth = await requirePermission("use_ai")
    return auth.ok ? auth.ctx.companyId : null
}
const NO = { success: false as const, error: "Your role can't use the AI documents. Ask your company's owner." }

export async function listDocsTree(search?: string): Promise<Result<DocTree>> {
    const c = await company()
    if (!c) return NO
    return { success: true, data: await docsTree(c, typeof search === "string" ? search.slice(0, 100) : undefined) }
}

export async function getDocumentUrl(id: string): Promise<Result<{ url: string }>> {
    const c = await company()
    if (!c) return NO
    const url = await docUrl(c, id).catch(() => null)
    return url ? { success: true, data: { url } } : { success: false, error: "That document is gone." }
}

export async function deleteDocument(id: string): Promise<Result<null>> {
    const c = await company()
    if (!c) return NO
    const ok = await removeDocument(c, id)
    revalidatePath("/documents")
    return ok ? { success: true, data: null } : { success: false, error: "That document is gone." }
}

export async function moveDocumentToFolder(id: string, folderId: string | null): Promise<Result<null>> {
    const c = await company()
    if (!c) return NO
    return (await moveDocument(c, id, folderId)) ? { success: true, data: null } : { success: false, error: "Couldn't move it." }
}

export async function createDocFolder(name: string): Promise<Result<{ id: string }>> {
    const c = await company()
    if (!c) return NO
    const id = await createFolder(c, typeof name === "string" ? name : "")
    return id ? { success: true, data: { id } } : { success: false, error: "Name the folder." }
}

export async function deleteDocFolder(id: string): Promise<Result<null>> {
    const c = await company()
    if (!c) return NO
    return (await removeFolder(c, id)) ? { success: true, data: null } : { success: false, error: "That folder is gone." }
}
