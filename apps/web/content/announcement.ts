/**
 * The strip above the navbar (plan/web/revamp REV-4). One at a time, or `null` for
 * none. Changing `id` shows it again to people who closed the previous one, so give
 * every new announcement a new id.
 *
 * Only announce what exists: `href` must resolve, on this site or the app.
 */
export interface Announcement {
    id: string
    /** Short mono label: "NEW", "UPDATE". */
    tag: string
    text: string
    href: string
    cta: string
}

export const ANNOUNCEMENT: Announcement | null = null

/** localStorage key holding the id of the last announcement a visitor closed. */
export const ANNOUNCEMENT_STORAGE_KEY = "shipithq:announcement-dismissed"
