"use client"

import {
	TrendingUp, Trophy, Users, Star, Clock, CheckCircle2, Target, Code2,
	Eye, ThumbsUp, Zap, Award, Activity, BarChart3, PieChart, ArrowUpRight,
	ArrowDownRight
} from "lucide-react"
import {
	Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@repo/ui/components/ui/card"
import { Badge } from "@repo/ui/components/ui/badge"
import { Progress } from "@repo/ui/components/ui/progress"
import {
	Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import Image from "next/image"
import { StatBand } from "@repo/ui/components/ui/stat-band"

interface ProjectStats {
	totalViews: number
	totalStarted: number
	totalCompleted: number
	totalSubmissions: number
	averageRating: number
	totalVotes: number
	totalXpAwarded: number
	completionRate: number
	averageCompletionTime: number
	difficultyDistribution: {
		beginner: number
		intermediate: number
		advanced: number
	}
	technologyPopularity: {
		name: string
		count: number
		percentage: number
	}[]
	weeklyStats: {
		week: string
		views: number
		started: number
		completed: number
	}[]
	topPerformers: {
		username: string
		avatar: string
		xp: number
		completionTime: number
	}[]
}

interface UserProjectStats {
	totalProjects: number
	completedProjects: number
	inProgressProjects: number
	totalXpEarned: number
	totalTimeSpent: number
	averageRating: number
	totalSubmissions: number
	streak: number
	rank: number
	badges: {
		id: string
		name: string
		description: string
		icon: string
		earnedAt: Date
	}[]
}

interface ProjectProgress {
	totalTasks: number
	completedTasks: number
	progressPercentage: number
	currentTask?: {
		id: string
		title: string
		difficulty: string
	}
	upcomingTasks: {
		id: string
		title: string
		estimatedTime: number
	}[]
	timeSpent: number
	xpEarned: number
	milestone?: {
		name: string
		progress: number
		target: number
	}
}

interface AnalyticsComponentProps {
	stats: ProjectStats
	className?: string
}

interface UserStatsComponentProps {
	userStats: UserProjectStats
	className?: string
}

interface ProgressComponentProps {
	progress: ProjectProgress
	className?: string
}

// Main Project Analytics Component
export function ProjectAnalytics({ stats, className }: AnalyticsComponentProps) {
	return (
		<div className={`space-y-6 ${className}`}>
			<StatBand
				cols={4}
				items={[
					{ icon: Eye, label: "Total Views", value: stats.totalViews.toLocaleString(), hint: <TrendDelta trend={12.5} /> },
					{ icon: Users, label: "Active Builders", value: stats.totalStarted.toLocaleString(), hint: <TrendDelta trend={8.3} /> },
					{ icon: CheckCircle2, label: "Completions", value: stats.totalCompleted.toLocaleString(), hint: <TrendDelta trend={-2.1} /> },
					{ icon: Star, label: "Avg Rating", value: stats.averageRating.toFixed(1), hint: <TrendDelta trend={5.7} /> },
				]}
			/>
			<Tabs defaultValue="overview" className="space-y-6">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="engagement">Engagement</TabsTrigger>
					<TabsTrigger value="trends">Trends</TabsTrigger>
					<TabsTrigger value="leaderboard">Top Builders</TabsTrigger>
				</TabsList>
				<TabsContent value="overview" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<CompletionRateChart completionRate={stats.completionRate} />
						<DifficultyDistributionChart distribution={stats.difficultyDistribution} />
					</div>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Code2 className="h-5 w-5" />
								Technology Popularity
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{
									stats.technologyPopularity.slice(0, 5).map((tech, index) => (
										<div key={tech.name} className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-6 h-6 rounded bg-gradient-to-br from-neutral-900 to-neutral-800 text-white flex items-center justify-center text-xs font-bold">
													{index + 1}
												</div>
												<span className="font-medium text-gray-900 dark:text-white">
													{tech.name}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Progress value={tech.percentage} className="w-20" />
												<span className="text-sm text-gray-600 dark:text-gray-400 w-12">
													{tech.percentage}%
												</span>
											</div>
										</div>
									))
								}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="engagement" className="space-y-6">
					<StatBand
						cols={3}
						items={[
							{ icon: ThumbsUp, label: "Total Votes", value: stats.totalVotes.toLocaleString() },
							{ icon: Trophy, label: "XP Awarded", value: `${(stats.totalXpAwarded / 1000).toFixed(1)}K` },
							{ icon: Target, label: "Submissions", value: stats.totalSubmissions.toLocaleString() },
						]}
					/>
				</TabsContent>
				<TabsContent value="trends" className="space-y-6">
					<WeeklyTrendsChart weeklyStats={stats.weeklyStats} />
				</TabsContent>
				<TabsContent value="leaderboard" className="space-y-6">
					<TopPerformersLeaderboard performers={stats.topPerformers} />
				</TabsContent>
			</Tabs>
		</div>
	)
}

// User Stats Component
export function UserProjectAnalytics({ userStats, className }: UserStatsComponentProps) {
	return (
		<div className={`space-y-6 ${className}`}>
			<StatBand
				cols={4}
				items={[
					{ icon: Code2, label: "Total Projects", value: userStats.totalProjects.toString() },
					{ icon: CheckCircle2, label: "Completed", value: userStats.completedProjects.toString() },
					{ icon: Trophy, label: "Total XP", value: userStats.totalXpEarned.toLocaleString() },
					{ icon: Star, label: "Avg Rating", value: userStats.averageRating > 0 ? userStats.averageRating.toFixed(1) : "-" },
				]}
			/>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Performance Metrics
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-gray-600 dark:text-gray-400">Current Streak</span>
							<Badge className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100">
								{userStats.streak} days
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600 dark:text-gray-400">Global Rank</span>
							<Badge className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100">
								#{userStats.rank}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600 dark:text-gray-400">Time Invested</span>
							<span className="font-medium text-gray-900 dark:text-white">
								{Math.round(userStats.totalTimeSpent / 60)}h
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
							<span className="font-medium text-gray-900 dark:text-white">
								{userStats.totalProjects > 0
									? Math.round((userStats.completedProjects / userStats.totalProjects) * 100)
									: 0}%
							</span>
						</div>
					</CardContent>
				</Card>
				{
					userStats.badges.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Award className="h-5 w-5" />
									Recent Badges
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{
										userStats.badges.slice(0, 3).map((badge) => (
											<div key={badge.id} className="flex items-center gap-3">
												<div className="w-8 h-8 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-full flex items-center justify-center">
													<span className="text-lg">{badge.icon}</span>
												</div>
												<div>
													<div className="font-medium text-gray-900 dark:text-white">
														{badge.name}
													</div>
													<div className="text-xs text-gray-600 dark:text-gray-400">
														{new Date(badge.earnedAt).toLocaleDateString()}
													</div>
												</div>
											</div>
										))
									}
								</div>
							</CardContent>
						</Card>
					)
				}
			</div>
		</div>
	)
}

// Project Progress Component
export function ProjectProgressAnalytics({ progress, className }: ProgressComponentProps) {
	return (
		<div className={`space-y-6 ${className}`}>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Target className="h-5 w-5" />
						Project Progress
					</CardTitle>
					<CardDescription>
						{progress.completedTasks} of {progress.totalTasks} tasks completed
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium">Overall Progress</span>
						<span className="text-sm font-bold">{progress.progressPercentage}%</span>
					</div>
					<Progress value={progress.progressPercentage} className="h-3" />
					<div className="grid grid-cols-2 gap-4 mt-4">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{Math.round(progress.timeSpent / 60)}h spent
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Zap className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{progress.xpEarned} XP earned
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
			{
				progress.currentTask && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Current Task</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
									<Code2 className="h-5 w-5 text-white" />
								</div>
								<div>
									<div className="font-medium text-gray-900 dark:text-white">
										{progress.currentTask.title}
									</div>
									<Badge variant="outline" className="text-xs mt-1">
										{progress.currentTask.difficulty}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>
				)
			}
			{
				progress.milestone && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Trophy className="h-5 w-5" />
								Current Milestone: {progress.milestone.name}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">Progress</span>
								<span className="text-sm font-bold">
									{progress.milestone.progress}/{progress.milestone.target}
								</span>
							</div>
							<Progress
								value={(progress.milestone.progress / progress.milestone.target) * 100}
								className="h-2"
							/>
						</CardContent>
					</Card>
				)
			}
			{
				progress.upcomingTasks.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Upcoming Tasks</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{
									progress.upcomingTasks.slice(0, 3).map((task, index) => (
										<div key={task.id} className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
													{index + 1}
												</div>
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{task.title}
												</span>
											</div>
											<span className="text-xs text-gray-600 dark:text-gray-400">
												~{task.estimatedTime}min
											</span>
										</div>
									))
								}
							</div>
						</CardContent>
					</Card>
				)
			}
		</div>
	)
}

