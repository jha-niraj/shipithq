'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Calendar, Clock, CheckCircle2, AlertCircle, Trophy, X
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { Badge } from '@repo/ui/components/ui/badge'
import toast from '@repo/ui/components/ui/sonner'
import {
    checkStandupConfig, createStandupConfig
} from '@/actions/(main)/projects/standup.action'
import { Label } from '@repo/ui/components/ui/label'
import { Slider } from '@repo/ui/components/ui/slider'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface DailyStandupSheetProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    projectSlug: string
    projectTitle: string
    userCredits: number
    hasStarted: boolean
}

const DAYS = [
    { value: 0, label: 'Sun', full: 'Sunday' },
    { value: 1, label: 'Mon', full: 'Monday' },
    { value: 2, label: 'Tue', full: 'Tuesday' },
    { value: 3, label: 'Wed', full: 'Wednesday' },
    { value: 4, label: 'Thu', full: 'Thursday' },
    { value: 5, label: 'Fri', full: 'Friday' },
    { value: 6, label: 'Sat', full: 'Saturday' },
]

interface StandupConfig {
    daysPerWeek: number;
    standupTime: string;
    durationMinutes: number;
    selectedDays: number[];
    completedStandups?: number;
    totalStandups?: number;
}

/**
 * Whether the paid standup configuration is offered.
 *
 * A flag rather than deleted code: the scheduling half works, and the reason it
 * is off is that the submission screen does not exist yet. Flip this and the
 * copy in `daily-standup-tab.tsx` when it does.
 */
const STANDUPS_FOR_SALE = false

