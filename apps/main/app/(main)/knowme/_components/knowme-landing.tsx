"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Bot, Sparkles, MessageSquare, Github, Code2, ChevronRight, Briefcase,
    Shield, Zap, Globe, BarChart3, Users, ArrowRight, Play,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from "@repo/ui/components/ui/sheet";
import { initializeKnowMeProfile } from "@/actions/(main)/knowme";
import toast from "@repo/ui/components/ui/sonner";
import { cn } from "@repo/ui/lib/utils";
import { useRouter } from "next/navigation";
import type { KnowMeProfileFull } from "@/types/knowme";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { KnowMeOnboarding } from "@/components/knowme/knowme-onboarding";

interface KnowMeLandingPageProps {
    isLoggedIn: boolean;
    profile?: KnowMeProfileFull | null;
}

const features = [
    {
        icon: MessageSquare,
        title: "24/7 AI Assistant",
        description: "Answer questions about your work anytime, even when you're asleep.",
    },
    {
        icon: Github,
        title: "Connect Platforms",
        // GitHub only. LeetCode was named here too, and has no sync handler - see
        // KM-5. A marketing card is still a promise.
        description: "Sync your GitHub repositories and contributions to enrich your AI.",
    },
    {
        icon: Code2,
        title: "Portfolio Integration",
        description: "Embed your AI chatbot directly into your personal portfolio.",
    },
    {
        icon: BarChart3,
        title: "Rich Analytics",
        description: "See who's asking about you and what they're interested in.",
    },
];

const howItWorks = [
    {
        step: 1,
        title: "Connect Your Data",
        description: "We gather your projects, assessments, and platform data",
        icon: Zap,
    },
    {
        step: 2,
        title: "AI Learns About You",
        description: "Your data is converted into intelligent knowledge",
        icon: Bot,
    },
    {
        step: 3,
        title: "Share & Impress",
        description: "Visitors can chat with your AI from anywhere",
        icon: Globe,
    },
];

// `RECRUITERS` is gone from this list, not merely unselected. This product has no
// recruiter identity - no role, no verification, no way to become one (KM-4) - so
// the option could only ever mean "everyone", which is what it silently meant, or
// "nobody". Neither is what "Verified recruiters only" promised. Same reasoning
// that removed the platforms with no sync handler in KM-5. See KM-12.

