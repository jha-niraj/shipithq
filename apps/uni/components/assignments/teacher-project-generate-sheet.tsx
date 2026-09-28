'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Code2, Brain, Rocket,
    Zap, AlertCircle, Calendar, Coins, FileText, Users, GraduationCap
} from 'lucide-react'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
    SheetTrigger
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { DateTimePicker, todayLocal } from '@repo/ui/components/ui/date-time-picker'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Label } from '@repo/ui/components/ui/label'
import { Progress } from '@repo/ui/components/ui/progress'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import toast from '@repo/ui/components/ui/sonner'
import {
    createProjectAssignment, finalizeProjectAssignment, getProjectAssignmentJobStatus, getTeacherClasses,
} from '@/actions/assignments/project-assignments.action'
import { cn } from '@repo/ui/lib/utils'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@repo/ui/components/ui/select'

interface ClassOption {
    id: string
    name: string
    code: string | null
    semester: string
    academicYear: string
    studentCount: number
    department?: { name: string; code: string | null } | null
}

interface TeacherProjectGenerateSheetProps {
    trigger?: React.ReactNode
    onSuccess?: (projectSlug: string) => void
}

const GENERATION_TYPES = [
    { value: 'FULL_STACK', label: 'Full Stack', icon: Code2, color: 'from-neutral-900 to-neutral-900', description: 'Complete web application' },
    { value: 'FRONTEND', label: 'Frontend', icon: Brain, color: 'from-neutral-900 to-pink-500', description: 'UI-focused project' },
    { value: 'APP', label: 'Mobile App', icon: Rocket, color: 'from-neutral-900 to-neutral-900', description: 'iOS & Android apps' },
    { value: 'PROGRAMS', label: 'Programs', icon: Rocket, color: 'from-neutral-900 to-red-500', description: 'CLI tools & scripts' },
    { value: 'AI/ML', label: 'AI/ML', icon: Sparkles, color: 'from-neutral-900 to-neutral-900', description: 'AI & Machine Learning' },
    { value: 'AI_AGENT', label: 'AI Agent', icon: Zap, color: 'from-neutral-900 to-neutral-900', description: 'Autonomous AI systems' },
    { value: 'OTHER', label: 'Other', icon: Code2, color: 'from-gray-500 to-slate-500', description: 'Custom project type' },
] as const

