import { sql, type SQL } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"

/*
 * What a learner did in each module, in one shape (plan/home HOME-6): the numbers for a
 * section's header, the series behind its line chart, and the latest items. Home's
 * sections and the progress reports (plan/progress PRG-7) both read these, the app with
 * its `db` and the worker with its own, so nothing here imports app code.
 *
 * Plain SQL over the tables' real names: several modules join through tables with no
 * user id (hiring attempts, Pathfinder steps), which reads more clearly as SQL.
 * Days are UTC days, as every timestamp here is stored.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = NeonHttpDatabase<any>

export type ModuleKey = "projects" | "practice" | "mock" | "pathfinder" | "incidents" | "jobs" | "aiTools" | "knowme" | "ideas"

export const MODULE_ORDER: ModuleKey[] = ["projects", "practice", "mock", "pathfinder", "incidents", "jobs", "aiTools", "knowme", "ideas"]

/** Inclusive UTC days, yyyy-mm-dd. */
export interface DayRange { from: string; to: string }

export interface ChartLine {
    key: string
    label: string
    /** The label for exactly one, in a caption ("1 task done"). */
    one?: string
    /** A score line has a point only where something was scored; a count line is zero-filled. */
    kind: "count" | "score"
}

/** One point per day (or per week, see `bucket`), `date` as yyyy-mm-dd of its first day. */
export type SeriesPoint = { date: string; [key: string]: string | number | null }

export interface ModuleItem {
    title: string
    detail: string
    href: string
    /** ISO time of the item's latest change. */
    when: string
    /** 0 to 100 where the item has a score. */
    score?: number | null
    status?: string
}

export interface ModuleSummary {
    key: ModuleKey
    /** Header figures, formatted: all time unless the label says otherwise. */
    numbers: { label: string; value: string }[]
    lines: ChartLine[]
    series: SeriesPoint[]
    bucket: "day" | "week"
    /** Sum of each count line over the range. */
    periodTotals: Record<string, number>
    items: ModuleItem[]
    /** How many items exist in all, for "See all N". */
    total: number
    /** Nothing ever done in this module. */
    empty: boolean
}

// ─── Ranges and series ───────────────────────────────────────────────────────

export type RangeKey = "30d" | "90d" | "1y"

export const RANGE_DAYS: Record<RangeKey, number> = { "30d": 30, "90d": 90, "1y": 365 }

export function parseRange(value: string | null | undefined): RangeKey {
    return value === "30d" || value === "1y" ? value : "90d"
}

function day(d: Date) {
    return d.toISOString().slice(0, 10)
}

/** The last `days` UTC days ending today. */
export function rangeFor(key: RangeKey, today = new Date()): DayRange {
    const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const from = new Date(to)
    from.setUTCDate(from.getUTCDate() - (RANGE_DAYS[key] - 1))
    return { from: day(from), to: day(to) }
}

/** The same length of time just before `r`. */
export function previousRange(r: DayRange): DayRange {
    const from = new Date(`${r.from}T00:00:00Z`)
    const to = new Date(`${r.to}T00:00:00Z`)
    const len = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
    const pTo = new Date(from); pTo.setUTCDate(pTo.getUTCDate() - 1)
    const pFrom = new Date(pTo); pFrom.setUTCDate(pFrom.getUTCDate() - (len - 1))
    return { from: day(pFrom), to: day(pTo) }
}

export function daysIn(r: DayRange): string[] {
    const out: string[] = []
    const d = new Date(`${r.from}T00:00:00Z`)
    const end = new Date(`${r.to}T00:00:00Z`)
    while (d <= end) { out.push(day(d)); d.setUTCDate(d.getUTCDate() + 1) }
    return out
}

/** Weeks for anything longer than four months, so a year is 53 points, not 365. */
export function bucketFor(r: DayRange): "day" | "week" {
    return daysIn(r).length > 120 ? "week" : "day"
}

type Row = { d: string; k: string; v: number | string | null }

/**
 * Rows of (day, line key, value) into chart points: count lines summed and zero-filled,
 * score lines averaged and null where nothing was scored.
 */
