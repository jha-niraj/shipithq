"use client"

/**
 * `/projects` - the user's own work, not a sales page.
 *
 * ── What this replaced ───────────────────────────────────────────────────────
 * 457 lines of marketing rendered INSIDE the authenticated shell: a centred hero
 * reading "Build Real Projects, Master Real Skills", a "Stop watching tutorials"
 * sub-headline, a four-up stat band, four `features` blurbs, a "Community
 * Showcase", and a closing "Join thousands of developers" call to action.
 *
 * Every word of that was aimed at someone deciding whether to sign up. The
 * reader is signed up, is paying, and came to see what they are building.
 * Niraj, 2026-08-29: *"the overview page should be about the user and what are
 * the things that the user have done across this all module and not marketing."*
 * That also settles `PRJ-U2` and open question 3 in `00-state-of-play.md`.
 *
 * ── Two things the old page was saying that were not true ────────────────────
 *  - The stat band read `0+ Projects Built · 0+ Active Builders · 0+ Tasks
 *    Completed · 94% Success Rate`. The first three were real and zero; the
 *    fourth was a hardcoded literal, because with zero completed tasks there is
 *    nothing to compute a rate from. Three honest zeroes next to one invented
 *    number is worse than showing neither.
 *  - One `features` blurb advertised "Community Driven - Project sharing,
 *    Community voting, Inspiration gallery". All three were deleted in PRJ-1
 *    through PRJ-4. The copy outlived the features it described.
 *
 * Every number below comes from `getMyProjectsOverview`, which reads only the
 * signed-in user's own rows. If a figure cannot be computed from their work, it
 * is not on the page.
 */

import Link from "next/link"
import { ProjectPicks } from "./project-picks"
import type { RecommendedIdeaView } from "@/actions/(main)/projects/recommendations.action"
import { motion } from "framer-motion"
import {
	ArrowRight, CheckCircle2, Compass, Lightbulb, ListTodo, Plus, Sparkles,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { cn } from "@repo/ui/lib/utils"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"
import { PublicProjectsGrid } from "@/app/(main)/projects/_components/public-projects-grid"
import { ActivityChart, type ActivityPoint } from "@/components/common/activity-chart"
import { OverviewPanel } from "@/components/common/overview-kit"
import type { MyProjectSummary, MyProjectsOverview } from "@/actions/(main)/projects/overview.action"

interface ProjectsHubClientProps {
	overview: MyProjectsOverview | null
	activity: { series: ActivityPoint[]; unit: string; total: number }
	/** Rendered above the header. The onboarding "where you stand" widget lives here. */
	widget?: React.ReactNode
	/** Ideas chosen from the onboarding profile (plan/projects, PJ-1). */
	picks: RecommendedIdeaView[]
	/** False until the projects onboarding is finished. */
	canRecommend: boolean
}

export default function ProjectsHubClient({ overview, activity, widget, picks, canRecommend }: ProjectsHubClientProps) {
	const active = overview?.active ?? []
	const finished = overview?.finished ?? []
	const totals = overview?.totals
	const nextTask = overview?.nextTask
	const hasWork = (totals?.projects ?? 0) > 0

	return (
		<div className="page-frame px-page py-6">
			{widget && <div className="mb-6">{widget}</div>}
			<motion.header
				initial={{ opacity: 0, y: -12 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
			>
				<div className="min-w-0">
					<h1 className="text-xl font-bold text-neutral-900 dark:text-white">
						{hasWork ? "Your projects" : "Build something"}
					</h1>
					<p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
						{hasWork
							? "Everything you have started here, and what to do next."
							: "Generate a project from an idea, then work it sprint by sprint."}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button asChild variant="outline" size="sm" className="gap-2">
						<Link href="/projects/explore?tab=browse">
							<Lightbulb className="h-4 w-4" />
							Browse ideas
						</Link>
					</Button>
					<ProjectGenerateSheet
						trigger={
							<Button size="sm" className="gap-2">
								<Plus className="h-4 w-4" />
								New project
							</Button>
						}
					/>
				</div>
			</motion.header>

			{/* Pick up where you left off. Above everything, because it is the one
				thing a returning user almost always wants. */}
			{/* What to build next, from the onboarding. Above the catalogue and below
				"pick up where you left off": someone mid-project wants that first. */}
			<ProjectPicks initial={picks} canRecommend={canRecommend} />

			{nextTask && (
				<motion.section
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.04 }}
					className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
								Next up
							</p>
							<p className="mt-1 truncate text-base font-semibold text-neutral-900 dark:text-white">
								{nextTask.title}
							</p>
							<p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
								{nextTask.projectTitle}
								{nextTask.sprintTitle ? ` · ${nextTask.sprintTitle}` : ""}
							</p>
						</div>
						<Button asChild className="shrink-0 gap-2">
							<Link href={`/projects/${nextTask.projectSlug}/workspace?task=${nextTask.id}&file=%40task`}>
								Continue
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</motion.section>
			)}

			{/* Only rendered once there is something to count. An all-zero stat band
				on a first run is noise, and it is exactly what the old page did. */}
			{hasWork && totals && (
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.08 }}
					className="mb-6"
				>
					<StatBand
						cols={4}
						items={[
							{ icon: Compass, label: "Projects", value: totals.projects.toLocaleString() },
							{ icon: ListTodo, label: "In progress", value: totals.active.toLocaleString() },
							{ icon: CheckCircle2, label: "Finished", value: totals.finished.toLocaleString() },
							{
								icon: CheckCircle2,
								label: "Tasks done",
								value: totals.tasksCompleted.toLocaleString(),
								hint: totals.totalTasks > 0 ? `of ${totals.totalTasks}` : undefined,
							},
						]}
					/>
				</motion.div>
			)}

			{/* The chart is rendered whether or not there is anything in it. An
				all-zero series still shows the window, the axis and a real baseline,
				which is a true reading; hiding it until data exists means the page
				changes shape the first time somebody finishes a task. */}
			<OverviewPanel
				title="Tasks completed"
				action={{ label: "All projects", href: "/projects/explore?tab=mine" }}
				delay={0.1}
				className="mb-6"
			>
				<p className="-mt-2 mb-3 text-sm text-neutral-500 dark:text-neutral-400">
					<span className="font-medium text-neutral-900 tabular-nums dark:text-white">
						{activity.total}
					</span>
					{" in the last 30 days"}
				</p>
				<ActivityChart data={activity.series} unit={activity.unit} />
			</OverviewPanel>

			<motion.section
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.14 }}
				className="mb-8"
			>
				<div className="mb-3 flex items-baseline justify-between gap-3">
					<h2 className="text-base font-semibold text-neutral-900 dark:text-white">
						In progress
					</h2>
					{active.length > 0 && (
						<Link
							href="/projects/explore?tab=mine"
							className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
						>
							All projects
						</Link>
					)}
				</div>

				{active.length > 0 ? (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{active.map((p) => (
							<ProjectRow key={p.id} project={p} />
						))}
					</div>
				) : (
					<EmptyState
						title={hasWork ? "Nothing in progress" : "You have not started a project yet"}
						body={
							hasWork
								? "Everything you started is finished. Generate another one when you are ready."
								: "Describe what you want to build and the AI turns it into sprints and tasks you can actually work through."
						}
					/>
				)}
			</motion.section>

			{finished.length > 0 && (
				<motion.section
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.16 }}
					className="mb-8"
				>
					<h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
						Finished
					</h2>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{finished.slice(0, 6).map((p) => (
							<ProjectRow key={p.id} project={p} />
						))}
					</div>
				</motion.section>
			)}

			{/* Discovery, BELOW the user's own work rather than above it. */}
			<motion.section
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
			>
				<div className="mb-3 flex items-baseline justify-between gap-3">
					<h2 className="text-base font-semibold text-neutral-900 dark:text-white">
						From the catalogue
					</h2>
					<Link
						href="/projects/explore?tab=browse&made=community"
						className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
					>
						Browse all
					</Link>
				</div>
				<PublicProjectsGrid />
			</motion.section>
		</div>
	)
}

