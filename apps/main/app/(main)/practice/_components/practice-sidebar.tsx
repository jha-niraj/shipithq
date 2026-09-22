"use client";
import Link from "next/link";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    ChevronRight, Code2, Network, Globe, Server, BarChart3, Brain
} from "lucide-react";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { MODULE_CONFIG } from "@/types/practice";
import type { PracticeModule } from "@/types/practice";

// ── Icon mapping ──
const MODULE_ICONS: Record<PracticeModule, typeof Code2> = {
    DSA: Code2,
    SYSTEM_DESIGN: Network,
    WEB_FRONTEND: Globe,
    WEB_BACKEND: Server,
};

const MODULE_PATHS: Record<PracticeModule, string> = {
    DSA: "/practice/dsa",
    SYSTEM_DESIGN: "/practice/system-design",
    WEB_FRONTEND: "/practice/web-frontend",
    WEB_BACKEND: "/practice/web-backend",
};

interface PracticeSidebarProps {
    activeModule: PracticeModule | null;
    activeCategory: string | null;
}

export function PracticeSidebar({ activeModule, activeCategory }: PracticeSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [expandedModules, setExpandedModules] = useState<Set<string>>(
        () => new Set(activeModule ? [activeModule] : [])
    );

    const toggleModule = (mod: PracticeModule) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            if (next.has(mod)) {
                next.delete(mod);
            } else {
                next.add(mod);
            }
            return next;
        });
    };

    const navigateToModule = (mod: PracticeModule) => {
        router.push(MODULE_PATHS[mod]);
    };

    const navigateToCategory = (mod: PracticeModule, categorySlug: string) => {
        router.push(`${MODULE_PATHS[mod]}?topic=${categorySlug}`);
    };

    const isDashboard = pathname === "/practice";

    return (
        <aside className="w-[280px] border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-shrink-0 hidden lg:flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <Link href="/practice" className={cn(
                        "cursor-pointer flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isDashboard
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}>
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                </Link>
                <Link href="/practice/memory" className={cn(
                        "mt-1 cursor-pointer flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === "/practice/memory"
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}>
                    <Brain className="h-4 w-4" />
                    What the mentor knows
                </Link>
            </div>
            <ScrollArea className="min-h-0 flex-1">
                <div className="p-3 space-y-1">
                    {
                    (Object.keys(MODULE_CONFIG) as PracticeModule[]).map((mod) => {
                        const config = MODULE_CONFIG[mod];
                        const Icon = MODULE_ICONS[mod];
                        const isExpanded = expandedModules.has(mod);
                        const isActive = activeModule === mod;
                        const categories = Object.entries(config.categories);

                        return (
                            <div key={mod}>
                                <button
                                    onClick={() => {
                                        toggleModule(mod);
                                        if (!isExpanded) navigateToModule(mod);
                                    }}
                                    className={cn(
                                        "cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        isActive && !activeCategory
                                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                    )}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="flex-1 text-left truncate">{config.label}</span>
                                    <ChevronRight
                                        className={cn(
                                            "h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 transition-transform duration-200",
                                            isExpanded && "rotate-90"
                                        )}
                                    />
                                </button>

                                {
                                isExpanded && categories.length > 0 && (
                                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-neutral-200 dark:border-neutral-800 pl-3">
                                        {
                                        categories.map(([slug, cat]) => (
                                            <button
                                                key={slug}
                                                onClick={() => navigateToCategory(mod, slug)}
                                                className={cn(
                                                    "cursor-pointer w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                                                    activeModule === mod && activeCategory === slug
                                                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium"
                                                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                                )}
                                            >
                                                <span className="text-sm">{cat.icon}</span>
                                                <span className="truncate">{cat.name}</span>
                                            </button>
                                        ))
                                        }
                                    </div>
                                )
                                }
                            </div>
                        );
                    })
                    }
                </div>
            </ScrollArea>
        </aside>
    );
}