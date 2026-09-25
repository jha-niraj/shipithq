"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useState, useTransition, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, ListChecks, ChevronRight, Clock, Users, Mic,
    MoreVertical, Star, Edit2, Trash2, Copy, Eye, CheckCircle2,
    AlertCircle, Sparkles, FileStack, Rocket, Building2, Briefcase
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@repo/ui/components/ui/sheet"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@repo/ui/components/ui/dialog"
import {
    InterviewProcessForm, ProcessTemplate
} from "./components/interview-process-form"
import { InterviewProcessDetail } from "./components/interview-process-detail"
import {
    cloneInterviewProcess, deleteInterviewProcess,
    getInterviewTemplates, generateInterviewTemplate,
    type InterviewTemplate
} from "@/actions/interview-config"
import toast from "@repo/ui/components/ui/sonner"
import type {
    InterviewProcessStats, InterviewProcess, InterviewRound
} from "@/types"
import { cn } from "@repo/ui/lib/utils"

// View-specific types - subset of full types for list display
type InterviewRoundView = Pick<
    InterviewRound,
    'id' | 'roundNumber' | 'roundType' | 'title' | 'durationMinutes' | 'format' | 'description' | 'hasMockInterview'
>

type InterviewProcessView = Pick<
    InterviewProcess,
    'id' | 'name' | 'description' | 'isDefault' | 'isActive' | 'estimatedDurationWeeks' | '_count' | 'createdAt'
> & {
    rounds: InterviewRoundView[]
}

interface InterviewConfigContentProps {
    initialProcesses: InterviewProcessView[]
    initialStats: InterviewProcessStats
}

const roundTypeColors: Record<string, string> = {
    PHONE_SCREEN: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    TECHNICAL_CODING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    SYSTEM_DESIGN: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    BEHAVIORAL: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    TAKE_HOME: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PANEL: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    HIRING_MANAGER: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    CULTURE_FIT: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    HR_FINAL: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    CUSTOM: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
}

