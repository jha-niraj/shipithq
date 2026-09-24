"use server"

import { and, asc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm"
import { db, projectIdeas, projectsV2, users } from "@repo/db"
import { catalogueWhere } from "@/lib/projects/catalogue"

/*
 * The Explore page's Browse tab (plan/projects PJ-19, Niraj 2026-09-24).
 *
 * It replaced two tabs that showed the same projects: Ideas (the curated ideas,
 * each linked to a curated project) and Community (every public project, which
 * were those same curated ones until a learner publishes something). Browse is
 * every public project, with who made it as a filter, plus any approved idea
 * that has no project yet ("Generate this").
 *
 * Every filter is in the URL, read here on the server, so a view can be
 * shared, reloaded and gone back to, and search covers the whole catalogue
 * rather than one page of it.
 */

export type MadeBy = "all" | "shipithq" | "community"
export type BrowseSort = "recommended" | "popular" | "recent"

export interface BrowseFilters {
    made: MadeBy
    /** "technology" leads with the stack; "problem" with what the project is FOR. */
    mode: "technology" | "problem"
    technology?: string
    /** BEGINNER / INTERMEDIATE / ADVANCED. */
    difficulty?: string
    category?: string
    q?: string
    sort: BrowseSort
}

export interface BrowseRow {
    /** The project's id, or the idea's when there is no project yet. */
    id: string
    kind: "project" | "idea"
    title: string
    description: string
    difficulty: string
    technologies: string[]
    categories: string[]
    /** Null for an idea with no project yet. */
    slug: string | null
    madeBy: "shipithq" | "community"
    author: { name: string | null; username: string | null } | null
    estimatedHours: number | null
    outcomes: string[]
    /** Build sprints and their tasks; Setup is not counted. */
    sprintCount: number
    taskCount: number
    started: number
}

export interface BrowseFacets {
    technologies: string[]
    categories: string[]
    difficulties: string[]
}

/** The ideas' EASY/MEDIUM/HARD, in the projects' terms. */
const IDEA_DIFFICULTY: Record<string, string> = { EASY: "BEGINNER", MEDIUM: "INTERMEDIATE", HARD: "ADVANCED" }
const DIFFICULTY_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]

type Sortable = BrowseRow & { publishedAt: number }

