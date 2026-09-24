'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Card, CardContent, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Avatar, AvatarFallback, AvatarImage
} from '@repo/ui/components/ui/avatar'
import {
    Youtube, FileText, BookOpen, GraduationCap, MessageCircle, Wrench, Video, Newspaper,
    Palette, Sparkles, Github, ExternalLink, ThumbsUp, Eye, Trash2, Shield
} from 'lucide-react'
import {
    getProjectResources, toggleResourceHelpful, deleteProjectResource,
    incrementResourceView
} from '@/actions/(main)/projects/resources.action'
import { ResourceType } from '@repo/db'
import toast from '@repo/ui/components/ui/sonner'
import { formatDistanceToNow } from 'date-fns'
import AddResourceSheet from './add-resource-sheet'
import { HoverSelect } from './hover-select'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

const RESOURCE_TYPES = [
    { value: 'ALL', label: 'All Resources', icon: FileText },
    { value: 'YOUTUBE_VIDEO', label: 'YouTube', icon: Youtube },
    { value: 'VIDEO', label: 'Videos', icon: Video },
    { value: 'DOCUMENTATION', label: 'Docs', icon: BookOpen },
    { value: 'BLOG_ARTICLE', label: 'Articles', icon: Newspaper },
    { value: 'COURSE', label: 'Courses', icon: GraduationCap },
    { value: 'DISCORD_COMMUNITY', label: 'Community', icon: MessageCircle },
    { value: 'TOOL_RECOMMENDATION', label: 'Tools', icon: Wrench },
    { value: 'DESIGN_MOCKUP', label: 'Mockups', icon: Palette },
    { value: 'DESIGN_INSPIRATION', label: 'Inspiration', icon: Sparkles },
    { value: 'GITHUB_REPO', label: 'GitHub', icon: Github },
]

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
    YOUTUBE_VIDEO: Youtube,
    VIDEO: Video,
    DOCUMENTATION: BookOpen,
    BLOG_ARTICLE: Newspaper,
    COURSE: GraduationCap,
    DISCORD_COMMUNITY: MessageCircle,
    TOOL_RECOMMENDATION: Wrench,
    DESIGN_MOCKUP: Palette,
    DESIGN_INSPIRATION: Sparkles,
    GITHUB_REPO: Github,
    OTHER: FileText,
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
    YOUTUBE_VIDEO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    VIDEO: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    DOCUMENTATION: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    BLOG_ARTICLE: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    COURSE: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    DISCORD_COMMUNITY: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    TOOL_RECOMMENDATION: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    DESIGN_MOCKUP: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    DESIGN_INSPIRATION: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100',
    GITHUB_REPO: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    OTHER: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
}

interface ResourcesListProps {
    projectId: string
    currentUserId?: string | null
    isCreator?: boolean
}

interface ResourceItem {
    id: string
    type: ResourceType
    title: string
    description?: string | null
    link: string
    isOfficial: boolean
    helpfulCount: number
    views: number
    userId: string
    markedHelpfulBy: string[]
    createdAt: Date
    user: {
        name: string | null
        username: string | null
        image: string | null
    }
}

