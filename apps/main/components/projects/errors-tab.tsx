'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle, ThumbsUp, AlertCircle, Plus, ChevronDown, Code2,
    CheckCircle2, Bug, Shield, Zap, Database, Globe, Settings,
    Layers
} from 'lucide-react'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger,
    SelectValue
} from '@repo/ui/components/ui/select'
import {
    Sheet, SheetContent, SheetDescription, SheetFooter,
    SheetHeader,
    SheetTitle, SheetTrigger
} from '@repo/ui/components/ui/sheet'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import toast from '@repo/ui/components/ui/sonner'
import {
    getProjectErrors, createProjectError,
    getProjectErrorStats
} from '@/actions/(main)/projects/project-errors.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { HoverSelect } from "./hover-select"

// ============================================================================
// Types
// ============================================================================

interface ProjectError {
    id: string
    title: string
    description: string
    solution: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
    errorCode?: string | null
    fixedCode?: string | null
    tags: string[]
    helpfulCount: number
    encounteredCount: number
    submittedBy: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
    task?: {
        id: string
        title: string
    } | null
    createdAt: Date
}

interface ErrorsTabProps {
    projectId: string
    isEnrolled: boolean
    isCreator: boolean
}

// ============================================================================
// Category Config
// ============================================================================

const categoryConfig: Record<string, { icon: typeof Bug; color: string; label: string }> = {
    SETUP: { icon: Settings, color: 'bg-neutral-500', label: 'Setup' },
    CONFIGURATION: { icon: Settings, color: 'bg-neutral-500', label: 'Configuration' },
    DATABASE: { icon: Database, color: 'bg-neutral-900', label: 'Database' },
    API: { icon: Globe, color: 'bg-neutral-900', label: 'API' },
    UI: { icon: Layers, color: 'bg-neutral-900', label: 'UI' },
    STATE: { icon: Zap, color: 'bg-neutral-900', label: 'State' },
    DEPLOYMENT: { icon: Globe, color: 'bg-neutral-900', label: 'Deployment' },
    SECURITY: { icon: Shield, color: 'bg-neutral-900', label: 'Security' },
    PERFORMANCE: { icon: Zap, color: 'bg-neutral-900', label: 'Performance' },
    OTHER: { icon: Bug, color: 'bg-neutral-500', label: 'Other' },
}

const severityConfig = {
    HIGH: { color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', label: 'Common' },
    MEDIUM: { color: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800/30 dark:text-neutral-100 dark:border-neutral-800', label: 'Occasional' },
    LOW: { color: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800/30 dark:text-neutral-100 dark:border-neutral-800', label: 'Rare' },
}

// ============================================================================
// Error Card Component
// ============================================================================

function ErrorCard({
    error,
}: {
    error: ProjectError
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const CategoryIcon = categoryConfig[error.category]?.icon || Bug

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg transition-shadow"
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        'p-2 rounded-lg text-white',
                        categoryConfig[error.category]?.color || 'bg-neutral-500'
                    )}>
                        <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                                {error.title}
                            </h4>
                            <Badge className={cn('text-xs px-1.5 shrink-0 border', severityConfig[error.severity].color)}>
                                {severityConfig[error.severity].label}
                            </Badge>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">
                            {error.description}
                        </p>
                        {
                            error.tags && error.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {
                                        error.tags.slice(0, 3).map((tag, idx) => (
                                            <span key={idx} className="text-xs px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400">
                                                {tag}
                                            </span>
                                        ))
                                    }
                                </div>
                            )
                        }
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                            </div>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-xs text-neutral-800 dark:text-neutral-100 hover:underline flex items-center gap-1"
                            >
                                {isExpanded ? 'Hide' : 'View'} Solution
                                <ChevronDown className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {
                    isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                                <div>
                                    <h5 className="text-sm font-semibold text-neutral-700 dark:text-neutral-100 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Solution
                                    </h5>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                        {error.solution}
                                    </p>
                                </div>
                                {
                                    error.errorCode && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                                <Code2 className="w-4 h-4" />
                                                Problematic Code
                                            </h5>
                                            <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs overflow-x-auto">
                                                <code className="text-red-800 dark:text-red-200">{error.errorCode}</code>
                                            </pre>
                                        </div>
                                    )
                                }
                                {
                                    error.fixedCode && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-neutral-700 dark:text-neutral-100 mb-2 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Corrected Code
                                            </h5>
                                            <pre className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-xs overflow-x-auto">
                                                <code className="text-neutral-800 dark:text-neutral-200">{error.fixedCode}</code>
                                            </pre>
                                        </div>
                                    )
                                }
                                {
                                    error.task && (
                                        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-2 border border-neutral-200 dark:border-neutral-800">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Related to task: <span className="font-medium text-neutral-700 dark:text-neutral-300">{error.task.title}</span>
                                            </p>
                                        </div>
                                    )
                                }
                                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>Submitted by</span>
                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                        {error.submittedBy.name || error.submittedBy.username || 'Anonymous'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </motion.div>
    )
}

