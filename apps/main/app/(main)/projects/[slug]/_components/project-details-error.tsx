'use client'

import { motion } from 'framer-motion'
import {
    AlertCircle, ArrowLeft, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@repo/ui/components/ui/button'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'

export function ProjectDetailsError() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden p-4">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Projects
                    </Link>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-center min-h-[60vh]"
                >
                    <Card className="max-w-md w-full bg-white dark:bg-neutral-900 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="text-center pb-4">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl">Project Not Found</CardTitle>
                            <CardDescription className="text-base">
                                {"We couldn't load this project. It might have been removed, made private, or there might be a connection issue."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Link href="/projects" className="block">
                                <Button className="w-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Browse All Projects
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}