import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { onboardingHref, type OnboardingModuleKey } from "@/lib/onboarding/modules";

const INK = "text-neutral-900 dark:text-neutral-50";
const INK_DIM = "text-neutral-600 dark:text-neutral-400";

/** Where the "where you stand" card would be for a module whose onboarding is
 *  unfinished: what it would say, and the way to get it (UI-10). */
export function ModuleGateLink({ moduleKey, label, resumable }: { moduleKey: OnboardingModuleKey; label: string; resumable: boolean }) {
    return (
        <section className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className={cn("text-sm font-semibold", INK)}>No read on where you stand in {label.toLowerCase()} yet.</p>
            <p className={cn("mt-1 max-w-xl text-sm leading-relaxed", INK_DIM)}>
                The short onboarding asks six to ten questions and turns them into a level, your strengths and what to work on. It is also what the recommended problems are picked from.
            </p>
            <Link href={onboardingHref(moduleKey)} className={cn("mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline", INK)}>
                {resumable ? "Finish it" : "Start it"} <ArrowRight className="h-4 w-4" />
            </Link>
        </section>
    );
}