// ============================================================================
// Submit Error Sheet
// ============================================================================

function SubmitErrorSheet({
    projectId,
    onSubmit
}: {
    projectId: string
    onSubmit: () => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        title: '',
        description: '',
        solution: '',
        severity: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
        category: 'OTHER',
        errorCode: '',
        fixedCode: '',
        tags: '',
    })

    const handleSubmit = async () => {
        if (!form.title || !form.description || !form.solution) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)
        try {
            const result = await createProjectError({
                projectId,
                title: form.title,
                description: form.description,
                solution: form.solution,
                severity: form.severity,
                category: form.category as 'SETUP' | 'CONFIGURATION' | 'DATABASE' | 'API' | 'UI' | 'STATE' | 'DEPLOYMENT' | 'SECURITY' | 'PERFORMANCE' | 'OTHER',
                errorCode: form.errorCode || undefined,
                fixedCode: form.fixedCode || undefined,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined,
            })

            if (result.success) {
                toast.success('Error submitted successfully!')
                setOpen(false)
                setForm({
                    title: '',
                    description: '',
                    solution: '',
                    severity: 'MEDIUM',
                    category: 'OTHER',
                    errorCode: '',
                    fixedCode: '',
                    tags: '',
                })
                onSubmit()
            } else {
                toast.error(result.error || 'Failed to submit error')
            }
        } catch (error) {
            console.log("Error occurred while submit: " + error);
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Share Error
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl">
                <section className="w-full max-w-5xl mx-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                            Share an Error or Mistake
                        </SheetTitle>
                        <SheetDescription>
                            Help others avoid the same pitfalls you encountered
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Error Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., 'CORS error when fetching data'"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            Object.entries(categoryConfig).map(([key, { label }]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select value={form.severity} onValueChange={(v: 'HIGH' | 'MEDIUM' | 'LOW') => setForm({ ...form, severity: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HIGH">Common</SelectItem>
                                        <SelectItem value="MEDIUM">Occasional</SelectItem>
                                        <SelectItem value="LOW">Rare</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="description">What happened? *</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the error or mistake..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="solution">How did you fix it? *</Label>
                                <Textarea
                                    id="solution"
                                    placeholder="Explain the solution..."
                                    value={form.solution}
                                    onChange={(e) => setForm({ ...form, solution: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="errorCode">Problematic Code (optional)</Label>
                                <Textarea
                                    id="errorCode"
                                    placeholder="Paste the code that caused the issue..."
                                    value={form.errorCode}
                                    onChange={(e) => setForm({ ...form, errorCode: e.target.value })}
                                    rows={3}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fixedCode">Corrected Code (optional)</Label>
                                <Textarea
                                    id="fixedCode"
                                    placeholder="Paste the corrected code..."
                                    value={form.fixedCode}
                                    onChange={(e) => setForm({ ...form, fixedCode: e.target.value })}
                                    rows={3}
                                    className="font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tags">Tags (comma separated)</Label>
                            <Input
                                id="tags"
                                placeholder="e.g., react, api, fetch"
                                value={form.tags}
                                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            />
                        </div>
                    </div>
                    <SheetFooter>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !form.title || !form.description || !form.solution}
                            className="w-full"
                        >
                            {
                                loading ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Submit Error
                                    </>
                                )
                            }
                        </Button>
                    </SheetFooter>
                </section>
            </SheetContent>
        </Sheet>
    )
}

