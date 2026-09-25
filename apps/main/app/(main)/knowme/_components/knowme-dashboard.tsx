"use client";

/**
 * The KnowMe dashboard.
 *
 * ── Layout ───────────────────────────────────────────────────────────────────
 * A full-height flex column, not a page that scrolls. `h-screen` is retargeted
 * at the shell's `--page-h` by a rule in globals.css, so it means "the page
 * card", not "the viewport"; a raw `100vh` here would overflow the card by
 * 24px. Under the header the row splits into the chat (which takes the whole
 * remaining height, per Niraj 2026-08-29) and a sidebar that scrolls on its own.
 *
 * Below `lg` the row stacks and the page scrolls normally - a 400px chat above a
 * 600px sidebar in a single scroller is fine on a phone, and two nested
 * scrollers there are not.
 *
 * ── What this screen owes the owner ──────────────────────────────────────────
 * It used to render `<Badge>Active</Badge>` as a literal string while the row
 * said `ERROR`, next to "0 questions" and "0 visitors" - which reads as "nobody
 * came" when the truth was "it never worked". The status block now reports the
 * real status, why, and what to do about it. See KM-9.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Bot, Share2, Key, RefreshCw, Copy, Check,
    ExternalLink, Github, FileText, ToggleLeft, ToggleRight, ChevronRight,
    Sparkles, AlertTriangle, Database,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import {
    Avatar, AvatarFallback, AvatarImage
} from "@repo/ui/components/ui/avatar";
import { cn } from "@repo/ui/lib/utils";
import toast from "@repo/ui/components/ui/sonner";
import type { KnowMeProfileFull } from "@/types/knowme";
import {
    sendChatMessage, getOrCreateChatSession, triggerManualUpdate
} from "@/actions/(main)/knowme";
import { formatRelativeDate } from "@/utils/knowme/format";
import { knowMeProfileUrl } from "@/lib/urls";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { KnowMeChat, type KnowMeChatMessage } from "@/components/knowme/knowme-chat";

interface KnowMeDashboardProps {
    profile: KnowMeProfileFull;
}

/**
 * What each status MEANS to the person who owns the profile, in their words
 * rather than the enum's.
 *
 * `tone: "bad"` is the only one that gets a red treatment, and only ERROR earns
 * it. PROCESSING is work in progress and must not read as a failure; INACTIVE
 * and SETUP are states the owner chose or has not left yet.
 */
const STATUS_COPY: Record<
    KnowMeProfileFull["status"],
    { label: string; blurb: string; tone: "good" | "bad" | "neutral" }
> = {
    ACTIVE: {
        label: "Live",
        blurb: "Your link answers questions from anyone who opens it.",
        tone: "good",
    },
    PROCESSING: {
        label: "Indexing",
        blurb: "Reading your work. Answers get better as this finishes.",
        tone: "neutral",
    },
    SETUP: {
        label: "Setup",
        blurb: "Finish onboarding to put your assistant online.",
        tone: "neutral",
    },
    PAUSED: {
        label: "Paused",
        blurb: "Your link is up but not answering. Resume it in settings.",
        tone: "neutral",
    },
    INACTIVE: {
        label: "Off",
        blurb: "Nobody can reach your assistant while it is off.",
        tone: "neutral",
    },
    ERROR: {
        label: "Not working",
        blurb: "The last attempt to read your work failed, so your assistant has nothing to answer from.",
        tone: "bad",
    },
};

const OWNER_SUGGESTIONS = [
    "What are my strongest technical skills?",
    "Summarise my most impressive project",
    "What would you tell a recruiter about me?",
    "Where are the gaps in my experience?",
];

/** Sparkles is the assistant rail's mark. This one is a Bot, on purpose. */
function KnowMeMark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "flex items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
                className,
            )}
        >
            <Bot className="h-[60%] w-[60%]" />
        </span>
    );
}

