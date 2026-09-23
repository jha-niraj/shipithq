"use client";

/**
 * The pieces every module overview is built from.
 *
 * Seven overview pages (`/practice`, `/projects`, `/mock`, `/pathfinder`, `/ai`,
 * `/jobs`, `/knowme`) were each hand-building their own header, stat cards and
 * empty states, which is why they looked like seven products. One definition
 * cannot drift.
 *
 * Headline numbers are not here: they use `StatBand` from
 * `@repo/ui/components/ui/stat-band` (plan/stat-band). The `StatTile` that lived
 * in this file had no importers and was removed in SB-3, with its `compact`
 * formatter and `Sparkline`.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";

export function OverviewHeader({
    title,
    subtitle,
    actions,
}: {
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
}) {
    return (
        <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
            <div className="min-w-0">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h1>
                <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </motion.header>
    );
}

/**
 * A titled panel. `action` is the one link out, never a row of them.
 */
export function OverviewPanel({
    title,
    action,
    delay = 0,
    className,
    children,
}: {
    title: string;
    action?: { label: string; href: string };
    delay?: number;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn(
                "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900",
                className,
            )}
        >
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
                {action && (
                    <Link
                        href={action.href}
                        className="shrink-0 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        {action.label}
                    </Link>
                )}
            </div>
            {children}
        </motion.section>
    );
}

/**
 * The one shape an empty region takes across every overview.
 *
 * Says what the surface is for and offers the single action that fills it - the
 * rule from `PRJ-U4`, applied everywhere rather than per module.
 */
export function OverviewEmpty({
    icon,
    title,
    body,
    action,
    secondaryAction,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    action?: React.ReactNode;
    secondaryAction?: { label: string; href: string };
}) {
    return (
        <div className="py-10 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {icon}
            </span>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
            {(action || secondaryAction) && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {action}
                    {secondaryAction && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href={secondaryAction.href}>
                                {secondaryAction.label}
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