export function toSeries(r: DayRange, lines: ChartLine[], rows: Row[]): { series: SeriesPoint[]; bucket: "day" | "week"; periodTotals: Record<string, number> } {
    const bucket = bucketFor(r)
    const days = daysIn(r)
    const slot = (d: string) => bucket === "day" ? d : days[Math.floor(days.indexOf(d) / 7) * 7]!
    const slots = bucket === "day" ? days : days.filter((_, i) => i % 7 === 0)
    const sums = new Map<string, Record<string, { sum: number; n: number }>>()
    for (const s of slots) sums.set(s, {})
    const periodTotals: Record<string, number> = Object.fromEntries(lines.filter((l) => l.kind === "count").map((l) => [l.key, 0]))
    for (const row of rows) {
        const d = String(row.d).slice(0, 10)
        if (d < r.from || d > r.to || row.v === null) continue
        const at = sums.get(slot(d))
        if (!at) continue
        const v = Number(row.v)
        const cell = (at[row.k] ??= { sum: 0, n: 0 })
        cell.sum += v
        cell.n += 1
        if (row.k in periodTotals) periodTotals[row.k]! += v
    }
    const series = slots.map((s) => {
        const at = sums.get(s)!
        const point: SeriesPoint = { date: s }
        for (const l of lines) {
            const c = at[l.key]
            point[l.key] = l.kind === "count" ? (c?.sum ?? 0) : c ? Math.round(c.sum / c.n) : null
        }
        return point
    })
    return { series, bucket, periodTotals }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function rows<T>(ex: AnyDb, q: SQL): Promise<T[]> {
    const r = await ex.execute(q)
    return ((r as unknown as { rows?: T[] }).rows ?? (r as unknown as T[]))
}

const n = (v: unknown) => Number(v ?? 0)
/** "1 task done", "2 tasks done". */
const pl = (v: unknown, one: string, many: string) => (n(v) === 1 ? one : many)
const fmt = (v: number) => v.toLocaleString("en")
const iso = (v: unknown) => (v instanceof Date ? v : new Date(String(v))).toISOString()
const within = (col: SQL, r: DayRange) => sql`${col} >= ${r.from}::date and ${col} < (${r.to}::date + 1)`

const PRACTICE_PATH: Record<string, string> = { DSA: "dsa", SYSTEM_DESIGN: "system-design", WEB_FRONTEND: "web-frontend", WEB_BACKEND: "web-backend" }
const PRACTICE_LABEL: Record<string, string> = { DSA: "DSA", SYSTEM_DESIGN: "System design", WEB_FRONTEND: "Web frontend", WEB_BACKEND: "Web backend" }
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")

function summary(key: ModuleKey, r: DayRange, lines: ChartLine[], data: Row[], rest: Omit<ModuleSummary, "key" | "lines" | "series" | "bucket" | "periodTotals">): ModuleSummary {
    return { key, lines, ...toSeries(r, lines, data), ...rest }
}

// ─── Modules ─────────────────────────────────────────────────────────────────

export async function summarizeProjects(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [{ key: "tasks", label: "Tasks done", one: "Task done", kind: "count" }]
    const [counts] = await rows<{ active: number; finished: number; total: number; tasks: number }>(ex, sql`
        select count(*) filter (where status = 'IN_PROGRESS')::int as active,
               count(*) filter (where status in ('SUBMITTED','COMPLETED'))::int as finished,
               count(*)::int as total,
               (select count(*)::int from user_task_v2_status where user_id = ${userId} and status = 'COMPLETED') as tasks
        from user_project_v2_progress where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select completed_at::date::text as d, 'tasks' as k, count(*)::int as v
        from user_task_v2_status
        where user_id = ${userId} and status = 'COMPLETED' and ${within(sql`completed_at`, r)}
        group by 1`)
    const items = await rows<{ slug: string; title: string; status: string; pct: number; done: number; all: number; at: string; score: number | null }>(ex, sql`
        select p.slug, p.title, g.status, round(g.progress_percentage)::int as pct, g.tasks_completed as done, g.total_tasks as all,
               g.updated_at as at, g.total_score as score
        from user_project_v2_progress g join project_v2 p on p.id = g.project_id
        where g.user_id = ${userId}
        order by (g.status = 'IN_PROGRESS') desc, g.updated_at desc limit 5`)
    return summary("projects", r, lines, data, {
        numbers: [
            { label: "in progress", value: fmt(n(counts?.active)) },
            { label: "finished", value: fmt(n(counts?.finished)) },
            { label: pl(counts?.tasks, "task done", "tasks done"), value: fmt(n(counts?.tasks)) },
        ],
        items: items.map((i) => ({
            title: i.title,
            detail: i.status === "IN_PROGRESS" ? `${n(i.done)} of ${n(i.all)} tasks` : title(i.status),
            href: `/projects/${i.slug}`,
            when: iso(i.at),
            score: i.status === "IN_PROGRESS" ? n(i.pct) : i.score,
            status: i.status === "IN_PROGRESS" ? "progress" : title(i.status),
        })),
        total: n(counts?.total),
        empty: n(counts?.total) === 0,
    })
}

export async function summarizePractice(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "solved", label: "Solved", kind: "count" },
        { key: "started", label: "Started", kind: "count" },
    ]
    const [c] = await rows<{ solved: number; total: number; avg: number | null; xp: number }>(ex, sql`
        select count(*) filter (where status = 'COMPLETED')::int as solved, count(distinct problem_id)::int as total,
               round(avg(best_score) filter (where status = 'COMPLETED'))::int as avg,
               coalesce(sum(xp_awarded), 0)::int as xp
        from practice_user_session where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select completed_at::date::text as d, 'solved' as k, count(*)::int as v from practice_user_session
        where user_id = ${userId} and status = 'COMPLETED' and ${within(sql`completed_at`, r)} group by 1
        union all
        select started_at::date::text, 'started', count(*)::int from practice_user_session
        where user_id = ${userId} and ${within(sql`started_at`, r)} group by 1`)
    const items = await rows<{ slug: string; title: string; module: string; difficulty: string; status: string; score: number | null; at: string }>(ex, sql`
        select * from (
            -- One row per problem (a problem can have a session per mode), its latest.
            select distinct on (s.problem_id) p.slug, p.title, s.module, p.difficulty, s.status,
                   case when s.status = 'COMPLETED' then s.best_score end as score, s.updated_at as at
            from practice_user_session s join practice_problem p on p.id = s.problem_id
            where s.user_id = ${userId}
            order by s.problem_id, s.updated_at desc
        ) x order by at desc limit 5`)
    return summary("practice", r, lines, data, {
        numbers: [
            { label: "solved", value: fmt(n(c?.solved)) },
            { label: "average score", value: c?.avg == null ? "-" : String(c.avg) },
            { label: "XP", value: fmt(n(c?.xp)) },
        ],
        items: items.map((i) => ({
            title: i.title,
            detail: `${PRACTICE_LABEL[i.module] ?? i.module} · ${title(i.difficulty)}`,
            href: `/practice/${PRACTICE_PATH[i.module] ?? "dsa"}/${i.slug}`,
            when: iso(i.at),
            score: i.score,
            status: i.status === "COMPLETED" ? "Solved" : i.status === "IN_PROGRESS" ? "In progress" : "Started",
        })),
        total: n(c?.total),
        empty: n(c?.total) === 0,
    })
}

