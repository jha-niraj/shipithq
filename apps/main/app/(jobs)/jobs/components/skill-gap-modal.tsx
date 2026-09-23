"use client"

import { useState, useEffect } from "react"
import {
    Building2, Target, CheckCircle2, AlertCircle, GraduationCap,
    ArrowRight, ExternalLink, Award, Swords, Users
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@repo/ui/components/ui/dialog"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@repo/ui/lib/utils"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    getShouldApplyScore, getSkillGapForJob,
    type FeedJobResult, type ShouldApplyScore, type SkillGapAnalysis
} from "@/actions/jobs"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface SkillGapModalProps {
    job: FeedJobResult | null
    open: boolean
    onClose: () => void
}

export function SkillGapModal({ job, open, onClose }: SkillGapModalProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<SkillGapAnalysis | null>(null)
    const [shouldApply, setShouldApply] = useState<ShouldApplyScore | null>(null)

    useEffect(() => {
        if (open && job) {
            setLoading(true)
            Promise.all([
                getSkillGapForJob(job.id),
                getShouldApplyScore(job.id)
            ]).then(([gapResult, applyResult]) => {
                if (gapResult.success && gapResult.data) {
                    setData(gapResult.data)
                }
                if (applyResult.success && applyResult.data) {
                    setShouldApply(applyResult.data)
                }
                setLoading(false)
            })
        }
    }, [open, job])

    if (!job) return null

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case "HIGHLY_RECOMMENDED": return "text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30"
            case "RECOMMENDED": return "text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30"
            case "CONSIDER": return "text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30"
            default: return "text-red-600 bg-red-100 dark:bg-red-900/30"
        }
    }

    const getRecommendationLabel = (rec: string) => {
        switch (rec) {
            case "HIGHLY_RECOMMENDED": return "Highly Recommended"
            case "RECOMMENDED": return "Recommended"
            case "CONSIDER": return "Consider Applying"
            default: return "May Not Be a Good Fit"
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent scroll className="flex max-h-[90dvh] max-w-2xl flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                            {job.company.logoUrl ? (
                                <Image src={job.company.logoUrl} alt={job.company.name} fill className="object-cover" />
                            ) : (
                                <Building2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                            )}
                        </div>
                        <div>
                            <span className="block">{job.title}</span>
                            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">{job.company.name}</span>
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        See how well you match and get personalized recommendations
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-12 flex items-center justify-center">
                        <InlineLoader size="lg" className="text-neutral-600 dark:text-neutral-400" />
                    </div>
                ) : (
                    <div className="space-y-6 mt-4">
                        {shouldApply && (
                            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-900 dark:to-neutral-800/50 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Should You Apply?
                                    </h3>
                                    <Badge className={cn("text-sm px-3 py-1", getRecommendationColor(shouldApply.recommendation))}>
                                        {getRecommendationLabel(shouldApply.recommendation)}
                                    </Badge>
                                </div>
                                <StatBand
                                    size="sm"
                                    cols={3}
                                    className="mb-4"
                                    items={[
                                        { icon: Target, label: "Match Score", value: `${shouldApply.score}%` },
                                        {
                                            icon: Swords,
                                            label: "Competition",
                                            value: shouldApply.competition.level,
                                            tone: shouldApply.competition.level === "HIGH" ? "rose" : "neutral",
                                        },
                                        { icon: Users, label: "Applicants", value: shouldApply.competition.applicantsCount },
                                    ]}
                                />
                                <div className="space-y-2">
                                    {shouldApply.reasons.map((reason, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100 mt-0.5 shrink-0" />
                                            <span className="text-neutral-600 dark:text-neutral-300">{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {data && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Award className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                        Skills You Have ({data.matchedSkills.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {data.matchedSkills.map((skill, i) => (
                                            <Badge key={i} className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                {skill}
                                            </Badge>
                                        ))}
                                        {data.matchedSkills.length === 0 && (
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">No matching skills found</p>
                                        )}
                                    </div>
                                </div>

                                {data.missingRequired.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                            Skills You Need ({data.missingRequired.length})
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {data.missingRequired.map((skill, i) => (
                                                <Badge key={i} variant="outline" className="text-neutral-800 dark:text-neutral-200 border-neutral-300">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {data.learningRecommendations.length > 0 && (
                                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-50/50 dark:from-neutral-800/20 dark:to-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800">
                                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                            Learn & Boost Your Match
                                        </h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                            Complete these projects to increase your match to {data.potentialMatchAfterLearning}%
                                        </p>

                                        <div className="space-y-3">
                                            {data.learningRecommendations.map((rec, i) => (
                                                <Link
                                                    key={i}
                                                    href={`/projects/${rec.projectSlug}`}
                                                    className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg hover:shadow-md transition-all group"
                                                >
                                                    <div>
                                                        <div className="font-medium text-neutral-900 dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors">
                                                            {rec.projectTitle}
                                                        </div>
                                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            learn: <span className="text-neutral-800 dark:text-neutral-200">{rec.skill}</span> • ~{rec.estimatedHours}h
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-800 transition-colors" />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Link href={`/jobs/${job.slug}`} className="flex-1">
                                <Button className="w-full rounded-xl" size="lg">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Full Details
                                </Button>
                            </Link>
                            <Button variant="outline" className="rounded-xl" size="lg" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