export default function KnowMeLandingPage({ isLoggedIn, profile }: KnowMeLandingPageProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    // Opens by itself when a profile exists but setup was never finished, so
    // somebody who abandoned halfway is put back where they were rather than
    // shown the marketing page again. The wizard resumes from
    // `profile.onboardingStep`.
    const [onboardingOpen, setOnboardingOpen] = useState(
        !!profile && !profile.onboardingCompleted && profile.status === "SETUP"
    );

    const handleGetStarted = async () => {
        if (!isLoggedIn) {
            router.push("/login?callbackUrl=/knowme");
            return;
        }

        setIsLoading(true);
        try {
            const result = await initializeKnowMeProfile();
            if (result.success) {
                // Check if resuming or starting fresh
                if (result.message === "Resume onboarding") {
                    toast.success("Welcome back! Let's continue setting up your AI.");
                } else {
                    toast.success("Profile initialized! Let's set up your AI.");
                }
                setOnboardingOpen(true);
            } else {
                toast.error(result.error || "Failed to initialize profile");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <>
            <div className="min-h-screen overflow-hidden">
                <section className="relative py-20 lg:py-32">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                        <div
                            className={cn(
                                "absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[100px]",
                                "bg-[radial-gradient(circle,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0)_70%)]",
                                "dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0)_70%)]"
                            )}
                        />
                        <div className="absolute top-[25%] left-[5%] w-96 h-96 rounded-full blur-[120px] animate-pulse-slow bg-neutral-100/30 dark:bg-neutral-800/20" />
                        <div className="absolute top-[20%] right-[10%] w-96 h-96 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000 bg-neutral-100/40 dark:bg-neutral-800/20" />
                    </div>
                    <div className="w-full px-4 relative">
                        <div className="text-center max-w-4xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-neutral-200/50 dark:border-white/10 rounded-full mb-6">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
                                    </span>
                                    <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
                                        AI-Powered Portfolio
                                    </span>
                                </div>
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-neutral-900 dark:text-white"
                            >
                                Meet{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-white dark:to-neutral-400">
                                    KnowMe
                                </span>
                                <br />
                                <span className="text-neutral-600 dark:text-neutral-400">
                                    Your AI Portfolio Assistant
                                </span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8 font-light text-neutral-700 dark:text-neutral-300"
                            >
                                Create an intelligent AI chatbot that knows everything about your
                                professional profile. Let recruiters and visitors discover your
                                skills, projects, and experience through natural conversation.
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                            >
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="lg"
                                        onClick={handleGetStarted}
                                        disabled={isLoading}
                                        className={cn(
                                            "h-14 px-8 text-base rounded-2xl font-bold transition-all duration-300",
                                            "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-xl shadow-neutral-900/10",
                                            "dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                        )}
                                    >
                                        {
                                            isLoading ? (
                                                <>
                                                    <InlineLoader size="md" className="mr-2" />
                                                    Setting up...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    {isLoggedIn ? "Get Started Free" : "Sign In to Start"}
                                                    <ChevronRight className="w-5 h-5 ml-1" />
                                                </>
                                            )
                                        }
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className={cn(
                                            "h-14 px-8 text-base rounded-2xl backdrop-blur-md transition-all duration-300",
                                            "border-neutral-300 bg-white/50 text-neutral-900 hover:bg-white/80",
                                            "dark:border-neutral-700 dark:bg-black/50 dark:text-white dark:hover:bg-white/10 dark:hover:border-neutral-500"
                                        )}
                                    >
                                        <Play className="w-5 h-5 mr-2" />
                                        Watch Demo
                                    </Button>
                                </motion.div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-neutral-500 dark:text-neutral-400"
                            >
                                {/* These were "500+ developers using", "10K+ questions
                                    answered" and "100+ recruiters engaged". Every KnowMe
                                    table has 0 rows, and the product has no recruiter
                                    identity at all (KM-4) - so all three were invented,
                                    on the screen that asks somebody to trust the module
                                    with their professional history. Replaced with what
                                    it actually does, which needs no number. */}
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Answers around the clock</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Github className="w-4 h-4" />
                                    <span>Trained on your real work</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span>You choose who can ask</span>
                                </div>
                            </motion.div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.5 }}
                            className="mt-16 relative"
                        >
                            <div className="relative max-w-4xl mx-auto">
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-neutral-200/50 dark:shadow-black/50 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                        </div>
                                        <div className="flex-1 mx-4">
                                            <div className="bg-white dark:bg-neutral-800 rounded-lg px-4 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2 max-w-md mx-auto">
                                                <Shield className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                                                shipithq.com/knowme/yourname
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-neutral-50 dark:bg-neutral-900 min-h-[300px]">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black text-sm">
                                                    <Bot className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-none p-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                                                        Hi! 👋 I&apos;m the AI assistant for <strong>John Developer</strong>.
                                                        Ask me anything about his skills, projects, or experience!
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 justify-end">
                                                <div className="bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-none p-4 max-w-xs">
                                                    <p className="text-sm">
                                                        What&apos;s his experience with React?
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black text-sm">
                                                    <Bot className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-none p-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                                                        I have 3+ years of React experience! I&apos;ve built 5 production apps
                                                        including an e-commerce platform with 10K+ users.
                                                        <br /><br />
                                                        📊 <strong>95%</strong> on React Assessment
                                                        <br />
                                                        🔗 View my projects →
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -top-4 -left-4 bg-white dark:bg-neutral-800 rounded-xl px-4 py-2 shadow-lg border border-neutral-200 dark:border-neutral-700"
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-neutral-500 animate-pulse" />
                                        <span className="text-neutral-600 dark:text-neutral-300">Always available</span>
                                    </div>
                                </motion.div>
                                <motion.div
                                    animate={{ y: [0, 10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -bottom-4 -right-4 bg-white dark:bg-neutral-800 rounded-xl px-4 py-2 shadow-lg border border-neutral-200 dark:border-neutral-700"
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                        <span className="text-neutral-600 dark:text-neutral-300">AI-powered answers</span>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </section>
                <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
                    <div className="w-full px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-16"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-full backdrop-blur-sm mb-4">
                                <Zap className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Features</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                                Everything you need to stand out
                            </h2>
                            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                                KnowMe combines your professional data with AI to create
                                an intelligent assistant that represents you perfectly.
                            </p>
                        </motion.div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {
                                features.map((feature, index) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        whileHover={{ y: -5 }}
                                        className="group bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-xl transition-all"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <feature.icon className="w-6 h-6 text-white dark:text-neutral-900" />
                                        </div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                            {feature.description}
                                        </p>
                                    </motion.div>
                                ))
                            }
                        </div>
                    </div>
                </section>
                <section className="py-20 bg-white dark:bg-black">
                    <div className="w-full px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-16"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-full backdrop-blur-sm mb-4">
                                <Bot className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">How It Works</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                                Set up in 2 minutes
                            </h2>
                            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                                Getting started is simple. Just connect your data and let AI do the rest.
                            </p>
                        </motion.div>
                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {
                                howItWorks.map((step, index) => (
                                    <motion.div
                                        key={step.step}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="relative text-center"
                                    >
                                        {
                                            index < howItWorks.length - 1 && (
                                                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-neutral-200 dark:bg-neutral-800" />
                                            )
                                        }
                                        <div className="relative">
                                            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                                <step.icon className="w-10 h-10 text-neutral-600 dark:text-neutral-300" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold text-sm">
                                                {step.step}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                            {step.description}
                                        </p>
                                    </motion.div>
                                ))
                            }
                        </div>
                    </div>
                </section>
                <section className="py-20 bg-neutral-900 dark:bg-white relative overflow-hidden">
                    <div className="container mx-auto px-4 max-w-4xl relative text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-white dark:text-neutral-900 mb-4">
                                Ready to transform your portfolio?
                            </h2>
                            <p className="text-white/80 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
                                Join hundreds of developers who are already using KnowMe
                                to showcase their skills in a whole new way.
                            </p>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    onClick={handleGetStarted}
                                    disabled={isLoading}
                                    className="bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 px-8 py-6 text-lg shadow-lg"
                                >
                                    {isLoading ? "Setting up..." : "Create Your AI Now"}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
            </div>


            {/* This Sheet is the ONLY way a user reaches setup - /knowme/onboarding
                is a bare redirect back here (CLN-50). The flow itself is
                `KnowMeOnboarding`, because this file used to hold a second copy of
                all four steps and the two had drifted: KM-5 cut the platform list
                back to GitHub in the OTHER copy, the unreachable one, and left this
                one advertising three platforms that silently sync nothing. The fix
                shipped and every user still met the bug. See CLN-49. */}
            <Sheet open={onboardingOpen} onOpenChange={setOnboardingOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl">
                    <div className="mx-auto max-w-2xl py-6">
                        <SheetHeader className="mb-6 text-center">
                            <div className="mb-2 flex items-center justify-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                                    <Bot className="h-5 w-5" />
                                </span>
                                <SheetTitle className="text-xl font-bold">KnowMe setup</SheetTitle>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                An assistant that answers about you, to everyone else
                            </p>
                        </SheetHeader>

                        <KnowMeOnboarding
                            profile={profile}
                            onComplete={() => {
                                setOnboardingOpen(false);
                                router.push("/knowme");
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>


            {/* eslint-disable-next-line react/no-unknown-property */}
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 4s;
                }
            `}</style>
        </>
    );
}
