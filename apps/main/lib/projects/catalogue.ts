import { eq, type SQL } from 'drizzle-orm'
import { projectsV2 } from '@repo/db'

/**
 * What the public catalogue may show.
 *
 * Every public project. The browser-only filter WS-10 added (Niraj,
 * 2026-09-24) went again the same day with plan/project-repos RP-1: code is
 * written on the learner's own machine in V1, so a project that needs a server
 * is as buildable as one that does not. `runtime` stays on the row for the
 * in-browser editor (V2). Every catalogue query uses this one condition, so
 * the rule cannot drift between the hub, Explore and the stats.
 */
export function catalogueWhere(): SQL {
    return eq(projectsV2.visibility, 'PUBLIC')
}
