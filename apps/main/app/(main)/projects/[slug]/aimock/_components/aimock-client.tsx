"use client"

import { StatBand } from "@repo/ui/components/ui/stat-band"
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useConversation } from '@/lib/elevenlabs/use-conversation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, CheckCircle2,
    AlertCircle, ArrowLeft, Brain, Sparkles, Coins, Clock, Trophy, TrendingUp,
    Target, MessageSquare
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import { Progress } from '@repo/ui/components/ui/progress'
import { Separator } from '@repo/ui/components/ui/separator'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@repo/ui/components/ui/dialog'
import dynamic from 'next/dynamic'
import type { AgentState } from '@/components/main/orb'

// The orb IS the interview screen, so a bare `dynamic` left an empty
// aspect-square box where the thing you are talking to should be.
const Orb = dynamic(() => import('@/components/main/orb').then(m => ({ default: m.Orb })), {
    ssr: false,
    loading: () => (
        <div className="flex aspect-square w-full items-center justify-center">
            <InlineLoader size="lg" label="Waking the interviewer" />
        </div>
    ),
})
import toast from '@repo/ui/components/ui/sonner'
import {
    generateProjectMockKnowledgeBase, createProjectMockSession,
    updateProjectMockSessionStatus, processProjectMockCompletion,
    abandonProjectMockSession,
    getProjectMockAttempts
} from '@/actions/(main)/projects/projectv2-mock.action'
import { getElevenLabsToken } from '@/actions/(main)/mockvoice/session.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface AIMockInterviewClientProps {
    project: {
        id: string
        slug: string
        title: string
        description: string | null
        difficulty: string
    }
    userCredits: number
    hasKnowledgeBase: boolean
    knowledgeBase: string | null
    previousAttempts: Array<{
        id: string
        score: number | null
        duration: number | null
        completedAt: Date | null
    }>
}

type Stage = 'payment' | 'ready' | 'interview' | 'processing' | 'results'

interface MockVariables {
    knowledge_base: string
    username: string
}

interface MockFeedback {
    overallScore: number
    communication?: { score: number; feedback: string }
    technical?: { score: number; feedback: string }
    problemSolving?: { score: number; feedback: string }
    strengths?: string[]
    improvements?: string[]
    detailedFeedback?: string
}

