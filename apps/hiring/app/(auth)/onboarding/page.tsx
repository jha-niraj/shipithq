"use client"

import { 
    useState, useTransition, useEffect, useCallback, Suspense 
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2, MapPin, Briefcase, ArrowRight, ArrowLeft, Check,
    Users, Code, Palette, LineChart, Megaphone, Cog, Globe,
    Link2, CheckCircle2, XCircle
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import { cn } from "@repo/ui/lib/utils"
import { 
    completeOnboarding, checkSlugAvailability, getPendingCompanyInfo, getOnboardingEligibility
} from "@/actions/auth/onboarding.action"
import { signOut } from "@repo/auth/client"
import { acceptInvitation } from "@/actions/team/invite.action"
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"

// Hiring Goal Options
const hiringGoals = [
    { id: "engineering", label: "Engineering", icon: Code, description: "Software developers, engineers" },
    { id: "design", label: "Design", icon: Palette, description: "UI/UX, graphic designers" },
    { id: "product", label: "Product", icon: Cog, description: "Product managers, analysts" },
    { id: "marketing", label: "Marketing", icon: Megaphone, description: "Marketing, growth roles" },
    { id: "sales", label: "Sales", icon: LineChart, description: "Sales, business development" },
    { id: "operations", label: "Operations", icon: Users, description: "HR, operations, admin" },
]

// Industry Options
const industries = [
    "Technology", "Finance", "Healthcare", "E-commerce", "Education",
    "Media", "Consulting", "Manufacturing", "Real Estate", "Other"
]

// Company Size Options
const companySizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "500+", label: "500+ employees" },
]

// Role Options
const roleOptions = [
    { value: "CEO", label: "CEO / Founder" },
    { value: "CTO", label: "CTO / Co-Founder" },
    { value: "COFOUNDER", label: "Co-Founder" },
    { value: "VP_ENGINEERING", label: "VP of Engineering" },
    { value: "HR_HEAD", label: "HR Head" },
    { value: "HR_MANAGER", label: "HR Manager" },
    { value: "RECRUITER", label: "Recruiter" },
    { value: "HIRING_MANAGER", label: "Hiring Manager" },
    { value: "OTHER", label: "Other" },
]

// Loading fallback component
function OnboardingLoading() {
    return <ShipItHQLoader />
}

/* Shown instead of the form when an invitation is waiting for this email (HA-8). */
function OnboardingInvited({ code, companyName, roleName }: { code: string; companyName: string; roleName: string }) {
    const [pending, startTransition] = useTransition()
    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-page dark:bg-neutral-950">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <Building2 className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">You&apos;ve been invited to {companyName}</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">Join as {roleName}. Your company&apos;s workspace is ready for you.</p>
                <Button
                    className="mt-6 w-full gap-1.5"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                        const r = await acceptInvitation(code)
                        if (!r.success) { toast.error(r.error); return }
                        window.location.href = "/home"
                    })}
                >
                    {pending && <InlineLoader size="sm" />} Accept and join
                </Button>
            </div>
        </div>
    )
}

/*
 * Shown instead of the form when this person may not create a company
 * (plan/hiring-app HA-4, HA-5): their email is not a work email, or their
 * company is already on ShipItHQ and they need an invite from its admins.
 */
function OnboardingBlocked({ title, message }: { title: string; message: string }) {
    const [signingOut, setSigningOut] = useState(false)
    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-page dark:bg-neutral-950">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <Building2 className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{message}</p>
                <Button
                    variant="outline"
                    className="mt-6 w-full"
                    disabled={signingOut}
                    onClick={async () => {
                        setSigningOut(true)
                        await signOut().catch(() => {})
                        window.location.href = "/signin"
                    }}
                >
                    Sign out
                </Button>
            </div>
        </div>
    )
}

// Main page wrapper with Suspense
export default function OnboardingPage() {
    return (
        <Suspense fallback={<OnboardingLoading />}>
            <OnboardingContent />
        </Suspense>
    )
}

function OnboardingContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [currentStep, setCurrentStep] = useState(1)
     
    const [_isLoadingPendingInfo, setIsLoadingPendingInfo] = useState(true)
    // May this person create a company? Asked before the form is shown.
    const [eligibility, setEligibility] = useState<Awaited<ReturnType<typeof getOnboardingEligibility>> | null>(null)
    useEffect(() => {
        let live = true
        void getOnboardingEligibility().then((e) => {
            if (!live) return
            if (e.status === "already_member") router.replace("/home")
            else if (e.status === "unauthorized") router.replace("/signin")
            else setEligibility(e)
        })
        return () => { live = false }
    }, [router])
    
    // Get inviteBy from URL (university referral)
    const inviteBy = searchParams.get('inviteBy')

    // Form State
    const [companyName, setCompanyName] = useState("")
    const [slug, setSlug] = useState("")
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
    const [slugSuggestions, setSlugSuggestions] = useState<string[]>([])
    const [website, setWebsite] = useState("")
    const [industry, setIndustry] = useState("")
    const [companySize, setCompanySize] = useState("")
    const [userRole, setUserRole] = useState("")
    const [description, setDescription] = useState("")
    const [city, setCity] = useState("")
    const [state, setState] = useState("")
    const [country, setCountry] = useState("")
    const [selectedGoals, setSelectedGoals] = useState<string[]>([])

    const totalSteps = 2

    // Fetch pending company info from registration
    useEffect(() => {
        const fetchPendingInfo = async () => {
            try {
                const result = await getPendingCompanyInfo();
                if (result.success && result.data) {
                    if (result.data.companyName) {
                        setCompanyName(result.data.companyName);
                    }
                    if (result.data.suggestedWebsite) {
                        setWebsite(result.data.suggestedWebsite);
                    }
                }
            } catch (error: unknown) {
                console.error("Failed to fetch pending company info:", error);
            } finally {
                setIsLoadingPendingInfo(false);
            }
        };
        fetchPendingInfo();
    }, []);

    // Generate slug from company name
    const generateSlug = useCallback((name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
    }, [])

    // Auto-generate slug when company name changes
    useEffect(() => {
        if (companyName) {
            const newSlug = generateSlug(companyName)
            setSlug(newSlug)
        }
    }, [companyName, generateSlug])

    // Check slug availability with debounce
    useEffect(() => {
        if (!slug || slug.length < 2) {
            setSlugStatus("idle")
            setSlugSuggestions([])
            return
        }

        setSlugStatus("checking")
        const timer = setTimeout(async () => {
            const result = await checkSlugAvailability(slug)
            if (result.available) {
                setSlugStatus("available")
                setSlugSuggestions([])
            } else {
                setSlugStatus("taken")
                setSlugSuggestions(result.suggestions || [])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [slug])

    const toggleGoal = (goalId: string) => {
        setSelectedGoals(prev =>
            prev.includes(goalId)
                ? prev.filter(g => g !== goalId)
                : [...prev, goalId]
        )
    }

    const canProceedStep1 = companyName.trim() && slug.trim() && slugStatus === "available" && userRole
    const canProceedStep2 = selectedGoals.length > 0

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = () => {
        startTransition(async () => {
            const result = await completeOnboarding({
                companyName,
                slug,
                website: website || undefined,
                industry: industry || undefined,
                companySize: companySize || undefined,
                description: description || undefined,
                userRole,
                hiringGoals: selectedGoals,
                city: city || undefined,
                state: state || undefined,
                country: country || undefined,
                inviteBy: inviteBy || undefined, // University referral
            })

            if (result.success) {
                toast.success("Workspace created successfully!")
                router.push("/home")
            } else if ("code" in result && result.code === "COMPANY_EXISTS") {
                // Someone from the same domain created it a moment ago.
                setEligibility({ status: "company_exists", companyName: "", message: result.error ?? "" })
            } else {
                toast.error(result.error || "Failed to create workspace")
            }
        })
    }

    if (!eligibility) return <OnboardingLoading />
    if (eligibility.status === "company_exists") {
        return <OnboardingBlocked title="Your company is already here" message={eligibility.message} />
    }
    if (eligibility.status === "invited") {
        return <OnboardingInvited code={eligibility.code} companyName={eligibility.companyName} roleName={eligibility.roleName} />
    }
    if (eligibility.status === "work_email_required") {
        return <OnboardingBlocked title="A company email is needed" message={eligibility.message} />
    }

    return (
        <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-white dark:text-black" />
                        </div>
                        <span className="font-bold text-neutral-900 dark:text-white">ShipItHQ Hiring</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                        Step {currentStep} of {totalSteps}
                    </div>
                </div>
            </nav>
            <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-neutral-200 dark:bg-neutral-800">
                <motion.div
                    className="h-full bg-neutral-900 dark:bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
            <div className="pt-24 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <AnimatePresence mode="wait">
                        {
                            currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                            <Building2 className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                                            {companyName ? (
                                                <>Set up your workspace for <span className="text-neutral-500">{companyName}</span></>
                                            ) : (
                                                "Set up your workspace"
                                            )}
                                        </h1>
                                        <p className="text-neutral-500">
                                            {companyName 
                                                ? "Complete the details below to finalize your workspace"
                                                : "Tell us about your company to personalize your experience"
                                            }
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
                                        <div className="space-y-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                                            <div>
                                                <Label htmlFor="companyName">Company Name *</Label>
                                                <div className="relative mt-1.5">
                                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                                    <Input
                                                        id="companyName"
                                                        value={companyName}
                                                        onChange={(e) => setCompanyName(e.target.value)}
                                                        placeholder="Acme Corporation"
                                                        className="pl-10 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label htmlFor="slug">Company URL *</Label>
                                                <div className="relative mt-1.5">
                                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                                    <Input
                                                        id="slug"
                                                        value={slug}
                                                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                                                        placeholder="acme-corp"
                                                        className={cn(
                                                            "pl-10 pr-10 rounded-xl",
                                                            slugStatus === "available" && "border-neutral-900 focus-visible:ring-neutral-900",
                                                            slugStatus === "taken" && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        {
                                                        slugStatus === "checking" && (
                                                            <InlineLoader size="sm" className="text-neutral-400" />
                                                        )
                                                        }
                                                        {
                                                        slugStatus === "available" && (
                                                            <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                                                        )
                                                        
                                                        
                                                        }
                                                        {
                                                        slugStatus === "taken" && (
                                                            <XCircle className="w-4 h-4 text-red-500" />
                                                        )
                                                        }
                                                    </div>
                                                </div>
                                                <p className="mt-1.5 text-xs text-neutral-500">
                                                    Your company page: hire.shipit.me/<span className="font-medium">{slug || "your-company"}</span>
                                                </p>
                                                {
                                                slugStatus === "taken" && slugSuggestions.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <span className="text-xs text-neutral-500">Try:</span>
                                                        {
                                                        slugSuggestions.map((suggestion) => (
                                                            <button
                                                                key={suggestion}
                                                                type="button"
                                                                onClick={() => setSlug(suggestion)}
                                                                className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))
                                                        }
                                                    </div>
                                                )
                                                }
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="website">Website</Label>
                                                <div className="relative mt-1.5">
                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                                    <Input
                                                        id="website"
                                                        value={website}
                                                        onChange={(e) => setWebsite(e.target.value)}
                                                        placeholder="https://acme.com"
                                                        className="pl-10 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label htmlFor="industry">Industry</Label>
                                                <Select value={industry} onValueChange={setIndustry}>
                                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                                        <SelectValue placeholder="Select industry" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {
                                                            industries.map(ind => (
                                                                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="companySize">Company Size</Label>
                                                <Select value={companySize} onValueChange={setCompanySize}>
                                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                                        <SelectValue placeholder="Select size" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {
                                                            companySizes.map(size => (
                                                                <SelectItem key={size.value} value={size.value}>
                                                                    {size.label}
                                                                </SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="userRole">Your Role *</Label>
                                                <Select value={userRole} onValueChange={setUserRole}>
                                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                                        <SelectValue placeholder="Select your role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {
                                                            roleOptions.map(role => (
                                                                <SelectItem key={role.value} value={role.value}>
                                                                    {role.label}
                                                                </SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label htmlFor="description">About Company</Label>
                                                <Textarea
                                                    id="description"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Brief description of your company..."
                                                    className="mt-1.5 rounded-xl min-h-[80px]"
                                                />
                                            </div>
                                            <div className="md:col-span-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <MapPin className="w-4 h-4 text-neutral-500" />
                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Company Location
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="city">City</Label>
                                                        <Input
                                                            id="city"
                                                            value={city}
                                                            onChange={(e) => setCity(e.target.value)}
                                                            placeholder="San Francisco"
                                                            className="mt-1.5 rounded-xl"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="state">State</Label>
                                                        <Input
                                                            id="state"
                                                            value={state}
                                                            onChange={(e) => setState(e.target.value)}
                                                            placeholder="California"
                                                            className="mt-1.5 rounded-xl"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="country">Country</Label>
                                                        <Input
                                                            id="country"
                                                            value={country}
                                                            onChange={(e) => setCountry(e.target.value)}
                                                            placeholder="USA"
                                                            className="mt-1.5 rounded-xl"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <Button
                                            onClick={handleNext}
                                            disabled={!canProceedStep1}
                                            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                        >
                                            Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        }
                        {
                            currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                                            What roles are you hiring for?
                                        </h1>
                                        <p className="text-neutral-500">
                                            Select all that apply to customize your dashboard
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {
                                            hiringGoals.map((goal) => {
                                                const Icon = goal.icon
                                                const isSelected = selectedGoals.includes(goal.id)

                                                return (
                                                    <button
                                                        key={goal.id}
                                                        onClick={() => toggleGoal(goal.id)}
                                                        className={cn(
                                                            "cursor-pointer p-4 rounded-2xl border-2 transition-all text-left",
                                                            isSelected
                                                                ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white"
                                                                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                                                            isSelected
                                                                ? "bg-white/20 dark:bg-black/20"
                                                                : "bg-neutral-100 dark:bg-neutral-800"
                                                        )}>
                                                            <Icon className={cn(
                                                                "w-5 h-5",
                                                                isSelected
                                                                    ? "text-white dark:text-black"
                                                                    : "text-neutral-600 dark:text-neutral-400"
                                                            )} />
                                                        </div>
                                                        <h3 className={cn(
                                                            "font-semibold mb-1",
                                                            isSelected
                                                                ? "text-white dark:text-black"
                                                                : "text-neutral-900 dark:text-white"
                                                        )}>
                                                            {goal.label}
                                                        </h3>
                                                        <p className={cn(
                                                            "text-sm",
                                                            isSelected
                                                                ? "text-white/70 dark:text-black/70"
                                                                : "text-neutral-500"
                                                        )}>
                                                            {goal.description}
                                                        </p>
                                                        {
                                                            isSelected && (
                                                                <div className="absolute top-3 right-3">
                                                                    <Check className="w-5 h-5 text-white dark:text-black" />
                                                                </div>
                                                            )
                                                        }
                                                    </button>
                                                )
                                            })
                                        }
                                    </div>
                                    <div className="flex justify-between mt-8">
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            className="rounded-xl"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleComplete}
                                            disabled={!canProceedStep2 || isPending}
                                            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                        >
                                            {
                                                isPending ? (
                                                    <>
                                                        <InlineLoader size="sm" className="mr-2" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        Complete Setup
                                                        <Check className="w-4 h-4 ml-2" />
                                                    </>
                                                )
                                            }
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}