"use client";

import { Button } from "@repo/ui/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
    Sheet, SheetContent
} from "@repo/ui/components/ui/sheet";
import {
    Menu, GraduationCap, ArrowRight
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSession } from '@repo/auth/client';
import { ThemeToggle } from "@repo/ui/components/themetoggle";
import { SoundToggle } from "@repo/ui/components/ui/sounds";
import Image from "next/image";

export default function Navbar() {
    const { data: session } = useSession();
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const isHome = pathname === '/';

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
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform group-hover:scale-105">
                        <GraduationCap className="w-4 h-4 text-white dark:text-black" />
                    </div>
                    <div className="flex flex-col justify-center h-8">
                        <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
                            ACADEMIA
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 leading-none mt-0.5 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                            by Coder&apos;z
                        </span>
                    </div>
                </Link>

                <div className={`hidden md:flex items-center space-x-1 rounded-full transition-all duration-300 p-1
                    ${isHome
                        ? (scrolled ? 'bg-transparent' : 'bg-white/40 dark:bg-neutral-900/30 backdrop-blur-md border border-neutral-200/30 dark:border-white/5 shadow-sm')
                        : 'bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800'
                    }`}>
                    <Link href="/" className={`${linkBaseClasses} ${standardLinkClasses} ${pathname === '/' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : ''}`}>Overview</Link>
                    <Link href="#features" onClick={(e) => handleSmoothScroll(e, "#features")} className={`${linkBaseClasses} ${standardLinkClasses} cursor-pointer`}>Modules</Link>
                    <Link href="#pricing" onClick={(e) => handleSmoothScroll(e, "#pricing")} className={`${linkBaseClasses} ${standardLinkClasses} cursor-pointer`}>Allocation</Link>
                </div>

                <div className="flex items-center justify-center space-x-3">
                    <SoundToggle />
                    <ThemeToggle />
                    {
                        session ? (
                            <button className="rounded-full relative group" onClick={() => setIsMobileMenuOpen(true)}>
                                {
                                    session?.user?.image ? (
                                        <Image
                                            className="h-10 w-10 rounded-full hidden md:flex border-2 border-transparent group-hover:border-neutral-200 dark:group-hover:border-neutral-700 transition-all"
                                            src={session.user.image}
                                            alt={`Profile picture of ${session.user.name || 'user'}`}
                                            width={40}
                                            height={40}
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hidden md:flex items-center justify-center border-2 border-transparent group-hover:border-neutral-200 dark:group-hover:border-neutral-700 transition-all">
                                            <span className="text-sm font-medium">{session?.user?.name?.[0] || 'U'}</span>
                                        </div>
                                    )
                                }
                            </button>
                        ) : (
                            <>
                                <Link href="/signin" className="hidden sm:block">
                                    <Button variant="ghost" className="cursor-pointer rounded-full h-9 px-4 text-xs font-bold">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button className="cursor-pointer rounded-full h-9 px-4 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black transition-all hover:scale-105">
                                        Register Uni
                                        <ArrowRight className="ml-1.5 h-3 w-3" />
                                    </Button>
                                </Link>
                            </>
                        )
                    }
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
                                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white">Overview</Link>
                                            <Link href="#features" onClick={(e) => handleSmoothScroll(e, "#features")} className="rounded-lg px-4 py-3 text-lg text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 transition-all cursor-pointer">Modules</Link>
                                            <Link href="#pricing" onClick={(e) => handleSmoothScroll(e, "#pricing")} className="rounded-lg px-4 py-3 text-lg text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 transition-all cursor-pointer">Allocation</Link>
                                        </div>
                                        <hr className="border-neutral-200 dark:border-neutral-800 my-4" />
                                        {
                                            session ? (
                                                <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                                    {
                                                        session?.user?.image ? (
                                                            <Image
                                                                className="h-10 w-10 rounded-full"
                                                                src={session.user.image}
                                                                alt={`Profile picture of ${session.user.name || 'user'}`}
                                                                width={40}
                                                                height={40}
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                                                                <span className="text-sm font-medium">{session?.user?.name?.[0] || 'U'}</span>
                                                            </div>
                                                        )
                                                    }
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{session?.user?.name}</span>
                                                        <span className="text-xs text-neutral-500">{session?.user?.email}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                                                        <Button variant="outline" className="cursor-pointer w-full rounded-full h-12 text-base font-bold">
                                                            Sign In
                                                        </Button>
                                                    </Link>
                                                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                                        <Button className="cursor-pointer w-full rounded-full h-12 text-base font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                                                            Register University
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    )
                }
            </AnimatePresence>
        </nav>
    );
}