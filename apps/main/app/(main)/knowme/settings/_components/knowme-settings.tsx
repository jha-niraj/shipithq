"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, Database, Shield, Key, Settings, ArrowLeft, Github, Code2,
    Award, User, ToggleRight, ToggleLeft, Copy, Check, Eye, EyeOff, 
    RefreshCw, Trash2, Globe, Lock, Users, Briefcase,
    Clock, ExternalLink, CalendarDays, Activity, Gauge
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Badge } from "@repo/ui/components/ui/badge";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select";
import { Separator } from "@repo/ui/components/ui/separator";
import { cn } from "@repo/ui/lib/utils";
import { StatBand } from "@repo/ui/components/ui/stat-band";
import toast from "@repo/ui/components/ui/sonner";
import type { KnowMeProfileFull, KnowMeApiConfig } from "@/types/knowme";
import {
    updateKnowMeProfile, regenerateApiKey, toggleApiAccess, 
    deleteKnowMeProfile, triggerManualUpdate
} from "@/actions/(main)/knowme";
import CodeEditor from "@/components/main/code-editor";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { absoluteUrl } from "@/lib/urls";

interface KnowMeSettingsProps {
    profile: KnowMeProfileFull;
    apiConfig: KnowMeApiConfig | null | undefined;
    initialTab?: string;
}

// `RECRUITERS` is gone from this list, not merely unselected. This product has no
// recruiter identity - no role, no verification, no way to become one (KM-4) - so
// the option could only ever mean "everyone", which is what it silently meant, or
// "nobody". Neither is what "Verified recruiters only" promised. Same reasoning
// that removed the platforms with no sync handler in KM-5. See KM-12.
const privacyOptions = [
    { value: "PUBLIC", label: "Anyone with the link", icon: Globe },
    { value: "REGISTERED", label: "Logged-in users only", icon: Users },
    { value: "PRIVATE", label: "Private (only you)", icon: Lock },
];

const updateCycleOptions = [
    { value: "10", label: "Every 10 days (Free)", credits: 0 },
    { value: "5", label: "Every 5 days", credits: 10 },
    { value: "3", label: "Every 3 days", credits: 25 },
    { value: "1", label: "Daily", credits: 50 },
];

