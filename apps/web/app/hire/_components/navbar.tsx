"use client";

import { Button } from "@repo/ui/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    Sheet, SheetContent
} from "@repo/ui/components/ui/sheet";
import {
    Menu, Briefcase, ArrowRight
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@repo/ui/components/themetoggle";
import { SoundToggle } from "@repo/ui/components/ui/sounds";
import { HIRING_LINKS } from "@/lib/site";

// The /hire navbar (moved from apps/hiring, plan/hiring-app HA-3). This site has
// no auth (apps/web/CLAUDE.md), so there is no signed-in state here: Sign in and
// Get started are plain links to the hiring app.

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const isHome = pathname === '/hire';

    useEffect(() => {
        const handleScroll = () => {
            const offset = window.scrollY;
            if (offset > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.querySelector(targetId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setIsMobileMenuOpen(false);
    };

    const linkBaseClasses = "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200";
    const standardLinkClasses = "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white";

    return (
        <nav className={`fixed top-0 w-full pl-3 pr-3 z-50 transition-all duration-300 
            ${isHome
                ? (scrolled ? 'bg-white/75 dark:bg-neutral-950/75 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm' : 'bg-transparent')
                : 'bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800'
            }`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                <Link href="/hire" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform group-hover:scale-105">
                        <Briefcase className="w-4 h-4 text-white dark:text-black" />
                    </div>
                    <div className="flex flex-col justify-center h-8">
                        <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
                            ShipItHQ Hiring
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 leading-none mt-0.5 group-hover:text-neutral-900 dark:group-hover:text-neutral-300 transition-colors">
                            Recruitment Platform
                        </span>
                    </div>
                </Link>

                <div className={`hidden md:flex items-center space-x-1 rounded-full transition-all duration-300 p-1
                    ${isHome
                        ? (scrolled ? 'bg-transparent' : 'bg-white/40 dark:bg-neutral-900/30 backdrop-blur-md border border-neutral-200/30 dark:border-white/5 shadow-sm')
                        : 'bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800'
                    }`}>
                    <Link href="/hire" className={`${linkBaseClasses} ${standardLinkClasses} ${pathname === '/hire' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : ''}`}>Overview</Link>
                    <Link href="#features" onClick={(e) => handleSmoothScroll(e, "#features")} className={`${linkBaseClasses} ${standardLinkClasses} cursor-pointer`}>Features</Link>
                    <Link href="#pricing" onClick={(e) => handleSmoothScroll(e, "#pricing")} className={`${linkBaseClasses} ${standardLinkClasses} cursor-pointer`}>Pricing</Link>
                </div>

                <div className="flex items-center justify-center space-x-3">
                    <SoundToggle />
                    <ThemeToggle />
                    <a href={HIRING_LINKS.signin} className="hidden sm:block">
                        <Button variant="ghost" className="cursor-pointer rounded-full h-9 px-4 text-xs font-bold">
                            Sign In
                        </Button>
                    </a>
                    <a href={HIRING_LINKS.signup}>
                        <Button className="cursor-pointer rounded-full h-9 px-4 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black transition-transform hover:scale-105">
                            Get Started
                            <ArrowRight className="ml-1.5 h-3 w-3" />
                        </Button>
                    </a>
                    <Button
                        onClick={() => setIsMobileMenuOpen(true)}
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer md:hidden rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {
                    isMobileMenuOpen && (
                        <Sheet open={isMobileMenuOpen} onOpenChange={() => setIsMobileMenuOpen(false)}>
                            <SheetContent side="top" className="w-full h-auto max-h-[80dvh] p-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-auto py-6 px-4 font-medium">
                                        <div className="grid grid-cols-1 gap-2">
                                            <Link href="/hire" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white">Overview</Link>
                                            <Link href="#features" onClick={(e) => handleSmoothScroll(e, "#features")} className="rounded-lg px-4 py-3 text-lg text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 transition-all cursor-pointer">Features</Link>
                                            <Link href="#pricing" onClick={(e) => handleSmoothScroll(e, "#pricing")} className="rounded-lg px-4 py-3 text-lg text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 transition-all cursor-pointer">Pricing</Link>
                                        </div>
                                        <hr className="border-neutral-200 dark:border-neutral-800 my-4" />
                                        <div className="grid grid-cols-1 gap-2">
                                            <a href={HIRING_LINKS.signin} onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button variant="outline" className="cursor-pointer w-full rounded-full h-12 text-base font-bold">
                                                    Sign In
                                                </Button>
                                            </a>
                                            <a href={HIRING_LINKS.signup} onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button className="cursor-pointer w-full rounded-full h-12 text-base font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                                                    Get Started
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    )
                }
            </AnimatePresence>
        </nav>
    )
}