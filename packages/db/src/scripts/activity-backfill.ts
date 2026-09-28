/**
 * Backfill the activity ledger from what every module already stores (plan/progress PRG-5).
 *
 * Reads each module's own tables for work done before the ledger was written, and writes
 * one entry per event with its original time, through `recordActivity`, using the same
 * keys live recording uses (`activityKey`). So a second run, or an event recorded live
 * later, never doubles up. Rebuilds each touched user's streak at the end.
 *
 *   pnpm script activity-backfill                    preview: per user and type, what it would write
 *   pnpm script activity-backfill --apply            write, then preview again (nothing left)
 *   pnpm script activity-backfill --email=a@b.com    one account
 */
import { sql } from "drizzle-orm";
import { db } from "../client";
import { activityKey, recordActivity, recomputeStreak, type ActivityType } from "../activity";
import { requireMigrationsApplied } from "./_migrations-check";

const apply = process.argv.includes("--apply");
const email = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);

type Ev = { user_id: string; type: ActivityType; key: string; title: string; description: string | null; xp: number; at: string };

const K = activityKey;
const onlyUser = email ? sql`and u.email = ${email}` : sql``;

/** Every past event, one query per source. `u` is always the user table, for `--email`. */
function sources() {
    return [
        sql`select s.user_id, 'COMPLETED_PRACTICE_SESSION' as type, ${K.practiceSolved("")} || s.id as key,
                'Solved ' || p.title as title,
                initcap(replace(lower(s.module::text), '_', ' ')) || ' · ' || initcap(lower(p.difficulty::text)) || coalesce(' · score ' || s.best_score, '') as description,
                coalesce(nullif(s.xp_awarded, 0), case p.difficulty when 'HARD' then 100 when 'MEDIUM' then 50 else 25 end) as xp,
                s.completed_at as at
            from practice_user_session s join practice_problem p on p.id = s.problem_id join "user" u on u.id = s.user_id
            where s.status = 'COMPLETED' and s.completed_at is not null ${onlyUser}`,
        sql`select t.user_id, 'PROJECT_TASK_COMPLETED', ${K.projectTask("")} || t.id, 'Finished task: ' || k.title,
                'Projects · ' || p.title, 0, t.completed_at
            from user_task_v2_status t join project_v2_task k on k.id = t.task_id join project_v2 p on p.id = t.project_id join "user" u on u.id = t.user_id
            where t.status = 'COMPLETED' and t.completed_at is not null ${onlyUser}`,
        sql`select g.user_id, 'PROJECT_SUBMISSION', ${K.projectSubmitted("")} || g.id, 'Submitted: ' || p.title, 'Projects', 0, g.submitted_at
            from user_project_v2_progress g join project_v2 p on p.id = g.project_id join "user" u on u.id = g.user_id
            where g.submitted_at is not null ${onlyUser}`,
        sql`select g.user_id, 'PROJECT_COMPLETED', ${K.projectCompleted("")} || g.id, 'Completed: ' || p.title, 'Projects · every task done', 0, g.completed_at
            from user_project_v2_progress g join project_v2 p on p.id = g.project_id join "user" u on u.id = g.user_id
            where g.completed_at is not null ${onlyUser}`,
        sql`select a.user_id, 'PROJECT_QUIZ_COMPLETED', ${K.projectQuiz("")} || a.id, 'Project quiz: ' || p.title,
                'Projects' || coalesce(' · score ' || a.score, ''), 0, a.completed_at
            from project_v2_quiz_attempt a join project_v2 p on p.id = a.project_id join "user" u on u.id = a.user_id
            where a.is_completed and a.completed_at is not null ${onlyUser}`,
        sql`select a.user_id, 'PROJECT_QUIZ_COMPLETED', ${K.projectQuiz("")} || a.id, 'Sprint quiz: ' || p.title,
                'Projects · ' || a.correct || ' of ' || a.total || ' correct', 0, a.created_at
            from project_v2_sprint_quiz_attempt a join project_v2_sprint_quiz q on q.id = a.quiz_id join project_v2 p on p.id = q.project_id join "user" u on u.id = a.user_id
            where true ${onlyUser}`,
        sql`select m.user_id, 'PROJECT_MOCK_COMPLETED', ${K.projectMock("")} || m.id, 'Sprint mock: ' || p.title,
                'Projects' || coalesce(' · score ' || (m.feedback->>'score'), ''), 0, m.ended_at
            from project_v2_sprint_mock_session m join project_v2 p on p.id = m.project_id join "user" u on u.id = m.user_id
            where m.ended_at is not null ${onlyUser}`,
        sql`select s.user_id, 'COMPLETED_MOCK_INTERVIEW', ${K.mockScored("")} || s.id, 'Mock interview: ' || v.title,
                'Mock interviews · score ' || round((s.ai_analysis->>'overallScore')::numeric), 0, coalesce(s.completed_at, s.updated_at)
            from mock_voice_session s join mock_interview_voice v on v.id = s.mock_id join "user" u on u.id = s.user_id
            where s.status = 'COMPLETED' and s.ai_analysis ? 'overallScore' ${onlyUser}`,
        sql`select g.user_id, 'PATHFINDER_GOAL_STARTED', ${K.goalStarted("")} || g.id, 'Started goal: ' || g.title, 'Pathfinder', 0, g.created_at
            from pathfinder_goal g join "user" u on u.id = g.user_id where true ${onlyUser}`,
        sql`select g.user_id, 'PATHFINDER_STEP_COMPLETED', ${K.stepCompleted("")} || s.id, 'Finished step: ' || s.title, 'Pathfinder · ' || g.title, 0, s.completed_at
            from pathfinder_sub_goal s join pathfinder_goal g on g.id = s.goal_id join "user" u on u.id = g.user_id
            where s.status = 'COMPLETED' and s.completed_at is not null ${onlyUser}`,
        sql`select a.user_id, 'PATHFINDER_QUIZ_COMPLETED', ${K.pathfinderQuiz("")} || a.id, 'Quiz: ' || g.title,
                'Pathfinder · score ' || a.score, 0, a.completed_at
            from pathfinder_quiz_attempt a join pathfinder_goal g on g.id = a.goal_id join "user" u on u.id = a.user_id
            where a.completed_at is not null ${onlyUser}`,
        sql`select g.user_id, 'PATHFINDER_GOAL_COMPLETED', ${K.goalCompleted("")} || g.id, 'Completed goal: ' || g.title, 'Pathfinder · verified', 0, g.completed_at
            from pathfinder_goal g join "user" u on u.id = g.user_id where g.status = 'COMPLETED' and g.completed_at is not null ${onlyUser}`,
        sql`select p.user_id,
                case p.kind when 'completion' then 'INCIDENT_CASE_COMPLETED' when 'perfect_round' then 'INCIDENT_ROUND_COMPLETED' else 'INCIDENT_CHECK_ANSWERED' end,
                case p.kind when 'completion' then ${K.incidentCase("")} || p.case_slug
                            when 'perfect_round' then 'incident:round:' || p.case_slug || ':' || p.item_id
                            else 'incident:check:' || p.case_slug || ':' || p.item_id end,
                case p.kind when 'completion' then 'Completed incident: ' || coalesce(c.title, p.case_slug)
                            when 'perfect_round' then 'Perfect round in ' || coalesce(c.title, p.case_slug)
                            else 'Answered a check in ' || coalesce(c.title, p.case_slug) end,
                'Incidents' || case when p.correct then ' · correct' when p.correct = false then ' · not quite' else '' end,
                coalesce(p.xp_awarded, 0), p.created_at
            from incident_progress p left join incident_case c on c.slug = p.case_slug join "user" u on u.id = p.user_id
            where p.kind in ('check', 'prediction', 'perfect_round', 'completion') ${onlyUser}`,
        sql`select r.user_id, 'INCIDENT_REPORT_READY', ${K.incidentReport("")} || r.id, 'Report ready: ' || coalesce(c.title, r.case_slug), 'Incidents', 0, r.reported_at
            from incident_run r left join incident_case c on c.slug = r.case_slug join "user" u on u.id = r.user_id
            where r.status = 'REPORTED' and r.reported_at is not null ${onlyUser}`,
        sql`select m.user_id, 'INCIDENT_MOCK_COMPLETED', ${K.incidentMock("")} || m.id, 'Incident talk: ' || coalesce(c.title, m.case_slug),
                'Incidents' || coalesce(' · score ' || (m.feedback->>'score'), ''), 0, m.completed_at
            from incident_mock_session m left join incident_case c on c.slug = m.case_slug join "user" u on u.id = m.user_id
            where m.status = 'COMPLETED' and m.completed_at is not null ${onlyUser}`,
        sql`select h.user_id, 'HIRING_ROUND_SCORED', ${K.roundScored("")} || a.id, 'Round scored: ' || coalesce(j.title, 'practice rounds'),
                'Jobs' || coalesce(' · score ' || a.score, ''), 0, coalesce(a.submitted_at, a.created_at)
            from hiring_attempt a join hiring_run h on h.id = a.run_id left join job j on j.id = h.job_id join "user" u on u.id = h.user_id
            where a.status = 'SCORED' ${onlyUser}`,
        sql`select s.user_id, 'HIRING_RESULTS_SENT', ${K.resultsSent("")} || s.id, 'Results sent: ' || coalesce(j.title, 'a role'), 'Jobs', 0, s.created_at
            from hiring_send s left join job j on j.id = s.job_id join "user" u on u.id = s.user_id where true ${onlyUser}`,
        sql`select r.student_id, 'REFERRAL_REQUESTED', ${K.referralRequested("")} || r.id, 'Asked for a referral' || coalesce(': ' || j.title, ''), 'Jobs', 0, r.created_at
            from referral_request r left join job j on j.id = r.job_id join "user" u on u.id = r.student_id where true ${onlyUser}`,
        sql`select s.user_id, 'JOB_SAVED', ${K.jobSaved("")} || s.job_id, 'Saved: ' || j.title, 'Jobs', 0, s.created_at
            from saved_job s join job j on j.id = s.job_id join "user" u on u.id = s.user_id where true ${onlyUser}`,
        sql`select i.owner_id, 'JOB_IMPORTED', ${K.jobImported("")} || i.id, 'Imported: ' || coalesce(i.extracted->>'title', 'a job'), 'Jobs', 0, i.updated_at
            from imported_job i join "user" u on u.id = i.owner_id where i.status = 'READY' ${onlyUser}`,
        sql`select d.user_id, 'RESUME_CREATED', ${K.resumeCreated("")} || d.id, 'Resume: ' || d.name, 'AI tools', 0, d.created_at
            from resume_draft d join "user" u on u.id = d.user_id where true ${onlyUser}`,
        sql`select l.user_id, 'COVER_LETTER_CREATED', ${K.coverLetter("")} || l.id,
                'Cover letter: ' || coalesce(l.job_title, 'a role') || coalesce(' at ' || l.company_name, ''), 'AI tools', 0, l.created_at
            from cover_letter l join "user" u on u.id = l.user_id where l.generated_content is not null ${onlyUser}`,
        sql`select k.user_id, 'KNOWME_ACTIVATED', ${K.knowmeActivated("")} || k.id, 'KnowMe profile is live', 'KnowMe', 0, coalesce(k.onboarding_started_at, k.created_at)
            from know_me_profile k join "user" u on u.id = k.user_id where k.onboarding_completed ${onlyUser}`,
        sql`select f.user_id, 'FEEDBACK_SUBMITTED', ${K.ideaPosted("")} || f.id, 'Posted an idea: ' || f.title, 'Ideas', 0, f.created_at
            from feedback f join "user" u on u.id = f.user_id where true ${onlyUser}`,
        sql`select v.user_id, 'IDEA_VOTED', ${K.ideaVoted("")} || v.feedback_id, 'Voted for: ' || f.title, 'Ideas', 0, v.created_at
            from idea_vote v join feedback f on f.id = v.feedback_id join "user" u on u.id = v.user_id where true ${onlyUser}`,
    ];
}

