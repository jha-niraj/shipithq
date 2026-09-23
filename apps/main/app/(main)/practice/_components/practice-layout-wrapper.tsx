"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_PARAM } from "@/lib/onboarding/modules";
import { PracticeTabs } from "./practice-tabs";

/**
 * The practice section's frame (plan/practice-ui, UI-2).
 *
 * It used to draw the tab row itself, above every page's own title, which spent
 * two rows of a laptop screen on chrome. The tabs now sit in each page's header,
 * beside the title (PJ-3), and this wrapper only decides whether a page gets them
 * at all: a problem workspace (three segments deep) needs the whole screen, and a
 * module's onboarding is not the module (`?onboarding=1`, MO-10).
 *
 * `usePracticeTabs()` is what a page calls to render them.
 */
export function PracticeLayoutWrapper({ children }: { children: React.ReactNode }) {
    return <div className="min-w-0">{children}</div>;
}

/** True when this page should show the practice tabs. */
export function usePracticeTabsVisible(): boolean {
    const pathname = usePathname();
    const params = useSearchParams();
    const isWorkspace = pathname.split("/").filter(Boolean).length >= 3;
    return !isWorkspace && params.get(ONBOARDING_PARAM) !== "1";
}

/**
 * The practice tabs for a page header, or nothing where they do not belong.
 * Wrapped in Suspense because `useSearchParams` needs one on a statically
 * rendered page; the fallback is the tabs, which is the common case.
 */
export function PracticeHeaderTabs() {
    return (
        <Suspense fallback={<PracticeTabs />}>
            <TabsUnlessOnboarding />
        </Suspense>
    );
}

function TabsUnlessOnboarding() {
    return usePracticeTabsVisible() ? <PracticeTabs /> : null;
}
