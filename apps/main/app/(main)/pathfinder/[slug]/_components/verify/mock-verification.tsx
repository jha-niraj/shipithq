'use client'

import { useState } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    CheckCircle2, Clock, ListChecks, Lock, Mic, Play, Target
} from 'lucide-react'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { VerificationSectionStatus } from '@repo/db'
import Link from 'next/link'
import { CreateMockSheet } from '@/app/(main)/mock/_components/create-mock-sheet'

interface MockConfig {
    title: string
    description: string
    duration: number
    questionsCount: number
    knowledgeBase: string
}

interface MockVerificationProps {
    mockInterviewId: string | null
    mockConfig?: MockConfig
    status: VerificationSectionStatus
    score: number | null
    attempts: number
}

export function MockVerification({
    mockInterviewId,
    mockConfig,
    status,
    score,
    attempts
}: MockVerificationProps) {
    const [showMockSheet, setShowMockSheet] = useState(false)

    // Show completed state
    if (status === 'COMPLETED') {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Mock Interview Passed!</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">You scored {score}%</p>
                    <Badge variant="secondary">Attempts: {attempts}</Badge>
                </div>
            </div>
        )
    }

    // Show locked state
    if (status === 'LOCKED') {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                        <Lock className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Mock Interview Locked</h3>
                    <p className="text-neutral-500 dark:text-neutral-400">Complete the Coding section first to unlock Mock Interview.</p>
                </div>
            </div>
        )
    }

    // Show mock interview start screen
    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-lg">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-neutral-800 to-neutral-800 flex items-center justify-center mb-6 shadow-lg">
                    <Mic className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    {mockConfig?.title || 'Mock Interview'}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                    {mockConfig?.description || 'Complete an AI-powered voice interview to demonstrate your knowledge.'}
                </p>
                <StatBand
                    size="sm"
                    cols={3}
                    className="mb-8"
                    items={[
                        { icon: Clock, label: 'Duration', value: `${mockConfig?.duration || 15}m` },
                        { icon: ListChecks, label: 'Questions', value: mockConfig?.questionsCount || 5 },
                        { icon: Target, label: 'To Pass', value: '70%' },
                    ]}
                />
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800 text-left">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Before you start:</h4>
                        <ul className="text-sm text-neutral-700 dark:text-neutral-100 space-y-1">
                            <li>• Make sure you&apos;re in a quiet environment</li>
                            <li>• Allow microphone access when prompted</li>
                            <li>• Speak clearly and take your time</li>
                            <li>• The AI will ask follow-up questions based on your answers</li>
                        </ul>
                    </div>

                    {
                        mockInterviewId ? (
                            <Link href={`/mock/voice/interview/${mockInterviewId}`}>
                                <Button size="lg" className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 hover:opacity-90">
                                    <Play className="w-5 h-5 mr-2" />
                                    Start Mock Interview
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Button
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 hover:opacity-90"
                                    onClick={() => setShowMockSheet(true)}
                                >
                                    <Play className="w-5 h-5 mr-2" />
                                    Create & Start Interview
                                </Button>
                                <CreateMockSheet
                                    open={showMockSheet}
                                    onOpenChange={setShowMockSheet}
                                    trigger={<></>}
                                />
                            </>
                        )
                    }

                    {
                        attempts > 0 && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Previous attempts: {attempts}
                            </p>
                        )
                    }
                </div>
            </div>
        </div>
    )
}