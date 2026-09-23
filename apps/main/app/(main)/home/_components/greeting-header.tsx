"use client";

import { motion } from "framer-motion";
import { StatBand } from "@repo/ui/components/ui/stat-band";
import {
    Avatar, AvatarFallback, AvatarImage
} from "@repo/ui/components/ui/avatar";
import {
    Sparkles, Zap, Shield, Coins, TrendingUp
} from "lucide-react";

interface GreetingHeaderProps {
    user: {
        id: string;
        name: string | null;
        image: string | null;
        credits: number;
        currentXp: number;
        totalXp: number;
        currentLevel: number;
        currentStreak: number;
        longestStreak: number;
        _count?: {
            followers: number;
            following: number;
        };
    } | null;
}

export default function GreetingHeader({ user }: GreetingHeaderProps) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const firstName = user?.name?.split(" ")[0] || "Coder";

    const stats = [
        { icon: Zap, label: "Total XP", value: user?.totalXp?.toLocaleString() || "0" },
        { icon: Shield, label: "Level", value: user?.currentLevel?.toString() || "1" },
        { icon: Coins, label: "Credits", value: user?.credits?.toLocaleString() || "0" },
        { icon: TrendingUp, label: "Streak", value: `${user?.currentStreak || 0} days` },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
        >
            <motion.div
                variants={itemVariants}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-primary/20 shrink-0">
                        <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                        <AvatarFallback className="text-lg font-bold">
                            {firstName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold truncate">
                                {getGreeting()}, {firstName}!
                            </h1>
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                                className="shrink-0"
                            >
                                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-900 dark:text-neutral-100" />
                            </motion.div>
                        </div>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Ready to continue your learning journey?
                        </p>
                    </div>
                </div>
                <motion.div variants={itemVariants} className="min-w-0 shrink-0 lg:ml-8 lg:w-[36rem]">
                    <StatBand size="sm" cols={4} items={stats} />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}