export default function KnowMeSettings({ profile, apiConfig, initialTab }: KnowMeSettingsProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(initialTab || "data");

    // Form states
    const [privacy, setPrivacy] = useState(profile.privacy);
    const [updateCycle, setUpdateCycle] = useState(profile.updateCycleDays.toString());
    const [includePersonalData, setIncludePersonalData] = useState(profile.includePersonalData);
    const [includePlatformData, setIncludePlatformData] = useState(profile.includePlatformData);
    const [welcomeMessage, setWelcomeMessage] = useState(profile.welcomeMessage || "");
    const [suggestedQuestions, setSuggestedQuestions] = useState(profile.suggestedQuestions.join("\n"));

    // API states
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyCopied, setApiKeyCopied] = useState(false);
    const [apiEnabled, setApiEnabled] = useState(apiConfig?.apiEnabled || false);

    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const result = await updateKnowMeProfile({
                privacy: privacy as "PUBLIC" | "REGISTERED" | "PRIVATE",
                updateCycleDays: parseInt(updateCycle),
                includePersonalData,
                includePlatformData,
                welcomeMessage: welcomeMessage || undefined,
                suggestedQuestions: suggestedQuestions.split("\n").filter(q => q.trim()),
            });

            if (result.success) {
                toast.success("Settings saved successfully!");
            } else {
                toast.error(result.error || "Failed to save settings");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyApiKey = () => {
        if (apiConfig?.apiKey) {
            navigator.clipboard.writeText(apiConfig.apiKey);
            setApiKeyCopied(true);
            toast.success("API key copied!");
            setTimeout(() => setApiKeyCopied(false), 2000);
        }
    };

    const handleRegenerateKey = async () => {
        setIsRegenerating(true);
        try {
            const result = await regenerateApiKey();
            if (result.success) {
                toast.success("API key regenerated!");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to regenerate key");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleToggleApi = async () => {
        try {
            const result = await toggleApiAccess(!apiEnabled);
            if (result.success) {
                setApiEnabled(!apiEnabled);
                toast.success(apiEnabled ? "API access disabled" : "API access enabled");
            } else {
                toast.error(result.error || "Failed to toggle API");
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const handleManualUpdate = async () => {
        setIsUpdating(true);
        try {
            const result = await triggerManualUpdate();
            if (result.success) {
                toast.success("Knowledge base updated!");
            } else {
                toast.error(result.error || "Failed to update");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!confirm("Are you sure? This will delete your KnowMe profile and all associated data. This action cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteKnowMeProfile();
            if (result.success) {
                toast.success("Profile deleted");
                router.push("/knowme");
            } else {
                toast.error(result.error || "Failed to delete profile");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/knowme">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                            <Settings className="w-6 h-6" />
                            KnowMe Settings
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Configure your AI assistant
                        </p>
                    </div>
                </div>
            </motion.div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 mb-8 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                    <TabsTrigger value="data" className="rounded-lg">
                        <Database className="w-4 h-4 mr-2" />
                        Data Sources
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="rounded-lg">
                        <Shield className="w-4 h-4 mr-2" />
                        Privacy
                    </TabsTrigger>
                    <TabsTrigger value="api" className="rounded-lg">
                        <Key className="w-4 h-4 mr-2" />
                        API
                    </TabsTrigger>
                    <TabsTrigger value="customize" className="rounded-lg">
                        <Bot className="w-4 h-4 mr-2" />
                        Customize
                    </TabsTrigger>
                </TabsList>
                <AnimatePresence mode="wait">
                    <TabsContent value="data" asChild>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6"
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                    Data Sources
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                                    Choose what data your AI should know about
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-medium text-neutral-900 dark:text-white">
                                    ShipItHQ Platform Data
                                </h3>

                                <DataToggle
                                    icon={<User className="w-5 h-5" />}
                                    title="Profile Information"
                                    description="Bio, skills, and basic info"
                                    enabled={includePersonalData}
                                    onToggle={() => setIncludePersonalData(!includePersonalData)}
                                />

                                <DataToggle
                                    icon={<Code2 className="w-5 h-5" />}
                                    title="Projects"
                                    description={`${profile.personalData.filter(d => d.dataType === "PROJECT").length} projects indexed`}
                                    enabled={true}
                                    onToggle={() => { }}
                                    locked
                                />

                                <DataToggle
                                    icon={<Award className="w-5 h-5" />}
                                    title="Assessments"
                                    description="Test scores and certifications"
                                    enabled={true}
                                    onToggle={() => { }}
                                    locked
                                />
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-neutral-900 dark:text-white">
                                        External Platforms
                                    </h3>
                                    <Badge variant={includePlatformData ? "default" : "secondary"}>
                                        {includePlatformData ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                                {/* GitHub, and only GitHub. It is the one platform with a
                                    real sync handler; LeetCode, StackOverflow and LinkedIn
                                    hit a silent `break` in the switch, so connecting one
                                    reported success and imported nothing (KM-5). Naming
                                    them here is the same promise by another route. */}
                                <DataToggle
                                    icon={<Github className="w-5 h-5" />}
                                    title="Platform Data"
                                    description="Your GitHub repositories and contributions"
                                    enabled={includePlatformData}
                                    onToggle={() => setIncludePlatformData(!includePlatformData)}
                                />

                                <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                    <p className="text-sm text-neutral-700 dark:text-neutral-100">
                                        GitHub is the only platform connected today. Turning this on
                                        lets your AI answer from your repositories and contributions
                                        the next time it indexes. More sources are coming.
                                    </p>
                                </div>

                                {
                                    profile.platformConnections.length > 0 && (
                                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                                Connected platforms:
                                            </p>
                                            {
                                                profile.platformConnections.map((conn) => (
                                                    <div key={conn.id} className="flex items-center justify-between py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Github className="w-4 h-4" />
                                                            <span className="text-sm font-medium">{conn.platform}</span>
                                                            {
                                                                conn.platformUsername && (
                                                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">@{conn.platformUsername}</span>
                                                                )
                                                            }
                                                        </div>
                                                        <Badge variant={conn.isConnected ? "default" : "secondary"}>
                                                            {conn.isConnected ? "Connected" : "Pending"}
                                                        </Badge>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )
                                }
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="font-medium text-neutral-900 dark:text-white">
                                    Update Schedule
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <Select value={updateCycle} onValueChange={setUpdateCycle}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {
                                                    updateCycleOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            <div className="flex items-center justify-between w-full">
                                                                <span>{option.label}</span>
                                                                {
                                                                    option.credits > 0 && (
                                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                                            {option.credits} credits/mo
                                                                        </Badge>
                                                                    )
                                                                }
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleManualUpdate}
                                        disabled={isUpdating}
                                        className="gap-2"
                                    >
                                        {
                                            isUpdating ? (
                                                <InlineLoader size="sm" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )
                                        }
                                        Update Now
                                    </Button>
                                </div>
                                {
                                    profile.nextScheduledUpdate && (
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Next update: {new Date(profile.nextScheduledUpdate).toLocaleDateString()}
                                        </p>
                                    )
                                }
                            </div>
                            <Button onClick={handleSaveChanges} disabled={isSaving} className="gap-2">
                                {isSaving ? <InlineLoader size="sm" /> : <Check className="w-4 h-4" />}
                                Save Changes
                            </Button>
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="privacy" asChild>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6"
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                    Privacy Settings
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                                    Control who can access your AI assistant
                                </p>
                            </div>
                            <div className="space-y-3">
                                {
                                    privacyOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = privacy === option.value;

                                        return (
                                            <div
                                                key={option.value}
                                                onClick={() => setPrivacy(option.value as "PRIVATE" | "PUBLIC" | "REGISTERED")}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    isSelected
                                                        ? "bg-neutral-50 dark:bg-neutral-800/20 border-neutral-900"
                                                        : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                                        isSelected ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "bg-neutral-200 dark:bg-neutral-700"
                                                    )}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-medium">{option.label}</span>
                                                </div>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2",
                                                    isSelected ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"
                                                )}>
                                                    {isSelected && <Check className="w-full h-full text-white p-0.5" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                            <Button onClick={handleSaveChanges} disabled={isSaving} className="gap-2">
                                {isSaving ? <InlineLoader size="sm" /> : <Check className="w-4 h-4" />}
                                Save Changes
                            </Button>
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="api" asChild>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6"
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Key className="w-5 h-5" />
                                    API Integration
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                                    Embed your AI into your personal portfolio
                                </p>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                                <div>
                                    <h3 className="font-medium text-neutral-900 dark:text-white">
                                        API Access
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Enable external API requests
                                    </p>
                                </div>
                                <Button
                                    variant={apiEnabled ? "default" : "outline"}
                                    onClick={handleToggleApi}
                                    className="gap-2"
                                >
                                    {
                                        apiEnabled ? (
                                            <>
                                                <ToggleRight className="w-5 h-5" />
                                                Enabled
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft className="w-5 h-5" />
                                                Disabled
                                            </>
                                        )
                                    }
                                </Button>
                            </div>
                            {
                                apiConfig && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Your API Key</Label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <Input
                                                        type={showApiKey ? "text" : "password"}
                                                        value={apiConfig.apiKey}
                                                        readOnly
                                                        className="pr-10 font-mono text-sm"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2"
                                                        onClick={() => setShowApiKey(!showApiKey)}
                                                    >
                                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                                <Button variant="outline" onClick={handleCopyApiKey} className="gap-2">
                                                    {apiKeyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleRegenerateKey}
                                                    disabled={isRegenerating}
                                                    className="gap-2"
                                                >
                                                    {
                                                        isRegenerating ? (
                                                            <InlineLoader size="sm" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4" />
                                                        )
                                                    }
                                                </Button>
                                            </div>
                                            <p className="text-xs text-neutral-800 dark:text-neutral-100">
                                                Keep this key secret! Anyone with it can access your AI.
                                            </p>
                                        </div>
                                        <StatBand
                                            size="sm"
                                            cols={3}
                                            items={[
                                                { icon: CalendarDays, label: "Today", value: apiConfig.apiUsageToday },
                                                { icon: Activity, label: "Total", value: apiConfig.apiUsageTotal },
                                                { icon: Gauge, label: "Daily Limit", value: apiConfig.apiRateLimit },
                                            ]}
                                        />
                                        <div className="bg-neutral-900 dark:bg-neutral-800 rounded-xl p-4 text-white">
                                            <h3 className="font-medium mb-3 flex items-center gap-2">
                                                <Code2 className="w-4 h-4" />
                                                Quick Start
                                            </h3>
                                            <CodeEditor
                                                placeholder={`fetch('${absoluteUrl('/api/v1/knowme/chat')}', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': 'Bearer YOUR_API_KEY',
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({
                                                        question: 'What are your skills?'
                                                    })
                                                })`}
                                                height="100px"
                                                readOnly={true}
                                                showLanguageSelector={false}
                                                showCopyButton={true}
                                            />
                                        </div>
                                        <Button variant="outline" className="gap-2" asChild>
                                            <Link href="/docs/knowme-api" target="_blank">
                                                <ExternalLink className="w-4 h-4" />
                                                View Full Documentation
                                            </Link>
                                        </Button>
                                    </>
                                )
                            }
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="customize" asChild>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6"
                        >
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                                    Customize Your AI
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                                    Personalize how your AI greets visitors
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Welcome Message</Label>
                                    <Textarea
                                        value={welcomeMessage}
                                        onChange={(e) => setWelcomeMessage(e.target.value)}
                                        placeholder="Hi! 👋 Ask me anything about my skills and projects..."
                                        rows={3}
                                        className="resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Suggested Questions</Label>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                        One question per line
                                    </p>
                                    <Textarea
                                        value={suggestedQuestions}
                                        onChange={(e) => setSuggestedQuestions(e.target.value)}
                                        placeholder="What's your experience with React?&#10;Tell me about your projects&#10;What technologies do you know?"
                                        rows={4}
                                        className="resize-none font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSaveChanges} disabled={isSaving} className="gap-2">
                                {isSaving ? <InlineLoader size="sm" /> : <Check className="w-4 h-4" />}
                                Save Changes
                            </Button>

                            <Separator />

                            <div className="border border-red-200 dark:border-red-900 rounded-xl p-4">
                                <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
                                    Danger Zone
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Permanently delete your KnowMe profile and all associated data.
                                </p>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteProfile}
                                    disabled={isDeleting}
                                    className="gap-2"
                                >
                                    {
                                        isDeleting ? (
                                            <InlineLoader size="sm" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )
                                    }
                                    Delete Profile
                                </Button>
                            </div>
                        </motion.div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}

function DataToggle({
    icon,
    title,
    description,
    enabled,
    onToggle,
    locked = false,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    locked?: boolean;
}) {
    return (
        <div
            className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all",
                locked
                    ? "bg-neutral-50 dark:bg-neutral-800"
                    : enabled
                        ? "bg-neutral-50 dark:bg-neutral-800/20 cursor-pointer"
                        : "bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
            )}
            onClick={locked ? undefined : onToggle}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    enabled ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "bg-neutral-200 dark:bg-neutral-700"
                )}>
                    {icon}
                </div>
                <div>
                    <h4 className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                        {title}
                        {locked && <Lock className="w-3 h-3 text-neutral-400" />}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                </div>
            </div>
            {
                !locked && (
                    enabled ? (
                        <ToggleRight className="w-8 h-8 text-neutral-900 dark:text-neutral-100" />
                    ) : (
                        <ToggleLeft className="w-8 h-8 text-neutral-400" />
                    )
                )
            }
        </div>
    );
}