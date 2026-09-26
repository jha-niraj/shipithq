"use client"

import dynamic from "next/dynamic"
import { useTheme } from "@repo/ui/components/themeprovider"

/*
 * The read-only design diagram for the shared send view (`renderDiagram` on
 * @repo/ui's SendView): Excalidraw lives in each app, not in the UI package.
 */

const ExcalidrawCanvas = dynamic(
    () => import("@/app/(main)/practice/_components/workspace/excalidraw-canvas").then((m) => ({ default: m.ExcalidrawCanvas })),
    { ssr: false, loading: () => <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900" /> },
)

export function DiagramViewer({ elements }: { elements: unknown[] }) {
    const { resolvedTheme } = useTheme()
    return <ExcalidrawCanvas initialData={{ elements }} darkMode={resolvedTheme === "dark"} viewOnly />
}

export const renderDiagram = (elements: unknown[]) => <DiagramViewer elements={elements} />