export async function summarizeMock(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [{ key: "score", label: "Overall score", kind: "score" }]
    const score = sql`nullif(ai_analysis->>'overallScore', '')::numeric`
    const [c] = await rows<{ done: number; total: number; avg: number | null; minutes: number }>(ex, sql`
        select count(*) filter (where status = 'COMPLETED')::int as done, count(*)::int as total,
               round(avg(${score}) filter (where status = 'COMPLETED'))::int as avg,
               coalesce(sum(duration) filter (where status = 'COMPLETED'), 0)::int / 60 as minutes
        from mock_voice_session where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select completed_at::date::text as d, 'score' as k, ${score} as v from mock_voice_session
        where user_id = ${userId} and status = 'COMPLETED' and ${score} is not null and ${within(sql`completed_at`, r)}`)
    const items = await rows<{ id: string; title: string; category: string | null; status: string; score: number | null; at: string }>(ex, sql`
        select s.id, m.title, m.category, s.status, round(nullif(s.ai_analysis->>'overallScore', '')::numeric)::int as score,
               coalesce(s.completed_at, s.updated_at) as at
        from mock_voice_session s join mock_interview_voice m on m.id = s.mock_id
        where s.user_id = ${userId} order by coalesce(s.completed_at, s.updated_at) desc limit 5`)
    return summary("mock", r, lines, data, {
        numbers: [
            { label: "completed", value: fmt(n(c?.done)) },
            { label: "average score", value: c?.avg == null ? "-" : String(c.avg) },
            { label: "minutes", value: fmt(n(c?.minutes)) },
        ],
        items: items.map((i) => ({
            title: i.title,
            detail: i.category ? title(i.category) : "Voice mock",
            href: i.status === "COMPLETED" ? `/mock/voice/results/${i.id}` : "/mock/voice",
            when: iso(i.at),
            score: i.score,
            status: title(i.status),
        })),
        total: n(c?.total),
        empty: n(c?.total) === 0,
    })
}

