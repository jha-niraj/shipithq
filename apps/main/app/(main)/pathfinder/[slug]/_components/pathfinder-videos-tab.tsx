'use client'

import {
    Tabs, TabsList, TabsTrigger, TabsContent
} from '@repo/ui/components/ui/tabs'
import { ListVideo, FileText, ExternalLink } from 'lucide-react'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import type { SubGoalResources } from '@/app/store/pathfinderStore'

function getYouTubeVideoId(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    } catch { return null }
    return null
}

interface PathfinderVideosTabProps {
    aiResources: SubGoalResources | null | undefined
}

export function PathfinderVideosTab({ aiResources }: PathfinderVideosTabProps) {
    const videos = aiResources?.videos ?? []
    const docs = aiResources?.documentations ?? []

    return (
        <Tabs defaultValue="videos" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="mx-4 mt-4 flex-shrink-0">
                <TabsList size="sm" fit>
                    <TabsTrigger value="videos" icon={<ListVideo />}>Videos ({videos.length})</TabsTrigger>
                    <TabsTrigger value="documents" icon={<FileText />}>Documents ({docs.length})</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="videos" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                        {videos.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                                <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No videos for this topic yet</p>
                            </div>
                        ) : (
                            videos.map((v, i) => {
                                const videoId = getYouTubeVideoId(v.url)
                                return (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                                    >
                                        {videoId ? (
                                            <div className="aspect-video bg-black">
                                                <iframe
                                                    className="w-full h-full"
                                                    src={`https://www.youtube.com/embed/${videoId}`}
                                                    title={v.description ?? 'Video'}
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <a
                                                href={v.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                            >
                                                <ListVideo className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                        {v.description || v.url}
                                                    </p>
                                                    {v.duration && (
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{v.duration}</span>
                                                    )}
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                            </a>
                                        )}
                                        {videoId && v.description && (
                                            <div className="p-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800">
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                    {v.description}
                                                </p>
                                                {v.duration && (
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{v.duration}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="documents" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                        {docs.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No documents for this topic yet</p>
                            </div>
                        ) : (
                            docs.map((d, i) => (
                                <a
                                    key={i}
                                    href={d.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                            {d.description || d.url}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{d.url}</p>
                                        {d.type && (
                                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                                                {d.type}
                                            </span>
                                        )}
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                                </a>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>
    )
}
