"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Pencil, Share2, Settings, Plus, MapPin, Building2, Globe, GraduationCap, Briefcase, Sparkles, Zap, FolderKanban, Users, ExternalLink, Calendar, FileText, ArrowRight, UserPlus, UserCheck, Upload, Eye, Trash2, Camera } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { cn } from "@repo/ui/lib/utils";
import toast from "@repo/ui/components/ui/sonner";
import { validateResumeFile } from "@/lib/resume-extractor.client";

// ─────────────────────────────────────────────────────────────────────────────
// The profile page. Both of them.
//
// There used to be two: `/profile` rendered stacked sections, and
// `/profile/[username]` rendered a header + tab bar + sidebar out of a separate
// set of thirteen components. Same data, same intent, two visibly different
// products, and any change to "how a profile looks" had to be made twice - which
// is exactly why they had drifted apart.
//
// This is the one layout. `isOwn` is a prop rather than a second component,
// because a prop cannot drift from itself.
//
// PRESENTATION ONLY. No fetching, no store, no server actions. Both callers own
// their own data loading and hand the result down, which is what lets the same
// markup serve a client-fetched page and a server-rendered one.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileViewSkill {
    id: string;
    name: string;
    level?: string | null;
    category?: string | null;
}

export interface ProfileViewData {
    id: string;
    name: string | null;
    username: string | null;
    email?: string | null;
    image: string | null;
    bio: string | null;
    headline?: string | null;
    location: string | null;
    company: string | null;
    university: string | null;
    website: string | null;
    hasResume?: boolean;
    skills: ProfileViewSkill[];
    experiences: Array<{
        id: string;
        companyName: string;
        roleTitle: string;
        description?: string | null;
        startDate: Date | string;
        endDate?: Date | string | null;
        isCurrentlyWorking?: boolean;
    }>;
    educations: Array<{
        id: string;
        institution: string;
        degree?: string | null;
        startDate?: Date | string | null;
        endDate?: Date | string | null;
    }>;
    projects: Array<{
        id: string;
        projectName: string;
        description?: string | null;
        status?: string | null;
        technologies?: string[];
    }>;
    socialLinks: Array<{ id: string; platform: string; url: string }>;
}

export interface ProfileViewStats {
    xp: number;
    level: number;
    projectsCount: number;
    skillsCount: number;
    followersCount: number;
}

export interface ProfileViewProps {
    profile: ProfileViewData;
    stats: ProfileViewStats;
    /** Owner sees edit affordances; a visitor sees Follow. */
    isOwn: boolean;

    // ── Owner actions. Each one gates its own button, so a caller that forgets
    //    to pass a handler renders no button rather than a dead one.
    onEdit?: () => void;
    onShare?: () => void;
    onAddSkills?: () => void;
    onAddExperience?: () => void;
    onAddEducation?: () => void;
    onAddProject?: () => void;

    // ── Resume. Owner only. The view owns the input and the client-side size /
    //    type check; the actual upload is the caller's, so this component stays
    //    free of server actions.
    /** Same contract as the resume: the view owns the picker, the caller owns the upload. */
    onUploadAvatar?: (file: File) => void | Promise<void>;
    avatarBusy?: boolean;

    onUploadResume?: (file: File) => void | Promise<void>;
    onViewResume?: () => void | Promise<void>;
    onDeleteResume?: () => void | Promise<void>;
    resumeBusy?: boolean;

