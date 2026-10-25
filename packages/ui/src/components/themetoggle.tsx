"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@repo/ui/lib/utils"
import { startThemeTransition } from "./themeprovider"

interface ThemeToggleProps {
    className?: string
    /** `vertical` turns the pill on its side (32 x 64, the knob slides on Y) for a narrow rail. */
    orientation?: "horizontal" | "vertical"
}

/**
 * The 64x32 pill toggle.
 *
 * Every visual state is driven by the `dark:` variant - i.e. by the `dark` class next-themes'
 * blocking script puts on <html> BEFORE first paint - and never by a React state read. That is
 * the whole point:
 *
 *  - The server and the first client render emit byte-identical markup, so there is no
 *    hydration mismatch (the thing the old `mounted` flag was defending against, by rendering
 *    the light branch on the server while the client read the resolved theme).
 *  - Nothing has to wait for an effect, so the control is correct on the very first frame.
 *    The old version held itself at `opacity-0` until `useEffect` ran, which is exactly the
 *    fade-in flicker on every page load.
 *
 * Both icons are always in the DOM; CSS decides which one is visible. `resolvedTheme` is read
 * ONLY inside the click handler, where it is always resolved because the handler cannot fire
 * before hydration.
 */
export function ThemeToggle({ className, orientation = "horizontal" }: ThemeToggleProps) {
    const vertical = orientation === "vertical"
    const { resolvedTheme, setTheme } = useTheme()

    const toggle = (e?: React.MouseEvent) => {
        const isDark = resolvedTheme === "dark"
        // An origin runs the directional wipe (light->dark L->R, dark->light R->L; the helper
        // derives the direction from the current theme). The coords do not steer the wipe, so a
        // keyboard toggle can pass the origin.
        startThemeTransition(
            () => setTheme(isDark ? "light" : "dark"),
            e ? { x: e.clientX, y: e.clientY } : { x: 0, y: 0 },
        )
    }

    return (
        <div
            className={cn(
                "flex p-1 rounded-full cursor-pointer transition-all duration-300",
                vertical ? "w-8 h-16" : "w-16 h-8",
                "bg-white border border-zinc-200",
                "dark:bg-zinc-950 dark:border-zinc-800",
                className
            )}
            onClick={toggle}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle() } }}
            role="button"
            tabIndex={0}
            aria-label="Toggle theme"
        >
            <div className={cn("flex justify-between items-center", vertical ? "h-full flex-col" : "w-full")}>
                {/* Left slot. In light mode it slides right and carries the Sun; in dark mode it
                    stays put and carries the Moon - so the filled knob is always the active one. */}
                <div
                    className={cn(
                        "flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300",
                        vertical ? "translate-y-8 dark:translate-y-0" : "translate-x-8 dark:translate-x-0",
                        "bg-zinc-200 dark:bg-zinc-800",
                    )}
                >
                    <Sun className="w-4 h-4 text-zinc-700 dark:hidden" strokeWidth={1.5} aria-hidden />
                    <Moon className="w-4 h-4 text-white hidden dark:block" strokeWidth={1.5} aria-hidden />
                </div>
                {/* Right slot - the inactive one, so it carries no fill. */}
                <div
                    className={cn(
                        "flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300",
                        vertical ? "-translate-y-8 dark:translate-y-0" : "-translate-x-8 dark:translate-x-0",
                        "bg-transparent",
                    )}
                >
                    <Moon className="w-4 h-4 text-black dark:hidden" strokeWidth={1.5} aria-hidden />
                    <Sun className="w-4 h-4 text-zinc-500 hidden dark:block" strokeWidth={1.5} aria-hidden />
                </div>
            </div>
        </div>
    )
}

/** Kept for shipithq apps. */
export default ThemeToggle
