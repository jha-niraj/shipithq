"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronsUpDown, Menu } from "lucide-react";
import { Logo } from "@repo/ui/components/logo";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import type { NavChild, NavItem } from "@/components/landingpage/nav-links";
import { MONO, OutlineCta, PrimaryCta } from "@/components/marketing/primitives";
import { AUDIENCES, AUDIENCE_ORDER, audienceFor, type Audience } from "./audiences";
import { LATEST, monthName } from "@/content/changelog";

/**
 * The one navbar on shipithq.com (plan/web/revamp REV-3), modelled on fanout.sh.
 *
 * A white bar across the full width with a hairline under it, sticky, in the page
 * flow: it no longer floats over the page as a rounded pill, so pages do not pad
 * their tops to clear it. Left to right: the logo, the audience switcher
 * ("Students ⇅", a panel like fanout's "Learning spaces"), that audience's links
 * with hover panels, then Sign in and the primary CTA.
 *
 * The dropdown mechanics are the old navbar's, kept because each fixed a real
 * failure (plan/web/polish 02-navigation.md):
 *   1. a 120ms close delay, so a diagonal mouse path does not snap the panel shut;
 *   2. Escape closes and returns focus to the trigger;
 *   3. panels hang from `pt-2` padding, not margin, so the pointer never leaves;
 *   4. top-level labels are real links; hover or focus opens, Enter navigates.
 *
 * z-40: below the z-50 Sheet/Dialog layer, so a dialog always covers the bar.
 */

const CLOSE_DELAY_MS = 120;

/** An absolute href leaves this site (the app origin), so it renders as a plain <a>. */
const isAppHref = (href: string) => /^https?:\/\//.test(href);
const SWITCHER = "__audience";

function PanelRow({ child, onNavigate }: { child: NavChild; onNavigate?: () => void }) {
    const Icon = child.icon;
    return (
        <Link
            href={child.href}
            onClick={onNavigate}
            className="group/row flex gap-3 rounded-lg p-2.5 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none"
        >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors group-hover/row:text-neutral-900">
                <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-neutral-900">{child.title}</span>
                {/* neutral-600 on white is 7.8:1; this is body text and owes 4.5:1. */}
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-600">{child.description}</span>
            </span>
        </Link>
    );
}

/** One audience in the switcher panel: icon, name, a line, and "Soon" when not live yet. */
function AudienceRow({ audience, current, onNavigate }: { audience: Audience; current: boolean; onNavigate?: () => void }) {
    const Icon = audience.icon;
    const body = (
        <>
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                    {audience.label}
                    {!audience.available && (
                        <span className="rounded-full border border-neutral-300 px-2 py-px text-[11px] font-medium text-neutral-700">Soon</span>
                    )}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-600">{audience.description}</span>
            </span>
        </>
    );
    if (!audience.available) {
        return <div className="flex gap-3 rounded-lg p-2.5" aria-disabled>{body}</div>;
    }
    return (
        <Link
            href={audience.home}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className={cn(
                "flex gap-3 rounded-lg p-2.5 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none",
                current && "bg-neutral-100",
            )}
        >
            {body}
        </Link>
    );
}

