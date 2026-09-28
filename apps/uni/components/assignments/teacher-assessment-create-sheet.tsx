'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, ArrowRight, Check, Loader2, Brain, GraduationCap,
    Calendar, Coins, FileText, AlertCircle, Code2, Clock, Zap, Plus, Trash2
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
import { Switch } from '@repo/ui/components/ui/switch'
import toast from '@repo/ui/components/ui/sonner'
import {
    createAssessmentAssignment, addAssessmentQuestions
} from '@/actions/assignments/assessment-assignments.action'
import { 
    getTeacherClasses 
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

interface TeacherAssessmentCreateSheetProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
}

const ASSESSMENT_MODES = [
    { value: 'QUIZ', label: 'Quiz', icon: Brain, description: 'MCQ, True/False, Multi-select', color: 'from-neutral-900 to-neutral-900' },
    { value: 'CODE', label: 'Coding', icon: Code2, description: 'Write code challenges', color: 'from-neutral-900 to-neutral-900' },
    { value: 'MIXED', label: 'Mixed', icon: Zap, description: 'Both quiz and coding', color: 'from-neutral-900 to-pink-500' },
] as const

const DIFFICULTY_LEVELS = [
    { value: 'EASY', label: 'Easy', color: 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30' },
    { value: 'HARD', label: 'Hard', color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
] as const

const LANGUAGES = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C', 'C#',
    'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML/CSS',
    'React', 'Node.js', 'DSA', 'System Design', 'General Programming'
]

type AssessmentMode = typeof ASSESSMENT_MODES[number]['value']
type Difficulty = typeof DIFFICULTY_LEVELS[number]['value']

interface QuestionInput {
    question: string
    type: 'MCQ' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'CODING'
    options: string[]
    correctAnswer: string[]
    explanation: string
}

interface FormData {
    title: string
    description: string
    language: string
    mode: AssessmentMode | undefined
    difficulty: Difficulty | undefined
    questionCount: number
    timeLimit: number // in minutes
    // University-specific
    classIds: string[]
    deadline: string
    credits: number
    instructions: string
    isLiveSession: boolean
    // Questions (for manual entry)
    questions: QuestionInput[]
}

export default function TeacherAssessmentCreateSheet({
    trigger,
    onSuccess,
}: TeacherAssessmentCreateSheetProps) {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState<ClassOption[]>([])
    const [loadingClasses, setLoadingClasses] = useState(false)
    const [questionMode, setQuestionMode] = useState<'manual' | 'ai'>('ai')

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        language: '',
        mode: undefined,
        difficulty: undefined,
        questionCount: 10,
        timeLimit: 30,
        classIds: [],
        deadline: '',
        credits: 5,
        instructions: '',
        isLiveSession: false,
        questions: [],
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
        { id: 'basics', title: 'Basic Info', subtitle: 'Title and type' },
        { id: 'config', title: 'Configuration', subtitle: 'Difficulty and time' },
        { id: 'questions', title: 'Questions', subtitle: 'Add or generate' },
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

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, {
                question: '',
                type: 'MCQ',
                options: ['', '', '', ''],
                correctAnswer: [],
                explanation: '',
            }],
        }))
    }

    const updateQuestion = (index: number, field: keyof QuestionInput, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => 
                i === index ? { ...q, [field]: value } : q
            ),
        }))
    }

    const removeQuestion = (index: number) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
        }))
    }

    const canProceed = () => {
        switch (currentStep) {
            case 0:
                return formData.title.length >= 3 && !!formData.mode && !!formData.language
            case 1:
                return !!formData.difficulty && formData.questionCount >= 1
            case 2:
                if (questionMode === 'ai') return true
                return formData.questions.length > 0 && formData.questions.every(q => 
                    q.question.length > 0 && q.correctAnswer.length > 0
                )
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
            toast.info('Creating assessment...')

            // First create the assessment
            const createResult = await createAssessmentAssignment({
                title: formData.title,
                description: formData.description,
                language: formData.language,
                mode: formData.mode!,
                difficulty: formData.difficulty!,
                questionCount: formData.questionCount,
                timeLimit: formData.timeLimit * 60, // Convert to seconds
                classIds: formData.classIds,
                deadline: formData.deadline ? new Date(formData.deadline) : undefined,
                credits: formData.credits || undefined,
                instructions: formData.instructions || undefined,
                isLiveSession: formData.isLiveSession,
            })

            if (!createResult.success || !createResult.data) {
                toast.error(createResult.error || 'Failed to create assessment')
                setLoading(false)
                return
            }

            // If manual questions were added, save them
            if (questionMode === 'manual' && formData.questions.length > 0) {
                const questionsResult = await addAssessmentQuestions(
                    createResult.data.id,
                    formData.questions.map(q => ({
                        question: q.question,
                        type: q.type,
                        options: q.options.filter(o => o.trim() !== ''),
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                    }))
                )

                if (!questionsResult.success) {
                    toast.error('Assessment created but failed to add questions')
                }
            }

            toast.success('Assessment created successfully!')
            setOpen(false)
            resetForm()
            onSuccess?.()
        } catch (error) {
            console.error('Creation error:', error)
            toast.error('Failed to create assessment. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setCurrentStep(0)
        setQuestionMode('ai')
        setFormData({
            title: '',
            description: '',
            language: '',
            mode: undefined,
            difficulty: undefined,
            questionCount: 10,
            timeLimit: 30,
            classIds: [],
            deadline: '',
            credits: 5,
            instructions: '',
            isLiveSession: false,
            questions: [],
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
                        <Brain className="w-4 h-4 mr-2" />
                        Create Assessment
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xl">Create Assessment</span>
                            <SheetDescription className="text-left">
                                Create quizzes and coding challenges for students
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
                                    <Label htmlFor="title">Assessment Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., JavaScript Fundamentals Quiz"
                                        value={formData.title}
                                        onChange={(e) => updateFormData('title', e.target.value)}
                                        className="mt-1.5"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe what this assessment covers..."
                                        value={formData.description}
                                        onChange={(e) => updateFormData('description', e.target.value)}
                                        className="mt-1.5"
                                    />
                                </div>

                                <div>
                                    <Label className="mb-3 block">Assessment Type *</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {ASSESSMENT_MODES.map((mode) => {
                                            const Icon = mode.icon
                                            return (
                                                <button
                                                    key={mode.value}
                                                    type="button"
                                                    onClick={() => updateFormData('mode', mode.value)}
                                                    className={cn(
                                                        "p-4 rounded-xl border text-center transition-all",
                                                        formData.mode === mode.value
                                                            ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center",
                                                        `bg-gradient-to-br ${mode.color}`
                                                    )}>
                                                        <Icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="font-medium text-sm">{mode.label}</div>
                                                    <div className="text-xs text-neutral-500 mt-0.5">{mode.description}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="language">Topic / Language *</Label>
                                    <Select value={formData.language} onValueChange={(__v) => updateFormData('language', __v)}>
                                        <SelectTrigger id="language" className="mt-1.5 w-full p-2 rounded-xl">
                                            <SelectValue placeholder="Select a topic..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LANGUAGES.map((lang) => (
                                                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Configuration */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="mb-3 block">Difficulty Level *</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {DIFFICULTY_LEVELS.map((level) => (
                                            <button
                                                key={level.value}
                                                type="button"
                                                onClick={() => updateFormData('difficulty', level.value)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-center transition-all",
                                                    formData.difficulty === level.value
                                                        ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                )}
                                            >
                                                <span className={cn("font-medium", level.color.split(' ')[0])}>
                                                    {level.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="questionCount">Number of Questions</Label>
                                        <Input
                                            id="questionCount"
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={formData.questionCount}
                                            onChange={(e) => updateFormData('questionCount', parseInt(e.target.value) || 10)}
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="timeLimit" className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Time Limit (minutes)
                                        </Label>
                                        <Input
                                            id="timeLimit"
                                            type="number"
                                            min={5}
                                            max={180}
                                            value={formData.timeLimit}
                                            onChange={(e) => updateFormData('timeLimit', parseInt(e.target.value) || 30)}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>

                                <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-neutral-900 dark:text-neutral-800 flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                Live Session Mode
                                            </h4>
                                            <p className="text-sm text-neutral-700 dark:text-neutral-100 mt-1">
                                                Enable for in-class surprise tests with real-time monitoring
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.isLiveSession}
                                            onCheckedChange={(checked) => updateFormData('isLiveSession', checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Questions */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        type="button"
                                        variant={questionMode === 'ai' ? 'default' : 'outline'}
                                        onClick={() => setQuestionMode('ai')}
                                        className="flex-1 rounded-xl"
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        AI Generate
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={questionMode === 'manual' ? 'default' : 'outline'}
                                        onClick={() => setQuestionMode('manual')}
                                        className="flex-1 rounded-xl"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Add Manually
                                    </Button>
                                </div>

                                {questionMode === 'ai' ? (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center">
                                        <Zap className="w-10 h-10 text-neutral-900 mx-auto mb-3" />
                                        <h4 className="font-medium text-neutral-900 dark:text-neutral-800">
                                            AI Question Generation
                                        </h4>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-100 mt-2">
                                            Questions will be automatically generated based on your selected topic ({formData.language}), 
                                            difficulty ({formData.difficulty}), and mode ({formData.mode}).
                                        </p>
                                        <p className="text-xs text-neutral-800 dark:text-neutral-100 mt-3">
                                            {formData.questionCount} questions will be generated when you create the assessment.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Questions ({formData.questions.length})</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={addQuestion}
                                                className="rounded-lg"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Add Question
                                            </Button>
                                        </div>

                                        {formData.questions.length === 0 ? (
                                            <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
                                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>No questions added yet</p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={addQuestion}
                                                    className="mt-2 rounded-lg"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add First Question
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto">
                                                {formData.questions.map((q, idx) => (
                                                    <div key={idx} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                                                        <div className="flex items-start justify-between gap-2 mb-3">
                                                            <span className="text-sm font-medium">Question {idx + 1}</span>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => removeQuestion(idx)}
                                                                className="h-8 w-8 p-0 text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <Textarea
                                                            placeholder="Enter your question..."
                                                            value={q.question}
                                                            onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                                                            className="mb-2"
                                                        />
                                                        <Select value={q.type} onValueChange={(__v) => updateQuestion(idx, 'type', __v)}>
                                                            <SelectTrigger className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 mb-2">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                                                                <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                                                                <SelectItem value="MULTI_SELECT">Multi-Select</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {q.type !== 'TRUE_FALSE' && (
                                                            <div className="space-y-2">
                                                                {q.options.map((opt, optIdx) => (
                                                                    <div key={optIdx} className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={q.correctAnswer.includes(opt)}
                                                                            onCheckedChange={(checked) => {
                                                                                const newCorrect = checked
                                                                                    ? [...q.correctAnswer, opt]
                                                                                    : q.correctAnswer.filter(a => a !== opt)
                                                                                updateQuestion(idx, 'correctAnswer', newCorrect)
                                                                            }}
                                                                        />
                                                                        <Input
                                                                            placeholder={`Option ${optIdx + 1}`}
                                                                            value={opt}
                                                                            onChange={(e) => {
                                                                                const newOptions = [...q.options]
                                                                                newOptions[optIdx] = e.target.value
                                                                                updateQuestion(idx, 'options', newOptions)
                                                                            }}
                                                                            className="flex-1 min-w-0"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {q.type === 'TRUE_FALSE' && (
                                                            <div className="flex gap-4">
                                                                <label className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={q.correctAnswer.includes('true')}
                                                                        onCheckedChange={(checked) => 
                                                                            updateQuestion(idx, 'correctAnswer', checked ? ['true'] : [])
                                                                        }
                                                                    />
                                                                    True
                                                                </label>
                                                                <label className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={q.correctAnswer.includes('false')}
                                                                        onCheckedChange={(checked) => 
                                                                            updateQuestion(idx, 'correctAnswer', checked ? ['false'] : [])
                                                                        }
                                                                    />
                                                                    False
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                                    <div className="flex-1 min-w-0">
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
                                Create Assessment
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