// ============================================================================
// Main Component
// ============================================================================
export default function ErrorsTab({ projectId, isEnrolled, isCreator }: ErrorsTabProps) {
    const [errors, setErrors] = useState<ProjectError[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<{ totalErrors: number; bySeverity?: { HIGH?: number; MEDIUM?: number; LOW?: number } } | null>(null)
    const [filter, setFilter] = useState({
        category: 'ALL',
        severity: 'ALL',
        sortBy: 'helpful' as 'helpful' | 'recent' | 'encountered',
    })

    const fetchErrors = useCallback(async () => {
        setLoading(true)
        try {
            const [errorsResult, statsResult] = await Promise.all([
                getProjectErrors(projectId, {
                    category: filter.category === 'ALL' ? undefined : filter.category,
                    severity: filter.severity === 'ALL' ? undefined : filter.severity,
                    sortBy: filter.sortBy,
                }),
                getProjectErrorStats(projectId),
            ])

            if (errorsResult.success) {
                setErrors(errorsResult.data?.errors || [])
            }
            if (statsResult.success) {
                setStats(statsResult.data)
            }
        } catch (error) {
            console.error('Error fetching errors:', error)
        } finally {
            setLoading(false)
        }
    }, [projectId, filter])

    useEffect(() => {
        fetchErrors()
    }, [fetchErrors])


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                        Errors & Mistakes
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Community-shared pitfalls and solutions
                    </p>
                </div>
                {
                    (isEnrolled || isCreator) && (
                        <SubmitErrorSheet projectId={projectId} onSubmit={fetchErrors} />
                    )
                }
            </div>
            {
                stats && stats.totalErrors > 0 && (
                    <StatBand
                        size="sm"
                        cols={4}
                        items={[
                            { icon: Bug, label: "Total Errors", value: stats.totalErrors },
                            { icon: AlertTriangle, label: "Common", value: stats.bySeverity?.HIGH || 0, tone: "rose" },
                            { icon: AlertCircle, label: "Occasional", value: stats.bySeverity?.MEDIUM || 0 },
                            { icon: Layers, label: "Rare", value: stats.bySeverity?.LOW || 0 },
                        ]}
                    />
                )
            }
            {/* Hover-opening, shared with the sprint board's copy (PJ-16 item 3). */}
            <div className="flex flex-wrap items-center gap-3">
                <HoverSelect
                    ariaLabel="Filter by category"
                    className="w-40"
                    value={filter.category}
                    onValueChange={(v) => setFilter(prev => ({ ...prev, category: v }))}
                    options={[
                        { value: 'ALL', label: 'All Categories' },
                        ...Object.entries(categoryConfig).map(([key, { label }]) => ({ value: key, label })),
                    ]}
                />
                <HoverSelect
                    ariaLabel="Filter by frequency"
                    className="w-40"
                    value={filter.severity}
                    onValueChange={(v) => setFilter(prev => ({ ...prev, severity: v }))}
                    options={[
                        { value: 'ALL', label: 'Any frequency' },
                        { value: 'HIGH', label: 'Common' },
                        { value: 'MEDIUM', label: 'Occasional' },
                        { value: 'LOW', label: 'Rare' },
                    ]}
                />
                <HoverSelect
                    ariaLabel="Sort errors"
                    className="w-40"
                    value={filter.sortBy}
                    onValueChange={(v) => setFilter(prev => ({ ...prev, sortBy: v }))}
                    options={[
                        { value: 'helpful', label: 'Most Helpful' },
                        { value: 'encountered', label: 'Most Faced' },
                        { value: 'recent', label: 'Recent' },
                    ]}
                />
            </div>
            {
                loading ? (
                    <div className="flex items-center justify-center py-12">
                        <InlineLoader size="lg" className="text-neutral-600 dark:text-neutral-400" />
                    </div>
                ) : errors.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-neutral-600 dark:text-neutral-400" />
                        <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">No errors shared yet</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                            Be the first to help others by sharing common pitfalls
                        </p>
                        {
                            (isEnrolled || isCreator) && (
                                <SubmitErrorSheet projectId={projectId} onSubmit={fetchErrors} />
                            )
                        }
                    </div>
                ) : (
                    <div className="space-y-3">
                        {
                            errors.map((error) => (
                                <ErrorCard
                                    key={error.id}
                                    error={error}
                                />
                            ))
                        }
                    </div>
                )
            }
        </div>
    )
}