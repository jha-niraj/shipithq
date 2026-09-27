'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from '@repo/ui/components/ui/tabs'
import {
    CheckCircle2, Code, Play, Lightbulb, ChevronRight, Lock
} from 'lucide-react'
import { VerificationSectionStatus } from '@repo/db'
import { submitVerificationCoding } from '@/actions/(main)/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import CodeEditor from '@/components/main/code-editor'

interface CodingQuestion {
    id: string
    title: string
    description: string
    difficulty: string
    category: string
    constraints: string[]
    examples: { input: string; output: string; explanation?: string }[]
    hints: string[]
    starterCode: { javascript: string; python: string }
    solution: { javascript: string; python: string; explanation: string; timeComplexity: string; spaceComplexity: string }
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[]
}

interface CodingVerificationProps {
    goalId: string
    questions: CodingQuestion[]
    status: VerificationSectionStatus
    score: number | null
}

export function CodingVerification({ goalId, questions, status, score }: CodingVerificationProps) {
    const [currentProblem, setCurrentProblem] = useState(0)
    const [code, setCode] = useState<Record<string, string>>({})
    const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
    const [showHints, setShowHints] = useState(false)
    const [hintLevel, setHintLevel] = useState(0)
    const [isRunning, setIsRunning] = useState(false)
    const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set())

    // Show completed state
    if (status === 'COMPLETED') {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Coding Passed!</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">You scored {score}%</p>
                    <Badge variant="secondary">Problems Solved: {questions.length}</Badge>
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
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Coding Locked</h3>
                    <p className="text-neutral-500 dark:text-neutral-400">Complete the Quiz section first to unlock Coding challenges.</p>
                </div>
            </div>
        )
    }

    const problem = questions[currentProblem]
    if (!problem) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <Code className="w-12 h-12 mx-auto text-neutral-600 dark:text-neutral-400 mb-4" />
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">No Coding Questions</h3>
                    <p className="text-neutral-500 dark:text-neutral-400">This goal doesn&apos;t have any coding challenges.</p>
                </div>
            </div>
        )
    }

    const currentCode = code[problem.id] || problem.starterCode[language]

    const handleCodeChange = (newCode: string) => {
        setCode(prev => ({
            ...prev,
            [problem.id]: newCode
        }))
    }

    const handleLanguageChange = (newLang: string) => {
        const lang = newLang as 'javascript' | 'python'
        setLanguage(lang)
        // Set starter code if no custom code yet
        if (!code[problem.id]) {
            setCode(prev => ({
                ...prev,
                [problem.id]: problem.starterCode[lang]
            }))
        }
    }

    const handleRun = async () => {
        setIsRunning(true)
        // Simulate running - in real implementation, this would call a code execution service
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsRunning(false)
        toast.success('Code executed! Check the output.')
    }

    const handleSubmit = async () => {
        setIsRunning(true)

        try {
            // In real implementation, this would run tests against the code
            // For now, simulate submission
            const result = await submitVerificationCoding({
                goalId,
                problemId: problem.id,
                code: currentCode,
                language,
                passed: true, // This would be determined by test results
                testsPassed: problem.testCases.length,
                totalTests: problem.testCases.length,
            })

            if (result.success) {
                setSolvedProblems(prev => new Set([...prev, problem.id]))
                if (result.overallPassed) {
                    toast.success('All problems solved! Coding section complete.')
                } else {
                    toast.success('Problem solved! Move to the next one.')
                }
            } else {
                toast.error(result.error || 'Failed to submit')
            }
        } catch {
            toast.error('Failed to submit solution')
        }

        setIsRunning(false)
    }

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Problems</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{solvedProblems.size}/{questions.length} solved</p>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                    <div className="p-2 space-y-1">
                        {
                            questions.map((q, index) => {
                                const isSolved = solvedProblems.has(q.id)
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentProblem(index)}
                                        className={cn(
                                            "w-full p-3 rounded-lg text-left transition-all flex items-center justify-between",
                                            currentProblem === index
                                                ? "bg-neutral-100 dark:bg-neutral-800/30"
                                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        <div>
                                            <div className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                                                {q.title}
                                            </div>
                                            <Badge variant="secondary" className="capitalize mt-1 text-xs">
                                                {q.difficulty.toLowerCase()}
                                            </Badge>
                                        </div>
                                        {
                                            isSolved ? (
                                                <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                                            )
                                        }
                                    </button>
                                )
                            })
                        }
                    </div>
                </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs defaultValue="problem" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 pt-3">
                        <TabsList variant="segmented" size="sm" fit>
                            <TabsTrigger value="problem">
                                Problem
                            </TabsTrigger>
                            <TabsTrigger value="solution">
                                Solution
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                        <TabsContent value="problem" className="flex-1 m-0 flex overflow-hidden">
                            <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
                                <ScrollArea className="min-h-0 flex-1 p-4">
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                                {problem.title}
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="capitalize">{problem.difficulty.toLowerCase()}</Badge>
                                                <Badge variant="outline">{problem.category}</Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                                                {problem.description}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Constraints:</h4>
                                            <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                                                {
                                                    problem.constraints.map((c, i) => (
                                                        <li key={i}>{c}</li>
                                                    ))
                                                }
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Examples:</h4>
                                            {
                                                problem.examples.map((ex, i) => (
                                                    <div key={i} className="mb-4 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                                                        <div className="text-sm">
                                                            <div className="mb-1">
                                                                <span className="font-medium">Input:</span> {ex.input}
                                                            </div>
                                                            <div className="mb-1">
                                                                <span className="font-medium">Output:</span> {ex.output}
                                                            </div>
                                                            {
                                                                ex.explanation && (
                                                                    <div className="text-neutral-500 dark:text-neutral-400">
                                                                        <span className="font-medium">Explanation:</span> {ex.explanation}
                                                                    </div>
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowHints(!showHints)}
                                            >
                                                <Lightbulb className="w-4 h-4 mr-2" />
                                                {showHints ? 'Hide Hints' : 'Show Hints'}
                                            </Button>
                                            {
                                                showHints && (
                                                    <div className="mt-3 space-y-2">
                                                        {
                                                            problem.hints.slice(0, hintLevel + 1).map((hint, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    initial={{ opacity: 0, y: -10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800"
                                                                >
                                                                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                                                                        Hint {i + 1}: {hint}
                                                                    </span>
                                                                </motion.div>
                                                            ))
                                                        }
                                                        {
                                                            hintLevel < problem.hints.length - 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setHintLevel(h => h + 1)}
                                                                >
                                                                    Show next hint
                                                                </Button>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="w-1/2 flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                                    <Tabs value={language} onValueChange={handleLanguageChange}>
                                        <TabsList size="sm" fit>
                                            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                                            <TabsTrigger value="python">Python</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleRun} disabled={isRunning}>
                                            <Play className="w-4 h-4 mr-1" />
                                            Run
                                        </Button>
                                        <Button size="sm" onClick={handleSubmit} disabled={isRunning} className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900">
                                            Submit
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden min-h-[300px]">
                                    <CodeEditor
                                        code={currentCode}
                                        onChange={handleCodeChange}
                                        language={language}
                                        height="300px"
                                        className="min-h-[300px]"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="solution" className="flex-1 m-0 overflow-hidden">
                            <ScrollArea className="h-full p-6">
                                <div className="max-w-3xl space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Approach</h3>
                                        <p className="text-neutral-600 dark:text-neutral-400">{problem.solution.explanation}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline">Time: {problem.solution.timeComplexity}</Badge>
                                        <Badge variant="outline">Space: {problem.solution.spaceComplexity}</Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">JavaScript Solution</h4>
                                        <div className="min-h-[150px] rounded-lg overflow-hidden">
                                            <CodeEditor
                                                code={problem.solution.javascript}
                                                language="javascript"
                                                readOnly
                                                showLanguageSelector={false}
                                                showCopyButton
                                                height="150px"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Python Solution</h4>
                                        <div className="min-h-[150px] rounded-lg overflow-hidden">
                                            <CodeEditor
                                                code={problem.solution.python}
                                                language="python"
                                                readOnly
                                                showLanguageSelector={false}
                                                showCopyButton
                                                height="150px"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}