export async function summarizePathfinder(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "steps", label: "Steps done", one: "Step done", kind: "count" },
        { key: "quizzes", label: "Quizzes", one: "Quiz", kind: "count" },
    ]
    const [c] = await rows<{ active: number; done: number; total: number; steps: number; notes: number }>(ex, sql`
        select count(*) filter (where g.status in ('ACTIVE','VERIFICATION'))::int as active,
               count(*) filter (where g.status = 'COMPLETED')::int as done,
               count(*)::int as total,
               coalesce(sum(g.completed_sub_goals), 0)::int as steps,
               (select count(*)::int from pathfinder_sub_goal s join pathfinder_goal x on x.id = s.goal_id
                where x.user_id = ${userId} and s.studio_id is not null) as notes
        from pathfinder_goal g where g.user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select s.completed_at::date::text as d, 'steps' as k, count(*)::int as v
        from pathfinder_sub_goal s join pathfinder_goal g on g.id = s.goal_id
        where g.user_id = ${userId} and s.status = 'COMPLETED' and ${within(sql`s.completed_at`, r)} group by 1
        union all
        select completed_at::date::text, 'quizzes', count(*)::int from pathfinder_quiz_attempt
        where user_id = ${userId} and completed_at is not null and ${within(sql`completed_at`, r)} group by 1`)
    const items = await rows<{ slug: string; title: string; status: string; pct: number; done: number; all: number; notes: number; at: string }>(ex, sql`
        select g.slug, g.title, g.status, round(g.progress_percent)::int as pct, g.completed_sub_goals as done, g.total_sub_goals as all,
               (select count(*)::int from pathfinder_sub_goal s where s.goal_id = g.id and s.studio_id is not null) as notes,
               coalesce(g.last_activity_at, g.updated_at) as at
        from pathfinder_goal g where g.user_id = ${userId}
        order by (g.status in ('ACTIVE','VERIFICATION')) desc, coalesce(g.last_activity_at, g.updated_at) desc limit 5`)
    return summary("pathfinder", r, lines, data, {
        numbers: [
            { label: pl(c?.active, "active goal", "active goals"), value: fmt(n(c?.active)) },
            { label: "completed", value: fmt(n(c?.done)) },
            { label: pl(c?.steps, "step done", "steps done"), value: fmt(n(c?.steps)) },
            { label: pl(c?.notes, "note", "notes"), value: fmt(n(c?.notes)) },
        ],
        items: items.map((i) => ({
            title: i.title,
            detail: `${n(i.done)} of ${n(i.all)} steps${n(i.notes) ? ` · ${n(i.notes)} note${n(i.notes) === 1 ? "" : "s"}` : ""}`,
            href: `/pathfinder/${i.slug}`,
            when: iso(i.at),
            score: n(i.pct),
            status: i.status === "COMPLETED" ? "Completed" : "progress",
        })),
        total: n(c?.total),
        empty: n(c?.total) === 0,
    })
}

