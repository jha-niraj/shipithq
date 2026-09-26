'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import { TrendingUp,
    ArrowRight, Brain, Sparkles,
    Trophy, Target, Zap, MessageSquare,
    Award, Timer, Shield
} from 'lucide-react'
import { useUserStore } from '@/app/store/useUserStore'
import { MyPractice } from './my-practice'

// The three data blocks that stood here - `mockInterviewTypes`, `features` and
// `benefits` - are gone with the sections that rendered them. All three were
// declaration-only by the end, and the first carried the last fabricated number
// on the page: `badge: '15K+ completed'`.

export default function MockInterviewLandingPage() {
    const { user, credits } = useUserStore()
    // The platform-stats fetch that was here is gone with the band it fed.
    //
    // Worth recording what its initial state was: `totalVoiceInterviews: 15420`,
    // `activeUsers: 8734`, `averageRating: '4.8'`, `successRate: '85'`. Those
    // were rendered on first paint, before the real query returned - so the page
    // showed fifteen thousand interviews to every visitor for a moment, then
    // replaced it with the true figure of 0. The invented numbers were not only
    // in the hardcoded pair; two of them were the loading state for the real ones.

    return (
            <main>
                <div className="page-frame px-page pt-6 pb-4">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6 sm:flex-row sm:items-end sm:justify-between"
                    >
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                                Mock Interviews
                            </h1>
                            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                                Practice with AI interviewers, get real-time feedback, and land your dream job.
                                {user && <span className="ml-2">You have <span className="font-semibold text-neutral-900 dark:text-white">{credits || 0} credits</span> available.</span>}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                className="h-9 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 font-medium"
                                asChild
                            >
                                <Link href="/mock/voice">
                                    Start Voice Interview
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 border-neutral-200 dark:border-neutral-800"
                                asChild
                            >
                                <Link href="#interview-types">
                                    Explore Types
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                    {/* ── The user's own practice ───────────────────────────────
                        What stood here was four PLATFORM statistics, and none of
                        them belonged on a page only signed-in users can reach:
                        "0+ Interviews Conducted" and "0+ Active Users" were real
                        but advertised the platform's emptiness, while "4.8/5" and
                        "85% Success Rate" were hardcoded and measured nothing at
                        all. Below them sat a "Choose Your Interview Format" hero
                        and a card claiming "15K+ completed".
                        All of it addressed somebody deciding whether to try the
                        product - a decision this reader already made. See MK-4. */}
                    <MyPractice />
                </div>
            </main>
    )
}