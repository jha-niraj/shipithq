"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
	Plus, ArrowRight, Code2, Trophy, Play, CheckCircle2, Search,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
	Pagination, PaginationContent, PaginationItem, PaginationLink,
	PaginationNext, PaginationPrevious
} from "@repo/ui/components/ui/pagination"
import { 
	Tabs, TabsList, TabsTrigger 
} from "@repo/ui/components/ui/tabs"
import toast from "@repo/ui/components/ui/sonner";
import { StatBand, StatBandSkeleton } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"
import { getUserProjects } from "@/actions/(main)/projects/project.action"
import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/project-card"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"
import { ProjectV2Basic, ProjectV2Progress } from "@/types/project"



// Extended interface for user projects with progress and submission counts
interface UserProjectWithProgress extends ProjectV2Basic {
	progress?: ProjectV2Progress[]
	_count?: {
		submissions: number
		progress: number
	}
}

interface UserStats {
	totalProjects: number
	completedProjects: number
	inProgressProjects: number
	totalSubmissions: number
}

export default function MyProjectsPage({ embedded = false }: { embedded?: boolean } = {}) {
	const [projects, setProjects] = useState<UserProjectWithProgress[]>([])
	const [stats, setStats] = useState<UserStats | null>(null)
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("ALL")
	const [visibilityFilter, setVisibilityFilter] = useState<string>("ALL")
	// "Sort by" was wired to state that nothing read: picking Progress or Title
	// re-rendered the same order (sweep 2026-09-23).
	const [sortBy, setSortBy] = useState("recent")
	const [activeTab, setActiveTab] = useState("all")
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(0)
	const [totalProjects, setTotalProjects] = useState(0)
	const [generateOpen, setGenerateOpen] = useState(false)
	const limit = 30

	// An empty list with a filter on it is a different situation from an empty
	// list, and the panel says a different thing in each case.
	const isFiltered = searchQuery.trim() !== "" || statusFilter !== "ALL" || visibilityFilter !== "ALL"

	const fetchUserProjects = useCallback(async () => {
		try {
			setLoading(true)
			const result = await getUserProjects(currentPage, limit)

			if (result.success && result.data) {
				const projectsData = result.data.projects || []
				setProjects(projectsData)

				// Set pagination data
				if (result.data.pagination) {
					setTotalPages(result.data.pagination.totalPages)
					setTotalProjects(result.data.pagination.total)
				}

				// Calculate stats from current page projects
				const stats: UserStats = {
					totalProjects: projectsData.length,
					completedProjects: projectsData.filter((p: UserProjectWithProgress) => p.progress?.[0]?.status === "COMPLETED").length,
					inProgressProjects: projectsData.filter((p: UserProjectWithProgress) => p.progress?.[0]?.status === "IN_PROGRESS").length,
					totalSubmissions: projectsData.reduce((acc: number, p: UserProjectWithProgress) => acc + (p._count?.submissions || 0), 0),
				}
				setStats(stats)
			}
		} catch (error) {
			console.error("Error fetching user projects:", error)
			toast.error("Failed to load your projects")
		} finally {
			setLoading(false)
		}
	}, [currentPage]);

	useEffect(() => {
		fetchUserProjects()
	}, [currentPage, fetchUserProjects])

	useEffect(() => {
		// Reset to page 1 when filters change
		setCurrentPage(1)
	}, [searchQuery, statusFilter, visibilityFilter, sortBy, activeTab])

	const handlePageChange = (page: number) => {
		setCurrentPage(page)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	// const handleDeleteProject = async (projectId: string) => {
	// 	try {
	// 		const result = await deleteProject(projectId)

	// 		if (result.success) {
	// 			setProjects(prev => prev.filter((p: UserProjectWithProgress) => p.id !== projectId))
	// 			toast.success('Project deleted successfully')
	// 		} else {
	// 			toast.error(result.error || 'Failed to delete project')
	// 		}
	// 	} catch (error) {
	// 		console.log("Error occurred while deleting project: " + error);
	// 		toast.error('Something went wrong. Please try again.')
	// 	}
	// }

	const filteredProjects = projects.filter(project => {
		const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.technologies.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()))

		const userProgress = project.progress?.[0]
		const projectStatus = userProgress?.status || 'NOT_STARTED'

		const matchesStatus = statusFilter === "ALL" || projectStatus === statusFilter
		const matchesVisibility = visibilityFilter === "ALL" || project.visibility === visibilityFilter
		const matchesTab = activeTab === "all" ||
			(activeTab === "in-progress" && projectStatus === "IN_PROGRESS") ||
			(activeTab === "completed" && projectStatus === "COMPLETED") ||
			(activeTab === "submissions" && project._count && project._count.submissions > 0)

		return matchesSearch && matchesStatus && matchesVisibility && matchesTab
	})
		.sort((a, b) => {
			// The control now does what it says. "Most recent" is the order the
			// server already returned, so it stays as it is.
			if (sortBy === "title") return a.title.localeCompare(b.title)
			if (sortBy === "progress") {
				return (b.progress?.[0]?.progressPercentage ?? 0) - (a.progress?.[0]?.progressPercentage ?? 0)
			}
			return 0
		})

	return (
			/* One rhythm, one padding (plan/projects, PJ-9). The column ran
			   mb-6, mb-8, mb-8, mb-8, mb-6, mb-8 + mt-8 - three scales and a 4rem
			   collision where the grid's margin met the pagination's. */
			<div className={embedded ? "" : "py-6"}>
				<div className={embedded ? "w-full space-y-5" : "w-full space-y-5 px-page"}>
					{!embedded && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
							<Link href="/projects" className="hover:text-neutral-800 dark:hover:text-neutral-100">
								Projects
							</Link>
							<ArrowRight className="w-4 h-4" />
							<span>My Projects - {totalProjects}</span>
						</div>
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
							<div>
								{/* text-xl, the scale PageHeader uses. This was
								    text-4xl md:text-5xl, one of five scales in the app
								    for the same element. */}
								<h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
									My Projects
								</h1>
								<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
									Manage your AI-generated projects and track your progress
								</p>
							</div>
							<Button size="sm" onClick={() => setGenerateOpen(true)}>
								<Plus className="mr-1.5 h-4 w-4" />
								Generate a project
							</Button>
						</div>
					</motion.div>
					)}
					{
						stats ? (
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2, duration: 0.6 }}
							>
								<StatBand
									cols={4}
									items={[
										{ icon: Code2, label: "Total Projects", value: stats.totalProjects },
										{ icon: CheckCircle2, label: "Completed", value: stats.completedProjects },
										{ icon: Play, label: "In Progress", value: stats.inProgressProjects },
										{ icon: Trophy, label: "Submissions", value: stats.totalSubmissions },
									]}
								/>
							</motion.div>
						) : loading ? (
							<StatBandSkeleton count={4} cols={4} />
						) : null
					}

					{/*
					  * Props, not classes (plan/projects, PJ-9).
					  *
					  * This was `<TabsList className="">` with no props at all, which
					  * is the default card variant: `w-full` with `flex-1` triggers,
					  * so four labels stretched across the whole page and read as a
					  * banner. `segmented size="sm" fit` is the same call the tabs in
					  * the page header make, which is why those look like they belong.
					  * There is no TabsContent here - the strip drives a filter - so
					  * the quieter affordance is also the honest one.
					  */}
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList variant="segmented" size="sm" fit>
							<TabsTrigger value="all">
								All Projects ({projects.length})
							</TabsTrigger>
							<TabsTrigger value="in-progress">
								In Progress ({projects.filter((p: UserProjectWithProgress) => p.progress?.[0]?.status === "IN_PROGRESS").length})
							</TabsTrigger>
							<TabsTrigger value="completed">
								Completed ({projects.filter((p: UserProjectWithProgress) => p.progress?.[0]?.status === "COMPLETED").length})
							</TabsTrigger>
							<TabsTrigger value="submissions">
								Submissions ({projects.filter((p: UserProjectWithProgress) => p._count && p._count.submissions > 0).length})
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<motion.div
						className="space-y-4"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3, duration: 0.6 }}
					>
						<div className="flex flex-col lg:flex-row gap-4">
							<div className="flex-1">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
									<Input
										placeholder="Search your projects..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
							</div>
							<div className="flex flex-col sm:flex-row gap-4">
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-48">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Status</SelectItem>
										<SelectItem value="NOT_STARTED">Not Started</SelectItem>
										<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
										<SelectItem value="COMPLETED">Completed</SelectItem>
										<SelectItem value="SUBMITTED">Submitted</SelectItem>
										<SelectItem value="PAUSED">Paused</SelectItem>
									</SelectContent>
								</Select>
								<Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
									<SelectTrigger className="w-48">
										<SelectValue placeholder="Visibility" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Visibility</SelectItem>
										<SelectItem value="PRIVATE">Private</SelectItem>
										<SelectItem value="PUBLIC">Public</SelectItem>
									</SelectContent>
								</Select>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="w-48">
										<SelectValue placeholder="Sort by" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="recent">Most Recent</SelectItem>
										<SelectItem value="progress">Progress</SelectItem>
										<SelectItem value="title">Title</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4, duration: 0.6 }}
					>
						{
							loading ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{
										[...Array(9)].map((_, i) => (
											<ProjectCardSkeleton key={i} />
										))
									}
								</div>
							) : filteredProjects.length > 0 ? (
								<>
									<div className="mb-3">
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, filteredProjects.length)} of {filteredProjects.length} projects
										</p>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
										{
											filteredProjects.map((project, index) => (
												<motion.div
													key={project.id}
													initial={{ opacity: 0, y: 20 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: index * 0.1, duration: 0.5 }}
												>
													<ProjectCard project={project} showProgress={true} />
												</motion.div>
											))
										}
									</div>
									{
										totalPages > 1 && (
											<div className="flex justify-center mt-5">
												<Pagination>
													<PaginationContent>
														<PaginationItem>
															<PaginationPrevious
																onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
																className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
															/>
														</PaginationItem>
														{
															[...Array(totalPages)].map((_, index) => {
																const pageNumber = index + 1
																// Show first page, last page, current page, and pages around current
																if (
																	pageNumber === 1 ||
																	pageNumber === totalPages ||
																	(pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
																) {
																	return (
																		<PaginationItem key={pageNumber}>
																			<PaginationLink
																				onClick={() => handlePageChange(pageNumber)}
																				isActive={currentPage === pageNumber}
																				className="cursor-pointer"
																			>
																				{pageNumber}
																			</PaginationLink>
																		</PaginationItem>
																	)
																} else if (
																	pageNumber === currentPage - 2 ||
																	pageNumber === currentPage + 2
																) {
																	return (
																		<PaginationItem key={pageNumber}>
																			<span className="px-4">...</span>
																		</PaginationItem>
																	)
																}
																return null
															})
														}
														<PaginationItem>
															<PaginationNext
																onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
																className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
															/>
														</PaginationItem>
													</PaginationContent>
												</Pagination>
											</div>
										)
									}
								</>
							) : (
								/*
								 * The same empty state as the ideas pane: a dashed panel,
								 * no shadow, the default button. It was a Card with
								 * `shadow-2xl` - the heaviest shadow in the app, on a
								 * panel that holds nothing - plus `p-5` and `py-12` for
								 * two sets of padding, and a button that re-hardcoded
								 * black and white. Two empty-state languages in one route.
								 */
								<div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
									<h3 className="text-sm font-medium text-neutral-900 dark:text-white">
										{
											isFiltered
												? "No projects match those filters."
												: "You have not started a project yet."
										}
									</h3>
									<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
										{
											isFiltered
												? "Clear the search or the filters to see the rest."
												: "Pick one from Ideas, or describe what you want to build and have it generated."
										}
									</p>
									{
										isFiltered ? (
											<button
												type="button"
												onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setVisibilityFilter("ALL") }}
												className="mt-3 text-sm font-semibold text-neutral-900 underline underline-offset-4 dark:text-white"
											>
												Clear the filters
											</button>
										) : (
											<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
												<Link href="/projects/explore?tab=browse">
													<Button size="sm" variant="outline">Browse ideas</Button>
												</Link>
												<Button size="sm" onClick={() => setGenerateOpen(true)}>
													<Plus className="mr-1.5 h-4 w-4" />
													Generate one
												</Button>
											</div>
										)
									}
								</div>
							)
						}
					</motion.div>

					{/* The sheet opens in place. `/projects/generate` is not a route -
					    the link that used to be here navigated away and did nothing. */}
					<ProjectGenerateSheet isOpen={generateOpen} onOpenChange={setGenerateOpen} />
				</div>
			</div>
	)
}