'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Switch } from '@repo/ui/components/ui/switch'
import { Badge } from '@repo/ui/components/ui/badge'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@repo/ui/components/ui/select'
import {
    Sparkles, FileText, Globe, Lock, CheckCircle, AlertCircle,
    Brain, ArrowRight, ArrowLeft, BookOpen, Check
} from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { createCustomMockVoice } from '@/actions/(main)/mockvoice/voice.action'
import { createMockVoiceSession } from '@/actions/(main)/mockvoice/session.action'
import { MOCK_CATEGORIES, MOCK_LEVELS } from '../voice/_constants/mock-categories'
import { MockCategory } from '@repo/db'
import { useRouter } from 'next/navigation'
import { cn } from '@repo/ui/lib/utils'
import Link from 'next/link'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from '@repo/ui/components/animated-icons'

interface CreateMockSheetProps {
    trigger?: React.ReactNode
    userCredits?: number
    onSuccess?: (mockId: string) => void
    spaceId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Pre-filled data for the mock interview */
    defaultValues?: {
        title?: string
        description?: string
        category?: MockCategory
        level?: string
        knowledgeBase?: string
    }
    /** If true, just save the mock and don't redirect to session */
    saveOnly?: boolean
    /** Learn step ID to link this mock to */
    learnStepId?: string
}

