"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Trash2 } from "lucide-react";
import type { ConceptStatus, LearnerConcept, LearnerMistake } from "@repo/db";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog";
import toast from "@repo/ui/components/ui/sonner";
import { cn } from "@repo/ui/lib/utils";
import { deleteLearnerEntry, type LearnerProfileView } from "@/actions/(main)/practice/memory.action";
import { MODULE_CONFIG, type PracticeModule } from "@/types/practice";

// ─────────────────────────────────────────────────────────────────────────────
// "What the mentor knows about you" (plan/practice-dsa PD-9).
//
// Every concept the mentor has recorded, grouped by status, with the problem
// and date as evidence, and every recurring mistake. Each can be deleted; a
// deletion is permanent and is honoured by later consolidations. Model output
// about the user is rendered as plain text.
// ─────────────────────────────────────────────────────────────────────────────

const GROUPS: Array<{ status: ConceptStatus; title: string; blurb: string }> = [
    { status: "mastered", title: "Mastered", blurb: "Understood on more than one problem." },
    { status: "understood", title: "Understood", blurb: "You showed it in your own words or in code that passed." },
    { status: "shaky", title: "Shaky", blurb: "Needed more than one nudge. The mentor revisits these on any problem." },
    { status: "introduced", title: "Introduced", blurb: "Explained to you, not used yet." },
];

const INK = "text-neutral-900 dark:text-neutral-50";
const INK_DIM = "text-neutral-600 dark:text-neutral-400";
const CARD = "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

function prettySlug(slug: string): string {
    return slug.replace(/-/g, " ");
}

function when(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

type Pending = { kind: "concept" | "mistake"; slug: string; label: string } | null;

export function MemoryView({ profile, module, label }: { profile: LearnerProfileView; module: PracticeModule; label: string }) {
    const [concepts, setConcepts] = useState<LearnerConcept[]>(profile.concepts);
    const [mistakes, setMistakes] = useState<LearnerMistake[]>(profile.mistakes);
    const [pending, setPending] = useState<Pending>(null);
    const [busy, setBusy] = useState(false);

    const confirmDelete = async () => {
        if (!pending) return;
        setBusy(true);
        const res = await deleteLearnerEntry(pending.kind, pending.slug, module);
        setBusy(false);
        if (!res.success) {
            toast.error(res.error ?? "Could not delete that.");
            return;
        }
        if (pending.kind === "concept") setConcepts((c) => c.filter((x) => x.slug !== pending.slug));
        else setMistakes((m) => m.filter((x) => x.slug !== pending.slug));
        toast.success("Deleted. The mentor will not use it again.");
        setPending(null);
    };

    const empty = concepts.length === 0 && mistakes.length === 0;

    const modulePath = `/practice/${MODULE_CONFIG[module]?.path ?? "dsa"}`;

    return (
        // The page's heading and the module tabs live in memory-tabs.tsx; this is one
        // module's memory (UI-10).
        <div className="space-y-5">
            {empty ? (
                <div className={cn(CARD, "flex flex-col items-start gap-3")}>
                    <Brain className={cn("h-5 w-5", INK)} />
                    <p className={cn("text-sm font-medium", INK)}>Nothing yet.</p>
                    <p className={cn("max-w-xl text-sm leading-relaxed", INK_DIM)}>
                        Nothing is written here until you solve a problem with the mentor. As you do, it records the concepts you showed, the ones that needed a nudge, and mistakes you repeat, each with the problem it came from.
                    </p>
                    <Link href={modulePath} className={cn("mt-1 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline", INK)}>
                        Start a {label.toLowerCase()} problem <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            ) : (
                <>
                    {GROUPS.map((g) => {
                        const items = concepts.filter((c) => c.status === g.status);
                        if (items.length === 0) return null;
                        return (
                            <section key={g.status} className={CARD} aria-labelledby={`group-${g.status}`}>
                                <h2 id={`group-${g.status}`} className={cn("text-sm font-semibold", INK)}>
                                    {g.title} <span className={cn("font-normal", INK_DIM)}>({items.length})</span>
                                </h2>
                                <p className={cn("mt-0.5 text-xs", INK_DIM)}>{g.blurb}</p>
                                <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {items.map((c) => (
                                        <li key={c.slug} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                            <div className="min-w-0 flex-1">
                                                <div className={cn("text-sm font-medium", INK)}>{c.label || prettySlug(c.slug)}</div>
                                                <ul className="mt-1 space-y-0.5">
                                                    {c.evidence.slice(-3).reverse().map((e, i) => (
                                                        <li key={i} className={cn("text-xs leading-relaxed", INK_DIM)}>
                                                            {prettySlug(e.problemSlug)}{when(e.at) ? `, ${when(e.at)}` : ""}{e.note ? `: ${e.note}` : ""}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPending({ kind: "concept", slug: c.slug, label: c.label || prettySlug(c.slug) })}
                                                aria-label={`Delete ${c.label}`}
                                                className={cn("cursor-pointer rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800", INK_DIM)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })}

                    {mistakes.length > 0 && (
                        <section className={CARD} aria-labelledby="group-mistakes">
                            <h2 id="group-mistakes" className={cn("text-sm font-semibold", INK)}>
                                Recurring mistakes <span className={cn("font-normal", INK_DIM)}>({mistakes.length})</span>
                            </h2>
                            <p className={cn("mt-0.5 text-xs", INK_DIM)}>Patterns the mentor watches for.</p>
                            <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                                {[...mistakes].sort((a, b) => b.count - a.count).map((m) => (
                                    <li key={m.slug} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0 flex-1">
                                            <div className={cn("text-sm font-medium", INK)}>{m.label}</div>
                                            <div className={cn("mt-1 text-xs", INK_DIM)}>
                                                {m.count} time{m.count === 1 ? "" : "s"}, last on {prettySlug(m.lastProblemSlug)}{when(m.lastSeenAt) ? `, ${when(m.lastSeenAt)}` : ""}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPending({ kind: "mistake", slug: m.slug, label: m.label })}
                                            aria-label={`Delete ${m.label}`}
                                            className={cn("cursor-pointer rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800", INK_DIM)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            )}

            <AlertDialog open={pending !== null} onOpenChange={(o) => !o && !busy && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{pending?.label}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The mentor stops using it from your next message, and it will not be added back from past sessions. If it comes up again in a new session, it can be recorded again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmDelete(); }} disabled={busy}>
                            {busy ? "Deleting" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