export async function summarizeIncidents(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "answered", label: "Checks answered", one: "Check answered", kind: "count" },
        { key: "xp", label: "XP", kind: "count" },
    ]
    const [c] = await rows<{ cases: number; done: number; xp: number; reports: number }>(ex, sql`
        select count(distinct case_slug)::int as cases,
               count(distinct case_slug) filter (where kind = 'completion')::int as done,
               coalesce(sum(xp_awarded), 0)::int as xp,
               (select count(*)::int from incident_run where user_id = ${userId} and status = 'REPORTED') as reports
        from incident_progress where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select created_at::date::text as d, 'answered' as k, count(*)::int as v from incident_progress
        where user_id = ${userId} and kind in ('check','prediction','round') and ${within(sql`created_at`, r)} group by 1
        union all
        select created_at::date::text, 'xp', coalesce(sum(xp_awarded), 0)::int from incident_progress
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1`)
    const items = await rows<{ slug: string; title: string | null; topic: string | null; done: boolean; answered: number; at: string }>(ex, sql`
        select p.case_slug as slug, c.title, c.topic,
               bool_or(p.kind = 'completion') as done,
               count(*) filter (where p.kind in ('check','prediction','round'))::int as answered,
               max(p.created_at) as at
        from incident_progress p left join incident_case c on c.slug = p.case_slug
        where p.user_id = ${userId}
        group by p.case_slug, c.title, c.topic order by max(p.created_at) desc limit 5`)
    return summary("incidents", r, lines, data, {
        numbers: [
            { label: pl(c?.done, "case completed", "cases completed"), value: fmt(n(c?.done)) },
            { label: pl(c?.reports, "report", "reports"), value: fmt(n(c?.reports)) },
            { label: "XP", value: fmt(n(c?.xp)) },
        ],
        items: items.map((i) => ({
            title: i.title ?? i.slug,
            detail: `${i.topic ? `${i.topic} · ` : ""}${n(i.answered)} answered`,
            href: `/incidents/${i.slug}`,
            when: iso(i.at),
            status: i.done ? "Completed" : "In progress",
        })),
        total: n(c?.cases),
        empty: n(c?.cases) === 0,
    })
}

export async function summarizeJobs(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "submitted", label: "Rounds submitted", one: "Round submitted", kind: "count" },
        { key: "sent", label: "Results sent", kind: "count" },
    ]
    const [c] = await rows<{ runs: number; active: number; sent: number; saved: number; referrals: number }>(ex, sql`
        select count(*)::int as runs, count(*) filter (where status = 'IN_PROGRESS')::int as active,
               (select count(*)::int from hiring_send where user_id = ${userId}) as sent,
               (select count(*)::int from saved_job where user_id = ${userId}) as saved,
               (select count(*)::int from referral_request where student_id = ${userId}) as referrals
        from hiring_run where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select a.submitted_at::date::text as d, 'submitted' as k, count(*)::int as v
        from hiring_attempt a join hiring_run h on h.id = a.run_id
        where h.user_id = ${userId} and a.submitted_at is not null and ${within(sql`a.submitted_at`, r)} group by 1
        union all
        select created_at::date::text, 'sent', count(*)::int from hiring_send
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1`)
    const items = await rows<{ status: string; job_title: string | null; job_slug: string | null; company: string | null; company_slug: string | null; process_id: string | null; imported_id: string | null; imported_title: string | null; submitted: number; best: number | null; at: string }>(ex, sql`
        select h.status, j.title as job_title, j.slug as job_slug, co.name as company, co.slug as company_slug, h.process_id,
               ij.id as imported_id, ij.extracted->>'title' as imported_title,
               (select count(*)::int from hiring_attempt a where a.run_id = h.id and a.submitted_at is not null) as submitted,
               (select max(a.score)::int from hiring_attempt a where a.run_id = h.id) as best,
               h.updated_at as at
        from hiring_run h
        left join job j on j.id = h.job_id
        left join company co on co.id = h.company_id
        left join imported_job ij on ij.company_process_id = h.process_id and ij.owner_id = ${userId}
        where h.user_id = ${userId} order by h.updated_at desc limit 5`)
    return summary("jobs", r, lines, data, {
        numbers: [
            { label: pl(c?.active, "round in progress", "rounds in progress"), value: fmt(n(c?.active)) },
            { label: "results sent", value: fmt(n(c?.sent)) },
            { label: pl(c?.referrals, "referral asked", "referrals asked"), value: fmt(n(c?.referrals)) },
            { label: "saved", value: fmt(n(c?.saved)) },
        ],
        items: items.map((i) => ({
            title: i.job_title ?? i.imported_title ?? "Practice rounds",
            detail: `${i.company ?? "Imported job"} · ${n(i.submitted)} round${n(i.submitted) === 1 ? "" : "s"} submitted`,
            href: i.job_slug ? `/jobs/${i.job_slug}/rounds` : i.imported_id ? `/jobs/import/${i.imported_id}` : i.company_slug && i.process_id ? `/companies/${i.company_slug}/rounds/${i.process_id}` : "/jobs/rounds",
            when: iso(i.at),
            score: i.best,
            status: i.status === "IN_PROGRESS" ? "In progress" : title(i.status),
        })),
        total: n(c?.runs),
        empty: n(c?.runs) + n(c?.saved) + n(c?.referrals) === 0,
    })
}