export function InterviewConfigContent({ initialProcesses, initialStats }: InterviewConfigContentProps) {
    const [processes, setProcesses] = useState<InterviewProcessView[]>(initialProcesses)
    const [stats, setStats] = useState<InterviewProcessStats>(initialStats)
    const [searchQuery, setSearchQuery] = useState("")
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
    const [selectedProcess, setSelectedProcess] = useState<InterviewProcessView | null>(null)
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
    const [processToClone, setProcessToClone] = useState<InterviewProcessView | null>(null)
    const [cloneName, setCloneName] = useState("")
    const [isPending, startTransition] = useTransition()
    const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null)

    // Template states
    const [templates, setTemplates] = useState<InterviewTemplate[]>([])
    const [templatesLoading, setTemplatesLoading] = useState(false)
    const [selectedStyle, setSelectedStyle] = useState<"ALL" | "STARTUP" | "FAANG" | "MNC">("ALL")

    // AI Chat states
    const [aiChatMessage, setAiChatMessage] = useState("")
    const [aiRoleType, setAiRoleType] = useState("")
    const [aiGenerating, setAiGenerating] = useState(false)

    // Fetch templates when sheet opens
    useEffect(() => {
        if (isTemplatesOpen) {
            setTemplatesLoading(true)
            getInterviewTemplates({ style: selectedStyle === "ALL" ? undefined : selectedStyle })
                .then(result => {
                    if (result.success && result.data) {
                        setTemplates(result.data)
                    }
                })
                .finally(() => setTemplatesLoading(false))
        }
    }, [isTemplatesOpen, selectedStyle])

    const handleGenerateWithAI = async (style: "STARTUP" | "FAANG" | "MNC") => {
        if (!aiRoleType.trim()) {
            toast.error("Please enter a role type")
            return
        }

        setAiGenerating(true)
        try {
            const result = await generateInterviewTemplate({
                style,
                roleType: aiRoleType,
                customPrompt: aiChatMessage || undefined
            })

            if (result.success && result.data) {
                toast.success("Template generated successfully!")
                // Convert to ProcessTemplate format
                setSelectedTemplate({
                    name: result.data.name,
                    description: result.data.description || "",
                    estimatedDurationWeeks: result.data.estimatedDurationWeeks || 2,
                    rounds: result.data.rounds
                })
                setIsTemplatesOpen(false)
                setIsCreateSheetOpen(true)
                // Refresh templates list
                setTemplates(prev => [result.data!, ...prev])
            } else {
                toast.error(result.error || "Failed to generate template")
            }
        } catch {
            toast.error("Failed to generate template")
        } finally {
            setAiGenerating(false)
        }
    }

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredTemplates = templates.filter(t =>
        selectedStyle === "ALL" || t.style === selectedStyle
    )

    const handleViewProcess = (process: InterviewProcessView) => {
        setSelectedProcess(process)
        setIsDetailSheetOpen(true)
    }

    const handleCloneClick = (process: InterviewProcessView, e: React.MouseEvent) => {
        e.stopPropagation()
        setProcessToClone(process)
        setCloneName(`${process.name} (Copy)`)
        setCloneDialogOpen(true)
    }

    const handleClone = async () => {
        if (!processToClone) return

        startTransition(async () => {
            const result = await cloneInterviewProcess(processToClone.id, cloneName)
            if (result.success && result.data) {
                setProcesses(prev => [...prev, result.data as InterviewProcessView])
                setStats(prev => ({ ...prev, processCount: prev.processCount + 1 }))
                toast.success("Process cloned successfully")
                setCloneDialogOpen(false)
            } else {
                toast.error(result.error || "Failed to clone process")
            }
        })
    }

    const handleDelete = async (process: InterviewProcessView, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(`Are you sure you want to delete "${process.name}"?`)) return

        startTransition(async () => {
            const result = await deleteInterviewProcess(process.id)
            if (result.success) {
                setProcesses(prev => prev.filter(p => p.id !== process.id))
                setStats(prev => ({ ...prev, processCount: prev.processCount - 1 }))
                toast.success("Process deleted")
            } else {
                toast.error(result.error || "Failed to delete process")
            }
        })
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Interview Process"
                subtitle="Configure transparent interview processes for candidates"
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setIsTemplatesOpen(true)}
                            className="rounded-xl"
                        >
                            <FileStack className="w-4 h-4 mr-2" />
                            Templates
                        </Button>
                        <Button
                            onClick={() => setIsCreateSheetOpen(true)}
                            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Process
                        </Button>
                    </>
                }
            />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <StatBand
                    cols={3}
                    items={[
                        { icon: ListChecks, label: "Processes", value: stats.processCount, hint: "Active interview processes" },
                        { icon: Users, label: "Rounds", value: stats.totalRounds, hint: "Total interview rounds" },
                        { icon: CheckCircle2, label: "Jobs Linked", value: stats.jobsWithProcess, hint: "Jobs with processes assigned" },
                    ]}
                />
            </motion.div>

            {
                processes.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800/50"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-neutral-800 dark:text-neutral-100 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">
                                    No Interview Process Configured
                                </h3>
                                <p className="text-sm text-neutral-700 dark:text-neutral-100 mt-1">
                                    Configure your interview process to enable transparency for candidates.
                                    They&apos;ll see what to expect, and can practice with AI mock interviews.
                                </p>
                                <Button
                                    onClick={() => setIsCreateSheetOpen(true)}
                                    className="mt-3 bg-neutral-800 hover:bg-neutral-700 text-white"
                                    size="sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Your First Process
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )
            }
            {
                processes.length > 0 && (
                    <div>
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <Input
                                placeholder="Search processes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                        </div>
                    </div>
                )
            }

            <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                    {
                        filteredProcesses.map((process, index) => (
                            <motion.div
                                key={process.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer"
                                onClick={() => handleViewProcess(process)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
                                                {process.name}
                                            </h3>
                                            {
                                                process.isDefault && (
                                                    <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                        <Star className="w-3 h-3 mr-1" />
                                                        Default
                                                    </Badge>
                                                )
                                            }
                                            {
                                                !process.isActive && (
                                                    <Badge variant="secondary" className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
                                                        Inactive
                                                    </Badge>
                                                )
                                            }
                                        </div>
                                        {
                                            process.description && (
                                                <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
                                                    {process.description}
                                                </p>
                                            )
                                        }

                                        <div className="flex flex-wrap gap-2">
                                            {
                                                process.rounds.slice(0, 5).map((round) => (
                                                    <div
                                                        key={round.id}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${roundTypeColors[round.roundType] || roundTypeColors.CUSTOM}`}
                                                    >
                                                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/20 text-[10px] font-bold">
                                                            {round.roundNumber}
                                                        </span>
                                                        <span className="truncate max-w-[120px]">{round.title}</span>
                                                        {
                                                            round.hasMockInterview && (
                                                                <Mic className="w-3 h-3 opacity-70" />
                                                            )
                                                        }
                                                    </div>
                                                ))
                                            }
                                            {
                                                process.rounds.length > 5 && (
                                                    <div className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                                        +{process.rounds.length - 5} more
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden md:flex items-center gap-4 text-sm text-neutral-500">
                                            {
                                                process.estimatedDurationWeeks && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{process.estimatedDurationWeeks} weeks</span>
                                                    </div>
                                                )
                                            }
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                <span>{process._count?.jobs || 0} jobs</span>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="rounded-xl">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); handleViewProcess(process); }}>
                                                    <Eye className="w-4 h-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit Process
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2" onClick={(e) => handleCloneClick(process, e)}>
                                                    <Copy className="w-4 h-4" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="gap-2 text-red-600 dark:text-red-400"
                                                    onClick={(e) => handleDelete(process, e)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    }
                </div>
            </AnimatePresence>

            {
                processes.length > 0 && filteredProcesses.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <Search className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                            No processes found
                        </h3>
                        <p className="text-neutral-500">
                            Try adjusting your search query
                        </p>
                    </motion.div>
                )
            }

            <Sheet open={isCreateSheetOpen} onOpenChange={(open) => {
                setIsCreateSheetOpen(open)
                if (!open) setSelectedTemplate(null)
            }}>
                <SheetContent
                    side="bottom"
                    className="h-[90dvh] rounded-t-3xl flex flex-col"
                >
                    <SheetHeader>
                        <SheetTitle>
                            {selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : "Create Interview Process"}
                        </SheetTitle>
                        <SheetDescription>
                            Configure your interview process. Candidates will see this information
                            and can practice with AI mock interviews for each round.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        <InterviewProcessForm
                            onClose={() => {
                                setIsCreateSheetOpen(false)
                                setSelectedTemplate(null)
                            }}
                            initialTemplate={selectedTemplate}
                        />
                    </div>
                </SheetContent>
            </Sheet>
            <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl h-[95dvh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedProcess?.name}</SheetTitle>
                        <SheetDescription>
                            View and manage this interview process
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        {
                            selectedProcess && (
                                <InterviewProcessDetail
                                    process={selectedProcess}
                                    onClose={() => setIsDetailSheetOpen(false)}
                                />
                            )
                        }
                    </div>
                </SheetContent>
            </Sheet>
            <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Clone Interview Process</DialogTitle>
                        <DialogDescription>
                            Create a copy of &quot;{processToClone?.name}&quot; with a new name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                            New Process Name
                        </label>
                        <Input
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            placeholder="Enter name for cloned process"
                            className="rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleClone}
                            disabled={isPending || !cloneName.trim()}
                            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            {isPending ? "Cloning..." : "Clone Process"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Templates Sheet from Bottom */}
            <Sheet open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
                <SheetContent
                    side="bottom"
                    className="h-[90dvh] rounded-t-3xl flex flex-col"
                >
                    <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                        <SheetHeader className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <Sparkles className="w-6 h-6 text-neutral-900 dark:text-white" />
                                Interview Process Templates
                            </SheetTitle>
                            <SheetDescription>
                                Choose a template or generate one with AI based on your hiring style
                            </SheetDescription>
                        </SheetHeader>
                        <div className="py-4 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mr-2">
                                    Interview Style:
                                </span>
                                {
                                    (["ALL", "STARTUP", "FAANG", "MNC"] as const).map((style) => {
                                        const styleConfig = {
                                            ALL: { icon: ListChecks, label: "All Templates" },
                                            STARTUP: { icon: Rocket, label: "Startup" },
                                            FAANG: { icon: Building2, label: "FAANG / Big Tech" },
                                            MNC: { icon: Briefcase, label: "MNC / Corporate" }
                                        }[style]
                                        const Icon = styleConfig.icon

                                        return (
                                            <button
                                                key={style}
                                                onClick={() => setSelectedStyle(style)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                                    selectedStyle === style
                                                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                                                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {styleConfig.label}
                                            </button>
                                        )
                                    })
                                }
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto py-4">
                            {
                                templatesLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
                                        <ShimmerStyles />
                                        {
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Shimmer className="h-5 w-16 rounded-full" delay={i * 0.04} />
                                                        <Shimmer className="h-3 w-14" delay={i * 0.04} />
                                                    </div>
                                                    <Shimmer className="h-5 w-3/4 mb-2" delay={i * 0.04} />
                                                    <Shimmer className="h-4 w-full" delay={i * 0.04} />
                                                    <Shimmer className="h-4 w-2/3 mt-1.5 mb-3" delay={i * 0.04} />
                                                    <div className="flex justify-between">
                                                        <Shimmer className="h-3 w-14" delay={i * 0.04} />
                                                        <Shimmer className="h-3 w-12" delay={i * 0.04} />
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                ) : filteredTemplates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {
                                            filteredTemplates.map((template, i) => (
                                                <motion.div
                                                    key={template.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-all cursor-pointer group"
                                                    onClick={() => {
                                                        setSelectedTemplate({
                                                            name: template.name,
                                                            description: template.description || "",
                                                            estimatedDurationWeeks: template.estimatedDurationWeeks || 2,
                                                            rounds: template.rounds
                                                        })
                                                        setIsTemplatesOpen(false)
                                                        setIsCreateSheetOpen(true)
                                                        toast.success(`Selected ${template.name} template - customize it now!`)
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-xs",
                                                                    template.style === "STARTUP" && "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-100",
                                                                    template.style === "FAANG" && "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-100",
                                                                    template.style === "MNC" && "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
                                                                )}
                                                            >
                                                                {template.style}
                                                            </Badge>
                                                            {
                                                                template.isAiGenerated && (
                                                                    <Badge variant="secondary" className="text-xs bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100">
                                                                        <Sparkles className="w-3 h-3 mr-1" />
                                                                        AI
                                                                    </Badge>
                                                                )
                                                            }
                                                        </div>
                                                        <span className="text-xs text-neutral-400">
                                                            {template.roundCount} rounds
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-100 mb-1">
                                                        {template.name}
                                                    </h3>
                                                    <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center justify-between text-xs text-neutral-400">
                                                        <span>{template.estimatedDurationWeeks} weeks</span>
                                                        <span>{template.usageCount} uses</span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FileStack className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                                            No templates found
                                        </h3>
                                        <p className="text-neutral-500">
                                            Try selecting a different style or generate one with AI below
                                        </p>
                                    </div>
                                )
                            }
                        </div>
                        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 mt-auto">
                            <div className="bg-gradient-to-r from-neutral-50 to-neutral-50 dark:from-neutral-900/30 dark:to-neutral-900/30 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-neutral-900 dark:text-white" />
                                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                                        Generate with AI
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <Input
                                        value={aiRoleType}
                                        onChange={(e) => setAiRoleType(e.target.value)}
                                        placeholder="Enter role (e.g., Senior Frontend Engineer)"
                                        className="rounded-xl bg-white dark:bg-neutral-900"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleGenerateWithAI("STARTUP")}
                                            disabled={aiGenerating || !aiRoleType.trim()}
                                            variant="outline"
                                            className="flex-1 rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900/30"
                                        >
                                            <Rocket className="w-4 h-4 mr-1" />
                                            Startup
                                        </Button>
                                        <Button
                                            onClick={() => handleGenerateWithAI("FAANG")}
                                            disabled={aiGenerating || !aiRoleType.trim()}
                                            variant="outline"
                                            className="flex-1 rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900/30"
                                        >
                                            <Building2 className="w-4 h-4 mr-1" />
                                            FAANG
                                        </Button>
                                        <Button
                                            onClick={() => handleGenerateWithAI("MNC")}
                                            disabled={aiGenerating || !aiRoleType.trim()}
                                            variant="outline"
                                            className="flex-1 rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900/30"
                                        >
                                            <Briefcase className="w-4 h-4 mr-1" />
                                            MNC
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Textarea
                                        value={aiChatMessage}
                                        onChange={(e) => setAiChatMessage(e.target.value)}
                                        placeholder="Optional: Add specific requirements (e.g., 'focus on system design', 'include take-home assignment', 'shorter process for urgent hire')..."
                                        className="rounded-xl bg-white dark:bg-neutral-900 min-h-[60px] resize-none"
                                    />
                                </div>

                                {
                                    aiGenerating && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-neutral-800 dark:text-neutral-100">
                                            <InlineLoader size="sm" />
                                            Generating interview process...
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}