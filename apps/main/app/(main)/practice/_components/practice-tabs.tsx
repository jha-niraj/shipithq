"use client";

import { usePathname } from "next/navigation";
import { TabsNav } from "@repo/ui/components/ui/tabs";

// ─────────────────────────────────────────────────────────────────────────────
// Practice navigation (plan/practice-ui, UI-2): one small row of tabs instead
// of a second sidebar, drawn with the shared `TabsNav` (the segmented style
// from gurukulhq's tabs, as links). Rendered by the practice layout on every
// practice page EXCEPT a problem workspace, which needs the whole screen.
// ─────────────────────────────────────────────────────────────────────────────

export const PRACTICE_TABS = [
    { href: "/practice", label: "Overview", exact: true },
    { href: "/practice/dsa", label: "DSA" },
    { href: "/practice/system-design", label: "System Design" },
    { href: "/practice/web-frontend", label: "Frontend" },
    { href: "/practice/web-backend", label: "Backend" },
    { href: "/practice/memory", label: "Mentor memory" },
] as const;

/** What the header costs a full-height page: the title row plus its margin (PJ-3).
 *  The tabs sit inside that row now rather than above it. */
export const PRACTICE_TABS_HEIGHT = "4rem";

export function PracticeTabs() {
    const pathname = usePathname();
    return (
        <div className="flex min-w-0 items-center">
            <TabsNav
                aria-label="Practice"
                size="sm"
                variant="segmented"
                items={PRACTICE_TABS.map((t) => ({
                    href: t.href,
                    label: t.label,
                    active: "exact" in t && t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`),
                }))}
            />
        </div>
    );
}
