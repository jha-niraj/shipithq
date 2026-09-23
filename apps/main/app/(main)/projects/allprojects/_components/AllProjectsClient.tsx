"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { Input } from "@repo/ui/components/ui/input"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
	Pagination, PaginationContent, PaginationItem, PaginationLink,
	PaginationNext, PaginationPrevious
} from "@repo/ui/components/ui/pagination"
import {
	Search, Filter, Sparkles
} from "lucide-react"
import Link from "next/link"
import { getAllPublicProjects } from "@/actions/(main)/projects/project.action"

/** One row exactly as `getAllPublicProjects` returns it. */
type PublicProject = NonNullable<
	Awaited<ReturnType<typeof getAllPublicProjects>>["data"]
>["projects"][number]
import { ProjectCardSkeleton } from "@/components/projects/project-card"
import { CatalogueCard } from "@/components/projects/catalogue-card"
import { ProjectV2Basic } from "@/types/project"

const DIFFICULTY_OPTIONS = [
	{ value: "ALL", label: "All Levels" },
	{ value: "BEGINNER", label: "Beginner" },
	{ value: "INTERMEDIATE", label: "Intermediate" },
	{ value: "ADVANCED", label: "Advanced" }
]

const TECHNOLOGY_OPTIONS = [
	"React", "Next.js", "Node.js", "Python", "TypeScript", "JavaScript",
	"MongoDB", "PostgreSQL", "Express", "Django", "Vue.js", "HTML", "CSS"
]

export default function AllProjectsPage({ embedded = false }: { embedded?: boolean } = {}) {
	// DERIVED from the action's actual return type, not hand-written.
	//
	// This was `ProjectV2Basic[]`, which declares generationType, visibility,
	// stacks, totalStarted and totalSubmissions - none of which the query
	// selects, and none of which this component reads. So the state claimed five
	// fields that were always `undefined`, and only an `any` in the action's
	// return type stopped the compiler saying so.
	const [projects, setProjects] = useState<PublicProject[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [difficulty, setDifficulty] = useState("ALL")
	const [selectedTech, setSelectedTech] = useState<string[]>([])
	const [sortBy, setSortBy] = useState<string>("popular")
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(0)
	const [totalProjects, setTotalProjects] = useState(0)
	const limit = 30

	const fetchProjects = useCallback(async () => {
		try {
			setLoading(true)

			const techFilter = selectedTech.length > 0 ? selectedTech : undefined
			const difficultyFilter = difficulty !== "ALL" ? difficulty : undefined

			const response = await getAllPublicProjects({
				page: currentPage,
				limit,
				difficulty: difficultyFilter,
				technologies: techFilter,
				search: searchTerm,
				sortBy: sortBy as 'popular' | 'recent' | 'rating'
			})

			if (response.success && response.data) {
				setProjects(response.data.projects)
				setTotalPages(response.data.pagination.totalPages)
				setTotalProjects(response.data.pagination.total)
			}
		} catch (error) {
			console.error("Error fetching projects:", error)
		} finally {
			setLoading(false)
		}
	}, [currentPage, difficulty, selectedTech, searchTerm, sortBy])

	useEffect(() => {
		fetchProjects()
	}, [fetchProjects])

	useEffect(() => {
		// Reset to page 1 when filters change
		setCurrentPage(1)
	}, [difficulty, selectedTech, searchTerm, sortBy])

	const handlePageChange = (page: number) => {
		setCurrentPage(page)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const handleTechToggle = (tech: string) => {
		setSelectedTech(prev =>
			prev.includes(tech)
				? prev.filter(t => t !== tech)
				: [...prev, tech]
		)
	}

	const filteredProjects = projects.filter(project =>
		project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
		project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
		project.technologies.some(tech =>
			tech.toLowerCase().includes(searchTerm.toLowerCase())
		)
	)

	// const sortedProjects = filteredProjects

	return (
			<div>
				<div className={embedded ? "w-full space-y-5" : "w-full space-y-5 px-page py-6"}>
					{!embedded && (
					<motion.div
						className="text-center"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<Badge className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm mb-4">
							<Sparkles className="w-4 h-4 mr-2"									/>
							Public Projects
						</Badge>
						<h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
							Community projects
						</h1>
						<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
							Discover amazing projects created by our community. Get inspired, learn from others, and start building!
						</p>
					</motion.div>
					)}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.6 }}
					>
						<div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
							<div className="flex flex-col md:flex-row gap-4">
								<div className="relative flex-1">
									<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-600 dark:text-neutral-400 w-5 h-5" />
									<Input
										placeholder="Search projects, technologies, or descriptions..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="pl-12 h-12 rounded-xl border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
									/>
								</div>
								<Select value={difficulty} onValueChange={setDifficulty}>
									<SelectTrigger className="w-full md:w-48 h-12 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
										<SelectValue placeholder="Select difficulty" />
									</SelectTrigger>
									<SelectContent>
										{
											DIFFICULTY_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))
										}
									</SelectContent>
								</Select>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="w-full md:w-48 h-12 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
										<SelectValue placeholder="Sort by" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="popular">Most Popular</SelectItem>
										<SelectItem value="recent">Most Recent</SelectItem>
										<SelectItem value="rating">Highest Rated</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
									<Filter className="w-4 h-4" />
									Filter by Technologies
								</h3>
								<div className="flex flex-wrap gap-2">
									{
										TECHNOLOGY_OPTIONS.map((tech) => (
											<Button
												key={tech}
												variant={selectedTech.includes(tech) ? "default" : "outline"}
												size="sm"
												onClick={() => handleTechToggle(tech)}
												className={`rounded-xl text-xs transition-all ${selectedTech.includes(tech)
													? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
													: "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
													}`}
											>
												{tech}
											</Button>
										))
									}
								</div>
								{
									selectedTech.length > 0 && (
										<div className="mt-3">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setSelectedTech([])}
												className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl"
											>
												Clear filters ({selectedTech.length})
											</Button>
										</div>
									)
								}
							</div>
						</div>
					</motion.div>
					{
						loading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{[...Array(9)].map((_, i) => (
									<ProjectCardSkeleton key={i} />
								))}
							</div>
						) : filteredProjects.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
								<h3 className="text-sm font-medium text-neutral-900 dark:text-white">
									No community projects match that.
								</h3>
								<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
									Try a different search, or fewer technologies.
								</p>
								<Link href="/projects/explore?tab=ideas" className="mt-3 inline-block text-sm font-semibold text-neutral-900 underline underline-offset-4 dark:text-white">
									Browse the curated ideas instead
								</Link>
							</div>
						) : (
							<>
								<div className="mb-3">
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalProjects)} of {totalProjects} projects
									</p>
								</div>
								{/* The SAME card the Ideas tab draws (Niraj, 2026-09-23).
								    It was a different one: tags on top, the title
								    buried under them, the author in a footer. */}
								<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
									{
										filteredProjects.map((project) => (
											<CatalogueCard
												key={project.id}
												title={project.title}
												description={project.shortDescription || project.description || ""}
												difficulty={project.difficulty ?? ""}
												technologies={project.technologies ?? []}
												estimatedHours={project.estimatedHours ?? null}
												views={project.totalViews ?? null}
												author={project.creator}
												href={`/projects/${project.slug}`}
												actionLabel="View project"
											/>
										))
									}
								</ul>
								{
									totalPages > 1 && (
										<div className="flex justify-center mt-8">
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
						)
					}
				</div>
			</div>
	)
}