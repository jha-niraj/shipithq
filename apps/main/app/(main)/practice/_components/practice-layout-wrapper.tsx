"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_PARAM } from "@/lib/onboarding/modules";
import { PracticeTabs } from "./practice-tabs";

/**
 * The practice section's frame: a small tab row above every practice page,
 * and nothing at all around a problem workspace (plan/practice-ui, UI-2).
 *
 * This replaced a second sidebar that listed every module's category tree.
 * That sidebar was also sized to 100% of a parent with no fixed height, so on
 * a short page (`/practice/memory`) it shrank to the content. The tab row has
 * no height to get wrong, and categories live as chips on each module page.
 *
 * A workspace is any route three segments deep (`/practice/dsa/two-sum`).
 * `/practice/memory` is two, so it keeps the tabs.
 *
 * No tabs during a module's onboarding either (plan/module-onboarding, MO-10):
 * the page is then the gate or the question flow, not the module, and the
 * server page marks that with `?onboarding=1`, so this reads the URL rather
 * than guessing from the page's contents.
 */
export function PracticeLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isWorkspace = pathname.split("/").filter(Boolean).length >= 3;
    if (isWorkspace) return <>{children}</>;
    return (
        <div className="min-w-0">
            {/* useSearchParams needs a Suspense boundary on a statically rendered page.
                The fallback is the common case, the tabs; the onboarding pages are
                dynamic, so they resolve on the server and never show the fallback. */}
            <Suspense fallback={<PracticeTabs />}>
                <TabsUnlessOnboarding />
            </Suspense>
            {children}
        </div>
    );
}

function TabsUnlessOnboarding() {
    const params = useSearchParams();
    if (params.get(ONBOARDING_PARAM) === "1") return null;
    return <PracticeTabs />;
}
