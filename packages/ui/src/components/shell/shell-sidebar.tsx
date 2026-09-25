"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
    ChevronDown, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { toast } from "../ui/sonner"
import { Logo } from "../logo"
import { ThemeToggle } from "../themetoggle"
import { SoundToggle } from "../ui/sounds"
import { AIGlyph } from "../ui/ai-mark"
import { InlineLoader } from "../ui/inline-loader"
import { ScrollArea } from "../ui/scroll-area"
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { MobileBottomNav } from "../ui/mobile-bottom-nav"
import { NavCommandPalette, type NavCommandItem } from "../ui/nav-command-palette"
import {
    flattenNavigation, resolveSidebarPrimary, toHref,
    type FlatDestination, type NavigationItem, type SidebarPreset,
} from "../../lib/shell-navigation"
import { useSidebar } from "./sidebar-provider"
import { OFFSCREEN_LEFT, panelTransition } from "../../lib/shell-motion"
import { CustomizeSidebarSheet } from "./customize-sidebar-sheet"

// ─────────────────────────────────────────────────────────────────────────────
// The app sidebar, ported from gurukulhq's `components/navigation/sidebar.tsx`
// (2026-09-22) at Niraj's request: the same layout, rows, states and footer,
// always the full labelled list (no icon rail), with ShipItHQ's data behind it.
//
// Pinned or unpinned (UI-7): the header button unpins it out of the layout, and
// the left edge of the screen then floats it back over the page on hover. The
// state lives in `components/common/sidebarprovider.tsx`.
//
// Layout, top to bottom: brand, search (Cmd+K palette), the pinned rows with
// the module you are in expanded under its row, "Customize sidebar", then the
// footer: credits and the AI assistant, theme and notifications, the user.
//
// Not carried over, because ShipItHQ has no equivalent: the school usage bars,
// the plan badge, the pulse monitors, the guides sheet and school branding.
// Pins are saved per device (localStorage) rather than on the server.
//
// Shared by apps/main and apps/hiring (plan/hiring-app HA-1). Everything that
// differs between the apps is a prop: the links, the brand line, the footer's
// tools row (credits and the AI toggle in main, the AI toggle in hiring), the
// notifications panel, and the signed-in user. The rows, states, motion and
// footer layout are this file's alone, so the two sidebars cannot drift.
//
// `customizable` turns on pins and the customize sheets; without it, every
// item is shown in config order (the jobs shell, the hiring app).
// ─────────────────────────────────────────────────────────────────────────────

/** The desktop sidebar's width. The shell offsets the page by exactly this. */
export const SIDEBAR_WIDTH_CLASS = "lg:w-60"


const SHELL_SURFACE = "bg-white border-neutral-200 dark:bg-neutral-950 dark:border-white/10"

const basePath = (p: string) => p.split("?")[0] || p
const matchPath = (pathname: string, p: string) => !!p && p !== "/" && (pathname === p || pathname.startsWith(`${p}/`))

const DISCLOSE = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const

/** A nav module with its paths as real hrefs. */
type Module = { name: string; path: string; icon: NavigationItem["icon"]; children: { name: string; path: string; icon: NavigationItem["icon"] }[] }

function toModules(items: NavigationItem[]): Module[] {
    return items.map((i) => ({
        name: i.name,
        path: toHref(i.path),
        icon: i.icon,
        children: (i.children ?? []).map((c) => ({ name: c.name, path: toHref(c.path), icon: c.icon })),
    }))
}

function readPins(key: string): string[] | null {
    try {
        const raw = window.localStorage.getItem(key)
        const v = raw ? (JSON.parse(raw) as unknown) : null
        return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null
    } catch {
        return null
    }
}

function writePins(key: string, paths: string[]): boolean {
    try {
        if (paths.length === 0) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, JSON.stringify(paths))
        return true
    } catch {
        return false
    }
}

export interface ShellSidebarUser {
    name: string
    image: string | null
    username?: string | null
}

export interface ShellSidebarProps {
    /** The links, in order. */
    navigation: NavigationItem[]
    /** Pins and the customize sheets. Off: every item shows in config order. */
    customizable?: boolean
    /** "Start from a preset" choices in the customize sheet. */
    presets?: SidebarPreset[]
    /** localStorage prefix for pins; each app keeps its own. */
    pinsKey?: string
    brand: { title: string; subtitle: string; href: string }
    /** The footer's first row (e.g. credits and the AI toggle). */
    tools?: React.ReactNode
    /** The bell, beside the theme and sound toggles. */
    notifications?: React.ReactNode
    /** The AI assistant: drives the mobile bottom bar's centre button. */
    ai?: { label: string; open: boolean; onToggle: () => void }
    user: ShellSidebarUser | null
    userPending: boolean
    profileHref: string
    signInHref: string
    /** Signs out; the sidebar shows the toasts and then goes to `signOutHref`. */
    onSignOut: () => Promise<unknown>
    signOutHref: string
}

