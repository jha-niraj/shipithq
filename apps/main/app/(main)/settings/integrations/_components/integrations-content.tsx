'use client'

import { useState, useEffect } from 'react'
import { signIn } from '@repo/auth/client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import {
    Twitter, Linkedin, Link2, Unlink, Check, RefreshCw,
    GitPullRequest, GitBranch, Star, ExternalLink
} from 'lucide-react'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle
} from '@repo/ui/components/ui/alert-dialog'
import { cn } from '@repo/ui/lib/utils'
import toast from '@repo/ui/components/ui/sonner'
import { 
    disconnectSocialAccount 
} from '@/actions/(main)/social/social-connections.action'
import {
    getGitHubProfile, disconnectGitHub, syncGitHubContributions
} from '@/actions/(main)/user/integrations.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"

interface Connection {
    id: string
    provider: 'TWITTER' | 'LINKEDIN'
    accountName: string | null
    accountHandle: string | null
    accountImage: string | null
    isActive: boolean
    connectedAt: Date
}

interface IntegrationsContentProps {
    socialConnections: Connection[]
}

// No brand colours. Each of these carried its own hex - Twitter blue and LinkedIn blue -
// painted onto the icon tile AND the Connect button, which put two different saturated blues
// on a page whose palette is pinned to monochrome black/neutral (CLAUDE.md rules out blue
// explicitly). The GitHub row directly above them was already neutral, so the section did not
// even agree with itself.
//
// The icons still identify the platforms; they do not need to be the platform's blue to do
// it, and a Connect button has no reason to be a different colour per row.
const SOCIAL_PLATFORMS = [
    {
        id: 'TWITTER' as const,
        name: 'Twitter / X',
        icon: Twitter,
        description: 'Share achievements on Twitter',
    },
    {
        id: 'LINKEDIN' as const,
        name: 'LinkedIn',
        icon: Linkedin,
        description: 'Share achievements on LinkedIn',
    },
]

