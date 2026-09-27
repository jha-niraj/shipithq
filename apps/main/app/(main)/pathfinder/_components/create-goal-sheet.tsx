'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { NumberTextInput } from '@repo/ui/components/ui/number-text-input'
import { Label } from '@repo/ui/components/ui/label'
import { Badge } from '@repo/ui/components/ui/badge'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Target, CheckCircle, Sparkles, ArrowRight, ArrowLeft, Brain, Check,
    Link as LinkIcon, FolderPlus, Wand2
} from 'lucide-react'
import { Switch } from '@repo/ui/components/ui/switch'
import toast from '@repo/ui/components/ui/sonner'
import {
    createPathfinderGoal, createPathfinderGroup
} from '@/actions/(main)/pathfinder'
import { PathfinderCategory, PathfinderLevel } from '@repo/db'
import { cn } from '@repo/ui/lib/utils'
import type { PathfinderGoal, PathfinderGroup } from '@/types/pathfinder'
import { GOAL_DURATION_OPTIONS } from '@/types/pathfinder'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from "@repo/ui/components/animated-icons"
import { PATHFINDER_CATEGORIES } from "@/types/pathfinder"
import { GroupIcon, GROUP_ICONS, DEFAULT_GROUP_ICON } from './group-icon'
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"

type Group = PathfinderGroup

interface CreateGoalSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (goalId: string, goal?: PathfinderGoal) => void
    groups?: Group[]
    onGroupCreated?: (group: Group) => void
}

// Labels only. The ICON comes from PATHFINDER_CATEGORIES so this grid and every
// other category surface stay in step - this list previously carried its own
// emoji, which is how it ended up missing INTERVIEW_PREP entirely.
const categories: { value: PathfinderCategory; label: string }[] = [
    { value: 'DSA', label: 'DSA' },
    { value: 'WEB_DEVELOPMENT', label: 'Web Dev' },
    { value: 'FRONTEND', label: 'Frontend' },
    { value: 'BACKEND', label: 'Backend' },
    { value: 'DEVOPS', label: 'DevOps' },
    { value: 'AI_ML', label: 'AI/ML' },
    { value: 'DATABASE', label: 'Database' },
    { value: 'SYSTEM_DESIGN', label: 'System Design' },
    { value: 'MOBILE', label: 'Mobile' },
    { value: 'INTERVIEW_PREP', label: 'Interview Prep' },
    { value: 'OTHER', label: 'Other' },
]

const levels: { value: PathfinderLevel; label: string; desc: string }[] = [
    { value: 'BEGINNER', label: 'Beginner', desc: 'Just starting' },
    { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Know basics' },
    { value: 'ADVANCED', label: 'Advanced', desc: 'Deep dive' },
    { value: 'EXPERT', label: 'Expert', desc: 'Master level' },
]

const focusOptions: { id: string; label: string }[] = [
    { id: 'Learns', label: 'Core Learns' },
    { id: 'practice', label: 'Practice Problems' },
    { id: 'interview', label: 'Interview Prep' },
    { id: 'projects', label: 'Build Projects' },
    { id: 'optimization', label: 'Optimization' },
    { id: 'patterns', label: 'Design Patterns' },
]

// Icons come from GROUP_ICONS in ./group-icon so this inline picker and the
// full Create Group sheet offer the same set.
// Deduped. This listed '#525252' and '#404040' TWICE, which React reported as
// "Encountered two children with the same key" and which the user saw as the
// same swatch offered twice in a row.
const defaultColors = ['#525252', '#737373', '#404040', '#a3a3a3', '#059669', '#dc2626', '#db2777', '#171717']

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60)
}