export default function DailyStandupSheet({
    isOpen,
    onClose,
    projectId,
    projectSlug,
    projectTitle,
    userCredits,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasStarted
}: DailyStandupSheetProps) {
    const [isChecking, setIsChecking] = useState(true)
    const [hasConfig, setHasConfig] = useState(false)
    const [config, setConfig] = useState<StandupConfig | null>(null)

    // Configuration state
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
    const [standupTime, setStandupTime] = useState('09:00')
    const [durationMinutes, setDurationMinutes] = useState(10)
    const [isCreating, setIsCreating] = useState(false)

    const checkConfig = useCallback(async () => {
        setIsChecking(true)
        try {
            const result = await checkStandupConfig(projectId)
            if (result.success && result.data) {
                setHasConfig(result.data.exists)
                setConfig(result.data.config)
            }
        } catch (error) {
            console.error('Error checking config:', error)
        } finally {
            setIsChecking(false)
        }
    }, [projectId]);

    useEffect(() => {
        if (isOpen) {
            checkConfig()
        }
    }, [isOpen, checkConfig])

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            if (selectedDays.length > 4) {
                setSelectedDays(selectedDays.filter(d => d !== day))
            } else {
                toast.error('You must select at least 4 days per week')
            }
        } else {
            if (selectedDays.length < 7) {
                setSelectedDays([...selectedDays, day].sort())
            }
        }
    }

    const handleCreateConfig = async () => {
        if (selectedDays.length < 4) {
            toast.error('Please select at least 4 days per week')
            return
        }

        const weeklyCredits = selectedDays.length * 5
        if (userCredits < weeklyCredits) {
            toast.error(`Insufficient credits. You need ${weeklyCredits} credits for this week.`)
            return
        }

        setIsCreating(true)
        try {
            const result = await createStandupConfig({
                projectId,
                projectSlug,
                daysPerWeek: selectedDays.length,
                standupTime,
                durationMinutes,
                selectedDays
            })

            if (result.success) {
                toast.success('Daily Standup configured successfully!', {
                    description: `${weeklyCredits} credits deducted for this week`
                })
                setHasConfig(true)
                setConfig(result.data)
            } else {
                toast.error(result.error || 'Failed to configure standup')
            }
        } catch (error) {
            toast.error('Something went wrong: ' + error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleSkipStandup = () => {
        toast.info('You can set up Daily Standup anytime from the project page')
        onClose()
    }

    const weeklyCredits = selectedDays.length * 5

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-2xl">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />
                            <SheetTitle className="text-2xl">Daily Standup</SheetTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <SheetDescription>
                        Build professional habits with daily progress tracking for {projectTitle}
                    </SheetDescription>
                </SheetHeader>

                {
                    /*
                     * NOT FOR SALE YET (Niraj, 2026-09-23).
                     *
                     * This sheet charged 5 credits a day - 20 to 35 for a week -
                     * and the screen it unlocked says "the submission interface is
                     * being built". We were taking money for a feature that does
                     * not exist. The configure-and-pay form below is left intact
                     * and unreachable; when submissions ship, delete this branch
                     * and it comes back.
                     */
                    STANDUPS_FOR_SALE === false && !hasConfig ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Daily standups are not ready yet.</h3>
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                Scheduling works, but there is nowhere to submit one, so there is nothing worth charging
                                for. It will open here when the submission screen lands.
                            </p>
                        </div>
                    ) : isChecking ? (
                        <div className="flex items-center justify-center py-12">
                            <InlineLoader size="lg" className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                    ) : hasConfig && config ? (
                        <div className="space-y-6">
                            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                            Daily Standup Active
                                        </h3>
                                        <p className="text-sm text-neutral-800 dark:text-neutral-200">
                                            Your standup is configured and ready to go!
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Days per Week</p>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                        {config.daysPerWeek}
                                    </p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Time</p>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                        {config.standupTime}
                                    </p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Duration</p>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                        {config.durationMinutes} min
                                    </p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Completed</p>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                        {config.completedStandups}/{config.totalStandups}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Selected Days</h3>
                                <div className="flex flex-wrap gap-2">
                                    {
                                        DAYS.map(day => (
                                            <Badge
                                                key={day.value}
                                                variant={config.selectedDays.includes(day.value) ? 'default' : 'outline'}
                                                className="px-3 py-1"
                                            >
                                                {day.label}
                                            </Badge>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-lg p-4">
                                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                    📝 Standup submissions will be available here soon!
                                </h4>
                                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                                    The submission interface is being built. You&apos;ll be able to submit your daily standups directly from here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-lg p-4">
                                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                                    🚀 Build Professional Habits
                                </h3>
                                <p className="text-sm text-neutral-800 dark:text-neutral-200 mb-3">
                                    Daily standups help you stay accountable, track progress, and develop habits used in real software teams.
                                </p>
                                <ul className="space-y-1 text-sm text-neutral-800 dark:text-neutral-200">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Share what you worked on yesterday</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Plan what you&apos;ll work on today</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Identify blockers early</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <label className="block font-semibold text-neutral-900 dark:text-white mb-3">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    Select Days (minimum 4)
                                </label>
                                <div className="grid grid-cols-7 gap-2">
                                    {
                                        DAYS.map(day => (
                                            <button
                                                key={day.value}
                                                onClick={() => toggleDay(day.value)}
                                                className={`
                                            p-3 rounded-lg border-2 transition-all
                                            ${selectedDays.includes(day.value)
                                                        ? 'border-neutral-800 bg-neutral-50 dark:bg-neutral-800/20'
                                                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                                                    }
                                        `}
                                            >
                                                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                    {day.label}
                                                </div>
                                                {
                                                    selectedDays.includes(day.value) && (
                                                        <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mx-auto mt-1" />
                                                    )
                                                }
                                            </button>
                                        ))
                                    }
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                    {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
                                </p>
                            </div>
                            <div>
                                <Label className="block font-semibold text-neutral-900 dark:text-white mb-3">
                                    <Clock className="w-4 h-4 inline mr-2" />
                                    Preferred Time
                                </Label>
                                <input
                                    type="time"
                                    value={standupTime}
                                    onChange={(e) => setStandupTime(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                                />
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                    Choose a time that works best for you
                                </p>
                            </div>
                            <div>
                                <Label className="block font-semibold text-neutral-900 dark:text-white mb-3">
                                    Duration: {durationMinutes} minutes
                                </Label>
                                <Slider
                                    min={5}
                                    max={10}
                                    step={1}
                                    value={[durationMinutes]}
                                    onValueChange={([v]) => setDurationMinutes(v ?? 5)}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    <span>5 min</span>
                                    <span>10 min</span>
                                </div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                        Weekly Cost
                                    </span>
                                    <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                                        {weeklyCredits} credits
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                                    {selectedDays.length} days × 5 credits/day = {weeklyCredits} credits/week
                                </p>
                                <p className="text-xs text-neutral-700 dark:text-neutral-100 mt-2">
                                    💡 You&apos;ll need to renew each week to continue
                                </p>
                            </div>

                            {
                                userCredits < weeklyCredits && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                                                    Insufficient Credits
                                                </p>
                                                <p className="text-sm text-red-800 dark:text-red-200">
                                                    You have {userCredits} credits but need {weeklyCredits} credits for this configuration.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                <Button
                                    onClick={handleCreateConfig}
                                    disabled={isCreating || userCredits < weeklyCredits}
                                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white gap-2"
                                >
                                    {
                                        isCreating ? (
                                            <>
                                                <InlineLoader size="sm" />
                                                Setting up...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Start Daily Standup ({weeklyCredits} credits)
                                            </>
                                        )
                                    }
                                </Button>
                                <Button
                                    onClick={handleSkipStandup}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Skip for Now
                                </Button>
                            </div>
                        </div>
                    )
                }
            </SheetContent>
        </Sheet>
    )
}