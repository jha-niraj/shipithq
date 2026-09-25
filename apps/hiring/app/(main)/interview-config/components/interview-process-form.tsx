"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Trash2, GripVertical, Mic, ChevronDown, ChevronUp,
    Save
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Switch } from "@repo/ui/components/ui/switch"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
    createInterviewProcess, InterviewRoundInput, InterviewProcessInput
} from "@/actions/interview-config"
import type { InterviewRoundType, InterviewFormat } from "@/types"

// Template data interface for pre-filling
export interface TemplateRound {
    roundType: string
    title: string
    durationMinutes: number
    format: string
    description: string
}

export interface ProcessTemplate {
    name: string
    description: string
    estimatedDurationWeeks: number
    rounds: TemplateRound[]
}

interface InterviewProcessFormProps {
    onClose: () => void
    initialTemplate?: ProcessTemplate | null
}

const roundTypes = [
    { value: "PHONE_SCREEN", label: "Phone Screen", description: "Initial screening call" },
    { value: "TECHNICAL_CODING", label: "Technical Coding", description: "Live coding or algorithm problems" },
    { value: "SYSTEM_DESIGN", label: "System Design", description: "Architecture & design discussion" },
    { value: "BEHAVIORAL", label: "Behavioral", description: "STAR format questions" },
    { value: "TAKE_HOME", label: "Take Home", description: "Assignment to complete offline" },
    { value: "PANEL", label: "Panel Interview", description: "Multiple interviewers" },
    { value: "HIRING_MANAGER", label: "Hiring Manager", description: "Final decision maker round" },
    { value: "CULTURE_FIT", label: "Culture Fit", description: "Team & values alignment" },
    { value: "HR_FINAL", label: "HR Final", description: "Offer discussion & logistics" },
    { value: "CUSTOM", label: "Custom", description: "Other type of round" },
]

const interviewFormats = [
    { value: "VOICE", label: "Phone Call" },
    { value: "VIDEO", label: "Video Call" },
    { value: "IN_PERSON", label: "In Person" },
    { value: "TAKE_HOME", label: "Take Home Assignment" },
    { value: "LIVE_CODING", label: "Live Coding" },
    { value: "WHITEBOARD", label: "Whiteboard" },
]

interface RoundFormData extends InterviewRoundInput {
    isExpanded: boolean
}

const getDefaultRound = (): RoundFormData => ({
    roundNumber: 1,
    roundType: "PHONE_SCREEN",
    title: "Phone Screen",
    durationMinutes: 30,
    format: "VOICE",
    description: "Initial screening call to discuss your background and the role.",
    hasMockInterview: true,
    isExpanded: true
})