export function CreateGoalSheet({ open, onOpenChange, onSuccess, groups = [], onGroupCreated }: CreateGoalSheetProps) {
    const [step, setStep] = useState(0)
    const [processing, setProcessing] = useState(false)
    const [progressPercent, setProgressPercent] = useState(0)
    const [formData, setFormData] = useState({
        title: '',
        category: '' as PathfinderCategory | '',
        level: 'INTERMEDIATE' as PathfinderLevel,
        duration: 'ONE_MONTH' as string,
        customDays: null as number | null,
        focusAreas: [] as string[],
        groupId: null as string | null,
        isPublic: false as boolean,
        generateAIPlan: true as boolean,
    })

    // Group creation state
    const [showNewGroup, setShowNewGroup] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupEmoji, setNewGroupEmoji] = useState<string>(DEFAULT_GROUP_ICON)
    const [newGroupColor, setNewGroupColor] = useState('#525252')
    const [creatingGroup, setCreatingGroup] = useState(false)
    const [localGroups, setLocalGroups] = useState<Group[]>(groups)

    // Update local groups when props change
    useEffect(() => {
        setLocalGroups(groups)
    }, [groups])

    // Generate slug preview
    const slugPreview = useMemo(() => generateSlug(formData.title), [formData.title])

    // Steps: Title -> Category + Level -> Group
    const steps = [
        { id: 'title', title: 'What do you want to learn?' },
        { id: 'category-level', title: 'Category & Level' },
        { id: 'group', title: 'Organize (optional)' },
    ]

    const resetForm = () => {
        setStep(0)
        setProcessing(false)
        setProgressPercent(0)
        setFormData({
            title: '',
            category: '',
            level: 'INTERMEDIATE',
            duration: 'ONE_MONTH',
            customDays: null,
            focusAreas: [],
            groupId: null,
            isPublic: false as boolean,
            generateAIPlan: true as boolean,
        })
        setShowNewGroup(false)
        setNewGroupName('')
        setNewGroupEmoji(DEFAULT_GROUP_ICON)
        setNewGroupColor('#525252')
    }

    const canProceed = () => {
        switch (step) {
            case 0: return formData.title.trim().length >= 3
            case 1: return formData.category !== '' && Boolean(formData.level)
            case 2: return true
            default: return false
        }
    }

    const nextStep = () => {
        if (!canProceed()) {
            // A disabled button cannot fire this; the guard is for the keyboard path.
            toast.error('Please complete this step')
            return
        }
        if (step < steps.length - 1) {
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const prevStep = () => {
        if (step > 0) setStep(step - 1)
    }

    const toggleFocus = (id: string) => {
        setFormData(prev => ({
            ...prev,
            focusAreas: prev.focusAreas.includes(id)
                ? prev.focusAreas.filter(f => f !== id)
                : [...prev.focusAreas, id]
        }))
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error('Please enter a group name')
            return
        }

        setCreatingGroup(true)
        try {
            const result = await createPathfinderGroup({
                name: newGroupName.trim(),
                emoji: newGroupEmoji,
                color: newGroupColor,
            })

            if (result.success && result.group) {
                const newGroup = {
                    id: result.group.id,
                    name: result.group.name,
                    emoji: result.group.emoji,
                    color: result.group.color,
                    description: result.group.description ?? null,
                    order: result.group.order ?? 0,
                    _count: { goals: 0 }
                }
                setLocalGroups(prev => [...prev, newGroup])
                setFormData(prev => ({ ...prev, groupId: result.group!.id }))
                onGroupCreated?.(newGroup)
                toast.success('Group created!')
                setShowNewGroup(false)
                setNewGroupName('')
            } else {
                toast.error(result.error || 'Failed to create group')
            }
        } catch {
            toast.error('Failed to create group')
        } finally {
            setCreatingGroup(false)
        }
    }

    const handleSubmit = async () => {
        setProcessing(true)
        setProgressPercent(20)

        try {
            const result = await createPathfinderGoal({
                title: formData.title,
                slug: slugPreview,
                category: formData.category as PathfinderCategory,
                level: formData.level,
                duration: formData.duration as 'ONE_WEEK' | 'FORTNIGHT' | 'ONE_MONTH' | 'TWO_MONTHS' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'CUSTOM',
                estimatedDays: formData.duration === 'CUSTOM' ? formData.customDays ?? undefined : undefined,
                focusAreas: formData.focusAreas,
                groupId: formData.groupId,
                isPublic: formData.isPublic,
                generateAIPlan: formData.generateAIPlan,
            })

            if (!result.success) {
                throw new Error(result.error || 'Failed to create goal')
            }

            setProgressPercent(100)
            toast.success('Goal created!')

            setTimeout(() => {
                onOpenChange(false)
                resetForm()
                if (onSuccess && result.goalId) {
                    onSuccess(result.goalId, result.slug ? { id: result.goalId, slug: result.slug } as Parameters<typeof onSuccess>[1] : undefined)
                }
            }, 400)
        } catch (error) {
            console.error('Error creating goal:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to create goal')
            setProcessing(false)
            setProgressPercent(0)
        }
    }

    return (
        <Sheet open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen)
            if (!isOpen) resetForm()
        }}>
            {/* A RIGHT-side panel, not a bottom sheet.
                As `side="bottom"` at `h-[80dvh]` this covered four fifths of the
                screen and centred a `max-w-lg` column inside a full-width sheet,
                so the form read as a narrow strip floating in a large dark field
                with the page it belongs to hidden behind it.

                `w-full sm:max-w-xl` is the safe form docs/responsiveness.md
                names: the Sheet primitive's own mobile width and margin survive
                below `sm`, and only the desktop cap is widened. An UNPREFIXED
                `max-w-*` here would beat the primitive's `max-w-[90%]` in the
                class merge and go edge-to-edge on a phone.

                `flex flex-col` + `overflow-hidden` on the shell, with the scroll
                on the body below: the primitive carries `overflow-y-auto`, so
                without this the sheet scrolls AND the body scrolls - two surfaces
                for one region. */}
            <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
                <ScrollArea className="min-h-0 flex-1" viewportClassName="px-6 py-6" reflow>
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-xl flex items-center gap-2">
                            <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                <Target className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                            </div>
                            Create Learning Goal
                        </SheetTitle>
                        <SheetDescription className="text-sm">
                            Set your goal and let AI create a personalized plan
                        </SheetDescription>
                    </SheetHeader>
                    <AnimatePresence mode="wait">
                        {
                            processing ? (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-16"
                                >
                                    <div className="relative mb-6">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="w-20 h-20 rounded-full border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {
                                                progressPercent === 100 ? (
                                                    <CheckCircle className="w-8 h-8 text-neutral-900 dark:text-neutral-100" />
                                                ) : (
                                                    <AnimatedIcon name="sparkle" size={32} motion="always" className="text-neutral-500 dark:text-neutral-400" />
                                                )
                                            }
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-medium mb-1 text-neutral-900 dark:text-white">
                                        {progressPercent === 100 ? 'Goal Created!' : formData.generateAIPlan ? 'Creating Goal & Study Plan...' : 'Creating Goal...'}
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                                        {progressPercent === 100
                                            ? 'Redirecting to your goal'
                                            : formData.generateAIPlan
                                                ? 'AI is generating your personalized study plan'
                                                : 'Setting up...'}
                                    </p>

                                    <div className="w-full max-w-xs">
                                        <Progress value={progressPercent} className="h-1.5" />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="mb-6">
                                        <div className="flex justify-between mb-2">
                                            {
                                                steps.map((s, index) => (
                                                    <div key={s.id} className="flex-1 text-center">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-medium transition-all",
                                                            index < step ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                index === step ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                    "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                                                        )}>
                                                            {index < step ? <Check className="w-4 h-4" /> : index + 1}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <Progress value={((step + 1) / steps.length) * 100} className="h-1" />
                                    </div>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={step}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="space-y-4"
                                        >
                                            {
                                                step === 0 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-4">
                                                            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                                                                {steps[0]?.title}
                                                            </h3>
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Be specific about your goal</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs text-neutral-500 dark:text-neutral-400">Goal Title</Label>
                                                            <Input
                                                                placeholder="e.g., Master Arrays and Strings in DSA"
                                                                value={formData.title}
                                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                                className="h-12"
                                                                autoFocus
                                                            />
                                                        </div>

                                                        {
                                                            formData.title.trim() && (
                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                                                    <LinkIcon className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">URL:</span>
                                                                    <code className="text-xs text-neutral-700 dark:text-neutral-300 font-mono">
                                                                        /pathfinder/{slugPreview || '...'}
                                                                    </code>
                                                                </div>
                                                            )
                                                        }

                                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                                            {
                                                                ['Learn React Hooks', 'Master SQL', 'DSA with Python'].map((ex) => (
                                                                    <Badge
                                                                        key={ex}
                                                                        variant="outline"
                                                                        className="cursor-pointer text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                                        onClick={() => setFormData({ ...formData, title: ex })}
                                                                    >
                                                                        {ex}
                                                                    </Badge>
                                                                ))
                                                            }
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">Category</Label>
                                                            <div className="grid grid-cols-5 gap-2">
                                                                {
                                                                    categories.map((cat) => (
                                                                        <button
                                                                            key={cat.value}
                                                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                                                            className={cn(
                                                                                "group flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all",
                                                                                formData.category === cat.value
                                                                                    ? "border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-neutral-100"
                                                                                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
                                                                            )}
                                                                        >
                                                                            {/* `currentColor`, so the icon darkens with the label on
                                                                                hover and goes full-contrast when selected. The emoji
                                                                                this replaced could do neither. */}
                                                                            <AnimatedIcon
                                                                                name={PATHFINDER_CATEGORIES[cat.value].icon}
                                                                                size={22}
                                                                                motion={formData.category === cat.value ? 'always' : 'hover'}
                                                                            />
                                                                            <p className="w-full truncate text-xs">
                                                                                {cat.label}
                                                                            </p>
                                                                        </button>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                step === 1 && (
                                                    <div>
                                                        <div className="space-y-6">
                                                            <div className="text-center mb-4">
                                                                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                                                                    {steps[1]?.title}
                                                                </h3>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">Experience Level</Label>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {
                                                                        levels.map((level) => (
                                                                            <button
                                                                                key={level.value}
                                                                                onClick={() => setFormData({ ...formData, level: level.value })}
                                                                                className={cn(
                                                                                    "p-2.5 rounded-lg border text-center transition-all",
                                                                                    formData.level === level.value
                                                                                        ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                                )}
                                                                            >
                                                                                <p className="text-xs font-medium text-neutral-900 dark:text-white">
                                                                                    {level.label}
                                                                                </p>
                                                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                                                    {level.desc}
                                                                                </p>
                                                                            </button>
                                                                        ))
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">Expected duration</Label>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {
                                                                        GOAL_DURATION_OPTIONS.filter((o) => o.value !== 'CUSTOM').map((opt) => (
                                                                            <button
                                                                                key={opt.value}
                                                                                type="button"
                                                                                onClick={() => setFormData({ ...formData, duration: opt.value })}
                                                                                className={cn(
                                                                                    "p-2 rounded-lg border text-center transition-all",
                                                                                    formData.duration === opt.value
                                                                                        ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                                )}
                                                                            >
                                                                                <p className="text-xs font-medium text-neutral-900 dark:text-white">{opt.label}</p>
                                                                            </button>
                                                                        ))
                                                                    }
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFormData({ ...formData, duration: 'CUSTOM' })}
                                                                        className={cn(
                                                                            "p-2 rounded-lg border text-center transition-all",
                                                                            formData.duration === 'CUSTOM'
                                                                                ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                        )}
                                                                    >
                                                                        <p className="text-xs font-medium text-neutral-900 dark:text-white">Custom</p>
                                                                    </button>
                                                                </div>
                                                                {
                                                                    formData.duration === 'CUSTOM' && (
                                                                        <div className="mt-2">
                                                                            <NumberTextInput
                                                                                min={1}
                                                                                max={365}
                                                                                placeholder="How many days"
                                                                                suffix="days"
                                                                                aria-label="Days"
                                                                                value={formData.customDays ?? null}
                                                                                onChange={(v) => setFormData({ ...formData, customDays: v })}
                                                                            />
                                                                        </div>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="text-center mb-4">
                                                                {/* Its own heading: this used to print steps[2] ("Organize"), the next step's (UF-4). */}
                                                                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                                                                    What to focus on
                                                                </h3>
                                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Select at least one</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {
                                                                    focusOptions.map((focus) => (
                                                                        <button
                                                                            key={focus.id}
                                                                            onClick={() => toggleFocus(focus.id)}
                                                                            className={cn(
                                                                                "p-3 rounded-lg border text-left transition-all flex items-center justify-between",
                                                                                formData.focusAreas.includes(focus.id)
                                                                                    ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                            )}
                                                                        >
                                                                            <span className="text-sm text-neutral-900 dark:text-white">{focus.label}</span>
                                                                            {
                                                                                formData.focusAreas.includes(focus.id) && (
                                                                                    <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                                )
                                                                            }
                                                                        </button>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                step === 2 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-4">
                                                            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                                                                {steps[2]?.title}
                                                            </h3>
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Group your goal for better organization</p>
                                                        </div>

                                                        {/* AI Study Plan Toggle */}
                                                        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-900/50">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
                                                                    <Wand2 className="w-4 h-4 text-white dark:text-neutral-900" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">AI Study Plan</p>
                                                                        <Switch
                                                                            checked={formData.generateAIPlan}
                                                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, generateAIPlan: checked }))}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                                        Generate 8-15 study topics tailored to your level with AI
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                                                            <div>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">Share in Explore</p>
                                                                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Anyone can copy it, free. You can change this later.</p>
                                                            </div>
                                                            <Switch checked={formData.isPublic} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))} aria-label="Share in Explore" />
                                                        </div>

                                                        {
                                                            !showNewGroup ? (
                                                                <div className="space-y-2">
                                                                    <button
                                                                        onClick={() => setFormData({ ...formData, groupId: null })}
                                                                        className={cn(
                                                                            "w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                                                                            formData.groupId === null
                                                                                ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                        )}
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm">
                                                                            📋
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">No Group</p>
                                                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Keep ungrouped</p>
                                                                        </div>
                                                                        {formData.groupId === null && <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />}
                                                                    </button>

                                                                    {
                                                                        localGroups.map((group) => (
                                                                            <button
                                                                                key={group.id}
                                                                                onClick={() => setFormData({ ...formData, groupId: group.id })}
                                                                                className={cn(
                                                                                    "w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                                                                                    formData.groupId === group.id
                                                                                        ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                                                )}
                                                                            >
                                                                                <div
                                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                                                                    style={{ backgroundColor: `${group.color || '#525252'}20` }}
                                                                                >
                                                                                    <GroupIcon value={group.emoji} size={16} />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{group.name}</p>
                                                                                </div>
                                                                                {formData.groupId === group.id && <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />}
                                                                            </button>
                                                                        ))
                                                                    }

                                                                    <button
                                                                        onClick={() => setShowNewGroup(true)}
                                                                        className="w-full p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-left transition-all flex items-center gap-3 hover:border-neutral-400 dark:hover:border-neutral-600"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                                                            <FolderPlus className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                                        </div>
                                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Create New Group</p>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Group Name</Label>
                                                                        <Input
                                                                            placeholder="e.g., Frontend, DSA Practice"
                                                                            value={newGroupName}
                                                                            onChange={(e) => setNewGroupName(e.target.value)}
                                                                            className="h-10"
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Icon</Label>
                                                                        <div className="flex gap-1.5">
                                                                            {
                                                                                GROUP_ICONS.slice(0, 8).map((iconName) => (
                                                                                    <button
                                                                                        key={iconName}
                                                                                        type="button"
                                                                                        aria-label={iconName}
                                                                                        aria-pressed={newGroupEmoji === iconName}
                                                                                        onClick={() => setNewGroupEmoji(iconName)}
                                                                                        className={cn(
                                                                                            "flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-all",
                                                                                            newGroupEmoji === iconName
                                                                                                ? "bg-neutral-200 text-neutral-900 ring-2 ring-neutral-400 dark:bg-neutral-700 dark:text-neutral-100"
                                                                                                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                                                                                        )}
                                                                                    >
                                                                                        <GroupIcon value={iconName} size={16} motion={newGroupEmoji === iconName ? 'always' : 'hover'} />
                                                                                    </button>
                                                                                ))
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Color</Label>
                                                                        <div className="flex gap-1.5">
                                                                            {
                                                                                defaultColors.map((color) => (
                                                                                    <button
                                                                                        key={color}
                                                                                        onClick={() => setNewGroupColor(color)}
                                                                                        className={cn(
                                                                                            "w-8 h-8 rounded transition-all",
                                                                                            newGroupColor === color && "ring-2 ring-neutral-400 ring-offset-2"
                                                                                        )}
                                                                                        style={{ backgroundColor: color }}
                                                                                    />
                                                                                ))
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 pt-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setShowNewGroup(false)}
                                                                            className="flex-1"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={handleCreateGroup}
                                                                            disabled={!newGroupName.trim() || creatingGroup}
                                                                            className="flex-1"
                                                                        >
                                                                            {
                                                                                creatingGroup ? (
                                                                                    <InlineLoader size="sm" />
                                                                                ) : (
                                                                                    'Create Group'
                                                                                )
                                                                            }
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </motion.div>
                                    </AnimatePresence>
                                    {/* Pinned to the sheet's bottom while the step scrolls (plan/ui-forms UF-8). */}
                                    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex items-center justify-between border-t border-neutral-200 bg-background/95 px-6 py-4 backdrop-blur dark:border-neutral-800">
                                        <Button
                                            variant="ghost"
                                            onClick={prevStep}
                                            disabled={step === 0}
                                            className="text-neutral-600 dark:text-neutral-400"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            disabled={!canProceed()}
                                            className="cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            {
                                                step === steps.length - 1 ? (
                                                    <>
                                                        {formData.generateAIPlan ? <Wand2 className="w-4 h-4 mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                                                        {formData.generateAIPlan ? 'Create goal and AI plan' : 'Create goal'}
                                                    </>
                                                ) : (
                                                    <>
                                                        Next
                                                        <ArrowRight className="w-4 h-4 ml-1" />
                                                    </>
                                                )



                                            }
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}