export default function ResourcesList({ projectId, currentUserId, isCreator }: ResourcesListProps) {
    const [resources, setResources] = useState<ResourceItem[]>([])
    const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedType, setSelectedType] = useState<string>('ALL')
    const [markedHelpful, setMarkedHelpful] = useState<Record<string, boolean>>({})

    const fetchResources = useCallback(async () => {
        setLoading(true)
        const result = await getProjectResources({ projectId })
        if (result.success && result.resources) {
            setResources(result.resources)
            setFilteredResources(result.resources)

            // Check which ones current user marked as helpful
            if (currentUserId) {
                const marked: Record<string, boolean> = {}
                result.resources.forEach((r: ResourceItem) => {
                    marked[r.id] = r.markedHelpfulBy.includes(currentUserId)
                })
                setMarkedHelpful(marked)
            }
        }
        setLoading(false)
    }, [projectId, currentUserId]);

    useEffect(() => {
        fetchResources()
    }, [fetchResources])

    useEffect(() => {
        if (selectedType === 'ALL') {
            setFilteredResources(resources)
        } else {
            setFilteredResources(resources.filter(r => r.type === selectedType))
        }
    }, [selectedType, resources])

    /*
     * All three of these ran a server action and showed nothing while it did
     * (sweep 2026-09-23, loading P0 4-6): the vote count jumped late, a deleted
     * row sat there looking undeleted, and a failed vote was silent.
     */
    const [busyId, setBusyId] = useState<string | null>(null)

    const handleToggleHelpful = async (resourceId: string) => {
        if (!currentUserId) {
            toast.error('Please sign in to mark resources as helpful')
            return
        }
        if (busyId) return
        setBusyId(resourceId)
        try {
            const result = await toggleResourceHelpful(resourceId)
            if (!result.success) {
                toast.error(result.error || 'That did not save. Try again.')
                return
            }
            setMarkedHelpful(prev => ({ ...prev, [resourceId]: result.marked! }))
            setResources(prev => prev.map(r =>
                r.id === resourceId
                    ? { ...r, helpfulCount: r.helpfulCount + (result.marked ? 1 : -1) }
                    : r
            ))
        } finally {
            setBusyId(null)
        }
    }

    const handleDelete = async (resourceId: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return
        if (busyId) return
        setBusyId(resourceId)
        try {
            const result = await deleteProjectResource(resourceId)
            if (result.success) {
                toast.success('Resource deleted')
                setResources(prev => prev.filter(r => r.id !== resourceId))
            } else {
                toast.error(result.error || 'Failed to delete resource')
            }
        } finally {
            setBusyId(null)
        }
    }

    const handleResourceClick = (resource: ResourceItem) => {
        /*
         * Open FIRST, count after.
         *
         * This used to `await incrementResourceView(...)` before `window.open`,
         * which breaks the user-gesture chain - by the time the open ran, the
         * browser no longer treated it as user-initiated and popup blockers ate
         * the tab. The count is not worth losing the click over, so it is fired
         * and forgotten.
         */
        window.open(resource.link, '_blank', 'noopener,noreferrer')
        void incrementResourceView(resource.id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <InlineLoader size="lg" />
            </div>
        )
    }

    const typeCounts = resources.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* One dropdown, not eleven chips wrapping onto three lines (PJ-16 item 3). */}
                <HoverSelect
                    ariaLabel="Filter resources by type"
                    value={selectedType}
                    onValueChange={setSelectedType}
                    className="w-full sm:w-52"
                    options={RESOURCE_TYPES.map((type) => ({
                        ...type,
                        count: type.value === 'ALL' ? resources.length : (typeCounts[type.value] || 0),
                    }))}
                />
                {
                    (currentUserId || isCreator) && (
                        <AddResourceSheet projectId={projectId} />
                    )
                }
            </div>
            {
                filteredResources.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto text-neutral-600 dark:text-neutral-400 mb-4" />
                        <p className="text-neutral-600 dark:text-neutral-400">
                            {
                                selectedType === 'ALL'
                                    ? 'No resources added yet. Be the first to share!'
                                    : `No ${RESOURCE_TYPES.find(t => t.value === selectedType)?.label} resources found`
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {
                            filteredResources.map((resource) => {
                                const Icon = RESOURCE_ICONS[resource.type as ResourceType]
                                const colorClass = RESOURCE_COLORS[resource.type as ResourceType]
                                const canDelete = currentUserId && (resource.userId === currentUserId || isCreator)

                                return (
                                    <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className={`${colorClass} gap-1`}>
                                                            <Icon className="w-3 h-3" />
                                                            {resource.type.replace(/_/g, ' ')}
                                                        </Badge>
                                                        {
                                                            resource.isOfficial && (
                                                                <Badge variant="outline" className="gap-1">
                                                                    <Shield className="w-3 h-3" />
                                                                    Official
                                                                </Badge>
                                                            )
                                                        }
                                                    </div>
                                                    <CardTitle className="text-lg break-words">
                                                        {resource.title}
                                                    </CardTitle>
                                                </div>
                                                {
                                                    canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={busyId === resource.id}
                                                            aria-label="Delete this resource"
                                                            onClick={() => handleDelete(resource.id)}
                                                            className="flex-shrink-0"
                                                        >
                                                            {busyId === resource.id
                                                                ? <InlineLoader size="sm" />
                                                                : <Trash2 className="w-4 h-4" />}
                                                        </Button>
                                                    )
                                                }
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {
                                                resource.description && (
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                        {resource.description}
                                                    </p>
                                                )
                                            }
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between"
                                                onClick={() => handleResourceClick(resource)}
                                            >
                                                <span className="truncate text-sm">{resource.link}</span>
                                                <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" />
                                            </Button>
                                            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                                <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                                                    <div className="flex items-center gap-1">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={resource.user.image || undefined} />
                                                            <AvatarFallback>{resource.user.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{resource.user.username || resource.user.name}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                                                        <Eye className="w-4 h-4" />
                                                        <span>{resource.views}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={busyId === resource.id}
                                                        onClick={() => handleToggleHelpful(resource.id)}
                                                        className={markedHelpful[resource.id] ? 'text-neutral-800 dark:text-neutral-200' : ''}
                                                    >
                                                        {busyId === resource.id ? (
                                                            <InlineLoader size="sm" />
                                                        ) : (
                                                            <ThumbsUp className={`w-4 h-4 ${markedHelpful[resource.id] ? 'fill-current' : ''}`} />
                                                        )}
                                                        <span className="ml-1">{resource.helpfulCount}</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        }
                    </div>
                )
            }
        </div>
    )
}