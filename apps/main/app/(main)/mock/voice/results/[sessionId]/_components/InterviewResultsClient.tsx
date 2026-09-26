'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    ArrowLeft, Share2, CheckCircle, AlertTriangle,
    TrendingUp, Target, MessageSquare, Trophy, Star
} from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { getSessionDetails } from '@/actions/(main)/mockvoice/session.action'
import { followMockScoring } from '@/actions/(main)/mockvoice/conversation.action'
import { TranscriptPane } from '@repo/ui/components/hiring/transcript-pane'
import type { VoiceTurn } from '@repo/db'
import { ReviewSheet } from '../../../../_components/review-sheet'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface SessionData {
    id: string
    duration: number | null
    createdAt: Date
    status: string
    mock: {
        title: string
        description: string
        level: string
    } | null
    userRating?: number | null
    aiAnalysis?: AIFeedback | null
}

interface AIFeedback {
    overallScore: number
    communication: { score: number; feedback: string }
    technical: { score: number; feedback: string }
    problemSolving: { score: number; feedback: string }
    strengths: string[]
    improvements: string[]
    detailedFeedback: string
}

export default function ResultsPage({
    params
}: {
    params: Promise<{ sessionId: string }>
}) {
    const resolvedParams = use(params)
    const router = useRouter()

    const [sessionData, setSessionData] = useState<SessionData | null>(null)
    const [feedback, setFeedback] = useState<AIFeedback | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
    const [reviewSheetOpen, setReviewSheetOpen] = useState(false)
    const [turns, setTurns] = useState<VoiceTurn[]>([])
    const [notScored, setNotScored] = useState<string | null>(null)

    useEffect(() => {
        async function loadResults() {
            try {
                const result = await getSessionDetails(resolvedParams.sessionId)

                if (!result.success || !result.session) {
                    toast.error('Session not found')
                    router.push('/mock/voice')
                    return
                }

                // Transform session data to match our interface
                const session = result.session
                const transformedSession: SessionData = {
                    id: session.id,
                    duration: session.duration,
                    createdAt: session.createdAt,
                    status: session.status,
                    mock: session.mock ? {
                        title: session.mock.title,
                        description: session.mock.description,
                        level: session.mock.level,
                    } : null,
                    userRating: session.userRating,
                    aiAnalysis: session.aiAnalysis as AIFeedback | null
                }

                setSessionData(transformedSession)

                setTurns((session.turns ?? []) as VoiceTurn[])
                // Check if AI analysis already exists
                if (transformedSession.aiAnalysis) {
                    setFeedback(transformedSession.aiAnalysis)
                } else if (session.provider === 'SARVAM') {
                    // plan/voice VO-10: follow the scoring job until it lands.
                    setIsLoading(false)
                    setIsGeneratingFeedback(true)
                    const until = Date.now() + 6 * 60_000
                    while (Date.now() < until) {
                        const r = await followMockScoring(resolvedParams.sessionId)
                        if (r.state === 'scored') { setFeedback(r.analysis); break }
                        if (r.state === 'not_scored') { setNotScored(r.reason); break }
                        await new Promise((res) => setTimeout(res, 3000))
                    }
                    // Sarvam's transcript replaces the live one once scored.
                    const again = await getSessionDetails(resolvedParams.sessionId)
                    if (again.success && again.session) {
                        setTurns((again.session.turns ?? []) as VoiceTurn[])
                        setSessionData((d) => d ? { ...d, duration: again.session!.duration } : d)
                    }
                    setIsGeneratingFeedback(false)
                }
                // An old ElevenLabs session with no report keeps showing none: its scorer is gone.
            } catch (error) {
                console.error('Error loading results:', error)
                toast.error('Failed to load results')
            } finally {
                setIsLoading(false)
            }
        }

        loadResults()
    }, [resolvedParams.sessionId, router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <InlineLoader size="lg" className="mx-auto mb-4 text-neutral-800 dark:text-neutral-200" />
                    <p className="text-neutral-600 dark:text-neutral-400">Loading your results...</p>
                </div>
            </div>
        )
    }

    const duration = sessionData?.duration || 0
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60

    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
            <div className="container mx-auto px-4 py-8">
                <motion.div
                    className="fixed top-6 right-6 z-50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                >
                    {
                        !sessionData?.userRating && (
                            <motion.div
                                animate={{
                                    scale: [1, 1.05, 1],
                                    boxShadow: [
                                        '0 0 0 0 rgba(251, 191, 36, 0.5)',
                                        '0 0 0 10px rgba(251, 191, 36, 0)',
                                        '0 0 0 0 rgba(251, 191, 36, 0)'
                                    ]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                            >
                                <Button
                                    onClick={() => setReviewSheetOpen(true)}
                                    className="bg-gradient-to-r from-neutral-900 to-neutral-900 hover:from-neutral-800 hover:to-neutral-800 text-white shadow-lg"
                                    size="lg"
                                >
                                    <Star className="w-5 h-5 mr-2" />
                                    Rate This Interview
                                </Button>
                            </motion.div>
                        )
                    }
                    {
                        sessionData?.userRating && (
                            <Button
                                onClick={() => setReviewSheetOpen(true)}
                                variant="outline"
                                className="border-2 border-neutral-300 dark:border-neutral-700"
                                size="lg"
                            >
                                <Star className="w-5 h-5 mr-2 fill-neutral-800 text-neutral-800 dark:text-neutral-200" />
                                Your Rating: {sessionData.userRating}/5
                            </Button>
                        )
                    }
                </motion.div>
                <div className="mb-8">
                    <Link href="/mock/voice">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Mock Interviews
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">Interview Results</h1>
                    <p className="text-neutral-600 dark:text-neutral-400">{sessionData?.mock?.title}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                Overall Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {
                                isGeneratingFeedback ? (
                                    <div className="flex items-center gap-2">
                                        <InlineLoader size="sm" />
                                        <span className="text-sm">Calculating...</span>
                                    </div>
                                ) : (
                                    <div className="text-4xl font-bold text-neutral-800 dark:text-neutral-200">
                                        {feedback?.overallScore || '--'}/100
                                    </div>
                                )
                            }
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                Duration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                minutes
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                Level
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge className="text-lg px-4 py-2">
                                {sessionData?.mock?.level}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>
                {
                    isGeneratingFeedback ? (
                        <Card className="mb-8">
                            <CardContent className="py-12">
                                <div className="text-center">
                                    <InlineLoader size="lg" className="mx-auto mb-4 text-neutral-800 dark:text-neutral-200" />
                                    <h3 className="text-xl font-semibold mb-2">Generating AI Feedback</h3>
                                    <p className="text-neutral-600 dark:text-neutral-400">
                                        Our AI is analyzing your performance. This may take a moment...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : feedback ? (
                        <>
                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle>Performance Breakdown</CardTitle>
                                    <CardDescription>Your scores across key areas</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Communication</span>
                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                                {feedback.communication.score}/100
                                            </span>
                                        </div>
                                        <Progress value={feedback.communication.score} className="mb-2" />
                                        <p className="text-sm text-left text-neutral-600 dark:text-neutral-400">
                                            {feedback.communication.feedback}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Technical Skills</span>
                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                                {feedback.technical.score}/100
                                            </span>
                                        </div>
                                        <Progress value={feedback.technical.score} className="mb-2" />
                                        <p className="text-sm text-left text-neutral-600 dark:text-neutral-400">
                                            {feedback.technical.feedback}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2 gap-4">
                                            <span className="font-medium">Problem Solving</span>
                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                                {feedback.problemSolving.score}/100
                                            </span>
                                        </div>
                                        <Progress value={feedback.problemSolving.score} className="mb-2" />
                                        <p className="text-sm text-left text-neutral-600 dark:text-neutral-400">
                                            {feedback.problemSolving.feedback}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                            <CheckCircle className="w-5 h-5" />
                                            Strengths
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {
                                                feedback.strengths.map((strength: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mt-1 flex-shrink-0" />
                                                        <span className="text-sm">{strength}</span>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                            <TrendingUp className="w-5 h-5" />
                                            Areas for Improvement
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {
                                                feedback.improvements.map((improvement: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mt-1 flex-shrink-0" />
                                                        <span className="text-sm text-left">{improvement}</span>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle>Detailed Feedback</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-neutral-700 text-left dark:text-neutral-300 leading-relaxed">
                                        {feedback.detailedFeedback}
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="mb-8">
                            <CardContent className="py-12 text-center">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-neutral-800 dark:text-neutral-200" />
                                <h3 className="text-xl font-semibold mb-2">Feedback Not Available</h3>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    {notScored
                                        ? `This interview couldn't be scored (${notScored}). Your credits were refunded.`
                                        : "We couldn't generate feedback for this session. Please try again or contact support."}
                                </p>
                            </CardContent>
                        </Card>
                    )
                }
                {turns.length > 0 && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg">Transcript</CardTitle>
                            <CardDescription>What was said, as the scorer read it.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TranscriptPane turns={turns} className="max-h-[32rem]" />
                        </CardContent>
                    </Card>
                )}
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button asChild>
                        <Link href="/mock/voice">
                            Try Another Mock
                        </Link>
                    </Button>
                    <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Results
                    </Button>
                </div>
            </div>
            <ReviewSheet
                isOpen={reviewSheetOpen}
                onClose={() => setReviewSheetOpen(false)}
                sessionId={resolvedParams.sessionId}
                existingRating={sessionData?.userRating}
            />
        </div>
    )
}