export function IntegrationsContent({ socialConnections }: IntegrationsContentProps) {
    const [connections, setConnections] = useState(socialConnections)
    const [disconnecting, setDisconnecting] = useState<string | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; provider: 'TWITTER' | 'LINKEDIN' | null }>({
        open: false,
        provider: null,
    })
    const [githubProfile, setGitHubProfile] = useState<{
        username: string
        avatarUrl: string | null
        profileUrl: string | null
        connectedAt: Date
        lastSyncAt: Date | null
    } | null>(null)
    const [contributionSummary, setContributionSummary] = useState<{
        totalPRs: number
        mergedPRs: number
        openPRs: number
        totalRepos: number
        totalCommits: number
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [githubDisconnecting, setGithubDisconnecting] = useState(false)

    useEffect(() => {
        loadGitHubProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount
    }, [])

    const loadGitHubProfile = async () => {
        setLoading(true)
        try {
            const result = await getGitHubProfile()
            if (result.success && result.profile) {
                setGitHubProfile(result.profile as typeof githubProfile)
                if (result.contributionSummary) {
                    setContributionSummary(result.contributionSummary as typeof contributionSummary)
                }
            }
        } catch {
            console.error('Error loading GitHub profile')
        } finally {
            setLoading(false)
        }
    }

    const getConnection = (provider: 'TWITTER' | 'LINKEDIN') =>
        connections.find((c) => c.provider === provider && c.isActive)

    const handleConnectSocial = (_platform: typeof SOCIAL_PLATFORMS[number]) => {
        toast.info('OAuth integration coming soon!', {
            description: 'Social account connection requires API setup.',
        })
    }

    const handleDisconnectSocial = async () => {
        if (!confirmDialog.provider) return
        setDisconnecting(confirmDialog.provider)
        try {
            const result = await disconnectSocialAccount(confirmDialog.provider)
            if (result.success) {
                toast.success('Account disconnected')
                setConnections((prev) =>
                    prev.filter((c) => !(c.provider === confirmDialog.provider && c.isActive))
                )
            } else {
                toast.error(result.error || 'Failed to disconnect')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setDisconnecting(null)
            setConfirmDialog({ open: false, provider: null })
        }
    }

    const handleConnectGitHub = async () => {
        try {
            await signIn.social({ provider: 'github', callbackURL: '/settings/integrations' })
        } catch {
            toast.error('Failed to connect GitHub')
        }
    }

    const handleDisconnectGitHub = async () => {
        if (!confirm('Disconnect GitHub? Your contribution data will be preserved.')) return
        setGithubDisconnecting(true)
        try {
            const result = await disconnectGitHub()
            if (result.success) {
                setGitHubProfile(null)
                setContributionSummary(null)
                toast.success('GitHub disconnected')
            } else {
                toast.error(result.error || 'Failed to disconnect')
            }
        } catch {
            toast.error('Failed to disconnect GitHub')
        } finally {
            setGithubDisconnecting(false)
        }
    }

    const handleSyncGitHub = async () => {
        setSyncing(true)
        try {
            const result = await syncGitHubContributions()
            if (result.success) {
                toast.success('Contributions synced!')
                await loadGitHubProfile()
            } else {
                toast.error(result.error || 'Failed to sync')
            }
        } catch {
            toast.error('Failed to sync')
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect accounts for sharing achievements and tracking contributions
                </p>
            </div>

            {/* GitHub */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white dark:text-neutral-900" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-lg">GitHub</CardTitle>
                                <CardDescription>Track open source contributions</CardDescription>
                            </div>
                        </div>
                        {loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <InlineLoader size="sm" />
                                <span className="text-sm">Loading...</span>
                            </div>
                        ) : githubProfile ? (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleSyncGitHub} disabled={syncing}>
                                    {syncing ? <InlineLoader size="sm" className="mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                                    Sync
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDisconnectGitHub}
                                    disabled={githubDisconnecting}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Unlink className="w-4 h-4" />
                                </Button>
                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900/10 text-neutral-800 dark:text-neutral-100 text-sm">
                                    <Check className="w-4 h-4" />
                                    Connected
                                </span>
                            </div>
                        ) : (
                            <Button onClick={handleConnectGitHub} size="sm">
                                <Link2 className="w-4 h-4 mr-2" />
                                Connect GitHub
                            </Button>
                        )}
                    </div>
                </CardHeader>
                {githubProfile && (
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Image
                                width={48}
                                height={48}
                                src={githubProfile.avatarUrl || `https://github.com/${githubProfile.username}.png`}
                                alt={githubProfile.username}
                                className="rounded-full border-2 border-border"
                            />
                            <div>
                                <p className="font-medium">@{githubProfile.username}</p>
                                <p className="text-sm text-muted-foreground">
                                    Connected {new Date(githubProfile.connectedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <a
                                href={githubProfile.profileUrl || `https://github.com/${githubProfile.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto"
                            >
                                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </a>
                        </div>
                        {contributionSummary && (
                            <StatBand
                                size="sm"
                                cols={5}
                                items={[
                                    { icon: GitPullRequest, label: 'PRs', value: contributionSummary.totalPRs },
                                    { icon: Check, label: 'Merged', value: contributionSummary.mergedPRs },
                                    { icon: GitBranch, label: 'Open', value: contributionSummary.openPRs },
                                    { icon: Star, label: 'Repos', value: contributionSummary.totalRepos },
                                    { icon: GitBranch, label: 'Commits', value: contributionSummary.totalCommits },
                                ]}
                            />
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Social Sharing */}
            <Card>
                <CardHeader>
                    <CardTitle>Social Sharing</CardTitle>
                    <CardDescription>
                        Connect to share achievements and badges
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {SOCIAL_PLATFORMS.map((platform) => {
                        const connection = getConnection(platform.id)
                        const isConnected = !!connection
                        const Icon = platform.icon
                        return (
                            <motion.div
                                key={platform.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    'flex items-center justify-between p-4 rounded-lg border',
                                    isConnected ? 'border-neutral-900/30 bg-neutral-900/5' : 'bg-muted/30'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Same neutral tile as the GitHub row above. */}
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                                        <Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{platform.name}</p>
                                        <p className="text-sm text-muted-foreground">{platform.description}</p>
                                    </div>
                                </div>
                                {isConnected ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmDialog({ open: true, provider: platform.id })}
                                        disabled={disconnecting === platform.id}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Unlink className="w-4 h-4 mr-2" />
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleConnectSocial(platform)}
                                    >
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Connect
                                    </Button>
                                )}
                            </motion.div>
                        )
                    })}
                </CardContent>
            </Card>

            <AlertDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog({ open, provider: confirmDialog.provider })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure? You won&apos;t be able to share achievements until you reconnect.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnectSocial} className="bg-red-600 hover:bg-red-700">
                            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