export function InterviewProcessForm({ onClose, initialTemplate }: InterviewProcessFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [processData, setProcessData] = useState({
        name: initialTemplate?.name || "",
        description: initialTemplate?.description || "",
        isDefault: true,
        estimatedDurationWeeks: initialTemplate?.estimatedDurationWeeks || 2
    })

    const [rounds, setRounds] = useState<RoundFormData[]>(() => {
        if (initialTemplate?.rounds && initialTemplate.rounds.length > 0) {
            return initialTemplate.rounds.map((round, index) => ({
                roundNumber: index + 1,
                roundType: round.roundType as InterviewRoundType,
                title: round.title,
                durationMinutes: round.durationMinutes,
                format: round.format as InterviewFormat,
                description: round.description,
                hasMockInterview: true,
                isExpanded: index === 0 // Only first round expanded
            }))
        }
        return [getDefaultRound()]
    })

    // Update form when template changes
    useEffect(() => {
        if (initialTemplate) {
            setProcessData({
                name: initialTemplate.name,
                description: initialTemplate.description,
                isDefault: true,
                estimatedDurationWeeks: initialTemplate.estimatedDurationWeeks
            })

            if (initialTemplate.rounds && initialTemplate.rounds.length > 0) {
                setRounds(initialTemplate.rounds.map((round, index) => ({
                    roundNumber: index + 1,
                    roundType: round.roundType as InterviewRoundType,
                    title: round.title,
                    durationMinutes: round.durationMinutes,
                    format: round.format as InterviewFormat,
                    description: round.description,
                    hasMockInterview: true,
                    isExpanded: index === 0
                })))
            }
        }
    }, [initialTemplate])

    const addRound = () => {
        const newRoundNumber = rounds.length + 1
        setRounds([
            ...rounds,
            {
                roundNumber: newRoundNumber,
                roundType: "TECHNICAL_CODING",
                title: `Round ${newRoundNumber}`,
                durationMinutes: 60,
                format: "VIDEO",
                description: "",
                hasMockInterview: true,
                isExpanded: true
            }
        ])
    }

    const removeRound = (index: number) => {
        const newRounds = rounds.filter((_, i) => i !== index)
        // Renumber rounds
        setRounds(newRounds.map((r, i) => ({ ...r, roundNumber: i + 1 })))
    }

    const updateRound = (index: number, updates: Partial<RoundFormData>) => {
        setRounds(prev => prev.map((r, i) =>
            i === index ? { ...r, ...updates } : r
        ))
    }

    const toggleRoundExpand = (index: number) => {
        setRounds(prev => prev.map((r, i) =>
            i === index ? { ...r, isExpanded: !r.isExpanded } : r
        ))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError(null)

        try {
            const input: InterviewProcessInput = {
                name: processData.name,
                description: processData.description,
                isDefault: processData.isDefault,
                estimatedDurationWeeks: processData.estimatedDurationWeeks,
                 
                rounds: rounds.map(({ isExpanded: _isExpanded, ...round }) => round)
            }

            const result = await createInterviewProcess(input)

            if (result.success) {
                router.refresh()
                onClose()
            } else {
                setError(result.error || "Failed to create interview process")
            }
        } catch (err: unknown) {
            setError("An unexpected error occurred")
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Process Name *</Label>
                    <Input
                        id="name"
                        placeholder="e.g., Software Engineer Interview"
                        value={processData.name}
                        onChange={(e) => setProcessData({ ...processData, name: e.target.value })}
                        className="mt-1.5 rounded-xl"
                    />
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Describe the overall interview process..."
                        value={processData.description}
                        onChange={(e) => setProcessData({ ...processData, description: e.target.value })}
                        className="mt-1.5 rounded-xl min-h-[80px]"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Label htmlFor="duration">Estimated Duration (weeks)</Label>
                        <Input
                            id="duration"
                            type="number"
                            min={1}
                            max={12}
                            value={processData.estimatedDurationWeeks}
                            onChange={(e) => setProcessData({ ...processData, estimatedDurationWeeks: parseInt(e.target.value) || 2 })}
                            className="mt-1.5 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                        <Switch
                            id="default"
                            checked={processData.isDefault}
                            onCheckedChange={(checked) => setProcessData({ ...processData, isDefault: checked })}
                        />
                        <Label htmlFor="default" className="cursor-pointer">Set as default</Label>
                    </div>
                </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800" />

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Interview Rounds
                    </h3>
                    <Button variant="outline" size="sm" onClick={addRound} className="rounded-xl">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Round
                    </Button>
                </div>
                <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                        {
                            rounds.map((round, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden"
                                >
                                    <div
                                        className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-900/50 cursor-pointer"
                                        onClick={() => toggleRoundExpand(index)}
                                    >
                                        <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab" />
                                        <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                            <span className="text-sm font-bold text-white dark:text-neutral-900">
                                                {round.roundNumber}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-neutral-900 dark:text-white">
                                                {round.title || `Round ${round.roundNumber}`}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {roundTypes.find(t => t.value === round.roundType)?.label}
                                                {round.durationMinutes && ` • ${round.durationMinutes} min`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {
                                                round.hasMockInterview && (
                                                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100 text-xs">
                                                        <Mic className="w-3 h-3" />
                                                        Mock
                                                    </div>
                                                )
                                            }
                                            {
                                                rounds.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => { e.stopPropagation(); removeRound(index) }}
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )
                                            }
                                            {
                                                round.isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                                                )
                                            }
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {
                                            round.isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="p-4 space-y-4 border-t border-neutral-200 dark:border-neutral-800"
                                                >
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Round Type *</Label>
                                                            <Select
                                                                value={round.roundType}
                                                                onValueChange={(value) => {
                                                                    const type = roundTypes.find(t => t.value === value)
                                                                    updateRound(index, {
                                                                        roundType: value as InterviewRoundType,
                                                                        title: type?.label || round.title
                                                                    })
                                                                }}
                                                            >
                                                                <SelectTrigger className="mt-1.5 rounded-xl">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {
                                                                        roundTypes.map((type) => (
                                                                            <SelectItem key={type.value} value={type.value}>
                                                                                <div>
                                                                                    <p>{type.label}</p>
                                                                                    <p className="text-xs text-neutral-500">{type.description}</p>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label>Title *</Label>
                                                            <Input
                                                                value={round.title}
                                                                onChange={(e) => updateRound(index, { title: e.target.value })}
                                                                placeholder="e.g., Technical Coding Round"
                                                                className="mt-1.5 rounded-xl"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Format</Label>
                                                            <Select
                                                                value={round.format}
                                                                onValueChange={(value) => updateRound(index, { format: value as InterviewFormat })}
                                                            >
                                                                <SelectTrigger className="mt-1.5 rounded-xl">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {
                                                                        interviewFormats.map((format) => (
                                                                            <SelectItem key={format.value} value={format.value}>
                                                                                {format.label}
                                                                            </SelectItem>
                                                                        ))
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label>Duration (minutes)</Label>
                                                            <Input
                                                                type="number"
                                                                min={15}
                                                                max={240}
                                                                value={round.durationMinutes || ""}
                                                                onChange={(e) => updateRound(index, { durationMinutes: parseInt(e.target.value) || undefined })}
                                                                placeholder="60"
                                                                className="mt-1.5 rounded-xl"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label>Description for Candidates *</Label>
                                                        <Textarea
                                                            value={round.description}
                                                            onChange={(e) => updateRound(index, { description: e.target.value })}
                                                            placeholder="What should candidates expect in this round?"
                                                            className="mt-1.5 rounded-xl min-h-[100px]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900">
                                                        <Switch
                                                            id={`mock-${index}`}
                                                            checked={round.hasMockInterview}
                                                            onCheckedChange={(checked) => updateRound(index, { hasMockInterview: checked })}
                                                        />
                                                        <div className="flex-1">
                                                            <Label htmlFor={`mock-${index}`} className="cursor-pointer">
                                                                Enable AI Mock Interview
                                                            </Label>
                                                            <p className="text-xs text-neutral-500">
                                                                Candidates can practice for this round with an AI interviewer
                                                            </p>
                                                        </div>
                                                        <Mic className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                    </div>
                                                </motion.div>
                                            )
                                        }
                                    </AnimatePresence>
                                </motion.div>
                            ))
                        }
                    </div>
                </AnimatePresence>
            </div>

            {
                error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )
            }

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl"
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !processData.name || rounds.some(r => !r.title || !r.description)}
                    className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                    {
                        isSubmitting ? (
                            <>
                                <InlineLoader size="sm" className="mr-2" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Create Process
                            </>
                        )
                    }
                </Button>
            </div>
        </div>
    )
}