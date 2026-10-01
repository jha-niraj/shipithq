"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@repo/ui/lib/utils"
import { startThemeTransition } from "@repo/ui/lib/theme-transition"

interface ThemeToggleProps {
    className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme()

    // `resolvedTheme` is undefined during SSR and on the first client render -
    // next-themes can only know the real theme once it has read localStorage and
    // the <html> class. Branching on it directly made the server emit the light
    // classes and the client emit the dark ones, which React reported as a
    // hydration mismatch and recovered from by throwing away and re-rendering
    // this subtree. Since the toggle sits in the sidebar footer, that happened on
    // every page load, in every app.
    //
    // Gating on `mounted` makes the server render and the first client render
    // identical by construction. The correct state lands one frame later.
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const isDark = mounted && resolvedTheme === "dark"

    const toggle = (e?: React.MouseEvent) => {
        // Passing an origin runs the directional wipe (light->dark L->R, dark->light
        // R->L; direction is derived from the current theme inside the helper). The
        // coords themselves don't steer the wipe, so a keyboard toggle passes {0,0}.
        startThemeTransition(
            () => setTheme(isDark ? "light" : "dark"),
            e ? { x: e.clientX, y: e.clientY } : { x: 0, y: 0 },
        )
    }

    // One toggle everywhere (Niraj, 2026-10-01): a 36px control with real padding and a
    // small radius, a square thumb that slides under the active icon.
    return (
        <div
            className={cn(
                "relative flex h-9 w-[4.5rem] shrink-0 cursor-pointer items-center rounded-lg border p-1 transition-colors duration-300",
                !mounted && "transition-none",
                isDark ? "border-neutral-800 bg-neutral-950" : "border-neutral-200 bg-white",
                className
            )}
            onClick={toggle}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle() } }}
            role="button"
            tabIndex={0}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
            <span
                aria-hidden
                className={cn(
                    "absolute left-1 top-1 size-7 rounded-md transition-transform duration-300",
                    !mounted && "transition-none",
                    isDark ? "translate-x-0 bg-neutral-800" : "translate-x-8 bg-neutral-100",
                )}
            />
            <span className="relative z-10 flex size-7 items-center justify-center">
                <Moon className={cn("size-4", isDark ? "text-white" : "text-neutral-500")} strokeWidth={1.75} />
            </span>
            <span className="relative z-10 ml-1 flex size-7 items-center justify-center">
                <Sun className={cn("size-4", isDark ? "text-neutral-500" : "text-neutral-900")} strokeWidth={1.75} />
            </span>
        </div>
    )
}

export default ThemeToggle
