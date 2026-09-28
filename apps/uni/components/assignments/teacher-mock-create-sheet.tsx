'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, ArrowRight, Check, Loader2, Mic, Users, GraduationCap,
    Calendar, Coins, FileText, AlertCircle, Brain, Code2, Settings
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
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import toast from '@repo/ui/components/ui/sonner'
import {
    createMockAssignment,
} from '@/actions/assignments/mock-assignments.action'
import { getTeacherClasses } from '@/actions/assignments/project-assignments.action'
import { cn } from '@repo/ui/lib/utils'

interface ClassOption {
    id: string
    name: string
    code: string | null
    semester: string
    academicYear: string
    studentCount: number
    department?: { name: string; code: string | null } | null
}

interface TeacherMockCreateSheetProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
}

const MOCK_CATEGORIES = [
    { value: 'TECHNICAL', label: 'Technical', icon: Code2, description: 'DSA, System Design, Coding' },
    { value: 'BEHAVIORAL', label: 'Behavioral', icon: Users, description: 'STAR method, soft skills' },
    { value: 'HR', label: 'HR Round', icon: Users, description: 'General HR questions' },
    { value: 'SYSTEM_DESIGN', label: 'System Design', icon: Settings, description: 'Architecture discussions' },
    { value: 'CODING', label: 'Live Coding', icon: Code2, description: 'Real-time coding challenges' },
    { value: 'GENERAL', label: 'General', icon: Brain, description: 'Mixed format interview' },
] as const

const MOCK_LEVELS = [
    { value: 'BEGINNER', label: 'Beginner', desc: 'Entry level / Freshers' },
    { value: 'INTERMEDIATE', label: 'Intermediate', desc: '1-3 years experience' },
    { value: 'ADVANCED', label: 'Advanced', desc: '3-5 years experience' },
    { value: 'EXPERT', label: 'Expert', desc: '5+ years experience' },
] as const

type MockCategory = typeof MOCK_CATEGORIES[number]['value']
type MockLevel = typeof MOCK_LEVELS[number]['value']

interface FormData {
    title: string
    description: string
    category: MockCategory | undefined
    level: MockLevel | undefined
    duration: number
    questionsCount: number
    knowledgeBase: string
    tags: string[]
    // University-specific
    classIds: string[]
    deadline: string
    credits: number
    instructions: string
}