export async function getBrowse(filters: BrowseFilters): Promise<{ rows: BrowseRow[]; facets: BrowseFacets; counts: Record<MadeBy, number> }> {
    const q = filters.q?.trim().slice(0, 100) || undefined
    const like = q ? `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : undefined

    // ── Public projects ──────────────────────────────────────────────────────
    const projectWhere: SQL[] = [catalogueWhere()]
    if (filters.made === "shipithq") projectWhere.push(eq(projectsV2.isPlatformSeeded, true))
    if (filters.made === "community") projectWhere.push(eq(projectsV2.isPlatformSeeded, false))
    if (filters.technology) projectWhere.push(sql`${filters.technology} = ANY(${projectsV2.technologies})`)
    if (filters.difficulty) projectWhere.push(sql`${projectsV2.difficulty}::text = ${filters.difficulty}`)
    if (filters.category) projectWhere.push(sql`${filters.category} = ANY(${projectIdeas.categories})`)
    if (like) {
        projectWhere.push(or(
            ilike(projectsV2.title, like),
            ilike(projectsV2.description, like),
            sql`array_to_string(${projectsV2.technologies}, ' ') ilike ${like}`,
        )!)
    }

    const projectRows = await db
        .select({
            id: projectsV2.id,
            title: projectsV2.title,
            shortDescription: projectsV2.shortDescription,
            description: projectsV2.description,
            difficulty: sql<string>`${projectsV2.difficulty}::text`,
            technologies: projectsV2.technologies,
            categories: projectIdeas.categories,
            slug: projectsV2.slug,
            curated: projectsV2.isPlatformSeeded,
            authorName: users.name,
            authorUsername: users.username,
            estimatedHours: projectsV2.estimatedHours,
            outcomes: projectsV2.keyOutcomes,
            started: projectsV2.totalStarted,
            publishedAt: projectsV2.publishedAt,
            sprintCount: sql<number>`(select count(*)::int from project_v2_sprint s where s.project_id = ${projectsV2.id} and s.sprint_number > 0)`,
            taskCount: sql<number>`(
                select count(*)::int from project_v2_task t join project_v2_sprint s on s.id = t.sprint_id
                where s.project_id = ${projectsV2.id} and s.sprint_number > 0
            )`,
        })
        .from(projectsV2)
        .leftJoin(projectIdeas, eq(projectIdeas.blueprintProjectId, projectsV2.id))
        .leftJoin(users, eq(users.id, projectsV2.createdBy))
        .where(and(...projectWhere))
        .limit(200)

    // ── Approved ideas with no project yet ("Generate this") ─────────────────
    const ideaWhere: SQL[] = [eq(projectIdeas.status, "APPROVED"), isNull(projectIdeas.blueprintProjectId)]
    if (filters.technology) ideaWhere.push(sql`${filters.technology} = ANY(${projectIdeas.technologies})`)
    if (filters.category) ideaWhere.push(sql`${filters.category} = ANY(${projectIdeas.categories})`)
    if (filters.difficulty) {
        const idea = Object.entries(IDEA_DIFFICULTY).find(([, v]) => v === filters.difficulty)?.[0]
        ideaWhere.push(eq(projectIdeas.difficulty, idea ?? "__none"))
    }
    if (like) ideaWhere.push(or(ilike(projectIdeas.projectTitle, like), ilike(projectIdeas.projectDescription, like))!)
    const ideaRows = filters.made === "community" ? [] : await db
        .select({
            id: projectIdeas.id,
            title: projectIdeas.projectTitle,
            description: projectIdeas.projectDescription,
            difficulty: projectIdeas.difficulty,
            technologies: projectIdeas.technologies,
            categories: projectIdeas.categories,
            built: projectIdeas.buildCount,
        })
        .from(projectIdeas)
        .where(and(...ideaWhere))
        .orderBy(asc(projectIdeas.projectTitle))
        .limit(100)

    const rows: Sortable[] = [
        ...projectRows.map((r): Sortable => ({
            id: r.id,
            kind: "project",
            title: r.title,
            description: r.shortDescription || r.description,
            difficulty: r.difficulty,
            technologies: r.technologies ?? [],
            categories: r.categories ?? [],
            slug: r.slug,
            madeBy: r.curated ? "shipithq" : "community",
            author: r.curated ? null : { name: r.authorName, username: r.authorUsername },
            estimatedHours: r.estimatedHours,
            outcomes: r.outcomes ?? [],
            sprintCount: Number(r.sprintCount ?? 0),
            taskCount: Number(r.taskCount ?? 0),
            started: r.started ?? 0,
            publishedAt: r.publishedAt?.getTime() ?? 0,
        })),
        ...ideaRows.map((r): Sortable => ({
            id: r.id,
            kind: "idea",
            title: r.title,
            description: r.description,
            difficulty: IDEA_DIFFICULTY[r.difficulty] ?? r.difficulty,
            technologies: r.technologies ?? [],
            categories: r.categories ?? [],
            slug: null,
            madeBy: "shipithq",
            author: null,
            estimatedHours: null,
            outcomes: [],
            sprintCount: 0,
            taskCount: 0,
            started: r.built ?? 0,
            publishedAt: 0,
        })),
    ]

    /*
     * Recommended: by stack it leads with the easiest (sorting the enum as TEXT
     * would put ADVANCED before INTERMEDIATE); problem first leads with the most
     * started - the nearest thing to "this problem is worth solving".
     */
    const rank = (d: string) => { const i = DIFFICULTY_ORDER.indexOf(d); return i === -1 ? 9 : i }
    const sort = filters.sort === "recommended" && filters.mode === "problem" ? "popular" : filters.sort
    rows.sort((a, b) =>
        sort === "popular" ? b.started - a.started || a.title.localeCompare(b.title)
        : sort === "recent" ? b.publishedAt - a.publishedAt || a.title.localeCompare(b.title)
        : rank(a.difficulty) - rank(b.difficulty) || a.title.localeCompare(b.title))

    // ── Facets and counts: from the WHOLE catalogue, so a dropdown can widen a search.
    const [facetProjects, facetIdeas, countRows] = await Promise.all([
        db.select({ technologies: projectsV2.technologies, difficulty: sql<string>`${projectsV2.difficulty}::text`, categories: projectIdeas.categories })
            .from(projectsV2).leftJoin(projectIdeas, eq(projectIdeas.blueprintProjectId, projectsV2.id)).where(catalogueWhere()),
        db.select({ technologies: projectIdeas.technologies, difficulty: projectIdeas.difficulty, categories: projectIdeas.categories })
            .from(projectIdeas).where(and(eq(projectIdeas.status, "APPROVED"), isNull(projectIdeas.blueprintProjectId))),
        db.select({ curated: projectsV2.isPlatformSeeded, n: sql<number>`count(*)::int` }).from(projectsV2).where(catalogueWhere()).groupBy(projectsV2.isPlatformSeeded),
    ])
    const all = [...facetProjects, ...facetIdeas.map((i) => ({ ...i, difficulty: IDEA_DIFFICULTY[i.difficulty] ?? i.difficulty }))]
    const shipithq = (countRows.find((r) => r.curated)?.n ?? 0) + facetIdeas.length
    const community = countRows.find((r) => !r.curated)?.n ?? 0

    return {
        rows: rows.map(({ publishedAt: _published, ...row }) => row),
        facets: {
            technologies: [...new Set(all.flatMap((r) => r.technologies ?? []))].sort((a, b) => a.localeCompare(b)),
            categories: [...new Set(all.flatMap((r) => r.categories ?? []))].sort((a, b) => a.localeCompare(b)),
            difficulties: DIFFICULTY_ORDER.filter((d) => all.some((r) => r.difficulty === d)),
        },
        counts: { all: shipithq + community, shipithq, community },
    }
}
