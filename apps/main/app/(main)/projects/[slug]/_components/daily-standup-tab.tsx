'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Calendar, Clock, CheckCircle2, AlertCircle, Trophy, Play,
    Mic, Timer
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { Label } from '@repo/ui/components/ui/label'
import { toast } from '@repo/ui/components/ui/sonner'
import {
    checkStandupConfig, createStandupConfig, getUpcomingStandups
} from '@/actions/(main)/projects/standup.action'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { Slider } from '@repo/ui/components/ui/slider'
import { LiveInterview } from '@/components/voice/live-interview'
import { handInStandup } from '@/actions/(main)/projects/standup-voice.action'
import { awaitBackgroundJob } from '@/hooks/use-background-job'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface DailyStandupTabProps {
    projectId: string
    projectSlug: string
    projectTitle: string
    userCredits: number
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
    daysPerWeek: number
    standupTime: string
    durationMinutes: number
    selectedDays: number[]
    completedStandups?: number
    totalStandups?: number
}

interface StandupEntry {
    id: string
    scheduledFor: Date
    status: 'SCHEDULED' | 'SUBMITTED' | 'MISSED'
    whatDidYesterday?: string
    whatDoingToday?: string
    anyBlockers?: string
}

// Mirrors `daily-standup-sheet.tsx`. Flip both together.
const STANDUPS_FOR_SALE = false

