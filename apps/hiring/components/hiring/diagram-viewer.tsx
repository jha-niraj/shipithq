"use client"

import dynamic from "next/dynamic"
import { useTheme } from "@repo/ui/components/themeprovider"
import "@excalidraw/excalidraw/index.css"

/*
 * The candidate's system design diagram, read-only (plan/hiring-rounds HR-18),
 * for @repo/ui's SendView `renderDiagram`. Excalidraw loads only when a
 * diagram is opened.
 */

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900" />,
})

export function DiagramViewer({ elements }: { elements: unknown[] }) {
    const { resolvedTheme } = useTheme()
    const theme = resolvedTheme === "dark" ? "dark" : "light"
    return (
        <Excalidraw
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={{ elements: elements as any, appState: { theme, viewBackgroundColor: theme === "dark" ? "#171717" : "#ffffff" } }}
            theme={theme}
            viewModeEnabled
            UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: false, export: false, toggleTheme: false } }}
        />
    )
}

export const renderDiagram = (elements: unknown[]) => <DiagramViewer elements={elements} />
