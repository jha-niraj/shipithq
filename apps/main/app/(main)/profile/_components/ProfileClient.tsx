"use client";

/**
 * `/profile` - where you maintain your profile (plan/profile PRF-11).
 *
 * Niraj's choice, 2026-09-25: a workspace-style editor, drawn in the language of
 * `projects/[slug]/workspace`. An identity strip on top; a left list of sections
 * with counts and completion ticks; the selected section's rows on the right, each
 * editable and deletable where it is shown. What other people READ is the one-pager
 * at `/profile/[username]` - this page is for changing it, and links there.
 *
 * Round one rendered the same `ProfileView` here and on the public route. That made
 * the two identical, and it also meant rows could only ever be added: the edit and
 * delete paths existed in every sheet and nothing opened them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, Camera, Check, Globe, Pencil, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Button } from "@repo/ui/components/ui/button";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { TabsNav } from "@repo/ui/components/ui/tabs";
import toast from "@repo/ui/components/ui/sonner";
import { cn } from "@repo/ui/lib/utils";
import { useUserStore } from "@/app/store/useUserStore";
import { getOwnProfile, getUserProfileStats } from "@/actions/(main)/user/profile.action";
import { uploadProfileImage } from "@/actions/(common)/shared/upload.action";
import { updateUserProfile } from "@/actions/(main)/user/user.action";
import type { ProfileStats } from "@/lib/profile/read";
import { ShareProfileModal } from "@/components/profile";
import { SkillsSheet } from "@/components/profile/sheets/skills-sheet";
import { ExperienceSheet } from "@/components/profile/sheets/experience-sheet";
import { EducationSheet } from "@/components/profile/sheets/education-sheet";
import { ProjectSheet } from "@/components/profile/sheets/project-sheet";
import { EditProfileSheet, type EditProfileTab } from "@/components/profile/sheets/edit-profile-sheet";
import {
    CareerPane, EducationPane, ExperiencePane, IdentityPane, LinksPane, ProjectsPane, SkillsPane,
    SECTIONS, sectionStatus, type OwnProfile, type SectionId,
} from "./profile-editor/sections";
import { ProfileEditorSkeleton } from "./profile-editor/skeleton";
import { ResumePane } from "./profile-editor/resume-pane";

type Editing =
    | { kind: "experience"; row: OwnProfile["experiences"][number] | null }
    | { kind: "education"; row: OwnProfile["educations"][number] | null }
    | { kind: "project"; row: OwnProfile["portfolioProjects"][number] | null }
    | { kind: "skills" }
    | { kind: "profile"; tab: EditProfileTab }
    | null;

const isSection = (v: string | null): v is SectionId => SECTIONS.some((s) => s.id === v);

export default function ProfileClient() {
    const fetchUser = useUserStore((s) => s.fetchUser);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const param = searchParams.get("section");
    // An unknown or missing `?section=` opens Identity.
    const section: SectionId = isSection(param) ? param : "identity";

    const [profile, setProfile] = useState<OwnProfile | null>(null);
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Editing>(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [p, s] = await Promise.all([getOwnProfile(), getUserProfileStats()]);
            if (!p.success || !p.user) {
                setError(p.error || "Could not load your profile");
                return;
            }
            setProfile(p.user);
            if (s.success) setStats(s.stats);
            setError(null);
        } catch (e: unknown) {
            console.error("Loading profile failed:", e);
            setError("Could not load your profile");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    // The phone strip scrolls sideways; bring the open section into view, or a
    // `?section=links` link opens with "Links" off the edge and nothing looks selected.
    const stripRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        stripRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
    }, [section, profile]);

    /** After any save: the page's data, and the store behind the header and sidebar. */
    const refresh = useCallback(async () => {
        await Promise.all([load(), fetchUser?.()]);
    }, [load, fetchUser]);

    const onUploadAvatar = useCallback(async (file: File) => {
        setAvatarBusy(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const result = await uploadProfileImage(form);
            if (!result.success || !result.url) {
                toast.error(result.message || "Could not upload that image");
                return;
            }
            // `uploadProfileImage` only stores the bytes; saving the URL is ours.
            await updateUserProfile({ image: result.url });
            await refresh();
            toast.success("Photo updated");
        } catch (e: unknown) {
            console.error("Avatar upload failed:", e);
            toast.error("Could not upload that image");
        } finally {
            setAvatarBusy(false);
        }
    }, [refresh]);

    if (error && !profile) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
                <AlertCircle className="size-5 text-neutral-400" />
                <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">Your profile did not load</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{error}</p>
                <Button size="sm" className="mt-4 cursor-pointer" onClick={() => void load()}>Try again</Button>
            </div>
        );
    }
    if (!profile) return <ProfileEditorSkeleton />;

    const status = sectionStatus(profile);
    const complete = SECTIONS.filter((s) => status[s.id].done).length;
    const hrefFor = (id: SectionId) => (id === "identity" ? pathname : `${pathname}?section=${id}`);
    const username = profile.username ?? "";

    return (
        // A centred max-w-5xl frame, not edge to edge (Niraj, 2026-09-25): at full
        // width the rows sat in a sea of black. Hairline sides so the frame reads as
        // one surface; the pane fills it rather than centring a narrower column.
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-neutral-200 bg-white text-neutral-900 lg:border-x dark:border-neutral-800 dark:bg-black dark:text-neutral-100">
            <IdentityStrip
                profile={profile}
                stats={stats}
                avatarBusy={avatarBusy}
                onUploadAvatar={onUploadAvatar}
                onEdit={() => setEditing({ kind: "profile", tab: "basic" })}
                onShare={() => setShareOpen(true)}
            />

            {/* Below lg, the section list is a scrolling strip of route tabs. */}
            <div ref={stripRef} className="border-b border-neutral-200 px-4 py-2 lg:hidden dark:border-neutral-800">
                <TabsNav
                    aria-label="Profile sections"
                    items={SECTIONS.map((s) => ({ href: hrefFor(s.id), label: s.label, active: s.id === section }))}
                />
            </div>

            <div className="flex min-h-0 flex-1">
                <nav aria-label="Profile sections" className="hidden w-56 shrink-0 border-r border-neutral-200 lg:block dark:border-neutral-800">
                    <div className="sticky top-0">
                        <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Profile</span>
                            <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">{complete} of {SECTIONS.length}</span>
                        </div>
                        <ul className="p-2">
                            {SECTIONS.map((s) => {
                                const active = s.id === section;
                                const st = status[s.id];
                                return (
                                    <li key={s.id}>
                                        <Link
                                            href={hrefFor(s.id)}
                                            scroll={false}
                                            aria-current={active ? "page" : undefined}
                                            className={cn(
                                                "flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors",
                                                active
                                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900",
                                            )}
                                        >
                                            <span className="flex-1 truncate">{s.label}</span>
                                            {st.count !== undefined && st.count > 0 ? (
                                                <span className={cn("text-[11px] tabular-nums", active ? "opacity-70" : "text-neutral-500 dark:text-neutral-400")}>{st.count}</span>
                                            ) : st.done ? (
                                                <Check className={cn("size-3.5", active ? "opacity-80" : "text-neutral-500")} aria-label="Complete" />
                                            ) : (
                                                <span className={cn("size-1.5 rounded-full", active ? "bg-white/50 dark:bg-neutral-900/40" : "bg-neutral-300 dark:bg-neutral-700")} aria-label="Not filled in" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </nav>

                <main className="min-w-0 flex-1">
                    {section === "identity" && <IdentityPane p={profile} onEdit={() => setEditing({ kind: "profile", tab: "basic" })} />}
                    {section === "experience" && (
                        <ExperiencePane p={profile} onChanged={refresh}
                            onAdd={() => setEditing({ kind: "experience", row: null })}
                            onEdit={(row) => setEditing({ kind: "experience", row })} />
                    )}
                    {section === "education" && (
                        <EducationPane p={profile} onChanged={refresh}
                            onAdd={() => setEditing({ kind: "education", row: null })}
                            onEdit={(row) => setEditing({ kind: "education", row })} />
                    )}
                    {section === "projects" && (
                        <ProjectsPane p={profile} onChanged={refresh}
                            onAdd={() => setEditing({ kind: "project", row: null })}
                            onEdit={(row) => setEditing({ kind: "project", row })} />
                    )}
                    {section === "skills" && <SkillsPane p={profile} onManage={() => setEditing({ kind: "skills" })} />}
                    {section === "links" && <LinksPane p={profile} onChanged={refresh} />}
                    {section === "resume" && <ResumePane onChanged={refresh} />}
                    {section === "career" && <CareerPane p={profile} onEdit={() => setEditing({ kind: "profile", tab: "career" })} />}
                </main>
            </div>

            {/* ── Sheets ── */}
            <EditProfileSheet
                open={editing?.kind === "profile"}
                onOpenChange={(o) => !o && setEditing(null)}
                initialTab={editing?.kind === "profile" ? editing.tab : "basic"}
                details={{
                    username: profile.username,
                    image: profile.image,
                    name: profile.name ?? "",
                    headline: profile.userProfile?.tagline ?? "",
                    bio: profile.bio ?? "",
                    location: profile.location ?? "",
                    website: profile.website ?? "",
                    occupation: profile.occupation ?? "",
                    company: profile.company ?? "",
                    university: profile.university ?? "",
                    openToWork: profile.openToWork,
                    careerGoals: profile.careerGoals ?? [],
                    targetCompanies: profile.targetCompanies ?? [],
                    expectedSalary: profile.expectedSalary ?? "",
                    noticePeriod: profile.noticePeriod ?? "",
                    workExperience: profile.workExperience ?? "",
                    visibility: profile.isPublicProfile === false ? "PRIVATE" : profile.userProfile?.visibility ?? "PUBLIC",
                    showEmail: profile.userProfile?.showEmail ?? false,
                    showResume: profile.userProfile?.showResume ?? true,
                }}
                onSaved={refresh}
                onUploadAvatar={onUploadAvatar}
                avatarBusy={avatarBusy}
            />
            <ExperienceSheet
                open={editing?.kind === "experience"}
                onOpenChange={(o) => !o && setEditing(null)}
                experience={editing?.kind === "experience" ? editing.row : null}
                onSaved={refresh}
            />
            <EducationSheet
                open={editing?.kind === "education"}
                onOpenChange={(o) => !o && setEditing(null)}
                education={editing?.kind === "education" ? editing.row : null}
                onSaved={refresh}
            />
            <ProjectSheet
                open={editing?.kind === "project"}
                onOpenChange={(o) => !o && setEditing(null)}
                project={editing?.kind === "project" ? editing.row : null}
                onSaved={refresh}
            />
            <SkillsSheet
                open={editing?.kind === "skills"}
                onOpenChange={(o) => !o && setEditing(null)}
                skills={profile.skills}
                onSaved={refresh}
            />
            <ShareProfileModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                username={username}
                name={profile.name}
                image={profile.image}
                visibility={profile.isPublicProfile === false ? "PRIVATE" : profile.userProfile?.visibility ?? "PUBLIC"}
            />
        </div>
    );
}

// ── Identity strip ──────────────────────────────────────────────────────────

function IdentityStrip({ profile, stats, avatarBusy, onUploadAvatar, onEdit, onShare }: {
    profile: OwnProfile;
    stats: ProfileStats | null;
    avatarBusy: boolean;
    onUploadAvatar: (f: File) => void;
    onEdit: () => void;
    onShare: () => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const name = profile.name || profile.username || "You";
    const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const headline = profile.userProfile?.tagline || [profile.occupation, profile.company].filter(Boolean).join(" at ");
    const lp = stats?.levelProgress;

    return (
        <header className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarBusy}
                        aria-label="Change profile photo"
                        className="group relative shrink-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                        <Avatar className="size-14 rounded-2xl">
                            {profile.image && <AvatarImage src={profile.image} alt="" className="object-cover" />}
                            <AvatarFallback className="rounded-2xl bg-neutral-100 text-base font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                            "absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-white transition-opacity",
                            avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}>
                            {avatarBusy ? <InlineLoader size="sm" label="Uploading photo" /> : <Camera className="size-4" />}
                        </span>
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) onUploadAvatar(f);
                        }}
                    />
                    <div className="min-w-0">
                        <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">@{profile.username}</p>
                        <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{name}</h1>
                        <p className={cn("mt-0.5 truncate text-[13px]", headline ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-400 dark:text-neutral-500")}>
                            {headline || "No headline yet"}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                    {stats && (
                        <div className="w-full sm:w-44">
                            <div className="flex items-baseline justify-between text-xs">
                                <span className="font-medium text-neutral-900 dark:text-white">Level {stats.level}</span>
                                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                                    {lp?.isMax ? `${stats.xp} XP` : `${lp?.intoLevel ?? 0} / ${lp?.levelSpan ?? 0} XP`}
                                </span>
                            </div>
                            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${lp?.percent ?? 0}%` }} />
                            </div>
                        </div>
                    )}
                    {/* Below sm the three share the row evenly; at 390px their full labels overflowed. */}
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                        {profile.username && (
                            <Button asChild size="sm" variant="outline" className="min-w-0 cursor-pointer">
                                {/* Relative on purpose: this navigates, it is not a link to share.
                                    `publicProfileUrl()` is the absolute production URL, which in
                                    development opens a different host. */}
                                <Link href={`/profile/${encodeURIComponent(profile.username)}`} target="_blank">
                                    <Globe className="mr-1.5 size-3.5 shrink-0" /><span className="truncate"><span className="sm:hidden">Public</span><span className="hidden sm:inline">View public page</span></span>
                                </Link>
                            </Button>
                        )}
                        <Button size="sm" variant="outline" className="min-w-0 cursor-pointer" onClick={onShare}>
                            <Send className="mr-1.5 size-3.5 shrink-0" /> Share
                        </Button>
                        <Button size="sm" className="min-w-0 cursor-pointer" onClick={onEdit}>
                            <Pencil className="mr-1.5 size-3.5 shrink-0" /><span className="truncate">Edit<span className="hidden sm:inline"> profile</span></span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
