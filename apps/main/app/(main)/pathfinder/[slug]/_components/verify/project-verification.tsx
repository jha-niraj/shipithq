'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from '@repo/ui/components/ui/dialog'
import {
    CheckCircle2, Lock, Wrench, Rocket, ExternalLink, Github, 
    FolderPlus
} from 'lucide-react'
import { VerificationSectionStatus } from '@repo/db'
import { submitProject } from '@/actions/(main)/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import Link from 'next/link'

interface Project {
    title: string
    description: string
}

interface ProjectVerificationProps {
    goalId: string
    minorProject?: Project | null
    majorProject?: Project | null
    status: VerificationSectionStatus
    complete: boolean
}

export function ProjectVerification({
    goalId,
    minorProject,
    majorProject,
    status,
    complete
}: ProjectVerificationProps) {
    const [showAddProject, setShowAddProject] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [projectForm, setProjectForm] = useState({
        title: '',
        description: '',
        demoUrl: '',
        githubUrl: '',
    })

    // Show completed state
    if (status === 'COMPLETED' || complete) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Project Submitted!</h3>
                    <p className="text-neutral-500 dark:text-neutral-400">Your project has been verified.</p>
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
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Project Locked</h3>
                    <p className="text-neutral-500 dark:text-neutral-400">Complete the Mock Interview section first to unlock Project submission.</p>
                </div>
            </div>
        )
    }

    const handleSubmitPortfolioProject = async () => {
        if (!projectForm.title || !projectForm.description) {
            toast.error('Please fill in all required fields')
            return
        }

        setIsSubmitting(true)
        const result = await submitProject(goalId, 'PORTFOLIO', 'custom')
        setIsSubmitting(false)

        if (result.success) {
            setShowAddProject(false)
            toast.success('Project submitted successfully!')
        } else {
            toast.error(result.error || 'Failed to submit project')
        }
    }

    // Show project options
    return (
        <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-neutral-800 to-red-600 flex items-center justify-center mb-4 shadow-lg">
                        <Wrench className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Project Verification</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        Build a project to demonstrate your practical skills. Choose one of the options below.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-neutral-900/10">
                                <Rocket className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Build with ShipItHQ</h3>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                            Use our guided project builder with AI assistance, task management, and built-in collaboration tools.
                        </p>
                        {
                            (minorProject || majorProject) && (
                                <div className="space-y-2 mb-4">
                                    {
                                        minorProject && (
                                            <div className="p-3 rounded-lg bg-white dark:bg-neutral-900">
                                                <Badge variant="secondary" className="mb-1">Minor</Badge>
                                                <div className="font-medium text-sm">{minorProject.title}</div>
                                            </div>
                                        )
                                    }
                                    {
                                        majorProject && (
                                            <div className="p-3 rounded-lg bg-white dark:bg-neutral-900">
                                                <Badge className="mb-1 bg-neutral-900">Major</Badge>
                                                <div className="font-medium text-sm">{majorProject.title}</div>
                                            </div>
                                        )
                                    }
                                </div>
                            )
                        }
                        <Link href="/projects">
                            <Button className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800">
                                <Rocket className="w-4 h-4 mr-2" />
                                Start Building
                            </Button>
                        </Link>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <FolderPlus className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add Your Own Project</h3>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                            Already built something? Add your existing project to your portfolio and verify your skills.
                        </p>
                        <div className="space-y-2 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                <span>Add GitHub repository</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                <span>Include demo link</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                <span>Showcase in your portfolio</span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowAddProject(true)}
                        >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Add Project
                        </Button>
                    </motion.div>
                </div>

                {
                    (minorProject || majorProject) && (
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Suggested Projects</h3>
                            <div className="space-y-4">
                                {
                                    minorProject && (
                                        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Badge variant="secondary" className="mb-2">Minor Project</Badge>
                                                    <h4 className="font-semibold text-neutral-900 dark:text-white">{minorProject.title}</h4>
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{minorProject.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                {
                                    majorProject && (
                                        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Badge className="mb-2 bg-neutral-900">Major Project (Recommended)</Badge>
                                                    <h4 className="font-semibold text-neutral-900 dark:text-white">{majorProject.title}</h4>
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{majorProject.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    )
                }
            </div>

            <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Your Project</DialogTitle>
                        <DialogDescription>
                            Add an existing project to verify your skills and showcase in your portfolio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Project Title *</Label>
                            <Input
                                id="title"
                                placeholder="My Awesome Project"
                                value={projectForm.title}
                                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what you built and the technologies used..."
                                value={projectForm.description}
                                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="github">GitHub URL</Label>
                            <div className="flex items-center gap-2">
                                <Github className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                <Input
                                    id="github"
                                    placeholder="https://github.com/username/repo"
                                    value={projectForm.githubUrl}
                                    onChange={(e) => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo">Demo URL</Label>
                            <div className="flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                <Input
                                    id="demo"
                                    placeholder="https://myproject.vercel.app"
                                    value={projectForm.demoUrl}
                                    onChange={(e) => setProjectForm({ ...projectForm, demoUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddProject(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitPortfolioProject} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}