function ProjectRow({ project }: { project: MyProjectSummary }) {
	const pct = Math.round(project.progressPercentage)

	return (
		<Link
			href={`/projects/${project.slug}`}
			className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<div className="flex items-start justify-between gap-3">
				<h3 className="min-w-0 truncate text-sm font-semibold text-neutral-900 dark:text-white">
					{project.title}
				</h3>
				<Badge variant="secondary" className="shrink-0 text-xs capitalize">
					{project.difficulty.toLowerCase()}
				</Badge>
			</div>

			{project.shortDescription && (
				<p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
					{project.shortDescription}
				</p>
			)}

			<div className="mt-auto pt-3">
				<div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
					<span>
						{project.tasksCompleted} of {project.totalTasks} tasks
					</span>
					<span className="tabular-nums">{pct}%</span>
				</div>
				<div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
					<div
						className={cn("h-full rounded-full bg-neutral-900 dark:bg-white")}
						style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
					/>
				</div>
			</div>
		</Link>
	)
}

function EmptyState({ title, body }: { title: string; body: string }) {
	return (
		<div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
			<span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
				<Sparkles className="h-5 w-5" />
			</span>
			<p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
			<p className="mx-auto mt-1 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
				{body}
			</p>
			<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
				<ProjectGenerateSheet
					trigger={
						<Button size="sm" className="gap-2">
							<Sparkles className="h-4 w-4" />
							Generate a project
						</Button>
					}
				/>
				<Button asChild variant="outline" size="sm" className="gap-2">
					<Link href="/projects/explore?tab=browse">
						<Lightbulb className="h-4 w-4" />
						Browse ideas
					</Link>
				</Button>
			</div>
		</div>
	)
}
