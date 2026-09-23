"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

export interface SDComponent {
    label: string;
    icon: string;
    category: "compute" | "storage" | "network" | "messaging" | "client";
}

interface SDComponentLibraryProps {
    onAddComponent: (component: SDComponent) => void;
}

const CATEGORIES: {
    key: SDComponent["category"];
    label: string;
    components: Omit<SDComponent, "category">[];
}[] = [
    {
        key: "client",
        label: "Client",
        components: [
            { label: "Client/Browser", icon: "🖥️" },
            { label: "Mobile App", icon: "📱" },
        ],
    },
    {
        key: "compute",
        label: "Compute",
        components: [
            { label: "API Server", icon: "🔧" },
            { label: "Web Server", icon: "🌐" },
            { label: "Worker", icon: "⚙️" },
            { label: "Microservice", icon: "📦" },
        ],
    },
    {
        key: "network",
        label: "Network",
        components: [
            { label: "Load Balancer", icon: "⚖️" },
            { label: "API Gateway", icon: "🚪" },
            { label: "CDN", icon: "🌍" },
            { label: "DNS", icon: "📡" },
            { label: "Reverse Proxy", icon: "🔄" },
        ],
    },
    {
        key: "storage",
        label: "Storage",
        components: [
            { label: "Database", icon: "💾" },
            { label: "Cache", icon: "⚡" },
            { label: "Object Storage", icon: "📁" },
            { label: "Search Index", icon: "🔍" },
        ],
    },
    {
        key: "messaging",
        label: "Messaging",
        components: [
            { label: "Message Queue", icon: "📬" },
            { label: "Event Bus", icon: "🔀" },
            { label: "Pub/Sub", icon: "📢" },
            { label: "Stream Processor", icon: "🌊" },
        ],
    },
];

export function SDComponentLibrary({ onAddComponent }: SDComponentLibraryProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(CATEGORIES.map((c) => [c.key, true]))
    );
    const [isOpen, setIsOpen] = useState(true);

    const toggle = (key: string) =>
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="flex flex-col h-full border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <button
                onClick={() => setIsOpen((o) => !o)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
                Components
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex-1"
                    >
                        <ScrollArea className="h-full">
                            <div className="px-2 pb-3 space-y-1">
                                {CATEGORIES.map((cat) => (
                                    <div key={cat.key}>
                                        <button
                                            onClick={() => toggle(cat.key)}
                                            className="flex items-center gap-1.5 w-full px-1.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                                        >
                                            {expanded[cat.key] ? (
                                                <ChevronDown className="h-3 w-3" />
                                            ) : (
                                                <ChevronRight className="h-3 w-3" />
                                            )}
                                            {cat.label}
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {expanded[cat.key] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                                                        {cat.components.map((comp) => (
                                                            <Button
                                                                key={comp.label}
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    onAddComponent({
                                                                        ...comp,
                                                                        category: cat.key,
                                                                    })
                                                                }
                                                                className="h-auto py-1.5 px-2 flex flex-col items-center gap-0.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80 rounded-md transition-colors"
                                                            >
                                                                <span className="text-base leading-none">{comp.icon}</span>
                                                                <span className="text-xs leading-tight text-center truncate w-full">
                                                                    {comp.label}
                                                                </span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