export function CreateMockSheet({
    trigger: _trigger,
    userCredits = 0,
    onSuccess,
    spaceId,
    open: controlledOpen,
    onOpenChange,
    defaultValues,
    saveOnly = false,
    learnStepId
}: CreateMockSheetProps) {
    const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = (value: boolean) => {
        if (controlledOpen === undefined) {
            setInternalOpen(value)
        }
        onOpenChange?.(value)
    }
    const [step, setStep] = useState(0)
    const [processing, setProcessing] = useState(false)
    const [progressPercent, setProgressPercent] = useState(0)
    const [, setCreatedMockId] = useState<string | null>(null) // Set only, value used internally
    const [formData, setFormData] = useState({
        title: defaultValues?.title || '',
        description: defaultValues?.description || '',
        category: (defaultValues?.category || 'GENERAL') as MockCategory,
        level: defaultValues?.level || 'INTERMEDIATE',
        includeResume: false,
        isPublic: false,
        duration: 15,
        questionsCount: 5,
        knowledgeBase: defaultValues?.knowledgeBase || ''
    })

    // Update form when defaultValues change
    useEffect(() => {
        if (defaultValues) {
            setFormData(prev => ({
                ...prev,
                title: defaultValues.title || prev.title,
                description: defaultValues.description || prev.description,
                category: (defaultValues.category || prev.category) as MockCategory,
                level: defaultValues.level || prev.level,
                knowledgeBase: defaultValues.knowledgeBase || prev.knowledgeBase
            }))
        }
    }, [defaultValues])

    const steps = [
        { id: 'basics', title: 'Basic Info', subtitle: 'Position details' },
        { id: 'knowledge', title: 'Knowledge Base', subtitle: 'Study materials' },
        { id: 'settings', title: 'Settings', subtitle: 'Configure options' },
    ]

    // Calculate credits
    const baseCredits = formData.duration
    const questionCredits = formData.questionsCount * 2
    const subtotal = (baseCredits + questionCredits) * (formData.isPublic ? 0.5 : 1)
    const resumeCredits = formData.includeResume ? 5 : 0
    const totalCredits = Math.ceil(subtotal + resumeCredits)

    const resetForm = () => {
        setStep(0)
        setProcessing(false)
        setProgressPercent(0)
        setCreatedMockId(null)
        setFormData({
            title: '',
            description: '',
            category: 'GENERAL' as MockCategory,
            level: 'INTERMEDIATE',
            includeResume: false,
            isPublic: false,
            duration: 15,
            questionsCount: 5,
            knowledgeBase: ''
        })
    }

    const canProceed = () => {
        switch (step) {
            case 0: return formData.title.trim() && formData.description.trim()
            case 1: return true
            case 2: return true
            default: return false
        }
    }

    const nextStep = () => {
        if (!canProceed()) {
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

    const handleSubmit = async () => {
        if (userCredits < totalCredits) {
            toast.error('Insufficient credits')
            return
        }

        setProcessing(true)
        setProgressPercent(10)

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgressPercent(p => Math.min(p + 10, 85))
        }, 1000)

        try {
            const result = await createCustomMockVoice({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                level: formData.level,
                duration: formData.duration,
                questionsCount: formData.questionsCount,
                includeResume: formData.includeResume,
                isPublic: formData.isPublic,
                knowledgeBase: formData.knowledgeBase || undefined,
                learnStepId: learnStepId
            })

            clearInterval(progressInterval)

            if (!result.success) {
                throw new Error(result.error || 'Failed to create mock')
            }

            setProgressPercent(90)
            const mockId = result.mockId!

            // If saveOnly mode (from Learns), just save and close without creating session
            if (saveOnly) {
                setProgressPercent(100)
                setCreatedMockId(mockId)
                toast.success('Mock interview created and linked!')
                setTimeout(() => {
                    setOpen(false)
                    resetForm()
                    if (onSuccess) onSuccess(mockId)
                }, 800)
                return
            }

            // Create session and redirect to interview (deducts credits)
            const sessionResult = await createMockVoiceSession({
                mockId,
                mockType: 'custom',
                includesResume: formData.includeResume
            })

            setProgressPercent(100)
            setCreatedMockId(mockId)

            if (sessionResult.success && sessionResult.sessionId) {
                toast.success('Mock interview created! Starting your interview...')
                setTimeout(() => {
                    setOpen(false)
                    resetForm()
                    if (onSuccess) onSuccess(mockId)
                    if (!spaceId) {
                        router.push(`/mock/voice/interview/${sessionResult.sessionId}`)
                    }
                }, 800)
            } else {
                toast.success('Mock interview created!')
                if (sessionResult.error) {
                    toast.info(sessionResult.error + ' You can start it from Mock interviews when ready.')
                }
                setTimeout(() => {
                    setOpen(false)
                    resetForm()
                    if (onSuccess) onSuccess(mockId)
                    if (!spaceId) {
                        router.push('/mock')
                    }
                }, 1500)
            }
        } catch (error) {
            clearInterval(progressInterval)
            console.error('Error creating mock:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to create mock interview')
            setProcessing(false)
            setProgressPercent(0)
        }
    }

    const getStatusMessage = () => {
        if (progressPercent < 30) return 'Analyzing requirements...'
        if (progressPercent < 60) return 'Generating questions...'
        if (progressPercent < 90) return 'Building knowledge base...'
        if (progressPercent === 100) return 'Complete!'
        return 'Processing...'
    }

    return (
        <Sheet open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
        }}>
            <SheetContent side="right" className="w-full sm:max-w-2xl">
                <div className="max-w-2xl mx-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            Create Mock Interview
                        </SheetTitle>
                        <SheetDescription>
                            Design your personalized AI-powered interview practice
                        </SheetDescription>
                    </SheetHeader>
                    <AnimatePresence mode="wait">
                        {
                            processing ? (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center py-20"
                                >
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-900 blur-2xl opacity-30 animate-pulse" />
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center"
                                        >
                                            <div className="w-28 h-28 rounded-full bg-white dark:bg-neutral-950 flex items-center justify-center">
                                                <motion.div
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                >
                                                    {
                                                        progressPercent === 100 ? (
                                                            <CheckCircle className="w-12 h-12 text-neutral-900 dark:text-neutral-100" />
                                                        ) : (
                                                            <Brain className="w-12 h-12 text-neutral-900 dark:text-neutral-100" />
                                                        )
                                                    }
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2 text-neutral-900 dark:text-white">
                                        {progressPercent === 100 ? 'Mock Interview Created!' : 'Creating Your Interview'}
                                    </h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                                        {getStatusMessage()}
                                    </p>
                                    <div className="w-full max-w-md space-y-4">
                                        <Progress value={progressPercent} className="h-3" />
                                        <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                                            <span>{progressPercent}% complete</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 space-y-3 text-sm text-left w-full max-w-md">
                                        {
                                            [
                                                { label: 'Analyzing requirements', threshold: 10, icon: Brain },
                                                { label: 'Generating questions', threshold: 40, icon: Sparkles },
                                                { label: 'Building knowledge base', threshold: 70, icon: BookOpen },
                                                { label: 'Finalizing interview', threshold: 95, icon: CheckCircle },
                                            ].map((item, idx) => {
                                                return (
                                                    <motion.div
                                                        key={item.label}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: progressPercent >= item.threshold ? 1 : 0.4, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="flex items-center gap-3"
                                                    >
                                                        {
                                                            progressPercent >= item.threshold + 20 ? (
                                                                <Check className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                            ) : progressPercent >= item.threshold ? (
                                                                <InlineLoader size="md" className="text-neutral-900 dark:text-neutral-100" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-700" />
                                                            )
                                                        }
                                                        <span className={cn(
                                                            progressPercent >= item.threshold
                                                                ? "text-neutral-900 dark:text-white"
                                                                : "text-neutral-600 dark:text-neutral-400"
                                                        )}>
                                                            {item.label}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })
                                        }
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="mb-8">
                                        <div className="flex justify-between mb-2">
                                            {
                                                steps.map((s, index) => (
                                                    <div key={s.id} className="flex-1 text-center">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-medium transition-all",
                                                            index < step ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                index === step ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                    "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                                                        )}>
                                                            {index < step ? <Check className="w-5 h-5" /> : index + 1}
                                                        </div>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.title}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
                                    </div>
                                    {/* The affordability line, and it now LOOKS different
                                        when the answer is no. It read identically either way,
                                        so the one fact that decides whether the user can
                                        finish this wizard was styled as neutral information.
                                        A short shortfall line appears rather than leaving them
                                        to subtract two numbers themselves. */}
                                    <div className={cn(
                                        'mb-6 flex items-center gap-3 rounded-xl border p-3',
                                        userCredits < totalCredits
                                            ? 'border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800'
                                            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/30'
                                    )}>
                                        <Sparkles className="h-5 w-5 shrink-0 text-neutral-800 dark:text-neutral-100" />
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                {totalCredits} credits required
                                            </span>
                                            <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                you have {userCredits.toLocaleString()}
                                            </span>
                                            {userCredits < totalCredits && (
                                                <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                    Need {(totalCredits - userCredits).toLocaleString()} more to start this.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={step}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            {
                                                step === 0 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-6">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Tell us about the role
                                                            </h3>
                                                            <p className="text-neutral-500 dark:text-neutral-400">What position are you preparing for?</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Position Title *</Label>
                                                            <Input
                                                                placeholder="e.g., Senior Frontend Developer, SDE-2"
                                                                value={formData.title}
                                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                                className="h-12"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Description *</Label>
                                                            <Textarea
                                                                placeholder="Describe the key areas you want to focus on..."
                                                                value={formData.description}
                                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Category</Label>
                                                                <Select
                                                                    value={formData.category}
                                                                    onValueChange={(value) => setFormData({ ...formData, category: value as MockCategory })}
                                                                >
                                                                    <SelectTrigger className="h-12">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {
                                                                            MOCK_CATEGORIES.filter(c => c.value !== 'ALL').map((cat) => (
                                                                                <SelectItem key={cat.value} value={cat.value}>
                                                                                    <span className="flex items-center gap-2">
                                                                                        <AnimatedIcon name={cat.icon} size={16} className="shrink-0" />
                                                                                        <span>{cat.label}</span>
                                                                                    </span>
                                                                                </SelectItem>
                                                                            ))
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Level</Label>
                                                                <Select
                                                                    value={formData.level}
                                                                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                                                                >
                                                                    <SelectTrigger className="h-12">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {
                                                                            MOCK_LEVELS.filter(l => l.value !== 'ALL').map((level) => (
                                                                                <SelectItem key={level.value} value={level.value}>
                                                                                    {level.label}
                                                                                </SelectItem>
                                                                            ))
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Duration</Label>
                                                                <Select
                                                                    value={formData.duration.toString()}
                                                                    onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                                                                >
                                                                    <SelectTrigger className="h-12">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="10">10 min</SelectItem>
                                                                        <SelectItem value="15">15 min</SelectItem>
                                                                        <SelectItem value="20">20 min</SelectItem>
                                                                        <SelectItem value="30">30 min</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Questions</Label>
                                                                <Select
                                                                    value={formData.questionsCount.toString()}
                                                                    onValueChange={(value) => setFormData({ ...formData, questionsCount: parseInt(value) })}
                                                                >
                                                                    <SelectTrigger className="h-12">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="3">3 questions</SelectItem>
                                                                        <SelectItem value="5">5 questions</SelectItem>
                                                                        <SelectItem value="7">7 questions</SelectItem>
                                                                        <SelectItem value="10">10 questions</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                step === 1 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-6">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Knowledge Base (Optional)
                                                            </h3>
                                                            <p className="text-neutral-500 dark:text-neutral-400">Add study materials for focused questions</p>
                                                        </div>
                                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                                                            <div className="flex gap-2">
                                                                <BookOpen className="w-5 h-5 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                                                <div className="text-sm text-neutral-900 dark:text-neutral-100">
                                                                    <p className="font-medium mb-1">Pro Tip</p>
                                                                    <p className="text-neutral-700 dark:text-neutral-100">
                                                                        Adding your syllabus helps the AI ask more targeted questions.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Textarea
                                                            placeholder="Paste your study materials, syllabus, or notes here..."
                                                            value={formData.knowledgeBase}
                                                            onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                                                            rows={10}
                                                            className="font-mono text-sm"
                                                        />
                                                        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                                                            <span>{formData.knowledgeBase.length} characters</span>
                                                            {
                                                                formData.knowledgeBase.length > 0 && (
                                                                    <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                step === 2 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-6">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Additional Options
                                                            </h3>
                                                            <p className="text-neutral-500 dark:text-neutral-400">Configure resume context and visibility</p>
                                                        </div>
                                                        <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-start gap-3">
                                                                    <FileText className="w-5 h-5 text-neutral-800 dark:text-neutral-100 mt-0.5" />
                                                                    <div>
                                                                        <div className="font-medium text-neutral-900 dark:text-white">
                                                                            Include Resume Context
                                                                        </div>
                                                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                                            AI asks questions based on your experience
                                                                        </div>
                                                                        <Badge variant="outline" className="text-xs mt-1">+5 credits</Badge>
                                                                    </div>
                                                                </div>
                                                                <Switch
                                                                    checked={formData.includeResume}
                                                                    onCheckedChange={(checked) => setFormData({ ...formData, includeResume: checked })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <motion.button
                                                                onClick={() => setFormData({ ...formData, isPublic: false })}
                                                                whileHover={{ scale: 1.02 }}
                                                                className={cn(
                                                                    "p-4 rounded-xl border-2 transition-all text-left",
                                                                    !formData.isPublic
                                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900/30"
                                                                        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                                                )}
                                                            >
                                                                <Lock className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mb-2" />
                                                                <div className="font-medium text-neutral-900 dark:text-white">Private</div>
                                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Only you can access</div>
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={() => setFormData({ ...formData, isPublic: true })}
                                                                whileHover={{ scale: 1.02 }}
                                                                className={cn(
                                                                    "p-4 rounded-xl border-2 transition-all text-left",
                                                                    formData.isPublic
                                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900/30"
                                                                        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                                                )}
                                                            >
                                                                <Globe className="w-5 h-5 text-neutral-900 dark:text-neutral-100 mb-2" />
                                                                <div className="font-medium text-neutral-900 dark:text-white">Public</div>
                                                                <div className="text-xs text-neutral-800 dark:text-neutral-200">50% discount!</div>
                                                            </motion.button>
                                                        </div>
                                                        <div className="p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                            <h4 className="font-semibold text-base mb-3">Cost Summary</h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                                                    <span>Duration ({formData.duration}min)</span>
                                                                    <span>{baseCredits}c</span>
                                                                </div>
                                                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                                                    <span>Questions ({formData.questionsCount})</span>
                                                                    <span>{questionCredits}c</span>
                                                                </div>
                                                                {
                                                                    formData.isPublic && (
                                                                        <div className="flex justify-between text-neutral-800 dark:text-neutral-200">
                                                                            <span>Public discount</span>
                                                                            <span>-50%</span>
                                                                        </div>
                                                                    )
                                                                }
                                                                {
                                                                    formData.includeResume && (
                                                                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                                                            <span>Resume context</span>
                                                                            <span>+{resumeCredits}c</span>
                                                                        </div>
                                                                    )
                                                                }
                                                                <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-2" />
                                                                <div className="flex justify-between font-bold text-lg">
                                                                    <span>Total</span>
                                                                    <span className="text-neutral-800 dark:text-neutral-100">{totalCredits} credits</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {
                                                            userCredits < totalCredits && (
                                                                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                                                    <div className="flex gap-2">
                                                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                                        <div className="text-sm text-red-900 dark:text-red-100">
                                                                            Insufficient credits.{' '}
                                                                            <Link href="/purchase" className="underline">Purchase credits</Link>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </motion.div>
                                    </AnimatePresence>
                                    <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                        <Button
                                            variant="outline"
                                            onClick={prevStep}
                                            disabled={step === 0}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            disabled={!canProceed() || (step === 2 && userCredits < totalCredits)}
                                            className="bg-gradient-to-r from-neutral-800 to-neutral-800 hover:opacity-90 text-white"
                                        >
                                            {
                                                step === steps.length - 1 ? (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Create Mock ({totalCredits} credits)
                                                    </>
                                                ) : (
                                                    <>
                                                        Next
                                                        <ArrowRight className="w-4 h-4 ml-2" />
                                                    </>
                                                )
                                            }
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                </div>
            </SheetContent>
        </Sheet>
    )
}