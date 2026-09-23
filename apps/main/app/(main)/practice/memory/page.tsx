import type { Metadata } from "next";
import { getLearnerProfile } from "@/actions/(main)/practice/memory.action";
import { getCurrentOnboarding } from "@/actions/(main)/onboarding/module-onboarding.action";
import type { OnboardingModuleKey } from "@/lib/onboarding/modules";
import type { PracticeModule } from "@/types/practice";
import { MemoryTabs, type MemoryModuleData } from "./_components/memory-tabs";

export const metadata: Metadata = {
    title: "What the mentor knows | ShipItHQ",
    description: "Where you stand in each practice module, and what the mentor has recorded about you while you solved problems.",
};

/** The four practice modules, in the order the tab row shows them (UI-10). */
const MODULES: Array<{ module: PracticeModule; label: string; onboardingKey: OnboardingModuleKey }> = [
    { module: "DSA", label: "DSA", onboardingKey: "practice:dsa" },
    { module: "SYSTEM_DESIGN", label: "System Design", onboardingKey: "practice:system-design" },
    { module: "WEB_FRONTEND", label: "Frontend", onboardingKey: "practice:web-frontend" },
    { module: "WEB_BACKEND", label: "Backend", onboardingKey: "practice:web-backend" },
];

// Note: /practice/memory has two path segments, so the practice layout wrapper
// keeps the tab row (it treats three or more as a full-screen workspace). A
// future route under here with three segments would lose it; see
// practice-layout-wrapper.tsx.
export default async function PracticeMemoryPage() {
    // Eight small reads, all indexed, in parallel: four memories and four onboarding
    // states. Fetching only the open tab would cost a round trip on every tab click.
    const modules: MemoryModuleData[] = await Promise.all(
        MODULES.map(async (m) => {
            const [profile, onboarding] = await Promise.all([
                getLearnerProfile(m.module),
                getCurrentOnboarding(m.onboardingKey),
            ]);
            return {
                ...m,
                profile: profile ?? { concepts: [], mistakes: [] },
                completed: onboarding.completed,
                inProgress: onboarding.inProgress,
            };
        }),
    );
    return <MemoryTabs modules={modules} />;
}
