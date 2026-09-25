/**
 * Where a resume came from (plan/resume RES-22). Derived, not stored: `imported_from`
 * and `tailored_for` already say it, and a second column would be a second thing to
 * keep in step.
 *
 * Grouped by kind (Niraj, 2026-09-25) rather than one filter per source: an AI import
 * usually combines sources ("linkedin,github"), and per-source filters would count it
 * several times.
 */

export const ORIGINS = ["created", "profile", "upload", "imported", "tailored"] as const
export type Origin = (typeof ORIGINS)[number]

export const ORIGIN_LABEL: Record<Origin, string> = {
    created: "Created by you",
    profile: "From profile",
    upload: "Uploaded",
    imported: "Imported",
    tailored: "Tailored",
}

/** The sources an import can name, as `apps/worker/src/jobs/resume-import.ts` writes them. */
export const IMPORT_SOURCES = ["linkedin", "github", "twitter", "portfolio", "text"] as const
export type ImportSource = (typeof IMPORT_SOURCES)[number]

export function originOf(d: { importedFrom: string | null; tailoredFor: string | null }): {
    origin: Origin
    sources: ImportSource[]
} {
    // A tailored copy of an imported resume is Tailored: that is what the user did last.
    if (d.tailoredFor) return { origin: "tailored", sources: [] }
    const raw = (d.importedFrom ?? "").toLowerCase().trim()
    if (!raw) return { origin: "created", sources: [] }
    if (raw === "profile") return { origin: "profile", sources: [] }
    if (raw === "upload") return { origin: "upload", sources: [] }
    const sources = raw.split(",").map((s) => s.trim()).filter((s): s is ImportSource =>
        (IMPORT_SOURCES as readonly string[]).includes(s))
    // An unrecognised value is still an import of some kind; it just gets no icons.
    return { origin: "imported", sources }
}

export function isOrigin(v: string | null | undefined): v is Origin {
    return !!v && (ORIGINS as readonly string[]).includes(v)
}