async function pending(): Promise<Ev[]> {
    const q = sql.join(sources().map((s) => sql`(${s})`), sql` union all `);
    const r = await db.execute(sql`
        select e.user_id, e.type, e.key, e.title, e.description, e.xp::int as xp, e.at
        from (${q}) as e(user_id, type, key, title, description, xp, at)
        where e.at is not null
          and not exists (select 1 from activity_entry a where a.user_id = e.user_id and a.dedupe_key = e.key)
        order by e.at`);
    return ((r as unknown as { rows?: Ev[] }).rows ?? (r as unknown as Ev[]));
}

function host(): string {
    try { return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"; } catch { return "(DATABASE_URL is not a URL)"; }
}

function print(evs: Ev[]) {
    const byUser = new Map<string, Map<string, number>>();
    for (const e of evs) {
        const m = byUser.get(e.user_id) ?? new Map<string, number>();
        m.set(e.type, (m.get(e.type) ?? 0) + 1);
        byUser.set(e.user_id, m);
    }
    for (const [u, m] of byUser) {
        console.log(`  ${u}: ${[...m].map(([t, c]) => `${t} ${c}`).join(", ")}`);
    }
    console.log(`\n  ${evs.length} entr${evs.length === 1 ? "y" : "ies"} for ${byUser.size} user${byUser.size === 1 ? "" : "s"}.`);
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nActivity backfill on ${host()}${email ? ` for ${email}` : ""} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const evs = await pending();
    print(evs);
    if (!apply) {
        console.log(evs.length ? "\n  Preview only. Run with --apply to write these.\n" : "\n  Nothing to backfill.\n");
        return;
    }
    let written = 0;
    for (const e of evs) {
        if (await recordActivity(db, e.user_id, { type: e.type, key: e.key, title: e.title, description: e.description, xp: e.xp, at: new Date(e.at) })) written++;
    }
    const users = [...new Set(evs.map((e) => e.user_id))];
    for (const u of users) await recomputeStreak(db, u);
    const left = await pending();
    console.log(`\n  Wrote ${written}; streaks rebuilt for ${users.length} user${users.length === 1 ? "" : "s"}.`);
    console.log(left.length ? `  ${left.length} still pending - read the lines above.\n` : "  Done. Planning again finds nothing left.\n");
    if (left.length) process.exitCode = 1;
}

main().then(() => process.exit(process.exitCode ?? 0)).catch((error: unknown) => {
    // A failed query's own message is on `cause`; the outer one is the whole SQL.
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    console.error(cause ?? (error instanceof Error ? error.message.split("\n")[0] : error));
    process.exit(1);
});