export default function DailyStandupTab({
    projectId,
    projectSlug,
    projectTitle,
    userCredits,
}: DailyStandupTabProps) {
    const [isChecking, setIsChecking] = useState(true)
    const [hasConfig, setHasConfig] = useState(false)
    const [config, setConfig] = useState<StandupConfig | null>(null)
    const [upcomingStandups, setUpcomingStandups] = useState<StandupEntry[]>([])
    const [activeStandup, setActiveStandup] = useState<StandupEntry | null>(null)

    // Configuration state
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
    const [standupTime, setStandupTime] = useState('09:00')
    const [durationMinutes, setDurationMinutes] = useState(10)
    const [isCreating, setIsCreating] = useState(false)

    // The standup being processed after hand-in (plan/voice VO-12).
    const [processing, setProcessing] = useState(false)

    const checkConfig = useCallback(async () => {
        setIsChecking(true)
        try {
            const result = await checkStandupConfig(projectId)
            if (result.success && result.data) {
                setHasConfig(result.data.exists)
                setConfig(result.data.config)

                // If config exists, fetch upcoming standups
                if (result.data.exists) {
                    const standupResult = await getUpcomingStandups(projectId)
                    if (standupResult.success && standupResult.data) {
                        setUpcomingStandups(standupResult.data.upcomingStandups || [])
                    }
                }
            }
        } catch (error) {
            console.error('Error checking config:', error)
        } finally {
            setIsChecking(false)
        }
    }, [projectId])

    useEffect(() => {
        checkConfig()
    }, [checkConfig])

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
                checkConfig() // Refresh to get upcoming standups
            } else {
                toast.error(result.error || 'Failed to configure standup')
            }
        } catch (error) {
            toast.error('Something went wrong: ' + error)
        } finally {
            setIsCreating(false)
        }
    }

    // Handed in: the worker reads what was said and fills in the entry.
    const handleHandIn = async () => {
        if (!activeStandup) return
        setProcessing(true)
        const started = await handInStandup(activeStandup.id, projectSlug)
        if (!started.success || !started.jobId) {
            toast.error(started.error ?? 'Could not save the standup')
            setProcessing(false)
            return
        }
        const outcome = await awaitBackgroundJob(started.jobId)
        setProcessing(false)
        if (outcome.ok) toast.success('Standup saved')
        else toast.error(outcome.error)
        setActiveStandup(null)
        checkConfig()
    }

    const weeklyCredits = selectedDays.length * 5

    if (isChecking) {
        return (
            <div className="flex items-center justify-center py-16">
                <InlineLoader size="lg" className="text-neutral-600 dark:text-neutral-400" />
            </div>
        )
    }

    // Active standup voice session view
    if (activeStandup) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto py-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                            Daily Standup
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {new Date(activeStandup.scheduledFor).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveStandup(null)}
                        size="sm"
                    >
                        Cancel
                    </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    {processing ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-700 dark:text-neutral-300">
                            <InlineLoader size="md" /> Reading your standup
                        </div>
                    ) : (
                        <LiveInterview
                            voiceRef={{ kind: 'standup', id: activeStandup.id }}
                            title={`Daily standup: ${projectTitle}`}
                            allows={{ voice: true, typed: true }}
                            initial={{ mode: null, consented: false, turns: [] }}
                            ending={false}
                            onHandIn={handleHandIn}
                        />
                    )}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Tips for a Great Standup
                    </h4>
                    <ul className="text-sm text-neutral-800 dark:text-neutral-200 space-y-1">
                        <li>• Be specific about what you worked on</li>
                        <li>• Mention any challenges or blockers</li>
                        <li>• Keep it concise (2-3 minutes)</li>
                    </ul>
                </div>
            </div>
        )
    }

    // Has config - show status and upcoming standups
    if (hasConfig && config) {
        const todayEntry = upcomingStandups.find(s => {
            const scheduledDate = new Date(s.scheduledFor)
            const today = new Date()
            return scheduledDate.toDateString() === today.toDateString() && s.status === 'SCHEDULED'
        })

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-neutral-50 to-neutral-50 dark:from-neutral-900/20 dark:to-neutral-900/20 border border-neutral-200 dark:border-neutral-800/30 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800/30 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                Daily Standup Active
                            </h3>
                            <p className="text-sm text-neutral-800 dark:text-neutral-200">
                                Your voice standup schedule for {projectTitle} is active.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick stats */}
                <StatBand
                    size="sm"
                    cols={4}
                    items={[
                        { icon: Calendar, label: "Days/Week", value: config.daysPerWeek },
                        { icon: Clock, label: "Time", value: config.standupTime },
                        { icon: Timer, label: "Duration", value: `${config.durationMinutes}min` },
                        { icon: CheckCircle2, label: "Completed", value: `${config.completedStandups || 0}/${config.totalStandups || 0}` },
                    ]}
                />

                {/* Selected days */}
                <div>
                    <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-3 text-sm">
                        Scheduled Days
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => (
                            <Badge
                                key={day.value}
                                variant={config.selectedDays.includes(day.value) ? 'default' : 'outline'}
                                className={cn(
                                    "px-3 py-1",
                                    config.selectedDays.includes(day.value)
                                        ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800"
                                        : "opacity-50"
                                )}
                            >
                                {day.label}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Today's standup or upcoming */}
                {todayEntry ? (
                    <div className="bg-gradient-to-r from-neutral-50 to-neutral-50 dark:from-neutral-900/20 dark:to-neutral-900/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-800/30 rounded-lg">
                                    <Mic className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                        Today&apos;s Voice Standup Ready
                                    </h4>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-100">
                                        Share your daily progress via voice
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setActiveStandup(todayEntry)}
                                className="bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Start Voice Standup
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                <Clock className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-700 dark:text-neutral-300">
                                    No Standup Scheduled Today
                                </h4>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Your next standup is on a scheduled day
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upcoming standups list */}
                {upcomingStandups.length > 0 && (
                    <div>
                        <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-3 text-sm">
                            Upcoming Standups
                        </h4>
                        <div className="space-y-2">
                            {upcomingStandups.slice(0, 5).map(standup => (
                                <div
                                    key={standup.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        standup.status === 'SUBMITTED'
                                            ? "bg-neutral-50/50 dark:bg-neutral-900/10 border-neutral-200 dark:border-neutral-800/30"
                                            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {standup.status === 'SUBMITTED' ? (
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                        ) : (
                                            <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                        )}
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                            {new Date(standup.scheduledFor).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-xs",
                                            standup.status === 'SUBMITTED'
                                                ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                        )}
                                    >
                                        {standup.status === 'SUBMITTED' ? 'Completed' : 'Scheduled'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    /*
     * NOT FOR SALE YET (Niraj, 2026-09-23). Same reason as the sheet: this
     * charges 5 credits a day and the standup it schedules has nowhere to be
     * submitted. The setup form below is intact and unreachable until the
     * submission screen ships.
     */
    if (!STANDUPS_FOR_SALE) {
        return (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Daily standups are not ready yet.</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Scheduling works, but there is nowhere to submit one, so there is nothing worth charging for.
                    It will open here when the submission screen lands.
                </p>
            </div>
        )
    }

    // No config - show setup UI
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30 rounded-2xl flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-neutral-800 dark:text-neutral-100" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    Voice Daily Standup
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                    Build professional habits with AI-powered voice standups
                </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-xl p-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    🎙️ Voice-Powered Standups
                </h3>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 mb-3">
                    Practice real-world standup meetings with our AI interviewer. Just like in a real team!
                </p>
                <ul className="space-y-1 text-sm text-neutral-800 dark:text-neutral-200">
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Talk through what you worked on yesterday</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Discuss your plans for today</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Identify and communicate blockers</span>
                    </li>
                </ul>
            </div>

            {/* Day selection */}
            <div>
                <label className="block font-semibold text-neutral-900 dark:text-white mb-3">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Select Days (minimum 4)
                </label>
                <div className="grid grid-cols-7 gap-2">
                    {DAYS.map(day => (
                        <button
                            key={day.value}
                            onClick={() => toggleDay(day.value)}
                            className={cn(
                                "p-3 rounded-lg border-2 transition-all",
                                selectedDays.includes(day.value)
                                    ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                            )}
                        >
                            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                {day.label}
                            </div>
                            {selectedDays.includes(day.value) && (
                                <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mx-auto mt-1" />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
                </p>
            </div>

            {/* Time selection */}
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
            </div>

            {/* Duration selection */}
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

            {/* Cost display */}
            <div className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-xl p-4">
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
            </div>

            {userCredits < weeklyCredits && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                                Insufficient Credits
                            </p>
                            <p className="text-sm text-red-800 dark:text-red-200">
                                You have {userCredits} credits but need {weeklyCredits} credits.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Button
                onClick={handleCreateConfig}
                disabled={isCreating || userCredits < weeklyCredits}
                className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white gap-2"
            >
                {isCreating ? (
                    <>
                        <InlineLoader size="sm" />
                        Setting up...
                    </>
                ) : (
                    <>
                        <Mic className="w-4 h-4" />
                        Start Voice Standups ({weeklyCredits} credits)
                    </>
                )}
            </Button>
        </div>
    )
}
