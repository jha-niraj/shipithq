'use client'

import { useState } from 'react'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, 
    SheetTrigger
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@repo/ui/components/ui/select'
import {
    Plus, Youtube, FileText, BookOpen, GraduationCap, MessageCircle, Video, Newspaper,
    Wrench, Palette, Sparkles, Github
} from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { addProjectResource } from '@/actions/(main)/projects/resources.action'
import { useRouter } from 'next/navigation'
import { ResourceType } from '@repo/db'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

/*
 * One neutral ink for every type, in both themes (2026-09-24). These were
 * `text-neutral-800`, dark on the dark menu, so the icon on a highlighted row
 * (neutral-800 too) vanished outright - "Course" looked iconless. YouTube red
 * and Design pink broke the monochrome palette as well.
 */
const ICON = 'text-neutral-600 dark:text-neutral-400'

const RESOURCE_TYPES = [
    { value: 'YOUTUBE_VIDEO', label: 'YouTube Video', icon: Youtube, color: ICON },
    { value: 'VIDEO', label: 'Video', icon: Video, color: ICON },
    { value: 'DOCUMENTATION', label: 'Documentation', icon: BookOpen, color: ICON },
    { value: 'BLOG_ARTICLE', label: 'Blog Article', icon: Newspaper, color: ICON },
    { value: 'COURSE', label: 'Course', icon: GraduationCap, color: ICON },
    { value: 'DISCORD_COMMUNITY', label: 'Discord/Community', icon: MessageCircle, color: ICON },
    { value: 'TOOL_RECOMMENDATION', label: 'Tool Recommendation', icon: Wrench, color: ICON },
    { value: 'DESIGN_MOCKUP', label: 'Design Mockup', icon: Palette, color: ICON },
    { value: 'DESIGN_INSPIRATION', label: 'Design Inspiration', icon: Sparkles, color: ICON },
    { value: 'GITHUB_REPO', label: 'GitHub Repository', icon: Github, color: ICON },
    { value: 'OTHER', label: 'Other', icon: FileText, color: ICON },
]

interface AddResourceSheetProps {
    projectId: string
}

export default function AddResourceSheet({ projectId }: AddResourceSheetProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        type: '' as ResourceType | '',
        description: ''
    })
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.link || !formData.type) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)

        const result = await addProjectResource({
            projectId,
            title: formData.title,
            link: formData.link,
            type: formData.type as ResourceType,
            description: formData.description || undefined
        })

        if (result.success) {
            toast.success('Resource added successfully!')
            setOpen(false)
            setFormData({ title: '', link: '', type: '', description: '' })
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to add resource')
        }

        setLoading(false)
    }

    const selectedTypeConfig = RESOURCE_TYPES.find(t => t.value === formData.type)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" className="w-fit gap-2">
                    <Plus className="w-4 h-4" />
                    Add Learning Resource
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
                <section className="w-full max-w-5xl mx-auto">
                    <SheetHeader>
                        <SheetTitle>Add Learning Resource</SheetTitle>
                        <SheetDescription>
                            Share a helpful resource with the community
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g., Complete React Tutorial"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                maxLength={200}
                                required
                            />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {formData.title.length}/200 characters
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">
                                Resource Type <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value as ResourceType })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select resource type">
                                        {
                                            selectedTypeConfig && (
                                                <div className="flex items-center gap-2">
                                                    <selectedTypeConfig.icon className={`w-4 h-4 ${selectedTypeConfig.color}`} />
                                                    <span>{selectedTypeConfig.label}</span>
                                                </div>
                                            )
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        RESOURCE_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <type.icon className={`w-4 h-4 ${type.color}`} />
                                                    <span>{type.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="link">
                                Link <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="link"
                                type="url"
                                placeholder="https://..."
                                value={formData.link}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                required
                            />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Full URL to the resource
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">
                                Description <span className="text-neutral-500 dark:text-neutral-400">(Optional)</span>
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of what this resource covers..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {
                                    loading ? (
                                        <>
                                            <InlineLoader size="sm" className="mr-2" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Resource
                                        </>
                                    )
                                }
                            </Button>
                        </div>
                    </form>
                </section>
            </SheetContent>
        </Sheet>
    )
}