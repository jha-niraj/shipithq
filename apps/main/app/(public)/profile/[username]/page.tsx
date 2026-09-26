import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@repo/auth";
import { Button } from "@repo/ui/components/ui/button";
import { loadPublicProfile } from "@/lib/profile/read";
import { publicProfileUrl } from "@/lib/urls";
import { OnePager } from "./_components/one-pager";
import { FallbackImage, FollowButton, ViewTracker } from "./_components/interactive";

/**
 * `/profile/<username>` - the page a user shares (plan/profile PRF-12).
 *
 * In the `(public)` group, not `(main)`: a stranger gets the page and none of the
 * application around it (see app/(public)/layout.tsx). Standalone for signed-in
 * viewers too (Niraj, 2026-09-25), so what a recruiter sees is exactly what the
 * owner sees. `lib/profile/read.ts` decides what this viewer may see.
 */

interface PageProps {
    params: Promise<{ username: string }>;
}

async function load(username: string) {
    const session = await getSession(await headers());
    const viewerId = session?.user?.id ?? null;
    return { result: await loadPublicProfile(decodeURIComponent(username), viewerId), signedIn: !!viewerId };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { username } = await params;
    const { result } = await load(username);

    if (result.status === "not_found") {
        // The root layout appends " | ShipItHQ" to every title.
        return { title: "Profile not found", robots: { index: false, follow: false } };
    }
    if (result.status === "restricted") {
        return { title: result.identity.name || result.identity.username, robots: { index: false } };
    }

    const p = result.profile;
    const name = p.name || p.username;
    const title = name;
    const description = p.headline || p.bio?.slice(0, 160) || `${name}'s projects, experience and skills on ShipItHQ.`;
    return {
        title,
        description,
        alternates: { canonical: publicProfileUrl(p.username) },
        openGraph: {
            title: name,
            description,
            type: "profile",
            url: publicProfileUrl(p.username),
            images: p.image ? [{ url: p.image }] : [],
        },
        twitter: { card: "summary", title: name, description, images: p.image ? [p.image] : [] },
    };
}

export default async function PublicProfilePage({ params }: PageProps) {
    const { username } = await params;
    const { result, signedIn } = await load(username);

    if (result.status === "not_found") notFound();

    const isOwn = result.status === "ok" && result.isOwn;

    return (
        <div className="min-h-dvh bg-white dark:bg-black">
            <TopBar signedIn={signedIn} isOwn={isOwn} />
            {result.status === "restricted" ? (
                <FollowersOnly identity={result.identity} signedIn={signedIn} />
            ) : (
                <>
                    {!isOwn && <ViewTracker profileId={result.profile.profileId} />}
                    <OnePager
                        p={result.profile}
                        isOwn={isOwn}
                        signedIn={signedIn}
                        isFollowing={result.isFollowing}
                        shareUrl={publicProfileUrl(result.profile.username)}
                    />
                </>
            )}
        </div>
    );
}

/** The only chrome: the wordmark and one way onward, which depends on who is looking. */
function TopBar({ signedIn, isOwn }: { signedIn: boolean; isOwn: boolean }) {
    return (
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-black/80">
            <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">ShipItHQ</Link>
                {isOwn ? (
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">This is your public page</span>
                        <Button asChild size="sm" className="h-8"><Link href="/profile">Edit profile</Link></Button>
                    </div>
                ) : signedIn ? (
                    <Button asChild size="sm" variant="outline" className="h-8"><Link href="/home">Back to ShipItHQ</Link></Button>
                ) : (
                    <Button asChild size="sm" className="h-8"><Link href="/register">Join ShipItHQ</Link></Button>
                )}
            </div>
        </header>
    );
}

/** A followers-only profile, seen by someone who does not follow: a face and a way in. */
function FollowersOnly({ identity, signedIn }: {
    identity: { id: string; name: string | null; username: string; image: string | null };
    signedIn: boolean;
}) {
    const name = identity.name || identity.username;
    const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
            <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="text-xl font-semibold text-neutral-600 dark:text-neutral-300">{initials}</span>
                {identity.image && <FallbackImage src={identity.image} alt={name} className="absolute inset-0 size-full object-cover" />}
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{name}</h1>
            <p className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">@{identity.username}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {name.split(" ")[0]} shares their profile with followers only.
            </p>
            <div className="mt-5">
                <FollowButton userId={identity.id} username={identity.username} signedIn={signedIn} initialFollowing={false} revealOnFollow />
            </div>
        </main>
    );
}