export default function KnowMeDashboard({ profile }: KnowMeDashboardProps) {
    const [messages, setMessages] = useState<KnowMeChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const profileUrl = knowMeProfileUrl(profile.user.username ?? "");
    const hasNothingIndexed = profile.indexedChunks === 0;

    useEffect(() => {
        async function initSession() {
            const result = await getOrCreateChatSession(profile.id);
            if (result.success && result.data) {
                setSessionId(result.data.id);
                if (result.data.messages.length > 0) {
                    setMessages(result.data.messages.map((m) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        createdAt: m.createdAt,
                    })));
                }
            }
        }
        initSession();
    }, [profile.id]);

    const handleSend = useCallback(async (text: string) => {
        if (!sessionId) return;

        setMessages((prev) => [...prev, {
            id: `local-${Date.now()}`,
            role: "user",
            content: text,
            createdAt: new Date(),
        }]);
        setIsLoading(true);

        try {
            const result = await sendChatMessage(sessionId, text);
            if (result.success && result.answer) {
                setMessages((prev) => [...prev, {
                    id: `local-${Date.now() + 1}`,
                    role: "assistant",
                    content: result.answer as string,
                    createdAt: new Date(),
                }]);
            } else {
                toast.error(result.error || "Failed to get response");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleManualUpdate = async () => {
        setIsUpdating(true);
        try {
            const result = await triggerManualUpdate();
            if (result.success) {
                toast.success("Knowledge base updated");
            } else {
                toast.error(result.error || "Failed to update");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="page-frame flex h-screen min-h-0 flex-col px-page py-4">
            {/* NO page header. The sidebar already carries "KnowMe" with Overview,
                Analytics and Settings under it, so a title bar repeating the module
                name and duplicating two of its own nav links spent the top ~70px of
                a full-height page telling the user where they already knew they
                were. Niraj, 2026-08-29. The chat gets that height instead. */}

            {/* min-h-0 so the chat column can shrink. Without it the grid row sizes to
                its tallest child and the chat's own scroller never engages. */}
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900"
                >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <div className="flex min-w-0 items-center gap-2">
                            <KnowMeMark className="h-7 w-7 shrink-0 rounded-lg" />
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                    Ask it what a visitor would
                                </h2>
                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                    Same answers your public link gives
                                </p>
                            </div>
                        </div>
                        <StatusPill status={profile.status} />
                    </div>

                    {/* The chat has a fixed height on mobile because the page scrolls
                        there; on lg the parent gives it the rest of the column. */}
                    <div className="flex min-h-[26rem] flex-1 flex-col lg:min-h-0">
                        <KnowMeChat
                            messages={messages}
                            isLoading={isLoading}
                            onSend={handleSend}
                            disabled={!sessionId}
                            suggestions={OWNER_SUGGESTIONS}
                            mark={<KnowMeMark className="h-5 w-5 rounded" />}
                            emptyMark={<KnowMeMark className="h-12 w-12 rounded-xl" />}
                            assistantName="Your KnowMe AI"
                            emptyTitle={
                                hasNothingIndexed
                                    ? "Nothing is indexed yet"
                                    : "Try it the way a recruiter would"
                            }
                            emptyHint={
                                hasNothingIndexed
                                    ? "Your assistant has no chunks to answer from, so it will say it does not know. Update the knowledge base first."
                                    : "Whatever it says here is what a stranger on your public link gets."
                            }
                            placeholder="Ask a question about yourself..."
                            footer="Enter to send · Shift+Enter for a new line · this chat is private to you"
                        />
                    </div>
                </motion.section>

                {/* On lg this is its own scroller so a long sidebar never grows the page.
                    Below lg it is just a stack in the page's own scroll. */}
                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="min-h-0 min-w-0"
                >
                    <ScrollArea className="h-full min-h-0 min-w-0" reflow>
                        <div className="space-y-4 lg:pr-3">
                            <StatusCard
                                profile={profile}
                                onUpdate={handleManualUpdate}
                                isUpdating={isUpdating}
                            />

                            <Card>
                                <CardTitle icon={<FileText className="h-4 w-4" />}>
                                    Data sources
                                </CardTitle>
                                <div className="space-y-1">
                                    <DataSourceItem
                                        icon={
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={profile.user.image || undefined} />
                                                <AvatarFallback className="text-xs">
                                                    {profile.user.name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                        }
                                        label="ShipItHQ profile"
                                        enabled={profile.includePersonalData}
                                    />
                                    <DataSourceItem
                                        icon={<FileText className="h-4 w-4" />}
                                        label="Resume"
                                        enabled={profile.personalData.some((d) => d.dataType === "RESUME")}
                                    />
                                    {profile.platformConnections.map((conn) => (
                                        <DataSourceItem
                                            key={conn.id}
                                            icon={<Github className="h-4 w-4" />}
                                            label={conn.platform}
                                            enabled={conn.isConnected}
                                            subtitle={conn.platformUsername || undefined}
                                        />
                                    ))}
                                </div>
                                <Button asChild variant="ghost" size="sm" className="mt-3 w-full gap-2">
                                    <Link href="/knowme/settings">
                                        Manage data sources
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </Card>

                            <div className="rounded-2xl bg-neutral-900 p-5 text-white dark:bg-neutral-800">
                                <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                                    <Share2 className="h-4 w-4" />
                                    Your public link
                                </h3>
                                <p className="mb-3 text-xs text-neutral-300">
                                    Anyone with this link can ask about you. No account needed.
                                </p>
                                <div className="flex gap-2">
                                    <div className="min-w-0 flex-1 truncate rounded-lg bg-white/10 px-3 py-2 font-mono text-xs">
                                        {profileUrl}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleCopyLink}
                                        aria-label="Copy public link"
                                        className="shrink-0"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 w-full gap-2 text-white hover:bg-white/10 hover:text-white"
                                >
                                    <Link href={profileUrl} target="_blank">
                                        <ExternalLink className="h-4 w-4" />
                                        Open it as a visitor
                                    </Link>
                                </Button>
                            </div>

                            <Card>
                                <CardTitle icon={<Key className="h-4 w-4" />}>API</CardTitle>
                                <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
                                    Embed the same answers in your own site.
                                </p>
                                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                                    <Link href="/knowme/settings?tab=api">
                                        <Sparkles className="h-4 w-4" />
                                        Get API keys
                                    </Link>
                                </Button>
                            </Card>
                        </div>
                    </ScrollArea>
                </motion.aside>
            </div>
        </div>
    );
}

/**
 * The honest version of the old hardcoded `<Badge>Active</Badge>`.
 *
 * Two numbers sit beside it deliberately. "Chunks indexed" is the one that says
 * whether the assistant knows anything at all - a profile can be ACTIVE with
 * zero chunks and answer every question with "they have not said".
 */
function StatusCard({
    profile,
    onUpdate,
    isUpdating,
}: {
    profile: KnowMeProfileFull;
    onUpdate: () => void;
    isUpdating: boolean;
}) {
    const status = STATUS_COPY[profile.status];
    const job = profile.lastJob;
    const showFailure = profile.status === "ERROR" || job?.status === "FAILED";

    return (
        <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
                <CardTitle icon={<Database className="h-4 w-4" />}>Status</CardTitle>
                <StatusPill status={profile.status} />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{status.blurb}</p>

            {showFailure && job?.error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-red-900 dark:text-red-200">
                                The last update failed{job.createdAt ? ` ${formatRelativeDate(job.createdAt)}` : ""}
                            </p>
                            {/* The raw text is an operator's message, not the headline.
                                `break-words` because it is a sentence with no spaces in
                                the wrong places, and it must not widen the sidebar. */}
                            <p className="mt-1 text-xs break-words text-red-800/80 dark:text-red-300/80">
                                {job.error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <dl className="mt-4 space-y-2.5">
                <Row
                    label="Chunks indexed"
                    value={profile.indexedChunks.toLocaleString()}
                    muted={profile.indexedChunks === 0}
                />
                <Row
                    label="Last updated"
                    value={profile.lastUpdatedAt ? formatRelativeDate(profile.lastUpdatedAt) : "Never"}
                    muted={!profile.lastUpdatedAt}
                />
                <Row label="Questions answered" value={profile.totalQuestionsAnswered.toLocaleString()} />
                <Row label="Visitors" value={profile.totalVisitors.toLocaleString()} />
            </dl>

            <Button
                variant="outline"
                size="sm"
                onClick={onUpdate}
                disabled={isUpdating}
                className="mt-4 w-full gap-2"
            >
                {isUpdating ? <InlineLoader size="sm" /> : <RefreshCw className="h-4 w-4" />}
                {isUpdating ? "Updating..." : showFailure ? "Try again" : "Update knowledge base"}
            </Button>
        </Card>
    );
}

function StatusPill({ status }: { status: KnowMeProfileFull["status"] }) {
    const copy = STATUS_COPY[status];
    return (
        <Badge
            variant="secondary"
            className={cn(
                "shrink-0 gap-1.5",
                copy.tone === "bad" &&
                "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200",
                copy.tone === "good" &&
                "border-neutral-300 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
            )}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {copy.label}
        </Badge>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            {children}
        </div>
    );
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
            <span className="text-neutral-500 dark:text-neutral-400">{icon}</span>
            {children}
        </h3>
    );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-neutral-600 dark:text-neutral-400">{label}</dt>
            <dd
                className={cn(
                    "text-sm font-medium text-neutral-900 dark:text-white",
                    muted && "text-neutral-500 dark:text-neutral-400",
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function DataSourceItem({
    icon,
    label,
    enabled,
    subtitle,
}: {
    icon: React.ReactNode;
    label: string;
    enabled: boolean;
    subtitle?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {icon}
                </span>
                <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">
                        {label}
                    </span>
                    {subtitle && (
                        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                            @{subtitle}
                        </span>
                    )}
                </div>
            </div>
            {enabled ? (
                <ToggleRight className="h-5 w-5 shrink-0 text-neutral-900 dark:text-white" aria-label="On" />
            ) : (
                <ToggleLeft className="h-5 w-5 shrink-0 text-neutral-400" aria-label="Off" />
            )}
        </div>
    );
}