const DIFFICULTY_LEVELS = [
    { value: 'BEGINNER', label: 'Beginner', desc: '0-6 months experience', color: 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30' },
    { value: 'INTERMEDIATE', label: 'Intermediate', desc: '6-18 months experience', color: 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30' },
    { value: 'ADVANCED', label: 'Advanced', desc: '18+ months experience', color: 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30' },
] as const

const FRONTEND_STACKS = ['React', 'Next.js', 'Vue', 'Angular', 'HTML/CSS/JS', 'Svelte']
const BACKEND_STACKS = ['Node.js/Express', 'Next.js API', 'Python/Flask', 'Python/Django', 'Java/Spring', 'Go']
const DATABASES = ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'Supabase', 'Firebase']
const AI_PROVIDERS = ['OpenAI', 'Claude (Anthropic)', 'Google Gemini', 'Hugging Face', 'None']
const APP_FRAMEWORKS = ['React Native', 'React Native (Expo)', 'Flutter', 'Swift (iOS)', 'Kotlin (Android)']
const APP_BACKENDS = ['Firebase', 'Supabase', 'Node.js/Express', 'Python/FastAPI', 'Appwrite']

type GenerationType = typeof GENERATION_TYPES[number]['value']
type Difficulty = typeof DIFFICULTY_LEVELS[number]['value']

interface FormData {
    projectTitle: string
    projectDescription: string
    generationType: GenerationType | undefined
    difficulty: Difficulty | undefined
    stacks: {
        frontend: string
        backend: string
        database: string
        deployment: string
        aiProvider: string
    }
    visibility: 'PUBLIC' | 'PRIVATE'
    includeAssessment: boolean
    // University-specific
    classIds: string[]
    deadline: string
    credits: number
    instructions: string
}

export default function TeacherProjectGenerateSheet({
    trigger,
    onSuccess,
}: TeacherProjectGenerateSheetProps) {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [progressPercent, setProgressPercent] = useState(0)
    const [jobStatus, setJobStatus] = useState<string>('idle')
    const [, setCurrentJobId] = useState<string | null>(null)
    const [classes, setClasses] = useState<ClassOption[]>([])
    const [loadingClasses, setLoadingClasses] = useState(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const [formData, setFormData] = useState<FormData>({
        projectTitle: '',
        projectDescription: '',
        generationType: undefined,
        difficulty: undefined,
        stacks: {
            frontend: '',
            backend: '',
            database: '',
            deployment: '',
            aiProvider: '',
        },
        visibility: 'PUBLIC',
        includeAssessment: true,
        classIds: [],
        deadline: '',
        credits: 0,
        instructions: '',
    })

    // Fetch classes when sheet opens
    useEffect(() => {
        if (open && classes.length === 0) {
            fetchClasses()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const fetchClasses = async () => {
        setLoadingClasses(true)
        try {
            const result = await getTeacherClasses()
            if (result.success && result.data) {
                setClasses(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error)
        } finally {
            setLoadingClasses(false)
        }
    }

    const steps = [
        { id: 'basics', title: 'Project Details', subtitle: 'Name and describe' },
        { id: 'type', title: 'Type & Difficulty', subtitle: 'Category and level' },
        { id: 'stack', title: 'Tech Stack', subtitle: 'Technologies' },
        { id: 'assignment', title: 'Assignment', subtitle: 'Classes & deadline' },
    ]

    const updateFormData = (key: keyof FormData, value: unknown) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const updateStacks = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            stacks: { ...prev.stacks, [key]: value },
        }))
    }

    const toggleClass = (classId: string) => {
        setFormData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId)
                ? prev.classIds.filter(id => id !== classId)
                : [...prev.classIds, classId],
        }))
    }

    const canProceed = () => {
        switch (currentStep) {
            case 0:
                return formData.projectTitle.length >= 3 && formData.projectDescription.length >= 10
            case 1:
                return !!formData.generationType && !!formData.difficulty
            case 2:
                return true // Stack is optional
            case 3:
                return formData.classIds.length > 0 // At least one class selected
            default:
                return true
        }
    }

    const nextStep = () => {
        if (!canProceed()) {
            toast.error('Please complete this step')
            return
        }
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleSubmit()
        }
    }

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1)
    }

    const handleSubmit = async () => {
        try {
            setLoading(true)
            toast.info('Creating project assignment...')

            const result = await createProjectAssignment({
                projectTitle: formData.projectTitle,
                projectDescription: formData.projectDescription,
                generationType: formData.generationType!,
                difficulty: formData.difficulty!,
                visibility: formData.visibility,
                includeAssessment: formData.includeAssessment,
                stacks: formData.stacks,
                classIds: formData.classIds,
                deadline: formData.deadline ? new Date(formData.deadline) : undefined,
                credits: formData.credits || undefined,
                instructions: formData.instructions || undefined,
            })

            if (!result.success || !result.jobId) {
                toast.error(result.error || 'Failed to create assignment')
                setLoading(false)
                return
            }

            setProgressPercent(0)
            setJobStatus('waiting')
            setCurrentJobId(result.jobId)
            startPolling(result.jobId)
        } catch (error) {
            console.error('Generation error:', error)
            toast.error('Failed to create project. Please try again.')
            setLoading(false)
        }
    }

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }, [])

    const startPolling = useCallback((jobId: string) => {
        const maxPolls = 120
        let pollCount = 0

        pollingRef.current = setInterval(async () => {
            pollCount++

            try {
                // Reads background_job through a server action; the worker's
                // Durable Object is what writes to it.
                const result = await getProjectAssignmentJobStatus(jobId)

                if (!result.success) {
                    if (pollCount >= maxPolls) {
                        stopPolling()
                        toast.error('Generation timeout')
                        setLoading(false)
                    }
                    return
                }

                const { status, progress, data, error: failedReason } = result

                setProgressPercent(progress ?? 0)
                setJobStatus(status ?? 'waiting')

                if (status === 'completed' && data) {
                    stopPolling()
                    setProgressPercent(100)
                    setJobStatus('completed')

                    // Finalize with university assignment details
                    const savedProject = await finalizeProjectAssignment(jobId, data)
                    if (!savedProject.success) {
                        toast.error(savedProject.error || 'Failed to save assignment')
                        setLoading(false)
                        return
                    }

                    toast.success('Project assignment created successfully!')
                    setOpen(false)
                    setLoading(false)
                    resetForm()

                    if (onSuccess && savedProject.data?.projectSlug) {
                        onSuccess(savedProject.data.projectSlug)
                    }
                } else if (status === 'failed') {
                    stopPolling()
                    toast.error(failedReason || 'Generation failed')
                    setLoading(false)
                } else if (pollCount >= maxPolls) {
                    stopPolling()
                    toast.error('Generation timeout. Please try again.')
                    setLoading(false)
                }
            } catch (error) {
                console.error('Polling error:', error)
                if (pollCount >= maxPolls) {
                    stopPolling()
                    toast.error('Failed to connect to worker.')
                    setLoading(false)
                }
            }
        }, 5000)
    }, [stopPolling, onSuccess])

    const resetForm = () => {
        setCurrentStep(0)
        setFormData({
            projectTitle: '',
            projectDescription: '',
            generationType: undefined,
            difficulty: undefined,
            stacks: { frontend: '', backend: '', database: '', deployment: '', aiProvider: '' },
            visibility: 'PUBLIC',
            includeAssessment: true,
            classIds: [],
            deadline: '',
            credits: 0,
            instructions: '',
        })
        setCurrentJobId(null)
    }

    const getStatusMessage = () => {
        switch (jobStatus) {
            case 'waiting': return 'Queued for generation...'
            case 'active': return 'Generating project structure...'
            case 'completed': return 'Assignment created!'
            case 'failed': return 'Generation failed'
            default: return 'Processing...'
        }
    }

    const isAppType = formData.generationType === 'APP'

    return (
        <Sheet open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) {
                stopPolling()
                resetForm()
                setLoading(false)
            }
        }}>
            <SheetTrigger asChild>
                {
                    trigger || (
                        <Button className="bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white rounded-xl">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Create Project Assignment
                        </Button>
                    )
                }
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80dvh] overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            Create Project Assignment
                        </SheetTitle>
                        <SheetDescription>
                            Generate an AI-powered project and assign it to your classes
                        </SheetDescription>
                    </SheetHeader>
                    <AnimatePresence mode="wait">
                        {
                            loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center py-16"
                                >
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-900 blur-2xl opacity-30 animate-pulse" />
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="relative w-28 h-28 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center"
                                        >
                                            <div className="w-24 h-24 rounded-full bg-white dark:bg-neutral-950 flex items-center justify-center">
                                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                                    {
                                                        jobStatus === 'completed' ? (
                                                            <Check className="w-10 h-10 text-neutral-900" />
                                                        ) : (
                                                            <Sparkles className="w-10 h-10 text-neutral-900" />
                                                        )
                                                    }
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">
                                        {jobStatus === 'completed' ? 'Assignment Created!' : 'Generating Project'}
                                    </h3>
                                    <p className="text-neutral-500 mb-6">{getStatusMessage()}</p>
                                    <div className="w-full max-w-md space-y-3">
                                        <Progress value={progressPercent} className="h-2" />
                                        <div className="flex justify-between text-sm text-neutral-500">
                                            <span>{progressPercent}% complete</span>
                                            <span className="capitalize">{jobStatus}</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 space-y-2 text-sm w-full max-w-md">
                                        {
                                            [
                                                { label: 'Analyzing requirements', threshold: 10 },
                                                { label: 'Generating project structure', threshold: 30 },
                                                { label: 'Creating tasks & Learns', threshold: 55 },
                                                { label: 'Adding resources', threshold: 80 },
                                                { label: 'Assigning to classes', threshold: 95 },
                                            ].map((step, idx) => (
                                                <motion.div
                                                    key={step.label}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: progressPercent >= step.threshold ? 1 : 0.4, x: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className="flex items-center gap-3"
                                                >
                                                    {
                                                        progressPercent >= step.threshold + 10 ? (
                                                            <Check className="w-4 h-4 text-neutral-900" />
                                                        ) : progressPercent >= step.threshold ? (
                                                            <Loader2 className="w-4 h-4 text-neutral-900 animate-spin" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-700" />
                                                        )
                                                    }
                                                    <span className={cn(
                                                        progressPercent >= step.threshold ? "text-neutral-900 dark:text-white" : "text-neutral-400"
                                                    )}>
                                                        {step.label}
                                                    </span>
                                                </motion.div>
                                            ))
                                        }
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="mb-8">
                                        <div className="flex justify-between mb-2">
                                            {
                                                steps.map((step, index) => (
                                                    <div key={step.id} className="flex-1 text-center">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-medium transition-all",
                                                            index < currentStep ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                index === currentStep ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                                                                    "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                                                        )}>
                                                            {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                                                        </div>
                                                        <p className="text-xs text-neutral-500 hidden sm:block">{step.title}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
                                    </div>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            {
                                                currentStep === 0 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-6">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Project Details
                                                            </h3>
                                                            <p className="text-neutral-500">What should students build?</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Project Title *</Label>
                                                            <Input
                                                                placeholder="e.g., Task Management App, E-commerce Platform..."
                                                                value={formData.projectTitle}
                                                                onChange={(e) => updateFormData('projectTitle', e.target.value)}
                                                                className="text-lg h-12"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Description *</Label>
                                                            <Textarea
                                                                placeholder="Describe what students should build, key features, learning objectives..."
                                                                value={formData.projectDescription}
                                                                onChange={(e) => updateFormData('projectDescription', e.target.value)}
                                                                rows={4}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                currentStep === 1 && (
                                                    <div className="space-y-6">
                                                        <div className="text-center mb-4">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Project Type & Difficulty
                                                            </h3>
                                                            <p className="text-neutral-500">Choose category and experience level</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label>Project Type *</Label>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                {
                                                                    GENERATION_TYPES.map((type) => {
                                                                        const Icon = type.icon
                                                                        const isSelected = formData.generationType === type.value
                                                                        return (
                                                                            <button
                                                                                key={type.value}
                                                                                type="button"
                                                                                onClick={() => updateFormData('generationType', type.value)}
                                                                                className={cn(
                                                                                    "p-3 rounded-xl border-2 transition-all text-left",
                                                                                    isSelected
                                                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900"
                                                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                                                                                )}
                                                                            >
                                                                                <div className={cn("p-1.5 rounded-lg inline-flex mb-1 bg-gradient-to-br", type.color)}>
                                                                                    <Icon className="w-4 h-4 text-white" />
                                                                                </div>
                                                                                <p className="font-medium text-sm text-neutral-900 dark:text-white">{type.label}</p>
                                                                            </button>
                                                                        )
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label>Difficulty Level *</Label>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {
                                                                    DIFFICULTY_LEVELS.map((level) => {
                                                                        const isSelected = formData.difficulty === level.value
                                                                        return (
                                                                            <button
                                                                                key={level.value}
                                                                                type="button"
                                                                                onClick={() => updateFormData('difficulty', level.value)}
                                                                                className={cn(
                                                                                    "p-4 rounded-xl border-2 transition-all text-center",
                                                                                    isSelected
                                                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900"
                                                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                                                                                )}
                                                                            >
                                                                                <p className={cn("font-bold", level.color.split(' ')[0])}>{level.label}</p>
                                                                                <p className="text-xs text-neutral-500 mt-1">{level.desc}</p>
                                                                            </button>
                                                                        )
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            {
                                                currentStep === 2 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-4">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Tech Stack (Optional)
                                                            </h3>
                                                            <p className="text-neutral-500">Leave empty for AI to decide based on project</p>
                                                        </div>

                                                        {
                                                            isAppType ? (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label>App Framework</Label>
                                                                        <Select value={formData.stacks.frontend} onValueChange={(__v) => updateStacks('frontend', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select framework" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {APP_FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Backend</Label>
                                                                        <Select value={formData.stacks.backend} onValueChange={(__v) => updateStacks('backend', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select backend" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {APP_BACKENDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Frontend</Label>
                                                                        <Select value={formData.stacks.frontend} onValueChange={(__v) => updateStacks('frontend', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select frontend" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {FRONTEND_STACKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Backend</Label>
                                                                        <Select value={formData.stacks.backend} onValueChange={(__v) => updateStacks('backend', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select backend" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {BACKEND_STACKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Database</Label>
                                                                        <Select value={formData.stacks.database} onValueChange={(__v) => updateStacks('database', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select database" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {DATABASES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>AI Provider</Label>
                                                                        <Select value={formData.stacks.aiProvider} onValueChange={(__v) => updateStacks('aiProvider', __v)}>
                                                                            <SelectTrigger className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3">
                                                                                <SelectValue placeholder="Select AI (optional)" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {AI_PROVIDERS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }

                                                        <div className="flex items-center gap-2 pt-4">
                                                            <Checkbox
                                                                id="includeAssessment"
                                                                checked={formData.includeAssessment}
                                                                onCheckedChange={(checked) => updateFormData('includeAssessment', !!checked)}
                                                            />
                                                            <label htmlFor="includeAssessment" className="text-sm">
                                                                Include quiz assessment for this project
                                                            </label>
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            {
                                                currentStep === 3 && (
                                                    <div className="space-y-4">
                                                        <div className="text-center mb-4">
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                                                                Assignment Details
                                                            </h3>
                                                            <p className="text-neutral-500">Select classes and set deadline</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label className="flex items-center gap-2">
                                                                <Users className="w-4 h-4" />
                                                                Select Classes *
                                                            </Label>
                                                            {
                                                                loadingClasses ? (
                                                                    <div className="flex items-center justify-center py-8">
                                                                        <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
                                                                    </div>
                                                                ) : classes.length === 0 ? (
                                                                    <div className="text-center py-8 text-neutral-500">
                                                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                                                        <p>No classes found. Create classes first.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                                                        {
                                                                            classes.map((cls) => {
                                                                                const isSelected = formData.classIds.includes(cls.id)
                                                                                return (
                                                                                    <button
                                                                                        key={cls.id}
                                                                                        type="button"
                                                                                        onClick={() => toggleClass(cls.id)}
                                                                                        className={cn(
                                                                                            "p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                                                                                            isSelected
                                                                                                ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-900"
                                                                                                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                                                        )}
                                                                                    >
                                                                                        <Checkbox checked={isSelected} />
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="font-medium text-sm truncate">{cls.name}</p>
                                                                                            <p className="text-xs text-neutral-500">
                                                                                                {cls.department?.name} • {cls.studentCount} students
                                                                                            </p>
                                                                                        </div>
                                                                                    </button>
                                                                                )
                                                                            })
                                                                        }
                                                                    </div>
                                                                )
                                                            }
                                                            {
                                                                formData.classIds.length > 0 && (
                                                                    <p className="text-sm text-neutral-800">{formData.classIds.length} class(es) selected</p>
                                                                )
                                                            }
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="flex items-center gap-2">
                                                                    <Calendar className="w-4 h-4" />
                                                                    Deadline (Optional)
                                                                </Label>
                                                                <DateTimePicker
                                                                    value={formData.deadline}
                                                                    onChange={(v) => updateFormData('deadline', v ?? '')}
                                                                    min={todayLocal()}
                                                                    defaultTime="23:59"
                                                                    aria-label="Deadline"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="flex items-center gap-2">
                                                                    <Coins className="w-4 h-4" />
                                                                    Credit Reward (Optional)
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={formData.credits || ''}
                                                                    onChange={(e) => updateFormData('credits', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4" />
                                                                Instructions (Optional)
                                                            </Label>
                                                            <Textarea
                                                                placeholder="Any specific instructions for students..."
                                                                value={formData.instructions}
                                                                onChange={(e) => updateFormData('instructions', e.target.value)}
                                                                rows={3}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        </motion.div>
                                    </AnimatePresence>
                                    <div className="flex justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={prevStep}
                                            disabled={currentStep === 0}
                                            className="rounded-xl"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            disabled={!canProceed()}
                                            className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700"
                                        >
                                            {
                                                currentStep === steps.length - 1 ? (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Create Assignment
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