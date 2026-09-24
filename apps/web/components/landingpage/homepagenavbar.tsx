"use client";

import { Button } from "@repo/ui/components/ui/button";
import { Logo } from "@repo/ui/components/logo"
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/ui/sheet";
import { ArrowRight, Menu, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@repo/ui/components/themetoggle";
import { SoundToggle } from "@repo/ui/components/ui/sounds";
import { APP_LINKS } from "@/lib/site";
import { NAV_ITEMS, type NavChild } from "./nav-links";

/**
 * Marketing navigation. This site has no session and no auth client - "Get started" always
 * deep-links to the app deploy, which owns sign-in and sign-up entirely.
 *
 * ── The design did not change; the navigation grew ──
 *
 * The floating pill, its scroll behaviour, the brand mark and the CTA are all as they were.
 * The complaint in `02-navigation.md` was that a flat row of five links had nowhere to go,
 * not that it looked wrong.
 *
 * ── Four mechanics, each fixing a specific failure ──
 *
 * **1. A close DELAY, not an instant close.** `scheduleClose` sets a 120ms timer rather
 * than closing on `mouseleave`. There is a gap between the tab and the panel, and a mouse
 * travelling diagonally crosses it. Without the grace period the menu snaps shut mid-travel
 * and the user has to try again. This one detail is the difference between a hover menu
 * that feels solid and one that feels broken.
 *
 * **2. Escape closes it, and focus goes back to the trigger.** A hover menu with no
 * keyboard exit is a trap for anyone navigating without a mouse. The listener is mounted
 * only while a menu is open, so the page carries no global keydown handler at rest.
 *
 * **3. Rows are titled and described.** A dropdown of six bare words makes the reader guess
 * what each one is. The copy lives in `nav-links.ts`.
 *
 * **4. `overflow-visible` on the pill.** Load-bearing. The open tab bleeds past the pill's
 * bottom edge to meet the panel; clipping severs that join and the panel reads as a
 * floating rectangle rather than something attached to the tab that opened it.
 *
 * ── z-40, deliberately ──
 *
 * The navbar sits BELOW the modal layer. `@repo/ui`'s Sheet and Dialog are both `z-50`, and
 * a navbar at the same level competes with them on DOM order alone - which resolves
 * differently depending on when the portal mounts. At `z-40` a dialog opened from any
 * public page renders above the navbar every time.
 */

/** How long the menu stays open after the mouse leaves. See mechanic 1. */
const CLOSE_DELAY_MS = 120;

function DropdownItem({ child, onNavigate }: { child: NavChild; onNavigate?: () => void }) {
    const Icon = child.icon;
    return (
        <Link
            href={child.href}
            onClick={onNavigate}
            className="group/item flex gap-3 rounded-xl p-3 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-800/60 dark:focus-visible:bg-neutral-800/60"
        >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors group-hover/item:border-neutral-400 group-hover/item:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:group-hover/item:border-neutral-500 dark:group-hover/item:text-white">
                <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">
                    {child.title}
                </span>
                {/* neutral-600, not neutral-500: at this size on a white panel neutral-500
                    is 4.6:1 and neutral-400 is 2.5:1. This is body text and owes 4.5:1. */}
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-600 dark:text-neutral-400">
                    {child.description}
                </span>
            </span>
        </Link>
    );
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    /** Label of the open desktop dropdown, or null. Only one is ever open. */
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    /** Label of the expanded mobile accordion, or null. */
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const pathname = usePathname();
    const isHome = pathname === "/";

    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    // Mechanic 1: the grace period. Set on leave, cancelled if the pointer arrives
    // anywhere inside the group before it fires.
    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpenMenu(null), CLOSE_DELAY_MS);
    }, [cancelClose]);

    // Clear a pending timer on unmount, so a route change mid-hover cannot fire a
    // setState into a component that is gone.
    useEffect(() => cancelClose, [cancelClose]);

    // Mechanic 2: Escape, mounted only while a menu is open, and focus returns to the
    // trigger so a keyboard user is not dropped at the top of the document.
    useEffect(() => {
        if (!openMenu) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            const trigger = triggerRefs.current[openMenu];
            setOpenMenu(null);
            trigger?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [openMenu]);

    // Any navigation closes everything. Without this, clicking a dropdown row leaves the
    // panel open over the page it just navigated to.
    useEffect(() => {
        setOpenMenu(null);
        setIsMobileMenuOpen(false);
        setOpenAccordion(null);
    }, [pathname]);

    const linkBaseClasses = "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200";
    const standardLinkClasses =
        "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white";

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0] || href);

    return (
        // z-40, below the z-50 modal layer - see the note at the top of this file.
        <nav className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
            <div
                // Mechanic 4: overflow-visible. The open tab and its panel extend past this
                // element's bottom edge; clipping would sever the join between them.
                className={`theme-vt-glass mx-auto max-w-7xl overflow-visible rounded-2xl transition-all duration-300
                ${isHome
                        ? scrolled
                            ? "bg-white/75 dark:bg-neutral-950/75 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm"
                            : "border border-transparent bg-transparent"
                        : "bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 shadow-sm"
                    }`}
            >
                <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2" aria-label="ShipItHQ home">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <Logo className="h-[17px] w-[17px]" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                            ShipItHQ
                        </span>
                    </Link>

                    <div
                        className={`hidden items-center space-x-1 rounded-full p-1 transition-all duration-300 lg:flex
                        ${isHome
                                ? scrolled
                                    ? "bg-transparent"
                                    : "bg-white/40 dark:bg-neutral-900/30 backdrop-blur-md border border-neutral-200/30 dark:border-white/5 shadow-sm"
                                : "bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800"
                            }`}
                    >
                        {NAV_ITEMS.map((item, index) => {
                            const active = isActive(item.href);

                            if (!item.children) {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`${linkBaseClasses} ${standardLinkClasses} ${active ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white" : ""}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            }

                            const open = openMenu === item.label;
                            // Index-based rather than hardcoded: adding a sixth item keeps
                            // the behaviour correct without anyone remembering to update this.
                            const isLastTwo = index >= NAV_ITEMS.length - 3;

                            return (
                                <div
                                    key={item.href}
                                    className="relative"
                                    onMouseEnter={() => { cancelClose(); setOpenMenu(item.label); }}
                                    onMouseLeave={scheduleClose}
                                    // Focus arriving anywhere in the group opens it, and focus
                                    // leaving the group entirely closes it. `relatedTarget` is
                                    // the element focus moved TO; `null` means it left the
                                    // document, which should also close.
                                    onFocus={() => { cancelClose(); setOpenMenu(item.label); }}
                                    onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                            setOpenMenu(null);
                                        }
                                    }}
                                >
                                    {/* A Link, not a button.

                                        The panel is a shortcut INTO the overview page, not a
                                        replacement for it, so the top-level label has to stay a
                                        real destination - middle-clickable, openable in a new
                                        tab, and crawlable. A button with an onClick that sets
                                        window.location is none of those, and it also throws away
                                        client-side navigation for no gain.

                                        Hovering or focusing it opens the panel; Enter navigates.
                                        On touch the first tap navigates, which is correct here
                                        because touch gets the accordion below instead. */}
                                    <Link
                                        href={item.href}
                                        ref={(el) => { triggerRefs.current[item.label] = el; }}
                                        aria-expanded={open}
                                        aria-haspopup="true"
                                        aria-current={active ? "page" : undefined}
                                        className={`${linkBaseClasses} ${standardLinkClasses} inline-flex items-center gap-1 ${active || open ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white" : ""}`}
                                    >
                                        {item.label}
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                                            aria-hidden
                                        />
                                    </Link>

                                    {open && (
                                        <div
                                            // pt-3 is the gap the mouse crosses. It is padding on
                                            // the panel rather than a margin, so the pointer is
                                            // still INSIDE this element while it travels - which
                                            // is what makes the 120ms delay rarely needed and
                                            // reliable when it is.
                                            // right-0 on the last two, centred on the rest.
                                            // A 28rem panel centred on a trigger near the end
                                            // of a five-item pill runs past the viewport edge;
                                            // anchoring those to their own right edge keeps
                                            // them on screen without a measurement pass.
                                            className={`absolute top-full z-50 w-[min(30rem,calc(100vw-2rem))] pt-3 ${
                                                isLastTwo ? "right-0" : "left-1/2 -translate-x-1/2"
                                            }`}
                                        >
                                            <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
                                                <div className={item.children.length > 3 ? "grid gap-1 sm:grid-cols-2" : "grid gap-1"}>
                                                    {item.children.map((child) => (
                                                        <DropdownItem key={child.href + child.title} child={child} />
                                                    ))}
                                                </div>
                                                <Link
                                                    href={item.href}
                                                    className="mt-1 flex items-center justify-between rounded-xl border-t border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-800/60"
                                                >
                                                    All {item.label.toLowerCase()}
                                                    <ArrowRight className="h-4 w-4" aria-hidden />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center space-x-3">
                        <SoundToggle />
                        <ThemeToggle />
                        <a href={APP_LINKS.signup} className="hidden sm:block">
                            <Button className="cursor-pointer rounded-full bg-neutral-900 text-white transition-all hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </a>
                        <Button
                            onClick={() => setIsMobileMenuOpen(true)}
                            variant="ghost"
                            size="icon"
                            aria-label="Open menu"
                            className="cursor-pointer text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 lg:hidden"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Mobile ──
                Hover is meaningless on touch, so the panels become accordions. The Sheet
                itself handles outside-click and Escape. */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent className="h-dvh max-w-[500px] border-l-0 bg-white p-0 dark:bg-neutral-950">
                    <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                    <div className="flex h-full flex-col">
                        <div className="flex-1 overflow-auto px-4 py-6">
                            <div className="grid grid-cols-1 gap-1">
                                {NAV_ITEMS.map((item, index) => {
                                    if (!item.children) {
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`rounded-lg px-4 py-3 text-lg font-medium transition-colors ${isActive(item.href)
                                                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white"
                                                    // The dark classes here used to fight each
                                                    // other - dark:bg-white next to
                                                    // dark:hover:bg-neutral-900, and both
                                                    // dark:text-neutral-400 and
                                                    // dark:text-neutral-900 on one element.
                                                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
                                                    }`}
                                            >
                                                {item.label}
                                            </Link>
                                        );
                                    }

                                    const expanded = openAccordion === item.label;
                                    const panelId = `nav-panel-${item.label.toLowerCase()}`;

                                    return (
                                        <div key={item.href}>
                                            <button
                                                type="button"
                                                aria-expanded={expanded}
                                                aria-controls={panelId}
                                                onClick={() => setOpenAccordion(expanded ? null : item.label)}
                                                // min-h-12: a 44px tap target floor, and these are
                                                // the primary navigation on a phone.
                                                className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-lg font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
                                            >
                                                {item.label}
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                                                    aria-hidden
                                                />
                                            </button>
                                            {expanded && (
                                                <div id={panelId} className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                                                    {item.children.map((child) => (
                                                        <DropdownItem
                                                            key={child.href + child.title}
                                                            child={child}
                                                            onNavigate={() => setIsMobileMenuOpen(false)}
                                                        />
                                                    ))}
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-neutral-900 dark:text-white"
                                                    >
                                                        All {item.label.toLowerCase()}
                                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                            <a href={APP_LINKS.signup} className="block">
                                <Button className="w-full rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                                    Get Started
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </nav>
    );
}
