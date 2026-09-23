"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@repo/ui/components/ui/card";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs";
import { Button } from "@repo/ui/components/ui/button";
import { Progress } from "@repo/ui/components/ui/progress";
import { Badge } from "@repo/ui/components/ui/badge";
import {
    Check, X, ArrowLeft, Flag,
    Trophy, RotateCcw, ChevronLeft, ChevronRight, Clock
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import type { QuizQuestion, QuizResult } from "./quiz";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"

export interface QuizResultsProps {
    result: QuizResult;
    questions: QuizQuestion[];
    title?: string;
    onRetake?: () => void;
    onBack?: () => void;
    showAnswerReview?: boolean;
    showCategoryBreakdown?: boolean;
}

export default function QuizResults({
    result,
    questions,
    title = "Quiz Results",
    onRetake,
    onBack,
    showAnswerReview = true,
    showCategoryBreakdown = true,
}: QuizResultsProps) {
    const [activeTab, setActiveTab] = useState("overall");
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    // Calculate category data
    const categories = [...new Set(questions.map(q => q.category || "General"))];
    const categoryData = categories.map(category => {
        const categoryQuestions = questions.filter(q => (q.category || "General") === category);
        const categoryAnswers = result.answers.filter(a =>
            categoryQuestions.some(q => q.id === a.questionId)
        );
        const correct = categoryAnswers.filter(a => a.isCorrect).length;

        return {
            name: category,
            correct,
            total: categoryQuestions.length,
            percentage: Math.round((correct / categoryQuestions.length) * 100),
        };
    });

    const selectedQuestion = questions[selectedQuestionIndex];
    const selectedAnswer = result.answers.find(a => a.questionId === selectedQuestion?.id);

    // Get score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-neutral-800 dark:text-neutral-100";
        if (score >= 60) return "text-neutral-800 dark:text-neutral-100";
        if (score >= 40) return "text-neutral-800 dark:text-neutral-100";
        return "text-red-600 dark:text-red-400";
    };

    // Get score message
    const getScoreMessage = (score: number) => {
        if (score >= 90) return "Outstanding! 🎉";
        if (score >= 80) return "Excellent Work! 🌟";
        if (score >= 70) return "Great Job! 👏";
        if (score >= 60) return "Good Effort! 👍";
        if (score >= 50) return "Keep Practicing! 💪";
        return "Room for Improvement! 📚";
    };

    // Get score icon bg
    const getScoreIconBg = (score: number) => {
        if (score >= 80) return "from-neutral-900 to-neutral-900";
        if (score >= 60) return "from-neutral-900 to-neutral-900";
        if (score >= 40) return "from-neutral-900 to-neutral-900";
        return "from-red-500 to-neutral-900";
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <InlineLoader size="lg" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800">
                    <CardHeader className="text-center pb-4">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className={cn(
                                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
                                "bg-gradient-to-br",
                                getScoreIconBg(result.scorePercentage)
                            )}
                        >
                            <Trophy className="w-10 h-10 text-white" />
                        </motion.div>
                        <CardTitle className="text-2xl mb-2">{title}</CardTitle>
                        <p className="text-muted-foreground">{getScoreMessage(result.scorePercentage)}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-8 mb-6">
                            <div className="text-center">
                                <p className={cn("text-5xl font-bold", getScoreColor(result.scorePercentage))}>
                                    {result.scorePercentage}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Score</p>
                            </div>
                            <div className="h-16 w-px bg-neutral-200 dark:bg-neutral-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                                    {result.correctCount}/{result.totalQuestions}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Correct</p>
                            </div>
                            <div className="h-16 w-px bg-neutral-200 dark:bg-neutral-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                                    {formatTime(result.totalTimeTaken)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Time</p>
                            </div>
                        </div>
                        <div className="flex justify-center gap-3">
                            {
                                onBack && (
                                    <Button variant="outline" onClick={onBack}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                )
                            }
                            {
                                onRetake && (
                                    <Button onClick={onRetake} className="bg-gradient-to-r from-neutral-800 to-pink-600 hover:opacity-90">
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Retake Quiz
                                    </Button>
                                )
                            }
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className="bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800">
                    <CardContent className="pt-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="w-full mb-6">
                                <TabsTrigger value="overall" className="flex-1">
                                    Overview
                                </TabsTrigger>
                                {
                                    showCategoryBreakdown && (
                                        <TabsTrigger value="categories" className="flex-1">
                                            Categories
                                        </TabsTrigger>
                                    )
                                }
                                {
                                    showAnswerReview && (
                                        <TabsTrigger value="review" className="flex-1">
                                            Review Answers
                                        </TabsTrigger>
                                    )
                                }
                            </TabsList>
                            <TabsContent value="overall" className="space-y-4">
                                <StatBand
                                    size="sm"
                                    cols={4}
                                    items={[
                                        { icon: Check, label: "Correct", value: result.correctCount },
                                        { icon: X, label: "Incorrect", value: result.totalQuestions - result.correctCount, tone: "rose" },
                                        { icon: Flag, label: "Flagged", value: result.flaggedQuestions.length },
                                        { icon: Clock, label: "Time Taken", value: formatTime(result.totalTimeTaken) },
                                    ]}
                                />
                                <div className="space-y-2">
                                    <h4 className="font-medium text-neutral-900 dark:text-white">Question Summary</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {
                                            result.answers.map((answer, idx) => (
                                                <button
                                                    key={answer.questionId}
                                                    onClick={() => {
                                                        setSelectedQuestionIndex(idx);
                                                        setActiveTab("review");
                                                    }}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center relative",
                                                        answer.isCorrect
                                                            ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                        "hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                                                    )}
                                                >
                                                    {idx + 1}
                                                    {
                                                        result.flaggedQuestions.includes(answer.questionId) && (
                                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-neutral-900 rounded-full" />
                                                        )
                                                    }
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            </TabsContent>
                            {
                                showCategoryBreakdown && (
                                    <TabsContent value="categories" className="space-y-4">
                                        {
                                            categoryData.map((cat, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-neutral-900 dark:text-white">
                                                            {cat.name}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {cat.correct}/{cat.total} ({cat.percentage}%)
                                                        </span>
                                                    </div>
                                                    <Progress value={cat.percentage} className="h-2" />
                                                </div>
                                            ))
                                        }
                                    </TabsContent>
                                )
                            }
                            {
                                showAnswerReview && (
                                    <TabsContent value="review">
                                        <AnimatePresence mode="wait">
                                            {
                                                selectedQuestion && selectedAnswer && (
                                                    <motion.div
                                                        key={selectedQuestionIndex}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="space-y-4"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className={cn(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                                                    selectedAnswer.isCorrect
                                                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                                        : "bg-red-500 text-white"
                                                                )}>
                                                                    {selectedQuestionIndex + 1}
                                                                </span>
                                                                <Badge className={cn(
                                                                    selectedAnswer.isCorrect
                                                                        ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                                                )}>
                                                                    {
                                                                        selectedAnswer.isCorrect ? (
                                                                            <><Check className="w-3 h-3 mr-1" /> Correct</>
                                                                        ) : (
                                                                            <><X className="w-3 h-3 mr-1" /> Incorrect</>
                                                                        )
                                                                    }
                                                                </Badge>
                                                                {
                                                                    result.flaggedQuestions.includes(selectedQuestion.id) && (
                                                                        <Flag className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                    )
                                                                }
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setSelectedQuestionIndex(prev => Math.max(0, prev - 1))}
                                                                    disabled={selectedQuestionIndex === 0}
                                                                >
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </Button>
                                                                <span className="text-sm text-muted-foreground">
                                                                    {selectedQuestionIndex + 1} / {questions.length}
                                                                </span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setSelectedQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                                                    disabled={selectedQuestionIndex === questions.length - 1}
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <h4 className="text-lg font-medium text-neutral-900 dark:text-white">
                                                            {selectedQuestion.text}
                                                        </h4>

                                                        {
                                                            selectedQuestion.codeSnippet && (
                                                                <pre className="p-4 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto text-sm font-mono">
                                                                    <code>{selectedQuestion.codeSnippet}</code>
                                                                </pre>
                                                            )
                                                        }

                                                        <div className="space-y-2">
                                                            {
                                                                selectedQuestion.options.map((option, idx) => {
                                                                    const isSelected = selectedAnswer.selectedAnswer === option.id ||
                                                                        (Array.isArray(selectedAnswer.selectedAnswer) &&
                                                                            selectedAnswer.selectedAnswer.includes(option.id));
                                                                    const isCorrect = option.isCorrect ||
                                                                        (selectedQuestion.correctAnswer !== undefined &&
                                                                            idx === selectedQuestion.correctAnswer);

                                                                    return (
                                                                        <div
                                                                            key={option.id}
                                                                            className={cn(
                                                                                "p-3 rounded-lg border-2 flex items-center gap-3",
                                                                                isCorrect && "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20",
                                                                                isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20",
                                                                                !isSelected && !isCorrect && "border-neutral-200 dark:border-neutral-700"
                                                                            )}
                                                                        >
                                                                            <span className={cn(
                                                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                                                                                isCorrect && "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
                                                                                isSelected && !isCorrect && "bg-red-500 text-white",
                                                                                !isSelected && !isCorrect && "bg-muted text-muted-foreground"
                                                                            )}>
                                                                                {
                                                                                    isCorrect ? <Check className="w-4 h-4" /> :
                                                                                        isSelected ? <X className="w-4 h-4" /> :
                                                                                            String.fromCharCode(65 + idx)
                                                                                }
                                                                            </span>
                                                                            <span className={cn(
                                                                                "flex-1",
                                                                                isCorrect && "text-neutral-800 dark:text-neutral-200 font-medium",
                                                                                isSelected && !isCorrect && "text-red-800 dark:text-red-200"
                                                                            )}>
                                                                                {option.text}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })
                                                            }
                                                        </div>

                                                        {
                                                            selectedQuestion.explanation && (
                                                                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                                                                    <h5 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                                                                        Explanation
                                                                    </h5>
                                                                    <p className="text-sm text-neutral-700 dark:text-neutral-100">
                                                                        {selectedQuestion.explanation}
                                                                    </p>
                                                                </div>
                                                            )
                                                        }
                                                    </motion.div>
                                                )
                                            }
                                        </AnimatePresence>
                                    </TabsContent>
                                )
                            }
                        </Tabs>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}