    // ── Visitor actions.
    isFollowing?: boolean;
    followPending?: boolean;
    onFollow?: () => void;
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, action, children }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    action?: { label: string; onClick: () => void };
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-neutral-900 dark:text-white" />
                    <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {title}
                    </h2>
                </div>
                {action && (
                    <button
                        type="button"
                        onClick={action.onClick}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                    >
                        <Plus className="h-3.5 w-3.5" /> {action.label}
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

// py-6, not py-8. On a new profile every card is this component, so the page is mostly empty
// state - and each one reserving 64px of vertical padding for a single line of text is a good
// part of what made the sections feel far apart.
function Empty({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
    return (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="cursor-pointer text-sm font-medium text-neutral-900 hover:underline dark:text-white"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

function dateRange(start: Date | string | null | undefined, end: Date | string | null | undefined, current?: boolean) {
    const fmt = (d: Date | string) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (!start) return current ? "Present" : "";
    return `${fmt(start)} - ${current ? "Present" : end ? fmt(end) : "Present"}`;
}

// ─── The page ────────────────────────────────────────────────────────────────

export function ProfileView({
    profile, stats, isOwn,
    onEdit, onShare, onAddSkills, onAddExperience, onAddEducation, onAddProject,
    onUploadAvatar, avatarBusy,
    onUploadResume, onViewResume, onDeleteResume, resumeBusy,
    isFollowing, followPending, onFollow,
}: ProfileViewProps) {
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Checked here rather than server-side only, so an obviously wrong file is refused
    // before it costs a round trip. The server checks again regardless - this is a
    // courtesy, not a control.
    const uploadAvatar = async (file: File) => {
        if (!onUploadAvatar) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            toast.error("Use a PNG, JPEG or WebP image.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("That image is over 5MB.");
            return;
        }
        await onUploadAvatar(file);
    };

    const handleResumeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset immediately so picking the SAME file twice still fires a change
        // event - the usual "I fixed the file and re-picked it" case.
        e.target.value = "";
        if (!file || !onUploadResume) return;
        const check = validateResumeFile(file);
        if (!check.valid) {
            toast.error(check.error ?? "Unsupported file");
            return;
        }
        void onUploadResume(file);
    };
    // XP inside the current level. Levels are 1000 XP wide, so the bar shows the
    // remainder - a lifetime total would sit at ~100% forever and say nothing.
    const xpIntoLevel = stats.xp % 1000;
    const xpProgress = Math.min(100, Math.round((xpIntoLevel / 1000) * 100));

    const { experiences, educations, projects, skills, socialLinks } = profile;

    const metaBits = [
        profile.location && { icon: MapPin, text: profile.location },
        profile.company && { icon: Building2, text: profile.company },
        profile.university && { icon: GraduationCap, text: profile.university },
    ].filter(Boolean) as Array<{ icon: React.ComponentType<{ className?: string }>; text: string }>;

    /** An Add action, but only on your own profile. */
    const own = (label: string, handler?: () => void) =>
        isOwn && handler ? { label, onClick: handler } : undefined;

    return (
        <div className="mx-auto w-full max-w-5xl space-y-3 px-page py-5 pb-8">
            {/* ── Identity ── */}
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
                {/* The cover band is gone. It was `h-24 sm:h-28` of flat gradient with
                    nothing in it and nothing behind it - not an uploaded image, not a
                    fallback for one, just 96-112px of the most valuable space on the page
                    pushing the actual profile below the fold.

                    The avatar used to hang into it on a negative margin, so that comes off
                    with it and the header gets ordinary padding. */}
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-4">
                            {/* The avatar is the uploader when it is your own profile.
                                Previously the only way to change it was Edit -> a field in a
                                modal, which is a long way round for the one thing on this page
                                that is obviously an image you would click to replace.

                                `isOwn` gates it: on someone else's profile this is a plain
                                picture and must not offer a file picker. */}
                            <div
                                className={cn(
                                    "group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 sm:h-24 sm:w-24",
                                    isOwn && onUploadAvatar && "cursor-pointer",
                                )}
                                onClick={isOwn && onUploadAvatar ? () => avatarInputRef.current?.click() : undefined}
                                role={isOwn && onUploadAvatar ? "button" : undefined}
                                tabIndex={isOwn && onUploadAvatar ? 0 : undefined}
                                aria-label={isOwn && onUploadAvatar ? "Change profile photo" : undefined}
                                onKeyDown={
                                    isOwn && onUploadAvatar
                                        ? (e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault()
                                                avatarInputRef.current?.click()
                                            }
                                        }
                                        : undefined
                                }
                            >
                                {profile.image ? (
                                    // `unoptimized` because avatars come from Google, GitHub and
                                    // Cloudinary; routing them through Next's optimiser would
                                    // need every one of those hosts allow-listed.
                                    <Image
                                        src={profile.image}
                                        alt={profile.name ?? "Profile photo"}
                                        width={96}
                                        height={96}
                                        className="h-full w-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                                        {(profile.name ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {isOwn && onUploadAvatar && (
                                    <>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) void uploadAvatar(file)
                                                // Reset, or picking the SAME file twice in a
                                                // row fires no change event.
                                                e.target.value = ""
                                            }}
                                        />
                                        <span
                                            className={cn(
                                                "absolute inset-0 flex items-center justify-center bg-neutral-900/60 text-white transition-opacity",
                                                avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100",
                                            )}
                                        >
                                            {avatarBusy ? <InlineLoader size="md" /> : <Camera className="h-5 w-5" />}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="min-w-0 pb-1">
                                <h1 className="truncate text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
                                    {profile.name ?? (isOwn ? "Your profile" : "Developer")}
                                </h1>
                                {profile.username && (
                                    <p className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
                                        @{profile.username}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {isOwn ? (
                                <>
                                    {onEdit && (
                                        <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
                                            <Pencil className="h-3.5 w-3.5" /> Edit
                                        </Button>
                                    )}
                                    {onShare && (
                                        <Button size="sm" variant="outline" className="gap-1.5" onClick={onShare}>
                                            <Share2 className="h-3.5 w-3.5" /> Share
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                        <Link href="/settings">
                                            <Settings className="h-3.5 w-3.5" /> Settings
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {onFollow && (
                                        <Button
                                            size="sm"
                                            variant={isFollowing ? "outline" : "default"}
                                            className="gap-1.5"
                                            onClick={onFollow}
                                            disabled={followPending}
                                        >
                                            {followPending ? (
                                                <InlineLoader size="sm" />
                                            ) : isFollowing ? (
                                                <UserCheck className="h-3.5 w-3.5" />
                                            ) : (
                                                <UserPlus className="h-3.5 w-3.5" />
                                            )}
                                            {isFollowing ? "Following" : "Follow"}
                                        </Button>
                                    )}
                                    {onShare && (
                                        <Button size="sm" variant="outline" className="gap-1.5" onClick={onShare}>
                                            <Share2 className="h-3.5 w-3.5" /> Share
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {profile.headline && (
                        <p className="mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            {profile.headline}
                        </p>
                    )}
                    {profile.bio && (
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {profile.bio}
                        </p>
                    )}

                    {(metaBits.length > 0 || profile.website) && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            {metaBits.map((m) => (
                                <span key={m.text} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                                    <m.icon className="h-3.5 w-3.5" /> {m.text}
                                </span>
                            ))}
                            {profile.website && (
                                <a
                                    href={profile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-neutral-900 hover:underline dark:text-white"
                                >
                                    <Globe className="h-3.5 w-3.5" /> Website
                                </a>
                            )}
                        </div>
                    )}

                    {/* Level. The "XP to next level" readout is the owner's own
                        business - a visitor gets the level, not the grind. */}
                    <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-white">
                                <Sparkles className="h-3.5 w-3.5" /> Level {stats.level}
                            </span>
                            {isOwn && (
                                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                    {xpIntoLevel} / 1000 XP to level {stats.level + 1}
                                </span>
                            )}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-neutral-900 to-neutral-800 transition-all dark:from-neutral-200 dark:to-neutral-400"
                                style={{ width: `${xpProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "Total XP", value: stats.xp.toLocaleString(), icon: Zap },
                            { label: "Projects", value: stats.projectsCount, icon: FolderKanban },
                            { label: "Skills", value: stats.skillsCount, icon: Sparkles },
                            { label: "Followers", value: stats.followersCount, icon: Users },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-xl border border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800">
                                <div className="flex items-center gap-1.5">
                                    <stat.icon className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                                </div>
                                <p className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* ── Sections. One scroll, no tabs: a profile is scanned top to
                   bottom, and tabs hide four fifths of it behind a click a
                   recruiter will not make. ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                    <Section title="Projects" icon={FolderKanban} action={own("Add", onAddProject)}>
                        {projects.length === 0 ? (
                            <Empty
                                text={isOwn ? "No projects on your profile yet." : "No projects yet."}
                                action={own("Add your first project", onAddProject)}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {projects.slice(0, 6).map((p) => (
                                    <div
                                        key={p.id}
                                        className="rounded-xl border border-neutral-100 p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600"
                                    >
                                        <div className="mb-1.5 flex items-start justify-between gap-2">
                                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-white">
                                                {p.projectName}
                                            </h3>
                                            {p.status && (
                                                <Badge variant="secondary" className="shrink-0 text-xs">{p.status}</Badge>
                                            )}
                                        </div>
                                        {p.description && (
                                            <p className="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                                                {p.description}
                                            </p>
                                        )}
                                        {p.technologies && p.technologies.length > 0 && (
                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                {p.technologies.slice(0, 4).map((t) => (
                                                    <span
                                                        key={t}
                                                        className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Work Experience" icon={Briefcase} action={own("Add", onAddExperience)}>
                        {experiences.length === 0 ? (
                            <Empty
                                text={isOwn ? "No work experience added yet." : "No work experience listed."}
                                action={own("Add a role", onAddExperience)}
                            />
                        ) : (
                            <div className="space-y-4">
                                {experiences.map((e) => (
                                    <div key={e.id} className="flex gap-3">
                                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            <Briefcase className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                                                {e.roleTitle}
                                            </p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{e.companyName}</p>
                                            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                                <Calendar className="h-3 w-3" />
                                                {dateRange(e.startDate, e.endDate, e.isCurrentlyWorking)}
                                            </p>
                                            {e.description && (
                                                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                                    {e.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Education" icon={GraduationCap} action={own("Add", onAddEducation)}>
                        {educations.length === 0 ? (
                            <Empty
                                text={isOwn ? "No education added yet." : "No education listed."}
                                action={own("Add your school", onAddEducation)}
                            />
                        ) : (
                            <div className="space-y-4">
                                {educations.map((ed) => (
                                    <div key={ed.id} className="flex gap-3">
                                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            <GraduationCap className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                                                {ed.institution}
                                            </p>
                                            {ed.degree && (
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{ed.degree}</p>
                                            )}
                                            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                                <Calendar className="h-3 w-3" />
                                                {dateRange(ed.startDate, ed.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                <div className="space-y-3">
                    <Section title="Skills" icon={Sparkles} action={own("Manage", onAddSkills)}>
                        {skills.length === 0 ? (
                            <Empty
                                text={isOwn ? "No skills added yet." : "No skills listed."}
                                action={own("Add skills", onAddSkills)}
                            />
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill) => (
                                    <span
                                        key={skill.id}
                                        className={cn(
                                            "rounded-lg border px-2.5 py-1 text-sm font-medium",
                                            "border-neutral-200 bg-neutral-50 text-neutral-700",
                                            "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
                                        )}
                                    >
                                        {skill.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Owner only. The file itself is behind a signed URL, and
                        whether someone has a resume on file is not a visitor's
                        business. */}
                    {isOwn && (
                        <Section title="Resume" icon={FileText}>
                            {/* One input for both upload and replace - replacing IS
                                uploading, and the worker re-reads the newest text
                                when its alarm fires. */}
                            <input
                                ref={resumeInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf"
                                className="hidden"
                                onChange={handleResumeFile}
                            />

                            {profile.hasResume ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3.5 dark:border-neutral-800">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <FileText className="h-4 w-4 shrink-0 text-neutral-900 dark:text-white" />
                                            <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                                                Resume on file
                                            </span>
                                        </div>
                                        {onViewResume && (
                                            <button
                                                type="button"
                                                onClick={() => void onViewResume()}
                                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-medium text-neutral-900 hover:underline dark:text-white"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> View
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {onUploadResume && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                disabled={resumeBusy}
                                                onClick={() => resumeInputRef.current?.click()}
                                            >
                                                {resumeBusy
                                                    ? <InlineLoader size="sm" />
                                                    : <Upload className="h-3.5 w-3.5" />}
                                                Replace
                                            </Button>
                                        )}
                                        {onDeleteResume && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 text-neutral-500 dark:text-neutral-400 hover:text-red-600"
                                                disabled={resumeBusy}
                                                onClick={() => void onDeleteResume()}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                            </Button>
                                        )}
                                        <Link
                                            href="/ai/resume"
                                            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-neutral-900 hover:underline dark:text-white"
                                        >
                                            Resume Builder <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            ) : onUploadResume ? (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        disabled={resumeBusy}
                                        onClick={() => resumeInputRef.current?.click()}
                                        className={cn(
                                            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors",
                                            "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500",
                                            resumeBusy && "cursor-not-allowed opacity-60",
                                        )}
                                    >
                                        {resumeBusy
                                            ? <InlineLoader size="md" className="text-neutral-500 dark:text-neutral-400" />
                                            : <Upload className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />}
                                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                            {resumeBusy ? "Uploading…" : "Upload your resume"}
                                        </span>
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                            PDF or DOCX, up to 5MB
                                        </span>
                                    </button>
                                    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                                        We read the text out of your file and let AI structure it into sections you
                                        can edit. It powers the AI resume builder, cover letters and interview prep.
                                    </p>
                                </div>
                            ) : (
                                <Empty text="No resume uploaded. It powers the AI resume builder, cover letters and interview prep." />
                            )}
                        </Section>
                    )}

                    {socialLinks.length > 0 && (
                        <Section title="Links" icon={Globe}>
                            <div className="space-y-2">
                                {socialLinks.map((l) => (
                                    <a
                                        key={l.id}
                                        href={l.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                                    >
                                        <span className="truncate">{l.platform}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0 text-neutral-600 dark:text-neutral-400" />
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfileView;
