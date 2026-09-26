/**
 * Ideas board types and labels (plan/web/revamp REV-41). No database import, so a
 * client component can use these without pulling the DB client into the bundle.
 * The queries are in ./ideas.ts.
 */

export type IdeaStatus = "open" | "planned" | "building" | "shipped";

/** Board order, left to right (plan/ideas IDEA-2). */
export const IDEA_STATUSES: IdeaStatus[] = ["open", "planned", "building", "shipped"];
export type IdeaCategory = "FEATURE" | "CONTENT" | "IMPROVEMENT" | "UI" | "OTHER";
export type IdeaSort = "top" | "new";

/** Categories a user may post publicly. BUG goes to the private queue instead. */
export const PUBLIC_IDEA_CATEGORIES: IdeaCategory[] = ["FEATURE", "CONTENT", "IMPROVEMENT", "UI", "OTHER"];

export const IDEA_CATEGORY_LABEL: Record<IdeaCategory | "BUG", string> = {
    FEATURE: "Feature",
    CONTENT: "Content",
    IMPROVEMENT: "Improvement",
    UI: "Design",
    OTHER: "Other",
    BUG: "Bug",
};

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = { open: "Open", planned: "Planned", building: "Building", shipped: "Shipped" };

/** One line under each status, for the detail page and the tabs' tooltips. */
export const IDEA_STATUS_HINT: Record<IdeaStatus, string> = {
    open: "Posted and open for votes.",
    planned: "On the roadmap.",
    building: "Being built right now.",
    shipped: "Live in ShipItHQ.",
};

/** The author as a board may show them: never an id or an email (plan/ideas IDEA-3). */
export interface IdeaAuthor {
    /** "ShipItHQ team", a first name, or "Community" when posted anonymously. */
    name: string
    image: string | null
    kind: "team" | "person" | "anonymous"
}