// Helper Components
/** Period-over-period delta shown as a StatBand hint. */
function TrendDelta({ trend }: { trend: number }) {
	return (
		<span className={`inline-flex items-center gap-1 ${trend >= 0 ? 'text-neutral-800 dark:text-neutral-200' : 'text-red-600'}`}>
			{trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
			{Math.abs(trend)}%
		</span>
	)
}

function CompletionRateChart({ completionRate }: { completionRate: number }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PieChart className="h-5 w-5" />
					Completion Rate
				</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center justify-center">
				<div className="relative w-32 h-32">
					<svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
						<circle
							cx="50"
							cy="50"
							r="40"
							stroke="currentColor"
							strokeWidth="8"
							fill="none"
							className="text-gray-200 dark:text-gray-700"
						/>
						<circle
							cx="50"
							cy="50"
							r="40"
							stroke="currentColor"
							strokeWidth="8"
							fill="none"
							strokeDasharray={`${completionRate * 2.51} 251`}
							className="text-neutral-800 dark:text-neutral-200"
						/>
					</svg>
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="text-2xl font-bold text-gray-900 dark:text-white">
							{completionRate}%
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function DifficultyDistributionChart({
	distribution
}: {
	distribution: { beginner: number; intermediate: number; advanced: number }
}) {
	const total = distribution.beginner + distribution.intermediate + distribution.advanced

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BarChart3 className="h-5 w-5" />
					Difficulty Distribution
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{
					Object.entries(distribution).map(([level, count]) => {
						const percentage = total > 0 ? Math.round((count / total) * 100) : 0
						const colors = {
							beginner: "bg-neutral-900",
							intermediate: "bg-neutral-900",
							advanced: "bg-neutral-900"
						}

						return (
							<div key={level}>
								<div className="flex justify-between text-sm mb-1">
									<span className="font-medium capitalize">{level}</span>
									<span>{count} ({percentage}%)</span>
								</div>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className={`h-2 rounded-full ${colors[level as keyof typeof colors]}`}
										style={{ width: `${percentage}%` }}
									></div>
								</div>
							</div>
						)
					})
				}
			</CardContent>
		</Card>
	)
}

function WeeklyTrendsChart({ weeklyStats }: { weeklyStats: { week: string; views: number; started: number; completed: number }[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TrendingUp className="h-5 w-5" />
					Weekly Trends
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{
						weeklyStats.slice(-4).map((week) => (
							<div key={week.week} className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="font-medium">{week.week}</span>
									<span className="text-gray-600 dark:text-gray-400">
										{week.views} views • {week.started} started • {week.completed} completed
									</span>
								</div>
								<div className="flex gap-1 h-2">
									<div
										className="bg-neutral-900 rounded-sm flex-grow"
										style={{ flex: week.views }}
									></div>
									<div
										className="bg-neutral-900 rounded-sm flex-grow"
										style={{ flex: week.started }}
									></div>
									<div
										className="bg-neutral-900 rounded-sm flex-grow"
										style={{ flex: week.completed }}
									></div>
								</div>
							</div>
						))
					}
				</div>
			</CardContent>
		</Card>
	)
}

function TopPerformersLeaderboard({ performers }: { performers: { username: string; avatar: string; xp: number; completionTime: number }[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Trophy className="h-5 w-5" />
					Top Performers
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{
						performers.slice(0, 5).map((performer, index) => (
							<div key={performer.username} className="flex items-center gap-3">
								<div className={`w-8 h-8 rounded-full flex items-center justify-center text-white dark:text-neutral-900 font-bold text-sm ${index === 0 ? 'bg-neutral-900 dark:bg-white' :
									index === 1 ? 'bg-gray-400' :
										index === 2 ? 'bg-neutral-900' : 'bg-neutral-900'
									}`}>
									{index + 1}
								</div>
								<Image
									src={performer.avatar}
									alt={performer.username}
									className="w-8 h-8 rounded-full"
									width={32}
									height={32}
								/>
								<div className="flex-1">
									<div className="font-medium text-gray-900 dark:text-white">
										{performer.username}
									</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">
										{performer.xp} XP • {Math.round(performer.completionTime / 60)}h
									</div>
								</div>
							</div>
						))
					}
				</div>
			</CardContent>
		</Card>
	)
}