export async function summarizeAiTools(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "resumes", label: "Resumes", one: "Resume", kind: "count" },
        { key: "letters", label: "Cover letters", one: "Cover letter", kind: "count" },
    ]
    const [c] = await rows<{ resumes: number; letters: number; ats: number | null }>(ex, sql`
        select (select count(*)::int from resume_draft where user_id = ${userId}) as resumes,
               (select count(*)::int from cover_letter where user_id = ${userId}) as letters,
               (select max(ats_score)::int from resume_draft where user_id = ${userId}) as ats`)
    const data = await rows<Row>(ex, sql`
        select created_at::date::text as d, 'resumes' as k, count(*)::int as v from resume_draft
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1
        union all
        select created_at::date::text, 'letters', count(*)::int from cover_letter
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1`)
    const items = await rows<{ kind: string; id: string; name: string; detail: string | null; score: number | null; at: string }>(ex, sql`
        (select 'resume' as kind, id, name, coalesce(tailored_for_company, tailored_for) as detail, ats_score as score, updated_at as at
         from resume_draft where user_id = ${userId})
        union all
        (select 'letter', id, coalesce(job_title, 'Cover letter'), company_name, null, updated_at
         from cover_letter where user_id = ${userId})
        order by at desc limit 5`)
    const total = n(c?.resumes) + n(c?.letters)
    return summary("aiTools", r, lines, data, {
        numbers: [
            { label: pl(c?.resumes, "resume", "resumes"), value: fmt(n(c?.resumes)) },
            { label: pl(c?.letters, "cover letter", "cover letters"), value: fmt(n(c?.letters)) },
            { label: "best ATS score", value: c?.ats == null ? "-" : String(c.ats) },
        ],
        items: items.map((i) => ({
            title: i.name,
            detail: i.kind === "resume" ? `Resume${i.detail ? ` · for ${i.detail}` : ""}` : `Cover letter${i.detail ? ` · ${i.detail}` : ""}`,
            href: i.kind === "resume" ? `/ai/resume/draft/${i.id}` : `/ai/coverletter?id=${i.id}`,
            when: iso(i.at),
            score: i.score,
        })),
        total,
        empty: total === 0,
    })
}

export async function summarizeKnowme(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "views", label: "Profile views", one: "Profile view", kind: "count" },
        { key: "questions", label: "Questions asked", one: "Question asked", kind: "count" },
    ]
    const [p] = await rows<{ id: string; status: string; answered: number; visitors: number }>(ex, sql`
        select id, status, total_questions_answered as answered, total_visitors as visitors
        from know_me_profile where user_id = ${userId}`)
    if (!p) {
        return summary("knowme", r, lines, [], { numbers: [], items: [], total: 0, empty: true })
    }
    const data = await rows<Row>(ex, sql`
        select viewed_at::date::text as d, 'views' as k, count(*)::int as v from know_me_profile_view
        where profile_id = ${p.id} and ${within(sql`viewed_at`, r)} group by 1
        union all
        select asked_at::date::text, 'questions', count(*)::int from know_me_question_analytics
        where profile_id = ${p.id} and ${within(sql`asked_at`, r)} group by 1`)
    const items = await rows<{ id: string; question: string; category: string | null; helpful: boolean | null; at: string }>(ex, sql`
        select id, question, question_category as category, was_helpful as helpful, asked_at as at
        from know_me_question_analytics where profile_id = ${p.id} order by asked_at desc limit 5`)
    return summary("knowme", r, lines, data, {
        numbers: [
            { label: "status", value: title(p.status) },
            { label: "visitors", value: fmt(n(p.visitors)) },
            { label: "questions answered", value: fmt(n(p.answered)) },
        ],
        items: items.map((i) => ({
            title: i.question,
            detail: i.category ? title(i.category) : "Asked on your profile",
            href: "/knowme/analytics",
            when: iso(i.at),
            status: i.helpful === true ? "Helpful" : undefined,
        })),
        total: n(p.answered),
        empty: false,
    })
}

