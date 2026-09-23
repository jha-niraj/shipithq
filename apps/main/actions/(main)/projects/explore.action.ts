"use server"

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db, projectIdeas, projectsV2 } from "@repo/db"

// The Explore page's Ideas tab (plan/projects, PJ-4). Reads the curated
// catalogue with the filters the URL carries, so a filtered view is shareable
// and survives a reload.

export interface IdeaRow {
    id: string
    title: string
    description: string
    difficulty: string
    technologies: string[]
    categories: string[]
    /*
     * The four below come from the idea's seeded blueprint, through
     * `project_idea.blueprint_project_id` (plan/projects, PJ-8 and PJ-11). They
     * are read rather than stored on the idea so there is ONE source of truth
     * for how long a project is: the project.
     *
     * `slug` is what turns "Build this" from a generation prompt into a link to
     * something that already exists. Null until the idea has a blueprint.
     */
    slug: string | null
    estimatedHours: number | null
    outcomes: string[]
    sprintCount: number
    taskCount: number
}

export interface IdeaFilters {
    /** "technology" groups by stack; "problem" groups by what the project is FOR. */
    mode: "technology" | "problem"
    technology?: string
    difficulty?: string
    category?: string
}

export interface IdeaFacets {
    technologies: string[]
    categories: string[]
    difficulties: string[]
}

export async function getIdeas(filters: IdeaFilters): Promise<{ ideas: IdeaRow[]; facets: IdeaFacets; total: number }> {
    const where = [eq(projectIdeas.status, "APPROVED")]
    if (filters.technology) where.push(sql`${filters.technology} = ANY(${projectIdeas.technologies})`)
    if (filters.category) where.push(sql`${filters.category} = ANY(${projectIdeas.categories})`)
    if (filters.difficulty) where.push(eq(projectIdeas.difficulty, filters.difficulty))

    const rows = await db
        .select({
            id: projectIdeas.id,
            title: projectIdeas.projectTitle,
            description: projectIdeas.projectDescription,
            difficulty: projectIdeas.difficulty,
            technologies: projectIdeas.technologies,
            categories: projectIdeas.categories,
            slug: projectsV2.slug,
            estimatedHours: projectsV2.estimatedHours,
            outcomes: projectsV2.keyOutcomes,
            // Counted in SQL against the blueprint rather than fetched and
            // measured: a card only needs the two numbers, not the sprints.
            sprintCount: sql<number>`(
                select count(*)::int from project_v2_sprint s where s.project_id = ${projectsV2.id}
            )`,
            taskCount: sql<number>`(
                select count(*)::int from project_v2_task t
                join project_v2_sprint s on s.id = t.sprint_id
                where s.project_id = ${projectsV2.id}
            )`,
        })
        .from(projectIdeas)
        // LEFT, not inner: an idea without a blueprint still belongs in the
        // catalogue, it just cannot be opened yet.
        .leftJoin(projectsV2, eq(projectsV2.id, projectIdeas.blueprintProjectId))
        .where(and(...where))
        /*
         * Technology-first leads with the easiest; problem-first leads with the
         * most built, which is the closest thing to "this problem is worth
         * solving".
         *
         * `asc(difficulty)` sorted the TEXT, and alphabetically that is EASY,
         * HARD, MEDIUM - so the hard projects came second. Nobody noticed while
         * the catalogue was 30 rows of similar things; it was obvious the moment
         * the ten curated ones went in (plan/projects, PJ-11).
         */
        .orderBy(
            filters.mode === "problem"
                ? desc(projectIdeas.buildCount)
                : sql`case ${projectIdeas.difficulty}
                        when 'EASY' then 1
                        when 'MEDIUM' then 2
                        when 'HARD' then 3
                        else 4
                      end`,
            asc(projectIdeas.projectTitle),
        )
        .limit(120)

    // The facets come from the WHOLE catalogue, not the filtered rows: a dropdown
    // that only offers what is already on screen cannot widen a search.
    const all = await db
        .select({
            technologies: projectIdeas.technologies,
            categories: projectIdeas.categories,
            difficulty: projectIdeas.difficulty,
        })
        .from(projectIdeas)
        .where(eq(projectIdeas.status, "APPROVED"))

    const technologies = [...new Set(all.flatMap((r) => r.technologies ?? []))].sort()
    const categories = [...new Set(all.flatMap((r) => r.categories ?? []))].sort()
    const difficulties = ["EASY", "MEDIUM", "HARD"].filter((d) => all.some((r) => r.difficulty === d))

    return {
        ideas: rows.map((r) => ({
            ...r,
            technologies: r.technologies ?? [],
            categories: r.categories ?? [],
            outcomes: r.outcomes ?? [],
            sprintCount: Number(r.sprintCount ?? 0),
            taskCount: Number(r.taskCount ?? 0),
        })),
        facets: { technologies, categories, difficulties },
        total: all.length,
    }
}

/** How many public projects and how many of the user's own, for the tab counts. */
export async function getExploreCounts(): Promise<{ ideas: number }> {
    const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(projectIdeas)
        .where(inArray(projectIdeas.status, ["APPROVED"]))
    return { ideas: row?.n ?? 0 }
}