export default function TeacherMockCreateSheet({
    trigger,
    onSuccess,
}: TeacherMockCreateSheetProps) {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState<ClassOption[]>([])
    const [loadingClasses, setLoadingClasses] = useState(false)
    const [tagInput, setTagInput] = useState('')

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        category: undefined,
        level: undefined,
        duration: 15,
        questionsCount: 5,
        knowledgeBase: '',
        tags: [],
        classIds: [],
        deadline: '',
        credits: 15,
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
                setClasses(result.data as ClassOption[])
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error)
        } finally {
            setLoadingClasses(false)
        }
    }

    const steps = [
        { id: 'basics', title: 'Basic Info', subtitle: 'Title and description' },
        { id: 'config', title: 'Configuration', subtitle: 'Category and level' },
        { id: 'knowledge', title: 'Knowledge Base', subtitle: 'Interview context' },
        { id: 'assignment', title: 'Assignment', subtitle: 'Classes & deadline' },
    ]

    const updateFormData = (key: keyof FormData, value: unknown) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const toggleClass = (classId: string) => {
        setFormData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId)
                ? prev.classIds.filter(id => id !== classId)
                : [...prev.classIds, classId],
        }))
    }

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()],
            }))
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag),
        }))
    }

    const canProceed = () => {
        switch (currentStep) {
            case 0:
                return formData.title.length >= 3 && formData.description.length >= 10
            case 1:
                return !!formData.category && !!formData.level
            case 2:
                return formData.knowledgeBase.length >= 20
            case 3:
                return formData.classIds.length > 0
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
            toast.info('Creating mock interview assignment...')

            const result = await createMockAssignment({
                title: formData.title,
                description: formData.description,
                category: formData.category!,
                level: formData.level!,
                duration: formData.duration,
                questionsCount: formData.questionsCount,
                knowledgeBase: formData.knowledgeBase,
                tags: formData.tags,
                classIds: formData.classIds,
                deadline: formData.deadline ? new Date(formData.deadline) : undefined,
                credits: formData.credits || undefined,
                instructions: formData.instructions || undefined,
            })

            if (!result.success) {
                toast.error(result.error || 'Failed to create mock interview')
                setLoading(false)
                return
            }

            toast.success('Mock interview assignment created successfully!')
            setOpen(false)
            resetForm()
            onSuccess?.()
        } catch (error) {
            console.error('Creation error:', error)
            toast.error('Failed to create mock interview. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setCurrentStep(0)
        setFormData({
            title: '',
            description: '',
            category: undefined,
            level: undefined,
            duration: 15,
            questionsCount: 5,
            knowledgeBase: '',
            tags: [],
            classIds: [],
            deadline: '',
            credits: 15,
            instructions: '',
        })
    }

    return (
        <Sheet open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
        }}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                        <Mic className="w-4 h-4 mr-2" />
                        Create Mock Interview
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xl">Create Mock Interview</span>
                            <SheetDescription className="text-left">
                                Create AI-powered mock interviews for your students
                            </SheetDescription>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 px-2">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                                    idx < currentStep
                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                        : idx === currentStep
                                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 ring-2 ring-neutral-900"
                                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                                )}>
                                    {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className="text-xs mt-1 text-neutral-500 hidden sm:block">{step.title}</span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={cn(
                                    "w-8 sm:w-12 h-0.5 mx-1",
                                    idx < currentStep ? "bg-neutral-900" : "bg-neutral-200 dark:bg-neutral-700"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Step 0: Basic Info */}
                        {currentStep === 0 && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Interview Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Frontend Developer Interview"
                                        value={formData.title}
                                        onChange={(e) => updateFormData('title', e.target.value)}
                                        className="mt-1.5"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description">Description *</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe what this mock interview covers..."
                                        value={formData.description}
                                        onChange={(e) => updateFormData('description', e.target.value)}
                                        className="mt-1.5 min-h-[100px]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="duration">Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min={5}
                                            max={60}
                                            value={formData.duration}
                                            onChange={(e) => updateFormData('duration', parseInt(e.target.value) || 15)}
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="questionsCount">Questions Count</Label>
                                        <Input
                                            id="questionsCount"
                                            type="number"
                                            min={3}
                                            max={15}
                                            value={formData.questionsCount}
                                            onChange={(e) => updateFormData('questionsCount', parseInt(e.target.value) || 5)}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Configuration */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="mb-3 block">Interview Category *</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {MOCK_CATEGORIES.map((cat) => {
                                            const Icon = cat.icon
                                            return (
                                                <button
                                                    key={cat.value}
                                                    type="button"
                                                    onClick={() => updateFormData('category', cat.value)}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-left transition-all",
                                                        formData.category === cat.value
                                                            ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                    )}
                                                >
                                                    <Icon className={cn(
                                                        "w-5 h-5 mb-1",
                                                        formData.category === cat.value ? "text-neutral-800" : "text-neutral-500"
                                                    )} />
                                                    <div className="font-medium text-sm">{cat.label}</div>
                                                    <div className="text-xs text-neutral-500">{cat.description}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-3 block">Experience Level *</Label>
                                    <div className="space-y-2">
                                        {MOCK_LEVELS.map((level) => (
                                            <button
                                                key={level.value}
                                                type="button"
                                                onClick={() => updateFormData('level', level.value)}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center",
                                                    formData.level === level.value
                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                )}
                                            >
                                                <div>
                                                    <div className="font-medium">{level.label}</div>
                                                    <div className="text-xs text-neutral-500">{level.desc}</div>
                                                </div>
                                                {formData.level === level.value && (
                                                    <Check className="w-5 h-5 text-neutral-800" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Knowledge Base */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                    <h4 className="font-medium text-neutral-900 dark:text-neutral-800 flex items-center gap-2">
                                        <Brain className="w-4 h-4" />
                                        Knowledge Base
                                    </h4>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-100 mt-1">
                                        Provide context and topics for the AI interviewer. This helps generate relevant questions.
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="knowledgeBase">Interview Topics & Context *</Label>
                                    <Textarea
                                        id="knowledgeBase"
                                        placeholder="Enter the topics, skills, and context for this interview. For example:

- Data Structures: Arrays, Linked Lists, Trees, Graphs
- Algorithms: Sorting, Searching, Dynamic Programming
- React.js Learns and hooks
- Database design principles
- Any specific technologies or frameworks to focus on..."
                                        value={formData.knowledgeBase}
                                        onChange={(e) => updateFormData('knowledgeBase', e.target.value)}
                                        className="mt-1.5 min-h-[200px]"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Minimum 20 characters. Be specific about the topics to cover.
                                    </p>
                                </div>

                                <div>
                                    <Label>Tags</Label>
                                    <div className="flex gap-2 mt-1.5">
                                        <Input
                                            placeholder="Add a tag..."
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        />
                                        <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                                    </div>
                                    {formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm flex items-center gap-1"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="text-neutral-400 hover:text-neutral-600"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Assignment */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" />
                                        Assign to Classes *
                                    </Label>
                                    {loadingClasses ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
                                        </div>
                                    ) : classes.length === 0 ? (
                                        <div className="text-center py-8 text-neutral-500">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No classes found. Please create classes first.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto">
                                            {classes.map((cls) => (
                                                <label
                                                    key={cls.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                        formData.classIds.includes(cls.id)
                                                            ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={formData.classIds.includes(cls.id)}
                                                        onCheckedChange={() => toggleClass(cls.id)}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium">{cls.name}</div>
                                                        <div className="text-xs text-neutral-500">
                                                            {cls.code && `${cls.code} • `}
                                                            {cls.department?.name || 'No Department'} • {cls.studentCount} students
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="deadline" className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Deadline
                                        </Label>
                                        <DateTimePicker
                                            id="deadline"
                                            value={formData.deadline}
                                            onChange={(v) => updateFormData('deadline', v ?? '')}
                                            min={todayLocal()}
                                            defaultTime="23:59"
                                            aria-label="Deadline"
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="credits" className="flex items-center gap-2">
                                            <Coins className="w-4 h-4" />
                                            Credits Required
                                        </Label>
                                        <Input
                                            id="credits"
                                            type="number"
                                            min={0}
                                            value={formData.credits}
                                            onChange={(e) => updateFormData('credits', parseInt(e.target.value) || 0)}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="instructions" className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Additional Instructions
                                    </Label>
                                    <Textarea
                                        id="instructions"
                                        placeholder="Any special instructions for students..."
                                        value={formData.instructions}
                                        onChange={(e) => updateFormData('instructions', e.target.value)}
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 0 || loading}
                        className="rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={nextStep}
                        disabled={!canProceed() || loading}
                        className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : currentStep === steps.length - 1 ? (
                            <>
                                Create Mock Interview
                                <Check className="w-4 h-4 ml-2" />
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