export async function summarizeIdeas(ex: AnyDb, userId: string, r: DayRange): Promise<ModuleSummary> {
    const lines: ChartLine[] = [
        { key: "posted", label: "Ideas posted", one: "Idea posted", kind: "count" },
        { key: "votes", label: "Votes cast", one: "Vote cast", kind: "count" },
    ]
    const [c] = await rows<{ posted: number; shipped: number; votes: number; upvotes: number }>(ex, sql`
        select count(*)::int as posted, count(*) filter (where status = 'COMPLETED')::int as shipped,
               coalesce(sum(upvotes), 0)::int as upvotes,
               (select count(*)::int from idea_vote where user_id = ${userId}) as votes
        from feedback where user_id = ${userId}`)
    const data = await rows<Row>(ex, sql`
        select created_at::date::text as d, 'posted' as k, count(*)::int as v from feedback
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1
        union all
        select created_at::date::text, 'votes', count(*)::int from idea_vote
        where user_id = ${userId} and ${within(sql`created_at`, r)} group by 1`)
    const items = await rows<{ id: string; title: string; category: string; status: string; upvotes: number; at: string }>(ex, sql`
        select id, title, category, status, upvotes, updated_at as at
        from feedback where user_id = ${userId} order by updated_at desc limit 5`)
    return summary("ideas", r, lines, data, {
        numbers: [
            { label: "posted", value: fmt(n(c?.posted)) },
            { label: "shipped", value: fmt(n(c?.shipped)) },
            { label: pl(c?.upvotes, "upvote received", "upvotes received"), value: fmt(n(c?.upvotes)) },
            { label: pl(c?.votes, "vote cast", "votes cast"), value: fmt(n(c?.votes)) },
        ],
        items: items.map((i) => ({
            title: i.title,
            detail: `${title(i.category)} · ${n(i.upvotes)} upvote${n(i.upvotes) === 1 ? "" : "s"}`,
            href: `/ideas/${i.id}`,
            when: iso(i.at),
            status: title(i.status),
        })),
        total: n(c?.posted),
        empty: n(c?.posted) + n(c?.votes) === 0,
    })
}

export const SUMMARIZE: Record<ModuleKey, (ex: AnyDb, userId: string, r: DayRange) => Promise<ModuleSummary>> = {
    projects: summarizeProjects,
    practice: summarizePractice,
    mock: summarizeMock,
    pathfinder: summarizePathfinder,
    incidents: summarizeIncidents,
    jobs: summarizeJobs,
    aiTools: summarizeAiTools,
    knowme: summarizeKnowme,
    ideas: summarizeIdeas,
}

// ─── XP ──────────────────────────────────────────────────────────────────────

/**
 * XP per day from the activity ledger (plan/progress): every event records the XP it
 * paid, so this is the same number the activity graph, the day sheet and a report's
 * headline show. (It read the XP transactions before, which practice never writes, so the
 * chart and the headlines disagreed.)
 */
export async function xpRows(ex: AnyDb, userId: string, r: DayRange): Promise<Row[]> {
    return rows<Row>(ex, sql`
        select date::text as d, 'xp' as k, total_xp_earned as v from daily_activity
        where user_id = ${userId} and date >= ${r.from}::date and date <= ${r.to}::date and total_xp_earned > 0`)
}

export interface XpSummary {
    series: SeriesPoint[]
    bucket: "day" | "week"
    total: number
    previousTotal: number
    /** Percent change against the previous period; null when that was zero. */
    change: number | null
    activeDays: number
}

/** XP over `r` with the previous period of the same length as a second line, `previous`. */
export async function summarizeXp(ex: AnyDb, userId: string, r: DayRange): Promise<XpSummary> {
    const prev = previousRange(r)
    const [cur, before] = await Promise.all([xpRows(ex, userId, r), xpRows(ex, userId, prev)])
    const lines: ChartLine[] = [{ key: "xp", label: "XP", kind: "count" }]
    const now = toSeries(r, lines, cur)
    const then = toSeries(prev, lines, before)
    const series = now.series.map((p, i) => ({ ...p, previous: (then.series[i]?.xp as number | undefined) ?? 0 }))
    const total = now.periodTotals.xp ?? 0
    const previousTotal = then.periodTotals.xp ?? 0
    const activeDays = new Set(cur.filter((x) => Number(x.v) > 0).map((x) => x.d)).size
    return {
        series,
        bucket: now.bucket,
        total,
        previousTotal,
        change: previousTotal === 0 ? null : Math.round(((total - previousTotal) / previousTotal) * 100),
        activeDays,
    }
}
