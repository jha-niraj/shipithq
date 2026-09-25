'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import { cn } from '@repo/ui/lib/utils'
import {
    Youtube, FileText, BookOpen, GraduationCap, MessageCircle, Wrench, Video, Newspaper,
    Palette, Sparkles, Github, ExternalLink, ThumbsUp, Eye, Trash2, ShieldCheck
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

/** What a type is called in a row. */
const TYPE_LABEL: Record<ResourceType, string> = {
    YOUTUBE_VIDEO: 'YouTube',
    VIDEO: 'Video',
    DOCUMENTATION: 'Docs',
    BLOG_ARTICLE: 'Article',
    COURSE: 'Course',
    DISCORD_COMMUNITY: 'Community',
    TOOL_RECOMMENDATION: 'Tool',
    DESIGN_MOCKUP: 'Mockup',
    DESIGN_INSPIRATION: 'Inspiration',
    GITHUB_REPO: 'GitHub',
    OTHER: 'Link',
}

/** "nirajjha.com" from a link, or the link when it is not a URL. */
function hostOf(link: string): string {
    try {
        return new URL(link).host.replace(/^www\./, '')
    } catch {
        return link
    }
}

interface ResourcesListProps {
    projectId: string
    currentUserId?: string | null
    isCreator?: boolean
}

interface ResourceItem {
    id: string
    /** The project it was shared on: this one, or the original a copy reads from (PJ-21). */
    projectId: string
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
    // Why there is nothing to show, when it is not "there is nothing yet".
    const [denied, setDenied] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<string>('ALL')
    const [markedHelpful, setMarkedHelpful] = useState<Record<string, boolean>>({})

    const fetchResources = useCallback(async () => {
        setLoading(true)
        const result = await getProjectResources({ projectId })
        setDenied(result.success ? null : (result.error || 'Resources could not be loaded.'))
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

    /*
     * Rows, not cards (Niraj, 2026-09-24: "too big text"), monochrome - the red
     * and pink type badges were off-palette - and a skeleton of rows while
     * loading, never a loader where content will be (CLAUDE.md, loading).
     */
    if (loading) return <ResourcesSkeleton />
    // Resources are for the project's owner and the people building it
    // (lib/projects/access.ts); say so rather than claiming there are none.
    if (denied) return <NotYours message="Resources show up here once this project is yours: enrol to get your own copy." />

    const typeCounts = resources.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                {/* One dropdown, not eleven chips wrapping onto three lines (PJ-16 item 3). */}
                <HoverSelect
                    ariaLabel="Filter resources by type"
                    value={selectedType}
                    onValueChange={setSelectedType}
                    className="w-44"
                    options={RESOURCE_TYPES.map((type) => ({
                        ...type,
                        count: type.value === 'ALL' ? resources.length : (typeCounts[type.value] || 0),
                    }))}
                />
                {(currentUserId || isCreator) && <AddResourceSheet projectId={projectId} />}
            </div>
            {filteredResources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700">
                    <FileText className="mx-auto h-5 w-5 text-neutral-500" />
                    <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
                        {selectedType === 'ALL' ? 'No resources yet' : `No ${RESOURCE_TYPES.find(t => t.value === selectedType)?.label.toLowerCase()} yet`}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">Share a video, doc or article that helped you build this.</p>
                </div>
            ) : (
                <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {filteredResources.map((resource) => {
                        const Icon = RESOURCE_ICONS[resource.type as ResourceType] ?? FileText
                        // As the server decides it: the author, or the creator of the project it
                        // was shared ON - not the owner of a copy showing an original's resource.
                        const canDelete = currentUserId && (resource.userId === currentUserId || (isCreator && resource.projectId === projectId))
                        const busy = busyId === resource.id
                        return (
                            <li key={resource.id} className="group flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <button type="button" onClick={() => handleResourceClick(resource)} className="min-w-0 flex-1 cursor-pointer text-left">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline group-hover:underline-offset-4 dark:text-white">{resource.title}</span>
                                        {resource.isOfficial && (
                                            <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-neutral-600 dark:text-neutral-400" title="Added by the project's creator">
                                                <ShieldCheck className="h-3 w-3" /> Official
                                            </span>
                                        )}
                                        <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                                    </span>
                                    {resource.description && (
                                        <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-700 dark:text-neutral-300">{resource.description}</span>
                                    )}
                                    <span className="mt-1 block truncate text-[11px] text-neutral-600 dark:text-neutral-400">
                                        {TYPE_LABEL[resource.type as ResourceType] ?? 'Link'} · {hostOf(resource.link)} · {resource.user.username || resource.user.name || 'someone'} · {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
                                    </span>
                                </button>
                                <div className="flex shrink-0 items-center gap-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                                    <span className="inline-flex items-center gap-1 px-1.5" title="Views"><Eye className="h-3.5 w-3.5" />{resource.views}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={busy}
                                        aria-pressed={!!markedHelpful[resource.id]}
                                        aria-label="Mark as helpful"
                                        onClick={() => handleToggleHelpful(resource.id)}
                                        className={cn('h-7 gap-1 px-1.5 text-xs', markedHelpful[resource.id] && 'text-neutral-900 dark:text-white')}
                                    >
                                        {busy ? <InlineLoader size="sm" /> : <ThumbsUp className={cn('h-3.5 w-3.5', markedHelpful[resource.id] && 'fill-current')} />}
                                        {resource.helpfulCount}
                                    </Button>
                                    {canDelete && (
                                        <Button variant="ghost" size="sm" disabled={busy} aria-label="Delete this resource" onClick={() => handleDelete(resource.id)} className="h-7 w-7 p-0">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

/* The shape of the list while it loads: the toolbar, then three rows. */
function ResourcesSkeleton() {
    return (
        <div className="space-y-4" aria-busy aria-label="Loading resources">
            <ShimmerStyles />
            <div className="flex items-center justify-between">
                <Shimmer className="h-9 w-44 rounded-lg" />
                <Shimmer className="h-8 w-32 rounded-lg" delay={0.05} />
            </div>
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-3.5 py-3">
                        <Shimmer className="h-8 w-8 rounded-lg" delay={i * 0.05} />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Shimmer className="h-3.5 w-2/5" delay={i * 0.05 + 0.03} />
                            <Shimmer className="h-2.5 w-3/5" delay={i * 0.05 + 0.06} />
                        </div>
                        <Shimmer className="h-5 w-20 rounded" delay={i * 0.05 + 0.08} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function NotYours({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{message}</p>
        </div>
    )
}
