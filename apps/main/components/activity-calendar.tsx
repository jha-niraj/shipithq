"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle
} from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import {
    Flame, TrendingUp, Calendar, ChevronLeft, ChevronRight, BookOpen, Clock,
    Coins, Trophy, Zap, Target, Brain, Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityType } from '@repo/db';
import toast from '@repo/ui/components/ui/sonner';
import {
    DailyActivitySummary, getActivityCalendar, getDailyActivitySummary, getUserStreak,
    StreakInfo
} from '@/actions/(main)/user/activity.action';
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand, StatBandSkeleton } from "@repo/ui/components/ui/stat-band"

interface DayActivity {
    date: Date;
    hasActivity: boolean;
    totalXpEarned: number;
    totalCreditsEarned: number;
    totalTimeSpent: number;
    activitiesCount: number;
    isStreakDay: boolean;
    activities: Array<{
        activityType: ActivityType;
        title: string;
        xpEarned: number;
        creditsEarned: number;
    }>;
}

interface ActivityStats {
    totalActivitiesAllTime: number;
    last30Days: {
        totalXp: number;
        totalCredits: number;
        totalTime: number;
        totalActivities: number;
    };
    streak: StreakInfo;
}

interface ActivityCalendarProps {
    className?: string;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ className = "" }) => {
    const [calendarData, setCalendarData] = useState<DayActivity[]>([]);
    const [dailySummary, setDailySummary] = useState<DailyActivitySummary | null>(null);
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingDailySummary, setLoadingDailySummary] = useState(false);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const loadCalendarData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get first and last day of the current month
            const startDate = new Date(currentYear, currentMonth, 1);
            const endDate = new Date(currentYear, currentMonth + 1, 0);

            const [calendarResponse, streakResponse] = await Promise.all([
                getActivityCalendar(startDate, endDate),
                getUserStreak()
            ]);

            if (calendarResponse.success && calendarResponse.data) {
                setCalendarData(calendarResponse.data);
            }

            if (streakResponse.success && streakResponse.data) {
                setStats({
                    totalActivitiesAllTime: 0,
                    last30Days: {
                        totalXp: 0,
                        totalCredits: 0,
                        totalTime: 0,
                        totalActivities: 0,
                    },
                    streak: streakResponse.data
                });
            }
        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setIsLoading(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => {
        loadCalendarData();
    }, [loadCalendarData]);

    // Load daily summary for selected date
    useEffect(() => {
        const loadDailySummary = async () => {
            if (!selectedDay) return;

            setLoadingDailySummary(true);
            const summary = await getDailyActivitySummary(selectedDay.date);
            setDailySummary(summary);
            setLoadingDailySummary(false);
        };

        loadDailySummary();
    }, [selectedDay]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(prev => prev - 1);
            } else {
                setCurrentMonth(prev => prev - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(prev => prev + 1);
            } else {
                setCurrentMonth(prev => prev + 1);
            }
        }
    };

    const getActivityIntensity = (dayData: DayActivity) => {
        if (!dayData.hasActivity) return 0;

        // Calculate intensity based on activities count and XP earned
        const activityScore = Math.min(dayData.activitiesCount * 25, 100);
        const xpScore = Math.min(dayData.totalXpEarned * 2, 100);

        const totalActivity = Math.max(activityScore, xpScore) / 100;

        if (totalActivity === 0) return 0;
        if (totalActivity <= 0.25) return 1;
        if (totalActivity <= 0.5) return 2;
        if (totalActivity <= 0.75) return 3;
        return 4;
    };

    const getIntensityColor = (intensity: number) => {
        switch (intensity) {
            case 0: return 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
            case 1: return 'bg-primary/20 border-primary/30';
            case 2: return 'bg-primary/40 border-primary/50';
            case 3: return 'bg-primary/60 border-primary/70';
            case 4: return 'bg-primary/80 border-primary/90';
            default: return 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
        }
    };

    const generateCalendarGrid = () => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const grid = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            grid.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = calendarData.find(d =>
                new Date(d.date).getDate() === day &&
                new Date(d.date).getMonth() === currentMonth &&
                new Date(d.date).getFullYear() === currentYear
            );
            grid.push(dayData || {
                date: new Date(currentYear, currentMonth, day),
                hasActivity: false,
                totalXpEarned: 0,
                totalCreditsEarned: 0,
                totalTimeSpent: 0,
                activitiesCount: 0,
                isStreakDay: false,
                activities: []
            });
        }

        return grid;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getActivityTypeIcon = (type: ActivityType) => {
        switch (type) {
            case ActivityType.DAILY_QUIZ_COMPLETED:
                return <Target className="w-4 h-4" />;
            case ActivityType.LEARN_COMPLETED:
                return <BookOpen className="w-4 h-4" />;
            case ActivityType.STARTED_INTERVIEW:
                return <Brain className="w-4 h-4" />;
            case ActivityType.REFERRAL_BONUS:
            case ActivityType.REWARD_RECEIVED:
                return <Trophy className="w-4 h-4" />;
            default:
                return <ActivityIcon className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className={`${className} space-y-6`}>
                <StatBandSkeleton count={3} cols={3} />
                <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            <div className="grid grid-cols-7 gap-2">
                                {
                                    Array.from({ length: 35 }).map((_, i) => (
                                        <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    ))
                                }
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const calendarGrid = generateCalendarGrid();
    const getActiveDaysThisMonth = () => {
        return calendarData.filter(d => d.hasActivity).length;
    };

    return (
        <div className={`${className} space-y-6`}>
            <StatBand
                cols={3}
                items={[
                    { icon: Flame, label: 'Current Streak', value: stats?.streak.currentStreak || 0, hint: 'days' },
                    { icon: TrendingUp, label: 'Longest Streak', value: stats?.streak.longestStreak || 0, hint: 'days' },
                    {
                        icon: Trophy,
                        label: 'Next Milestone',
                        value: Math.max(0, Math.ceil((stats?.streak.currentStreak || 0 + 1) / 7) * 7 - (stats?.streak.currentStreak || 0)) || '365+',
                        hint: 'days',
                    },
                ]}
            />
            <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl transition-all duration-300">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Activity Calendar
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-medium min-w-[120px] text-center">
                                {monthNames[currentMonth]} {currentYear}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {
                            dayNames.map(day => (
                                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                                    {day}
                                </div>
                            ))
                        }
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {
                            calendarGrid.map((dayData, index) => {
                                if (!dayData) {
                                    return <div key={index} className="h-8"></div>;
                                }

                                const intensity = getActivityIntensity(dayData);
                                const isToday = new Date(dayData.date).toDateString() === new Date().toDateString();
                                const isFuture = new Date(dayData.date) > new Date();

                                return (
                                    <motion.button
                                        key={index}
                                        className={`
                                        h-8 w-8 rounded border-2 text-xs font-medium transition-all duration-200
                                        ${getIntensityColor(intensity)}
                                        ${isToday ? 'ring-2 ring-neutral-900' : ''}
                                        ${isFuture ? 'opacity-30' : 'hover:scale-110 cursor-pointer'}
                                        ${selectedDay?.date.getTime() === dayData.date.getTime() ? 'ring-2 ring-neutral-900' : ''}
                                    `}
                                        onClick={() => setSelectedDay(dayData)}
                                        disabled={isFuture}
                                        whileHover={{ scale: isFuture ? 1 : 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {new Date(dayData.date).getDate()}
                                    </motion.button>
                                );
                            })
                        }
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Less</span>
                            <div className="flex gap-1">
                                {
                                    [0, 1, 2, 3, 4].map(intensity => (
                                        <div
                                            key={intensity}
                                            className={`w-3 h-3 rounded border ${getIntensityColor(intensity)}`}
                                        />
                                    ))
                                }
                            </div>
                            <span>More</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {getActiveDaysThisMonth()} active days this month
                        </div>
                    </div>
                </CardContent>
            </Card>
            <AnimatePresence>
                {
                    selectedDay && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl transition-all duration-300">
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {formatDate(selectedDay.date)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {
                                        loadingDailySummary ? (
                                            <div className="flex items-center justify-center py-12">
                                                <InlineLoader size="lg" />
                                            </div>
                                        ) : selectedDay.hasActivity && dailySummary ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-primary" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">XP Earned</p>
                                                        <p className="font-bold text-primary">
                                                            {dailySummary.totalXpEarned}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Coins className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Credits Earned</p>
                                                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                                                            {dailySummary.totalCreditsEarned}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Time Spent</p>
                                                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                                                            {dailySummary.totalTimeSpent}m
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ActivityIcon className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Activities</p>
                                                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                                                            {dailySummary.activitiesCount}
                                                        </p>
                                                    </div>
                                                </div>
                                                {
                                                    dailySummary.activities.length > 0 && (
                                                        <div className="col-span-full mt-6">
                                                            <h4 className="font-semibold mb-4 text-foreground">Daily Activities</h4>
                                                            <div className="space-y-3">
                                                                {dailySummary.activities.map((activity, index) => {
                                                                    const getActivityCategory = (type: ActivityType) => {
                                                                        switch (type) {
                                                                            case ActivityType.DAILY_QUIZ_COMPLETED:
                                                                                return { category: 'Quiz', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100' };
                                                                            case ActivityType.LEARN_COMPLETED:
                                                                                return { category: 'Learn', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100' };
                                                                            case ActivityType.STARTED_INTERVIEW:
                                                                                return { category: 'AI Interview', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' };
                                                                            case ActivityType.REFERRAL_BONUS:
                                                                            case ActivityType.REWARD_RECEIVED:
                                                                                return { category: 'Reward', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100' };
                                                                            default:
                                                                                return { category: 'Activity', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
                                                                        }
                                                                    };

                                                                    const categoryInfo = getActivityCategory(activity.activityType as ActivityType);

                                                                    return (
                                                                        <motion.div
                                                                            key={activity.id}
                                                                            initial={{ opacity: 0, y: 10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            transition={{ delay: index * 0.1 }}
                                                                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                                <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                                                                                    {getActivityTypeIcon(activity.activityType as ActivityType)}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <h5 className="font-medium text-foreground truncate">
                                                                                            {activity.title}
                                                                                        </h5>
                                                                                        <Badge variant="secondary" className={`text-xs ${categoryInfo.color} border-0`}>
                                                                                            {categoryInfo.category}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    {
                                                                                        activity.description && (
                                                                                            <p className="text-sm text-muted-foreground truncate mb-2">
                                                                                                {activity.description}
                                                                                            </p>
                                                                                        )
                                                                                    }
                                                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                                        <span className="flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3" />
                                                                                            {
                                                                                                activity.createdAt.toLocaleTimeString('en-US', {
                                                                                                    hour: '2-digit',
                                                                                                    minute: '2-digit'
                                                                                                })
                                                                                            }
                                                                                        </span>
                                                                                        {
                                                                                            activity.timeSpent > 0 && (
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <Clock className="w-3 h-3" />
                                                                                                    {activity.timeSpent}m spent
                                                                                                </span>
                                                                                            )
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col gap-1 ml-4">
                                                                                {
                                                                                    activity.xpEarned > 0 && (
                                                                                        <Badge variant="secondary" className="text-xs bg-neutral-800 text-white border-0">
                                                                                            +{activity.xpEarned} XP
                                                                                        </Badge>
                                                                                    )
                                                                                }
                                                                                {
                                                                                    activity.creditsEarned > 0 && (
                                                                                        <Badge variant="secondary" className="text-xs bg-neutral-800 text-white border-0">
                                                                                            +{activity.creditsEarned} Credits
                                                                                        </Badge>
                                                                                    )
                                                                                }
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                })
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="text-gray-400 mb-2">📅</div>
                                                <p className="text-muted-foreground">No learning activity on this day</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Start using AI tools or complete assessments to build your streak!
                                                </p>
                                            </div>
                                        )
                                    }
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    );
};

export default ActivityCalendar; 