export function SiteNavbar() {
    const pathname = usePathname() ?? "/";
    const audience = audienceFor(pathname);
    const [open, setOpen] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accordion, setAccordion] = useState<string | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggers = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);
    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
    }, [cancelClose]);
    useEffect(() => cancelClose, [cancelClose]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            const t = triggers.current[open];
            setOpen(null);
            t?.focus();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    // Any navigation closes everything.
    useEffect(() => {
        setOpen(null);
        setMobileOpen(false);
        setAccordion(null);
    }, [pathname]);

    const isActive = (href: string) => {
        const base = href.split("#")[0] || href;
        return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
    };

    /** Hover/focus group props shared by the switcher and each dropdown. */
    const group = (key: string) => ({
        onMouseEnter: () => { cancelClose(); setOpen(key); },
        onMouseLeave: scheduleClose,
        onFocus: () => { cancelClose(); setOpen(key); },
        onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(null);
        },
    });

    const linkClass = (active: boolean) =>
        cn(
            "inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
            active ? "font-medium text-neutral-900" : "text-neutral-600 hover:text-neutral-900",
        );

    return (
        <nav
            aria-label="Main"
            className={cn(
                "sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md transition-[border-color,box-shadow] duration-200 supports-[backdrop-filter]:bg-white/80",
                scrolled ? "border-neutral-200 shadow-[0_1px_0_rgba(0,0,0,0.02)]" : "border-neutral-200/70",
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
                <Link href={audience.home} aria-label="ShipItHQ home" className="mr-2 flex shrink-0 items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
                        <Logo className="size-[17px]" />
                    </span>
                    <span className="text-[17px] font-semibold tracking-tight text-neutral-900">ShipItHQ</span>
                </Link>

                {/* ── The audience switcher ── */}
                <div className="relative hidden lg:block" {...group(SWITCHER)}>
                    <button
                        type="button"
                        ref={(el) => { triggers.current[SWITCHER] = el; }}
                        aria-expanded={open === SWITCHER}
                        aria-haspopup="true"
                        onClick={() => setOpen(open === SWITCHER ? null : SWITCHER)}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                    >
                        {audience.label}
                        <ChevronsUpDown className="size-3.5 text-neutral-500" aria-hidden />
                    </button>
                    {open === SWITCHER && (
                        <div className="absolute left-0 top-full z-50 w-[22rem] pt-2">
                            <div className="rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] animate-in fade-in-0 zoom-in-95 duration-150">
                                <p className="px-2.5 pb-1.5 pt-1 text-xs text-neutral-600">ShipItHQ for</p>
                                <div className="grid gap-0.5">
                                    {AUDIENCE_ORDER.map((id) => (
                                        <AudienceRow key={id} audience={AUDIENCES[id]} current={id === audience.id} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <span aria-hidden className="mx-1 hidden h-5 w-px bg-neutral-200 lg:block" />

                {/* ── This audience's links ── */}
                <div className="hidden items-center lg:flex">
                    {audience.links.map((item: NavItem) => {
                        const active = isActive(item.href);
                        if (!item.children) {
                            // An app-origin link (Incidents) is a plain <a>: it leaves this site.
                            return isAppHref(item.href) ? (
                                <a key={item.href} href={item.href} className={linkClass(false)}>
                                    {item.label}
                                </a>
                            ) : (
                                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                                    {item.label}
                                </Link>
                            );
                        }
                        const isOpen = open === item.label;
                        return (
                            <div key={item.href} className="relative" {...group(item.label)}>
                                <Link
                                    href={item.href}
                                    ref={(el) => { triggers.current[item.label] = el; }}
                                    aria-expanded={isOpen}
                                    aria-haspopup="true"
                                    aria-current={active ? "page" : undefined}
                                    className={linkClass(active || isOpen)}
                                >
                                    {item.label}
                                    <ChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
                                </Link>
                                {isOpen && (
                                    // One column, hanging from the trigger's left edge (Niraj, 2026-09-25: two
                                    // columns read badly and panels opened leftwards).
                                    <div className={cn(
                                        "absolute top-full z-50 pt-2",
                                        // Two-column panels are centred under their trigger so they
                                        // fit at lg; one-column ones hang from its left edge.
                                        item.columns === 2 ? "left-1/2 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2" : "left-0 w-[22rem]",
                                    )}>
                                        <div className="rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] animate-in fade-in-0 zoom-in-95 duration-150">
                                            <div className={cn("grid max-h-[70vh] gap-0.5 overflow-y-auto", item.columns === 2 && "grid-cols-2")}>
                                                {item.children.map((child) => (
                                                    <PanelRow key={child.href + child.title} child={child} />
                                                ))}
                                            </div>
                                            <Link
                                                href={item.href}
                                                className="mt-1 flex items-center justify-between rounded-lg border-t border-neutral-100 px-2.5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
                                            >
                                                All {item.label.toLowerCase()}
                                                <ArrowRight className="size-4" aria-hidden />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {/* The What's new pill (REV-50): fanout's "New in September". xl only, so
                        the links never wrap at lg. */}
                    {LATEST && (
                        <Link
                            href={`/changelog#${LATEST.month}`}
                            className="group hidden h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white pl-3.5 pr-3 text-sm font-medium text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:border-neutral-300 xl:inline-flex"
                        >
                            New in {monthName(LATEST.month)}
                            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                    )}
                    <OutlineCta href={audience.signin} className="hidden sm:inline-flex">Sign in</OutlineCta>
                    <PrimaryCta href={audience.cta.href} size="sm" className="hidden sm:inline-flex">{audience.cta.label}</PrimaryCta>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-md text-neutral-900 hover:bg-neutral-100 lg:hidden"
                    >
                        <Menu className="size-5" />
                    </button>
                </div>
            </div>

            {/* ── Mobile: switcher first, then the audience's links as accordions ── */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent className="h-dvh w-full max-w-[420px] border-l border-neutral-200 bg-white p-0">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <div className="flex h-full flex-col">
                        <div className="flex-1 overflow-auto px-3 py-5">
                            <p className={cn(MONO, "px-2.5 pb-2 text-[11px] uppercase tracking-[0.16em] text-neutral-600")}>ShipItHQ for</p>
                            <div className="grid gap-0.5">
                                {AUDIENCE_ORDER.map((id) => (
                                    <AudienceRow key={id} audience={AUDIENCES[id]} current={id === audience.id} onNavigate={() => setMobileOpen(false)} />
                                ))}
                            </div>
                            <div className="my-4 h-px bg-neutral-200" />
                            <div className="grid gap-0.5">
                                {audience.links.map((item) => {
                                    if (!item.children) {
                                        const rowClass = cn("flex min-h-12 items-center rounded-lg px-2.5 text-base font-medium", isActive(item.href) ? "bg-neutral-100 text-neutral-900" : "text-neutral-700 hover:bg-neutral-100")
                                        return isAppHref(item.href) ? (
                                            <a key={item.href} href={item.href} className={rowClass}>{item.label}</a>
                                        ) : (
                                            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={rowClass}>
                                                {item.label}
                                            </Link>
                                        );
                                    }
                                    const expanded = accordion === item.label;
                                    const panelId = `m-nav-${item.label.toLowerCase()}`;
                                    return (
                                        <div key={item.href}>
                                            <button
                                                type="button"
                                                aria-expanded={expanded}
                                                aria-controls={panelId}
                                                onClick={() => setAccordion(expanded ? null : item.label)}
                                                className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-100"
                                            >
                                                {item.label}
                                                <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
                                            </button>
                                            {expanded && (
                                                <div id={panelId} className="ml-3 border-l border-neutral-200 pl-2">
                                                    {item.children.map((child) => (
                                                        <PanelRow key={child.href + child.title} child={child} onNavigate={() => setMobileOpen(false)} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="grid gap-2 border-t border-neutral-200 p-4">
                            <PrimaryCta href={audience.cta.href} className="w-full justify-center">{audience.cta.label}</PrimaryCta>
                            <OutlineCta href={audience.signin} className="h-11 w-full justify-center">Sign in</OutlineCta>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </nav>
    );
}

export default SiteNavbar;
