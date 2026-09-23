import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
    getProblemsForModule, getCategoriesForModule, getLeaderboard, getPath,
} from "@/actions/(main)/practice";
import { getCurrentOnboarding } from "@/actions/(main)/onboarding/module-onboarding.action";
import { ModuleOnboardingEntry } from "@/components/onboarding/module-onboarding-entry";
import { dashboardHref, onboardingHref, type OnboardingModuleKey } from "@/lib/onboarding/modules";
import type { PracticeModule } from "@/types/practice";
import { ModuleContent, ModuleContentSkeleton } from "./module-content";

interface PracticeModulePageProps {
    module: PracticeModule;
    moduleLabel: string;
    onboardingKey: OnboardingModuleKey;
    topic: string | null;
    /** `?resume=1`: go straight into the onboarding (resume, or a retake). */
    resume: boolean;
    /** `?onboarding=1` is on the URL (MO-10). */
    onboardingParam: boolean;
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
    onboardingParam,
}: PracticeModulePageProps) {
    const onboarding = await getCurrentOnboarding(onboardingKey);
    const showFlow = !onboarding.completed || resume;

    // Keep the URL in step with what renders (MO-10): `?onboarding=1` while the gate
    // or flow is up, so a refresh stays here and the layout drops the practice tabs;
    // never on the dashboard, so a stale link cannot hide them.
    if (showFlow && !onboardingParam) redirect(onboardingHref(onboardingKey, { retake: resume }));
    if (!showFlow && onboardingParam) redirect(dashboardHref(onboardingKey, topic));

    if (showFlow) {
        return (
            // The whole page: the tabs live in a page header now, and the onboarding
            // has no header of its own (MO-10, PJ-3).
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

    const [problems, categories, leaderboard, path] = await Promise.all([
        // The whole module: topics are filtered on the client now, so several can be
        // ticked at once without a round trip (UI-11).
        getProblemsForModule(module),
        getCategoriesForModule(module),
        getLeaderboard(module, 10),
        // Cached only: the planning call is the Path tab's own, through
        // /api/practice/path, so the page never waits on a model (plan/practice-path).
        getPath(module),
    ]);

    // The "where you stand" summary used to sit on top of this page. It moved to the
    // mentor memory page, one tab per sub-module (MO-11): the module page opens with
    // the module's own name, and everything the system thinks about you is in one
    // place. This div is a block child of the wrapper's <main>; on lg+ the content
    // inside sizes itself to the page and scrolls its own list (UI-9).
    return (
        <div>
            <Suspense fallback={<ModuleContentSkeleton />}>
                <ModuleContent
                    module={module}
                    moduleLabel={moduleLabel}
                    problems={problems}
                    categories={categories}
                    leaderboard={leaderboard}
                    activeCategory={topic}
                    path={path.stages}
                    canPlan={Boolean(onboarding.completed)}
                />
            </Suspense>
        </div>
    );
}
