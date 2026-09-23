"use client";

import { useState } from "react";
import { PageHeader } from "@repo/ui/components/ui/page-header";
import { PracticeHeaderTabs } from "../../_components/practice-layout-wrapper";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { cn } from "@repo/ui/lib/utils";
import type { OnboardingModuleKey } from "@/lib/onboarding/modules";
import type { LearnerProfileView } from "@/actions/(main)/practice/memory.action";
import type { OnboardingRunView } from "@/types/onboarding";
import type { PracticeModule } from "@/types/practice";
import { OnboardingWidget } from "@/components/onboarding/onboarding-widget";
import { ModuleGateLink } from "./module-gate-link";
import { MemoryView } from "./memory-view";

// ─────────────────────────────────────────────────────────────────────────────
// Mentor memory, one tab per practice sub-module (plan/practice-ui, UI-10).
//
// The memory table has always been per module; this page showed DSA's and had
// no way to reach the others. Each tab now carries everything the system thinks
// about you for that module: where you stand (the onboarding read, which used to
// sit on top of the module page - MO-11) and what the mentor has recorded while
// you solved problems.
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryModuleData {
    module: PracticeModule;
    label: string;
    onboardingKey: OnboardingModuleKey;
    profile: LearnerProfileView;
    completed: OnboardingRunView | null;
    inProgress: OnboardingRunView | null;
}

export function MemoryTabs({ modules }: { modules: MemoryModuleData[] }) {
    // Open on the module with something to show, so the page is not empty by
    // default for someone who has only practised one of the four.
    const [active, setActive] = useState<string>(() => {
        const withMemory = modules.find((m) => m.profile.concepts.length > 0 || m.profile.mistakes.length > 0)
        return (withMemory ?? modules.find((m) => m.completed) ?? modules[0])?.module ?? "DSA";
    });
    const current = modules.find((m) => m.module === active) ?? modules[0];

    return (
        <div className="w-full space-y-5 px-page pb-6 pt-2">
            <PageHeader
                title="What the mentor knows about you"
                subtitle="Where you said you stand, and what the mentor has seen while you solved problems."
                tabs={<PracticeHeaderTabs />}
            />

            <Tabs value={active} onValueChange={setActive}>
                <TabsList variant="segmented" size="sm" fit aria-label="Practice module">
                    {modules.map((m) => (
                        <TabsTrigger key={m.module} value={m.module}>
                            {m.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {current && (
                <div className="space-y-5">
                    {current.completed ? (
                        <OnboardingWidget
                            moduleKey={current.onboardingKey}
                            completed={current.completed}
                            inProgress={current.inProgress}
                        />
                    ) : (
                        <ModuleGateLink moduleKey={current.onboardingKey} label={current.label} resumable={Boolean(current.inProgress)} />
                    )}
                    <MemoryView key={current.module} module={current.module} label={current.label} profile={current.profile} />
                </div>
            )}
        </div>
    );
}