export function ShellSidebar({
    navigation, customizable = false, presets = [], pinsKey = "shipithq.sidebar",
    brand, tools, notifications, ai, user, userPending, profileHref, signInHref, onSignOut, signOutHref,
}: ShellSidebarProps) {
    const PINS_KEY = `${pinsKey}.pins`
    const MOBILE_PINS_KEY = `${pinsKey}.mobile-pins`
    const {
        isMobileOpen, setIsMobileOpen, isPinned, setPinned, isPeeking, unpeek, holdPeek, peek, lockPeek,
    } = useSidebar()
    // The sidebar slides on every hover of the left edge; `prefers-reduced-motion` is an
    // accessibility setting, so it then arrives at once instead of on a spring.
    const reducedMotion = useReducedMotion()
    const pathname = usePathname()
    const router = useRouter()

    // A link in the mobile sheet navigates, and the sheet should not stay over the new page.
    useEffect(() => { setIsMobileOpen(false) }, [pathname, setIsMobileOpen])

    const activeItemRef = useRef<HTMLElement | null>(null)
    const setActiveItemRef = useCallback((el: HTMLElement | null) => { activeItemRef.current = el }, [])

    // ── Navigation data ──
    const navItems = navigation
    const modules = useMemo(() => toModules(navItems), [navItems])
    const allDestinations = useMemo(() => flattenNavigation(navItems), [navItems])

    // Pins load after mount: localStorage does not exist on the server, and reading it
    // during render would make the first client render disagree with the server's.
    const [pinnedPaths, setPinnedPaths] = useState<string[] | null>(null)
    const [mobilePinnedPaths, setMobilePinnedPaths] = useState<string[]>([])
    useEffect(() => {
        if (!customizable) return
        setPinnedPaths(readPins(PINS_KEY))
        setMobilePinnedPaths(readPins(MOBILE_PINS_KEY) ?? [])
    }, [customizable, PINS_KEY, MOBILE_PINS_KEY])

    const resolvedPins = useMemo<FlatDestination[]>(
        () => (customizable ? resolveSidebarPrimary(allDestinations, pinnedPaths) : allDestinations.filter((d) => d.section === "")),
        [customizable, allDestinations, pinnedPaths],
    )
    const mobilePins = useMemo<FlatDestination[]>(() => {
        if (mobilePinnedPaths.length === 0) return resolvedPins.slice(0, 4)
        const byPath = new Map(allDestinations.map((d) => [d.path, d] as const))
        const chosen = mobilePinnedPaths.map((p) => byPath.get(p)).filter((d): d is FlatDestination => Boolean(d))
        return chosen.length > 0 ? chosen.slice(0, 4) : resolvedPins.slice(0, 4)
    }, [mobilePinnedPaths, allDestinations, resolvedPins])
    const pinnedSet = useMemo(() => new Set(resolvedPins.map((d) => d.path)), [resolvedPins])
    const expandableByPath = useMemo(
        () => new Map(modules.filter((m) => m.children.length > 0).map((m) => [m.path, m] as const)),
        [modules],
    )

    // ── Which module am I in? Longest match across every module and its children. ──
    const resolveModuleFor = useCallback((path: string): Module | null => {
        let best: Module | null = null
        let bestScore = -1
        for (const mod of modules) {
            if (mod.children.length === 0) continue
            let score = matchPath(path, mod.path) ? mod.path.length : -1
            for (const child of mod.children) {
                const cp = basePath(child.path)
                if (matchPath(path, cp) && cp.length > score) score = cp.length
            }
            if (score > bestScore) { bestScore = score; best = mod }
        }
        return bestScore >= 0 ? best : null
    }, [modules])
    const activeModule = useMemo(() => resolveModuleFor(pathname), [resolveModuleFor, pathname])

    // A child link opens its module at once, before the route has changed.
    const [pendingModulePath, setPendingModulePath] = useState<string | null>(null)
    useEffect(() => { setPendingModulePath(null) }, [pathname])
    useEffect(() => {
        if (!pendingModulePath) return
        const t = setTimeout(() => setPendingModulePath(null), 5000)
        return () => clearTimeout(t)
    }, [pendingModulePath])
    const openModuleOptimistically = useCallback((href: string) => {
        setPendingModulePath(resolveModuleFor(basePath(href))?.path ?? null)
    }, [resolveModuleFor])
    const routeModule = useMemo(() => {
        if (!pendingModulePath) return activeModule
        return modules.find((m) => m.path === pendingModulePath) ?? activeModule
    }, [pendingModulePath, modules, activeModule])

    // Clicking a module row toggles it; navigating resets to "the module you are in".
    const [moduleOverride, setModuleOverride] = useState<{ path: string | null } | null>(null)
    useEffect(() => { setModuleOverride(null) }, [pathname])
    const openModule = useMemo(() => {
        if (!moduleOverride) return routeModule
        if (!moduleOverride.path) return null
        return modules.find((m) => m.path === moduleOverride.path) ?? null
    }, [moduleOverride, routeModule, modules])
    const openModulePath = openModule?.path ?? null
    const toggleModule = useCallback((modPath: string) => {
        setModuleOverride((prev) => {
            const currentlyOpen = prev ? prev.path : (routeModule?.path ?? null)
            return { path: currentlyOpen === modPath ? null : modPath }
        })
    }, [routeModule])

    const activeChildPath = useMemo(() => {
        if (!routeModule) return null
        let best: string | null = null
        for (const child of routeModule.children) {
            const cp = basePath(child.path)
            if (matchPath(pathname, cp) && (!best || cp.length > best.length)) best = cp
        }
        return best
    }, [routeModule, pathname])
    // No nav entry carries a query string, so the path alone identifies the page.
    // (gurukul reads useSearchParams here, which in a layout forces a Suspense boundary.)
    const currentFullPath = pathname

    // The module you are in, when it is not one of your pins: shown under the pins.
    const appendedModule = useMemo(() => {
        if (!routeModule) return null
        if (pinnedSet.has(routeModule.path)) return null
        if (!pendingModulePath && resolvedPins.some((d) => d.path === pathname)) return null
        return routeModule
    }, [routeModule, pinnedSet, resolvedPins, pathname, pendingModulePath])

    // ── Command palette (Cmd+K) ──
    const [paletteOpen, setPaletteOpen] = useState(false)
    const paletteItems = useMemo<NavCommandItem[]>(
        () => allDestinations.map((d) => {
            const Icon = d.icon
            return { label: d.section && d.name === "Overview" ? `${d.section} overview` : d.name, href: d.path, section: d.section || "Modules", icon: <Icon className="h-4 w-4" /> }
        }),
        [allDestinations],
    )
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setPaletteOpen(true)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    // ── Customize ──
    const [customizeOpen, setCustomizeOpen] = useState(false)
    const [customizeMobileOpen, setCustomizeMobileOpen] = useState(false)
    const persistPins = useCallback((paths: string[]) => {
        if (writePins(PINS_KEY, paths)) {
            setPinnedPaths(paths.length ? paths : null)
            setCustomizeOpen(false)
            toast.success("Sidebar updated")
        } else toast.error("Could not save your layout")
    }, [PINS_KEY])
    const persistMobilePins = useCallback((paths: string[]) => {
        if (writePins(MOBILE_PINS_KEY, paths)) {
            setMobilePinnedPaths(paths)
            setCustomizeMobileOpen(false)
            toast.success("Bottom bar updated")
        } else toast.error("Could not save your bottom bar")
    }, [MOBILE_PINS_KEY])

    useEffect(() => { setIsMobileOpen(false) }, [pathname, setIsMobileOpen])

    // Keep the current page's row in view when it is below the fold.
    const scrolledForPathRef = useRef<string | null>(null)
    useEffect(() => {
        if (scrolledForPathRef.current === pathname) return
        const timer = setTimeout(() => {
            const el = activeItemRef.current
            if (!el) return
            scrolledForPathRef.current = pathname
            const viewport = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null
            if (!viewport) return
            const vp = viewport.getBoundingClientRect()
            const r = el.getBoundingClientRect()
            if (r.top >= vp.top && r.bottom <= vp.bottom) return
            viewport.scrollTop += (r.top - vp.top) - (viewport.clientHeight - r.height) / 2
        }, 60)
        return () => clearTimeout(timer)
    }, [pathname, openModulePath])

    const [signingOut, setSigningOut] = useState(false)
    const handleSignOut = async () => {
        if (signingOut) return
        setSigningOut(true)
        try {
            await onSignOut()
            toast.success("Signed out", { description: "You have been signed out successfully" })
            if (typeof window !== "undefined") window.location.href = signOutHref
        } catch {
            setSigningOut(false)
            toast.error("Could not sign you out", { description: "Check your connection and try again." })
        }
    }

    const avatarUrl = user?.image ?? null
    const userName = user?.name || "User"
    const username = user?.username

    // ── One child row inside an expanded module ──
    const renderChildRow = (child: Module["children"][number]) => {
        const ChildIcon = child.icon
        const active = child.path.includes("?") ? child.path === currentFullPath : basePath(child.path) === activeChildPath
        return (
            <Link
                key={child.path}
                href={child.path}
                ref={active ? setActiveItemRef : undefined}
                onClick={() => { setIsMobileOpen(false); openModuleOptimistically(child.path) }}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                    active
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white",
                )}
            >
                <ChildIcon className="h-[15px] w-[15px] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{child.name}</span>
            </Link>
        )
    }

    const renderModuleBody = (mod: Module) => {
        const needsOverview = !mod.children.some((c) => c.path === mod.path)
        const ModIcon = mod.icon
        return (
            <div className="ml-[26px] min-w-0 space-y-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                {needsOverview && (
                    <Link
                        href={mod.path}
                        ref={!activeChildPath && pathname === mod.path ? setActiveItemRef : undefined}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            !activeChildPath && pathname === mod.path
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white",
                        )}
                    >
                        <ModIcon className="h-[15px] w-[15px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Overview</span>
                    </Link>
                )}
                <div className="space-y-0.5">{mod.children.map(renderChildRow)}</div>
            </div>
        )
    }

    // ── One pinned row ──
    const renderPinnedRow = (dest: FlatDestination) => {
        const mod = expandableByPath.get(dest.path) ?? null
        const isOpenModule = !!mod && openModulePath === mod.path
        const ownsRoute = !!activeModule && !!mod && activeModule.path === mod.path
        const claimedElsewhere = !!activeModule && (!mod || activeModule.path !== mod.path)
        const active = isOpenModule || pathname === dest.path
            || (pathname.startsWith(`${dest.path}/`) && (ownsRoute || !claimedElsewhere))
        const Icon = mod?.icon ?? dest.icon
        const name = dest.section ? dest.name : (mod?.name ?? dest.name)
        const strongActive = active && !isOpenModule && !pendingModulePath
        const activeClass = strongActive
            ? "bg-black text-white dark:bg-white dark:text-black"
            : "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
        const idleClass = "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white"
        const rowClass = cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all",
            active ? activeClass : idleClass,
        )
        return (
            <div key={dest.path} className="min-w-0">
                {mod ? (
                    <button
                        type="button"
                        ref={active && !isOpenModule ? setActiveItemRef : undefined}
                        aria-expanded={isOpenModule}
                        onClick={() => toggleModule(mod.path)}
                        className={rowClass}
                    >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        {/* Always rendered: a chevron that appears only once a row is open
                            cannot tell you the row has anything to open. */}
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                "h-4 w-4 shrink-0 transition-transform duration-150",
                                isOpenModule ? "text-neutral-400" : "-rotate-90 text-neutral-400 dark:text-neutral-500",
                            )}
                        />
                    </button>
                ) : (
                    <Link
                        href={dest.path}
                        ref={active ? setActiveItemRef : undefined}
                        onClick={() => setIsMobileOpen(false)}
                        className={rowClass}
                    >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                    </Link>
                )}
                <AnimatePresence initial={false}>
                    {isOpenModule && mod && (
                        <motion.div key="module-body" {...DISCLOSE} className="overflow-hidden">
                            <div className="pb-1 pt-0.5">{renderModuleBody(mod)}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    const renderNavBody = () => (
        <>
            <div className="space-y-1">{resolvedPins.map(renderPinnedRow)}</div>

            {appendedModule && (
                <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5 px-3 py-1.5">
                        <appendedModule.icon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-600 dark:text-neutral-300">{appendedModule.name}</span>
                    </div>
                    {renderModuleBody(appendedModule)}
                </div>
            )}

            {customizable && (
                <div className="mt-2 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-800">
                    <button
                        type="button"
                        onClick={() => setCustomizeOpen(true)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white"
                    >
                        <SlidersHorizontal className="h-[18px] w-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-left">Customize sidebar</span>
                    </button>
                    {/* Only where the bottom bar exists; on desktop it edits a bar nobody can see. */}
                    <button
                        type="button"
                        onClick={() => { setIsMobileOpen(false); setCustomizeMobileOpen(true) }}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white"
                    >
                        <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-left">Customize bottom bar</span>
                    </button>
                </div>
            )}
        </>
    )

    const renderSidebarContent = (desktop: boolean) => (
        <>
            {/* Brand */}
            <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
                <Link href={brand.href} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-offset-2 transition-opacity hover:opacity-90">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <Logo className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                        <h1 className="truncate font-semibold tracking-tight text-neutral-900 dark:text-white">{brand.title}</h1>
                        <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">{brand.subtitle}</span>
                    </div>
                </Link>
                {/* Pin / unpin. Desktop only: the mobile sheet has its own open state and no
                    layout to leave. Unpinned, the sidebar leaves the layout and the left edge
                    of the screen floats it back over the page. */}
                {desktop && (
                    <button
                        type="button"
                        onClick={() => setPinned(!isPinned)}
                        aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                        title={isPinned ? "Unpin - reveal it from the left edge" : "Pin it open"}
                        className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 lg:inline-flex"
                    >
                        {isPinned
                            ? <PanelLeftClose className="h-[18px] w-[18px]" />
                            : <PanelLeftOpen className="h-[18px] w-[18px]" />}
                    </button>
                )}
            </div>

            {/* Search: opens the Cmd+K palette */}
            <div className="shrink-0 border-b border-neutral-200/70 px-3 pb-2 pt-3 dark:border-neutral-800/70">
                <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 transition-colors hover:bg-neutral-200/70 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700/70"
                >
                    <Search className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">Search pages...</span>
                    <kbd className="hidden shrink-0 items-center rounded border border-neutral-300 px-1.5 text-[10px] font-medium text-neutral-500 sm:inline-flex dark:border-neutral-600 dark:text-neutral-400">⌘K</kbd>
                </button>
            </div>

            {/* Radix's viewport wrapper defaults to display:table, which grows past the sidebar to
                fit the longest label and defeats truncate; forcing block keeps labels truncating. */}
            <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:block!">
                <nav aria-label="Main" className="px-3 py-4">{renderNavBody()}</nav>
            </ScrollArea>

            <div className="mt-auto shrink-0 border-t border-neutral-200 dark:border-neutral-800">
                {/* Tools: the app's own row (credits and the AI assistant in main). */}
                {tools && (
                    <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                        {tools}
                    </div>
                )}

                {/* Theme and notifications */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <div className="flex cursor-pointer items-center gap-1 px-1">
                        <ThemeToggle />
                        {/* Interface sounds, on by default (plan/ui-sounds). */}
                        <SoundToggle />
                    </div>
                    {notifications}
                </div>

                {/* The user */}
                {userPending ? (
                    <div className="px-3 py-2">
                        <div className="flex w-full items-center gap-3 rounded-lg p-2">
                            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                                <div className="h-2.5 w-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
                            </div>
                        </div>
                    </div>
                ) : user ? (
                    <div className="flex items-center gap-1 px-3 py-2">
                        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            {avatarUrl ? (
                                <Image className="h-8 w-8 flex-shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-800" src={avatarUrl} alt={userName} width={32} height={32} />
                            ) : (
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-600 dark:border-neutral-800">
                                    <span className="text-xs font-bold text-white">{userName[0]}</span>
                                </div>
                            )}
                            <div className="min-w-0 flex-1 text-left">
                                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{userName}</p>
                                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{username ? `@${username}` : "View profile"}</p>
                            </div>
                        </Link>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    disabled={signingOut}
                                    aria-label={signingOut ? "Signing out" : "Sign out"}
                                    aria-busy={signingOut}
                                    className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-70 dark:text-neutral-400 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                                >
                                    {signingOut ? <InlineLoader size="sm" /> : <LogOut className="h-4 w-4" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="border-neutral-800 bg-neutral-900 text-white dark:bg-white dark:text-black">
                                Sign out
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="px-3 py-2">
                        <Link href={signInHref} className="flex w-full items-center rounded-lg p-2 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">
                            <LogOut className="h-[18px] w-[18px]" />
                            <span className="ml-3">Sign in</span>
                        </Link>
                    </div>
                )}
            </div>
        </>
    )

    return (
        <TooltipProvider>
            <MobileBottomNav
                linkComponent={Link}
                onMore={() => setIsMobileOpen(true)}
                moreActive={isMobileOpen}
                centreAction={ai ? {
                    label: ai.label,
                    icon: <AIGlyph size={20} />,
                    onClick: () => { setIsMobileOpen(false); ai.onToggle() },
                    active: ai.open,
                } : undefined}
                items={mobilePins.map((dest) => {
                    const mod = expandableByPath.get(dest.path) ?? null
                    const Icon = mod?.icon ?? dest.icon
                    return {
                        label: dest.section ? dest.name : (mod?.name ?? dest.name),
                        href: dest.path,
                        icon: <Icon />,
                        active: pathname === dest.path || pathname.startsWith(`${dest.path}/`),
                    }
                })}
            />

            {/* Desktop: fixed and full height. Pinned it sits in the layout at z-40; unpinned it
                is off-screen until the left edge is hovered, then floats OVER the page at z-50.
                The shadow is on the whole unpinned state, not only the peek, so it is already
                there when the slide starts instead of popping in as it moves. */}
            <motion.aside
                className={cn(
                    "fixed inset-y-0 left-0 hidden h-dvh flex-col overflow-hidden border-r font-display print:hidden lg:flex",
                    SIDEBAR_WIDTH_CLASS,
                    SHELL_SURFACE,
                    isPinned ? "z-40" : "z-50 shadow-2xl",
                )}
                // The position is a framer `x`, not a translate class: Tailwind v4's
                // `translate-x-*` sets `translate`, not `transform`, so a transition on it
                // snaps. The spring matches the AI panel's.
                initial={false}
                animate={{ x: isPinned || isPeeking ? 0 : OFFSCREEN_LEFT }}
                transition={panelTransition(reducedMotion)}
                // The peek stays open while the pointer is in the sidebar and while focus is
                // in it, so a keyboard user tabbing in does not have it slide away. Escape
                // returns them to the page.
                onPointerEnter={isPinned ? undefined : holdPeek}
                onPointerLeave={isPinned ? undefined : unpeek}
                onFocusCapture={isPinned ? undefined : peek}
                // Pressing anything in here must never close it as a side effect (the theme
                // toggle's View Transition fires a pointerleave and a blur). The lock
                // postpones the close; it does not cancel it.
                onPointerDownCapture={isPinned ? undefined : () => lockPeek()}
                // A blur is a departure only when focus went somewhere ELSE. A null
                // relatedTarget (a re-render, a window blur, a transition snapshot) is not.
                onBlurCapture={isPinned ? undefined : (e) => {
                    const next = e.relatedTarget as Node | null
                    if (!next) return
                    if (e.currentTarget.contains(next)) return
                    unpeek()
                }}
                onKeyDown={(e) => { if (!isPinned && e.key === "Escape") unpeek() }}
                // Off-screen, it is hidden from assistive tech and out of the tab order.
                aria-hidden={!isPinned && !isPeeking ? true : undefined}
                inert={!isPinned && !isPeeking ? true : undefined}
            >
                {renderSidebarContent(true)}
            </motion.aside>

            {/* Mobile: the same content in a sheet. */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="w-72 border-neutral-200 bg-white p-0 dark:border-neutral-800 dark:bg-neutral-950 [&>button]:hidden">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <div className="flex h-full flex-col font-display">{renderSidebarContent(false)}</div>
                </SheetContent>
            </Sheet>

            <NavCommandPalette
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
                items={paletteItems}
                onSelect={(item) => {
                    openModuleOptimistically(item.href)
                    router.push(item.href)
                    setIsMobileOpen(false)
                }}
            />

            {customizable && (
                <>
                    <CustomizeSidebarSheet
                        open={customizeOpen}
                        onOpenChange={setCustomizeOpen}
                        allDestinations={allDestinations}
                        pinnedPaths={pinnedPaths}
                        saving={false}
                        onSave={persistPins}
                        onReset={() => persistPins([])}
                        presets={presets}
                    />
                    <CustomizeSidebarSheet
                        variant="mobile"
                        open={customizeMobileOpen}
                        onOpenChange={setCustomizeMobileOpen}
                        allDestinations={allDestinations}
                        pinnedPaths={mobilePinnedPaths}
                        saving={false}
                        onSave={persistMobilePins}
                        onReset={() => persistMobilePins([])}
                        presets={presets}
                    />
                </>
            )}
        </TooltipProvider>
    )
}