export default function AIMockInterviewClient({
    project,
    userCredits,
    hasKnowledgeBase,
    knowledgeBase,
    previousAttempts: initialAttempts
}: AIMockInterviewClientProps) {
    // const router = useRouter()

    const [stage, setStage] = useState<Stage>(hasKnowledgeBase ? 'ready' : 'payment')
    const [generating, setGenerating] = useState(false)
    const [, setMockKnowledgeBase] = useState(knowledgeBase)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [agentId, setAgentId] = useState<string | null>(null)
    const [variables, setVariables] = useState<MockVariables | null>(null)
    const [attempts, setAttempts] = useState(initialAttempts)

    // Interview state
    const [isMicMuted, setIsMicMuted] = useState(false)
    const [volume, setVolume] = useState(0.8)
    const [agentState, setAgentState] = useState<AgentState>(null)
    const [hasStarted, setHasStarted] = useState(false)
    // Both entry points are paid: creating a session charges 30 credits, and
    // neither button showed anything while its server action ran, so a second
    // click bought a second interview (sweep 2026-09-23, loading P0 1-3).
    const [starting, setStarting] = useState(false)
    const [ending, setEnding] = useState(false)
    const [showProcessingDialog, setShowProcessingDialog] = useState(false)
    const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing')

    // Results
    const [feedback, setFeedback] = useState<MockFeedback | null>(null)

    const conversationIdRef = useRef<string | null>(null)
    const intentionalEndRef = useRef(false)
    const isProcessingRef = useRef(false)

    /*
     * A call that produced nothing must not cost 30 credits.
     *
     * The session is charged the moment it is created, before a word is said, so
     * every way out of an interview that never connected has to come through
     * here: a dropped connection, a failure to authenticate with the voice agent,
     * ending it before it started, or simply leaving the page. The action is
     * idempotent and only refunds when there is no conversation and no
     * transcript, so calling it from all four is safe.
     */
    const abandonSession = useCallback(async (id: string | null) => {
        if (!id) return
        const result = await abandonProjectMockSession(id)
        if (result.success && (result.refunded ?? 0) > 0) {
            toast.info(`That call did not connect. Your ${result.refunded} credits were refunded.`)
        }
    }, [])

    // Leaving the page before anything connected is a dropped call by another
    // name. The hourly server-side sweep is the backstop for a hard close, where
    // this never gets to run.
    const sessionIdRef = useRef<string | null>(null)
    useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
    useEffect(() => () => {
        if (sessionIdRef.current && !conversationIdRef.current) {
            void abandonProjectMockSession(sessionIdRef.current)
        }
    }, [])

    const handleConversationEnd = useCallback(async () => {
        if (!conversationIdRef.current || !sessionId || isProcessingRef.current) return
        isProcessingRef.current = true

        setShowProcessingDialog(true)
        setProcessingStatus('processing')

        try {
            const result = await processProjectMockCompletion(sessionId, conversationIdRef.current)

            if (!result.success) {
                throw new Error(result.error)
            }

            setProcessingStatus('success')
            setFeedback(result.analysis)

            // Refresh attempts
            const attemptsResult = await getProjectMockAttempts(project.slug)
            if (attemptsResult.success) {
                setAttempts(attemptsResult.attempts || [])
            }

            setTimeout(() => {
                setShowProcessingDialog(false)
                setStage('results')
                isProcessingRef.current = false
            }, 1500)

        } catch (error) {
            console.error('Error processing conversation:', error)
            setProcessingStatus('error')
            toast.error('Failed to process interview')
            isProcessingRef.current = false
        }
    }, [sessionId, project.slug])

    const conversation = useConversation({
        micMuted: isMicMuted,
        volume,
        onConnect: () => {
            console.log('[AIMock] Connected to ElevenLabs')
            setAgentState('listening')
            toast.success('Interview started!')
        },
        onDisconnect: () => {
            console.log('[AIMock] Disconnected from ElevenLabs, intentional:', intentionalEndRef.current)
            setAgentState(null)
            // Only process end if this was an intentional end
            if (intentionalEndRef.current && conversationIdRef.current) {
                handleConversationEnd()
                return
            }
            // Dropped before anything was recorded: close the session and give
            // the credits back rather than leave it IN_PROGRESS for good.
            if (!conversationIdRef.current) {
                setHasStarted(false)
                abandonSession(sessionId)
            }
        },
        onModeChange: (mode: { mode: string }) => {
            console.log('[AIMock] Mode changed:', mode.mode)
            setAgentState(mode.mode === 'speaking' ? 'talking' : 'listening')
        },
        onError: (error: unknown) => {
            console.error('[AIMock] Conversation error:', error)
            toast.error('Connection error. Please try again.')
            setAgentState(null)
        },
    })

    // Request microphone permission
    useEffect(() => {
        if (stage === 'ready') {
            navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
                toast.error('Microphone access is required for voice interviews')
            })
        }
    }, [stage])

    const handleGenerateKnowledgeBase = async () => {
        if (userCredits < 30) {
            toast.error('Insufficient credits! You need 30 credits to generate mock interview.')
            return
        }

        setGenerating(true)
        const result = await generateProjectMockKnowledgeBase(project.slug)

        if (result.success && result.mockData) {
            setMockKnowledgeBase(result.mockData.knowledgeBase)
            setStage('ready')
            toast.success('Mock interview ready!')
        } else {
            toast.error(result.error || 'Failed to generate mock interview')
        }
        setGenerating(false)
    }

    const handleStartInterview = async () => {
        if (starting) return
        setStarting(true)
        try {
            const result = await createProjectMockSession(project.slug)

            if (!result.success || !result.sessionId) {
                toast.error(result.error || 'Failed to create session')
                return
            }

            setSessionId(result.sessionId)
            setAgentId(result.agentId || null)
            setVariables(result.variables)
            setStage('interview')
        } catch (error: unknown) {
            console.error('Error starting interview:', error)
            toast.error('Failed to start interview')
        } finally {
            setStarting(false)
        }
    }

    const startConversation = async () => {
        if (!agentId || !variables) return

        try {
            setHasStarted(true)
            setAgentState('thinking')

            // Fetch Token
            const tokenResult = await getElevenLabsToken(agentId)
            if (!tokenResult.success || !tokenResult.token) {
                toast.error('Failed to authenticate with voice agent')
                setAgentState(null)
                setHasStarted(false)
                await abandonSession(sessionId)
                setStage('ready')
                setSessionId(null)
                return
            }

            await updateProjectMockSessionStatus(sessionId!, 'IN_PROGRESS')

            const conversationId = await conversation.startSession({
                conversationToken: tokenResult.token,
                connectionType: 'webrtc',
                overrides: {
                    agent: {
                        prompt: {
                            prompt: variables.knowledge_base
                        },
                        firstMessage: `Hello ${variables.username}! Welcome to your mock interview for the ${project.title} project. I'm excited to discuss your work with you today.\n\nWe'll go through some technical questions about your project, the technologies you used, and your problem-solving approach. Feel free to take your time with your responses.\n\nAre you ready to begin?`
                    }
                }
            })

            conversationIdRef.current = conversationId
            await updateProjectMockSessionStatus(sessionId!, 'IN_PROGRESS', conversationId)

        } catch (error: unknown) {
            console.error('Error starting conversation:', error)
            toast.error('Failed to start interview. Please try again.')
            setAgentState(null)
            setHasStarted(false)
            await abandonSession(sessionId)
            setStage('ready')
            setSessionId(null)
        }
    }

    const endInterview = async () => {
        if (ending) return
        setEnding(true)
        try {
            intentionalEndRef.current = true
            await conversation.endSession()
            // Ended before the agent ever connected: there is nothing to process
            // and nothing to charge for.
            if (!conversationIdRef.current) {
                setAgentState(null)
                setHasStarted(false)
                await abandonSession(sessionId)
                setSessionId(null)
                setStage('ready')
                return
            }
            await updateProjectMockSessionStatus(sessionId!, 'COMPLETED', conversationIdRef.current)
            setAgentState(null)
        } catch (error: unknown) {
            console.error('Error ending interview:', error)
            toast.error('Failed to end interview properly')
        } finally {
            setEnding(false)
        }
    }

    const toggleMic = () => {
        setIsMicMuted(!isMicMuted)
        toast.info(isMicMuted ? 'Microphone unmuted' : 'Microphone muted')
    }

    const toggleVolume = () => {
        const newVolume = volume > 0 ? 0 : 0.8
        setVolume(newVolume)
        conversation.setVolume({ volume: newVolume })
    }

    if (stage === 'payment') {
        return (
            <div className="min-h-screen py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Project
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-neutral-900 to-neutral-900 rounded-2xl mb-4">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-500 dark:from-neutral-50 dark:to-neutral-400 mb-2">
                                AI Mock Interview
                            </h1>
                            <p className="text-lg text-neutral-600 dark:text-neutral-400">
                                Practice for real interviews with AI-powered feedback
                            </p>
                        </div>

                        <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Generate Interview Knowledge Base
                                </CardTitle>
                                <CardDescription>
                                    AI will create a personalized interview experience based on your project
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">~15</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Minutes</div>
                                    </div>
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">8-10</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Questions</div>
                                    </div>
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">AI</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Feedback</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-semibold text-neutral-900 dark:text-white">What you&apos;ll get:</p>
                                    <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Voice-based interview with AI interviewer</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Questions tailored to your project and technologies</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Detailed feedback on communication & technical skills</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Unlimited retakes to improve your score</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Your Credits</p>
                                            <p className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                <Coins className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                {userCredits}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Cost</p>
                                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">30 Credits</p>
                                        </div>
                                    </div>
                                    {
                                        userCredits < 30 && (
                                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                                                        Insufficient Credits
                                                    </p>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        You need {30 - userCredits} more credits
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    <Button
                                        onClick={handleGenerateKnowledgeBase}
                                        disabled={generating || userCredits < 30}
                                        className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800 text-white hover:opacity-90 rounded-xl"
                                        size="lg"
                                    >
                                        {
                                            generating ? (
                                                <>
                                                    <InlineLoader size="md" className="mr-2" />
                                                    Generating Interview...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    Generate Mock Interview for 30 Credits
                                                </>
                                            )
                                        }
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {
                            attempts.length > 0 && (
                                <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800">
                                    <CardHeader>
                                        <CardTitle className="text-base">Previous Attempts</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {
                                                attempts.map((attempt) => (
                                                    <div
                                                        key={attempt.id}
                                                        className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Trophy className="w-4 h-4 text-neutral-800 dark:text-neutral-100" />
                                                            <div>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    Score: {attempt.score || '--'}%
                                                                </p>
                                                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                                                    Duration: {attempt.duration ? `${Math.floor(attempt.duration / 60)}:${(attempt.duration % 60).toString().padStart(2, '0')}` : '--'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : '-'}
                                                        </p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        }
                    </motion.div>
                </div>
            </div>
        )
    }

    // Ready Stage (Knowledge base exists, ready to start)
    if (stage === 'ready') {
        return (
            <div className="min-h-screen py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Project
                    </Link>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-8"
                    >
                        <div>
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-neutral-900 to-neutral-900 rounded-full mb-6">
                                <Brain className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">
                                Ready for Your Interview?
                            </h1>
                            <p className="text-lg text-neutral-600 dark:text-neutral-400">
                                {project.title}
                            </p>
                        </div>
                        <Card className="bg-neutral-50 dark:bg-neutral-900 border-0 max-w-md mx-auto">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Clock className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                                    <span className="text-neutral-600 dark:text-neutral-400">~15 minutes</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mic className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Voice-based interview</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Brain className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                                    <span className="text-neutral-600 dark:text-neutral-400">AI-powered feedback</span>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex flex-col items-center gap-4">
                            <Button
                                onClick={handleStartInterview}
                                disabled={starting}
                                size="lg"
                                className="px-12 py-6 text-lg"
                            >
                                {starting ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Setting up your interview
                                    </>
                                ) : (
                                    <>
                                        <Phone className="w-5 h-5 mr-2" />
                                        Start Interview
                                    </>
                                )}
                            </Button>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Make sure your microphone is working
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    // Interview Stage
    if (stage === 'interview') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 flex flex-col">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{project.title}</h1>
                            <p className="text-neutral-600 dark:text-neutral-400">Mock Interview</p>
                        </div>
                        <Badge className="text-sm">{project.difficulty}</Badge>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl"
                    >
                        <div className="relative w-full aspect-square max-w-md mx-auto mb-8">
                            <Orb
                                agentState={agentState}
                                volumeMode="auto"
                                getInputVolume={conversation.getInputVolume}
                                getOutputVolume={conversation.getOutputVolume}
                                colors={['#737373', '#404040']}
                            />
                        </div>
                        <div className="text-center mb-8">
                            <AnimatePresence mode="wait">
                                {
                                    !hasStarted && (
                                        <motion.div
                                            key="ready"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            <h2 className="text-3xl font-bold mb-2">Ready to Begin?</h2>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Click the button below to start your mock interview
                                            </p>
                                        </motion.div>
                                    )
                                }
                                {
                                    hasStarted && agentState === 'thinking' && (
                                        <motion.div
                                            key="thinking"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Setting up your interview session
                                            </p>
                                        </motion.div>
                                    )
                                }
                                {
                                    agentState === 'listening' && (
                                        <motion.div
                                            key="listening"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            <h2 className="text-2xl font-bold mb-2">Listening...</h2>
                                            <p className="text-neutral-600 dark:text-neutral-400">Your turn to speak</p>
                                        </motion.div>
                                    )
                                }
                                {
                                    agentState === 'talking' && (
                                        <motion.div
                                            key="talking"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            <h2 className="text-2xl font-bold mb-2">Interviewer Speaking...</h2>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Listen carefully to the question
                                            </p>
                                        </motion.div>

                                    )}
                            </AnimatePresence>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            {
                                !hasStarted ? (
                                    <Button
                                        size="lg"
                                        className="px-8 py-6 text-lg"
                                        disabled={agentState === 'thinking'}
                                        onClick={startConversation}
                                    >
                                        {agentState === 'thinking' ? (
                                            <>
                                                <InlineLoader size="sm" className="mr-2" />
                                                Connecting
                                            </>
                                        ) : (
                                            <>
                                                <Phone className="w-5 h-5 mr-2" />
                                                Start Interview
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            size="lg"
                                            variant={isMicMuted ? 'destructive' : 'outline'}
                                            onClick={toggleMic}
                                            className="rounded-full w-14 h-14"
                                        >
                                            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="destructive"
                                            onClick={endInterview}
                                            disabled={ending}
                                            aria-label="End the interview"
                                            className="rounded-full w-16 h-16"
                                        >
                                            {ending ? <InlineLoader size="sm" /> : <PhoneOff className="w-6 h-6" />}
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant={volume === 0 ? 'destructive' : 'outline'}
                                            onClick={toggleVolume}
                                            className="rounded-full w-14 h-14"
                                        >
                                            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                        </Button>
                                    </>
                                )
                            }
                        </div>
                    </motion.div>
                </div>
                <Dialog open={showProcessingDialog} onOpenChange={() => { }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {
                                    processingStatus === 'processing' && (
                                        <>
                                            <InlineLoader size="md" className="text-neutral-800 dark:text-neutral-200" />
                                            Processing Your Interview
                                        </>
                                    )
                                }
                                {
                                    processingStatus === 'success' && (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                            Interview Completed!
                                        </>
                                    )
                                }
                                {
                                    processingStatus === 'error' && (
                                        <>
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            Processing Error
                                        </>
                                    )
                                }
                            </DialogTitle>
                            <DialogDescription>
                                {processingStatus === 'processing' && 'Please wait while we analyze your performance...'}
                                {processingStatus === 'success' && 'Loading your results...'}
                                {processingStatus === 'error' && 'Something went wrong. Please try again.'}
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    // Results Stage
    if (stage === 'results' && feedback) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <Link href={`/projects/${project.slug}`}>
                            <Button variant="ghost" className="mb-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Project
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-bold mb-2">Interview Results</h1>
                        <p className="text-neutral-600 dark:text-neutral-400">{project.title}</p>
                    </div>
                    <StatBand
                        cols={3}
                        className="mb-8"
                        items={[
                            { icon: Trophy, label: "Overall Score", value: `${feedback.overallScore}/100` },
                            { icon: MessageSquare, label: "Communication", value: `${feedback.communication?.score ?? ""}/100` },
                            { icon: Target, label: "Technical", value: `${feedback.technical?.score ?? ""}/100` },
                        ]}
                    />
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Performance Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">Communication</span>
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {feedback.communication?.score}/100
                                    </span>
                                </div>
                                <Progress value={feedback.communication?.score || 0} className="mb-2" />
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {feedback.communication?.feedback}
                                </p>
                            </div>

                            <Separator />

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">Technical Skills</span>
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {feedback.technical?.score}/100
                                    </span>
                                </div>
                                <Progress value={feedback.technical?.score || 0} className="mb-2" />
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {feedback.technical?.feedback}
                                </p>
                            </div>

                            <Separator />

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">Problem Solving</span>
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {feedback.problemSolving?.score}/100
                                    </span>
                                </div>
                                <Progress value={feedback.problemSolving?.score || 0} className="mb-2" />
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {feedback.problemSolving?.feedback}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Strengths
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {
                                        feedback.strengths?.map((strength: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mt-1 flex-shrink-0" />
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
                                        feedback.improvements?.map((improvement: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-200 mt-1 flex-shrink-0" />
                                                <span className="text-sm">{improvement}</span>
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
                            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                {feedback.detailedFeedback}
                            </p>
                        </CardContent>
                    </Card>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Button asChild>
                            <Link href={`/projects/${project.slug}`}>
                                Back to Project
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStage('ready')
                                setHasStarted(false)
                                setFeedback(null)
                                conversationIdRef.current = null
                            }}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
