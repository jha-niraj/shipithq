import { Suspense } from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
    getProblemsForModule, getCategoriesForModule, getLeaderboard,
} from "@/actions/(main)/practice";
import { getCurrentOnboarding } from "@/actions/(main)/onboarding/module-onboarding.action";
import { ModuleOnboardingEntry } from "@/components/onboarding/module-onboarding-entry";
import { OnboardingWidget } from "@/components/onboarding/onboarding-widget";
import type { OnboardingModuleKey } from "@/lib/onboarding/modules";
import type { PracticeModule } from "@/types/practice";
import { ModuleContent } from "./module-content";

function ContentSkeleton({ cards }: { cards: number }) {
    return (
        <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {
                    [...Array(cards)].map((_, i) => (
                        <Skeleton key={i} className="h-36 w-full rounded-xl" />
                    ))
                }
            </div>
        </div>
    );
}

interface PracticeModulePageProps {
    module: PracticeModule;
    moduleLabel: string;
    onboardingKey: OnboardingModuleKey;
    topic: string | null;
    /** `?resume=1`: go straight into the onboarding (resume, or a retake). */
    resume: boolean;
    skeletonCards?: number;
}

/**
 * One server component behind the four practice sub-module pages.
 *
 * The onboarding check runs BEFORE the problem, category and leaderboard
 * queries: behind the gate that data is never shown, so the gated page must
 * not be slower than the dashboard it is hiding (MO-4).
 */
export async function PracticeModulePage({
    module,
    moduleLabel,
    onboardingKey,
    topic,
    resume,
    skeletonCards = 9,
}: PracticeModulePageProps) {
    const onboarding = await getCurrentOnboarding(onboardingKey);
    const showFlow = !onboarding.completed || resume;

    if (showFlow) {
        return (
            <div className="h-[var(--page-h,100vh)] min-h-0">
                <ModuleOnboardingEntry
                    moduleKey={onboardingKey}
                    inProgress={onboarding.inProgress}
                    autoStart={resume || Boolean(onboarding.inProgress)}
                    hasCompleted={Boolean(onboarding.completed)}
                />
            </div>
        );
    }

    const [problems, categories, leaderboard] = await Promise.all([
        getProblemsForModule(module, topic ?? undefined),
        getCategoriesForModule(module),
        getLeaderboard(module, 10),
    ]);

    // No scroller here. This div is a block child of the wrapper's <main>, which is
    // the real scroller - `flex-1` does nothing outside a flex parent and
    // `overflow-auto` never fires without a height cap. See JB-1.
    return (
        <div>
            <Suspense fallback={<ContentSkeleton cards={skeletonCards} />}>
                <ModuleContent
                    module={module}
                    moduleLabel={moduleLabel}
                    problems={problems}
                    categories={categories}
                    leaderboard={leaderboard}
                    activeCategory={topic}
                    headerSlot={
                        onboarding.completed ? (
                            <OnboardingWidget
                                moduleKey={onboardingKey}
                                completed={onboarding.completed}
                                inProgress={onboarding.inProgress}
                            />
                        ) : null
                    }
                />
            </Suspense>
        </div>
    );
}
