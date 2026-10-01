"use client"

import { 
    useState, useTransition, useEffect, useCallback, Suspense 
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Users, Code, Palette, LineChart, Megaphone, Cog, CheckCircle2, XCircle } from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import { 
    completeOnboarding, checkSlugAvailability, getPendingCompanyInfo, getOnboardingEligibility, claimCompany
} from "@/actions/auth/onboarding.action"
import { signOut } from "@repo/auth/client"
import { acceptInvitation } from "@/actions/team/invite.action"
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { TagInput } from "@repo/ui/components/ui/tag-input"
import { OPTION_BUILTINS } from "@repo/db/option-builtins"
import { WebsiteStep, type WebsiteResult } from "./website-step"
import {
    Chip, OnboardingFrame, OnboardingStep, PanelMuted, StepField, StepFooter, type OnboardingPanel,
} from "@repo/ui/components/onboarding/split-onboarding"
import { COUNTRIES, INDIAN_STATES } from "@/lib/places"

// Hiring Goal Options
const hiringGoals = [
    { id: "engineering", label: "Engineering", icon: Code, description: "Software developers, engineers" },
    { id: "design", label: "Design", icon: Palette, description: "UI/UX, graphic designers" },
    { id: "product", label: "Product", icon: Cog, description: "Product managers, analysts" },
    { id: "marketing", label: "Marketing", icon: Megaphone, description: "Marketing, growth roles" },
    { id: "sales", label: "Sales", icon: LineChart, description: "Sales, business development" },
    { id: "operations", label: "Operations", icon: Users, description: "HR, operations, admin" },
]


// Company Size Options
const companySizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "500+", label: "500+ employees" },
]


// Loading fallback component
function OnboardingLoading() {
    return <ShipItHQLoader />
}

/** Every hiring onboarding screen sits in the shared split frame (plan/auth AUTH-13). */
const PANEL: Record<string, OnboardingPanel> = {
    website: { headline: <>Hire from people who <PanelMuted>already passed.</PanelMuted></>, sub: "Give us your website and we fill in most of this for you.", art: "terminal" },
    company: { headline: <>Your company, <PanelMuted>on ShipItHQ.</PanelMuted></>, sub: "Candidates see this page before they apply.", art: "roster" },
    about: { headline: <>Tell candidates <PanelMuted>why you.</PanelMuted></>, sub: "What you build, where, and how the team works.", art: "commit-graph" },
    goals: { headline: <>Who are you <PanelMuted>hiring?</PanelMuted></>, sub: "It shapes the templates and rounds you see first.", art: "funnel" },
    notice: { headline: <>Almost <PanelMuted>there.</PanelMuted></>, sub: "One more thing before your workspace opens.", art: "shield" },
}

function useSignOut() {
    const [signingOut, setSigningOut] = useState(false)
    const signOutNow = async () => {
        setSigningOut(true)
        await signOut().catch(() => {})
        window.location.href = "/signin"
    }
    return { signingOut, signOutNow }
}

/** A single screen (invited, blocked, claim): the frame with no step dashes. */
function NoticeFrame({ children }: { children: React.ReactNode }) {
    const { signingOut, signOutNow } = useSignOut()
    return (
        <OnboardingFrame brand="ShipItHQ Hiring" panel={PANEL.notice!} panelKey="notice" onLogout={() => void signOutNow()} loggingOut={signingOut}>
            {children}
        </OnboardingFrame>
    )
}

/* Shown instead of the form when an invitation is waiting for this email (HA-8). */
function OnboardingInvited({ code, companyName, roleName }: { code: string; companyName: string; roleName: string }) {
    const [pending, startTransition] = useTransition()
    return (
        <NoticeFrame>
            <OnboardingStep title={<>You&apos;ve been invited to {companyName}</>} hint={<>Join as {roleName}. Your company&apos;s workspace is ready for you.</>}
                footer={<StepFooter busy={pending} nextLabel="Accept and join" onNext={() => startTransition(async () => {
                    const r = await acceptInvitation(code)
                    if (!r.success) { toast.error(r.error); return }
                    window.location.href = "/welcome"
                })} />} />
        </NoticeFrame>
    )
}

/*
 * Shown instead of the form when this person may not create a company
 * (plan/hiring-app HA-4, HA-5): their email is not a work email, or their
 * company is already on ShipItHQ and they need an invite from its admins.
 */
function OnboardingBlocked({ title, message }: { title: string; message: string }) {
    const { signingOut, signOutNow } = useSignOut()
    return (
        <NoticeFrame>
            <OnboardingStep title={title} hint={message} footer={<StepFooter busy={signingOut} nextLabel="Sign out" onNext={() => void signOutNow()} />} />
        </NoticeFrame>
    )
}

/*
 * ShipItHQ built this company's page from its website, and nobody has claimed it
 * (plan/hiring-rounds HR-8). Claiming sends it to an admin; approval makes this
 * person the page's Owner. Nothing changes on the page until then.
 */
function OnboardingClaim({ companyName, website, lastRejection, onClaimed }: {
    companyName: string
    website: string | null
    lastRejection: string | null
    onClaimed: () => void
}) {
    const [jobTitle, setJobTitle] = useState("")
    const [linkedinUrl, setLinkedinUrl] = useState("")
    const [note, setNote] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const host = website?.replace(/^https?:\/\//, "").replace(/\/$/, "")
    const claim = () => startTransition(async () => {
        setError(null)
        const r = await claimCompany({ jobTitle, linkedinUrl, note })
        if (!r.success) { setError(r.error); return }
        onClaimed()
    })
    return (
        <NoticeFrame>
            <OnboardingStep
                wide
                title={<>Claim {companyName}&apos;s page</>}
                hint={<>{companyName} already has a page on ShipItHQ, built from {host ?? "its website"}. Claim it and, once we&apos;ve checked, you&apos;ll be its Owner. It usually takes a working day.</>}
                error={error}
                footer={<StepFooter busy={pending} disabled={jobTitle.trim().length < 2} nextLabel="Claim this page" onNext={claim} />}
            >
                {lastRejection && (
                    <p className="mb-5 rounded-md bg-neutral-200/60 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Your last claim wasn&apos;t approved: {lastRejection}</p>
                )}
                <div className="space-y-5">
                    <StepField label="Your job title">
                        <OptionSelect id="claim-title" value={jobTitle} onChange={setJobTitle} options={[...OPTION_BUILTINS.member_title]} placeholder="Pick one or type your own" />
                    </StepField>
                    <StepField label="LinkedIn profile" optional>
                        <Input id="claim-linkedin" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." maxLength={300} />
                    </StepField>
                    <StepField label="Anything that helps us check" optional>
                        <Textarea id="claim-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
                    </StepField>
                </div>
            </OnboardingStep>
        </NoticeFrame>
    )
}

/* The claim is with an admin (HR-8): no workspace until it is approved. */
function OnboardingClaimPending({ companyName, submittedAt }: { companyName: string; submittedAt: Date }) {
    const { signingOut, signOutNow } = useSignOut()
    return (
        <NoticeFrame>
            <OnboardingStep
                title={<>Your claim for {companyName} is pending</>}
                hint={<>Sent {new Date(submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. We&apos;re checking that you work there and will email you when it&apos;s approved; then this sign-in takes you straight to your workspace.</>}
                footer={<StepFooter busy={signingOut} nextLabel="Sign out" onNext={() => void signOutNow()} />}
            />
        </NoticeFrame>
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
    // From the website read (plan/hiring-ui HU-14), all editable on the details step.
    const [techStack, setTechStack] = useState<string[]>([])
    const [benefits, setBenefits] = useState<string[]>([])
    const [culture, setCulture] = useState("")
    const [draftId, setDraftId] = useState<string | undefined>()

    // 1 the website (optional), 2 the company, 3 about it (optional), 4 what you hire for (AUTH-13).
    const totalSteps = 4

    const applyWebsite = (r: WebsiteResult) => {
        setWebsite(r.website.trim() && !/^https?:\/\//i.test(r.website.trim()) ? `https://${r.website.trim()}` : r.website.trim())
        setDraftId(r.draftId)
        if (r.name && !companyName) setCompanyName(r.name)
        if (r.description) setDescription(r.description)
        if (r.industry) setIndustry(r.industry)
        // The site states size in its own words: used only when it is one of ours.
        if (r.size && companySizes.some((s) => s.value === r.size!.trim())) setCompanySize(r.size.trim())
        if (r.city) setCity(r.city)
        if (r.techStack) setTechStack(r.techStack)
        if (r.benefits) setBenefits(r.benefits)
        if (r.culture) setCulture(r.culture)
        setCurrentStep(2)
    }

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

    const canProceedDetails = companyName.trim() && slug.trim() && slugStatus === "available" && userRole
    const canProceedGoals = selectedGoals.length > 0

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
                techStack,
                benefits,
                culture: culture || undefined,
                draftId,
            })

            if (result.success) {
                toast.success("Your workspace is ready")
                router.push("/home")
            } else if ("code" in result && result.code === "COMPANY_EXISTS") {
                // Someone from the same domain created it a moment ago.
                setEligibility({ status: "company_exists", companyName: "", message: result.error ?? "" })
            } else {
                toast.error(result.error || "Could not create the workspace")
            }
        })
    }

    // Before any early return: hooks run in the same order every render.
    const { signingOut, signOutNow } = useSignOut()

    if (!eligibility) return <OnboardingLoading />
    if (eligibility.status === "company_exists") {
        return <OnboardingBlocked title="Your company is already here" message={eligibility.message} />
    }
    if (eligibility.status === "invited") {
        return <OnboardingInvited code={eligibility.code} companyName={eligibility.companyName} roleName={eligibility.roleName} />
    }
    if (eligibility.status === "claimable") {
        return (
            <OnboardingClaim
                companyName={eligibility.companyName}
                website={eligibility.website}
                lastRejection={eligibility.lastRejection}
                onClaimed={() => setEligibility({ status: "claim_pending", companyName: eligibility.companyName, submittedAt: new Date() })}
            />
        )
    }
    if (eligibility.status === "claim_pending") {
        return <OnboardingClaimPending companyName={eligibility.companyName} submittedAt={eligibility.submittedAt} />
    }
    if (eligibility.status === "claim_in_review") {
        return <OnboardingBlocked title="Your company's page is being claimed" message={eligibility.message} />
    }
    if (eligibility.status === "work_email_required") {
        return <OnboardingBlocked title="A company email is needed" message={eligibility.message} />
    }

    const stepKey = currentStep === 1 ? "website" : currentStep === 2 ? "company" : currentStep === 3 ? "about" : "goals"
    const next = () => {
        if (currentStep === 2 && !canProceedDetails) return
        if (currentStep === 4) return canProceedGoals && !isPending ? handleComplete() : undefined
        handleNext()
    }

    return (
        <OnboardingFrame
            brand="ShipItHQ Hiring"
            panel={PANEL[stepKey]!}
            panelKey={stepKey}
            steps={totalSteps}
            current={currentStep - 1}
            onJump={(n) => setCurrentStep(n + 1)}
            onLogout={() => void signOutNow()}
            loggingOut={signingOut}
            // The website step owns its form (Enter reads the site); the rest continue on Enter.
            onEnter={currentStep === 1 ? undefined : next}
            onEscape={currentStep > 1 ? handleBack : undefined}
        >
            {currentStep === 1 && <WebsiteStep key="website" initialWebsite={website} onDone={applyWebsite} />}

            {currentStep === 2 && (
                <OnboardingStep
                    key="company"
                    wide
                    title={companyName ? <>Set up {companyName}</> : "Set up your workspace"}
                    hint="The page candidates see, and your role in it."
                    footer={<StepFooter onBack={handleBack} onNext={next} disabled={!canProceedDetails} />}
                >
                    <div className="space-y-5">
                        <StepField label="Company name">
                            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corporation" autoFocus />
                        </StepField>
                        <StepField label="Company page address">
                            <div className="relative">
                                <Input id="slug" value={slug} onChange={(e) => setSlug(generateSlug(e.target.value))} placeholder="acme-corp"
                                    className={cn("pr-10", slugStatus === "taken" && "border-rose-500")} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {slugStatus === "checking" && <InlineLoader size="sm" className="text-neutral-400" />}
                                    {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-neutral-900 dark:text-white" />}
                                    {slugStatus === "taken" && <XCircle className="h-4 w-4 text-rose-500" />}
                                </span>
                            </div>
                            <span className="block text-xs text-neutral-500">hire.shipithq.com/c/<span className="font-medium">{slug || "your-company"}</span></span>
                            {slugStatus === "taken" && slugSuggestions.length > 0 && (
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-neutral-500">Try:</span>
                                    {slugSuggestions.map((suggestion) => (
                                        <button key={suggestion} type="button" onClick={() => setSlug(suggestion)}
                                            className="rounded-md bg-neutral-200/70 px-2 py-1 text-xs hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700">{suggestion}</button>
                                    ))}
                                </span>
                            )}
                        </StepField>
                        <StepField label="Your job title">
                            <OptionSelect id="userRole" value={userRole} onChange={setUserRole} options={[...OPTION_BUILTINS.member_title]} placeholder="Pick one or type your own" />
                        </StepField>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <StepField label="Industry" optional>
                                <OptionSelect value={industry} onChange={setIndustry} options={[...OPTION_BUILTINS.industry]} placeholder="Pick an industry" />
                            </StepField>
                            <StepField label="Website" optional>
                                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                            </StepField>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[14px] font-medium text-neutral-800 dark:text-neutral-200">Company size <span className="font-normal text-neutral-500">(optional)</span></p>
                            <div className="flex flex-wrap gap-2">
                                {companySizes.map((size) => <Chip key={size.value} on={companySize === size.value} onClick={() => setCompanySize(companySize === size.value ? "" : size.value)}>{size.label}</Chip>)}
                            </div>
                        </div>
                    </div>
                    {!canProceedDetails && <p className="mt-5 text-xs text-neutral-500">Name, page address and your job title are needed.</p>}
                </OnboardingStep>
            )}

            {currentStep === 3 && (
                <OnboardingStep
                    key="about"
                    wide
                    title="About the company"
                    hint="Optional. Shown on your company page; you can change it any time."
                    footer={<StepFooter onBack={handleBack} onSkip={handleNext} onNext={next} />}
                >
                    <div className="space-y-5">
                        <StepField label="What the company does" optional>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the company does, and for whom." rows={3} />
                        </StepField>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <StepField label="City" optional>
                                <OptionSelect id="city" value={city} onChange={setCity} options={[...OPTION_BUILTINS.city]} placeholder="Pick a city" />
                            </StepField>
                            <StepField label="State" optional>
                                <OptionSelect id="state" value={state} onChange={setState} options={country === "India" || !country ? [...INDIAN_STATES] : []} placeholder={country === "India" || !country ? "Pick a state" : "Type the state"} />
                            </StepField>
                            <StepField label="Country" optional>
                                <OptionSelect id="country" value={country} onChange={(v) => { if (v !== country) setState(""); setCountry(v) }} options={[...COUNTRIES]} placeholder="Pick a country" />
                            </StepField>
                        </div>
                        <StepField label="Tech stack" optional>
                            <TagInput values={techStack} onChange={setTechStack} suggestions={[...OPTION_BUILTINS.tech]} placeholder="e.g. TypeScript" />
                        </StepField>
                        <StepField label="Benefits" optional>
                            <TagInput values={benefits} onChange={setBenefits} suggestions={[...OPTION_BUILTINS.benefit]} placeholder="e.g. Health insurance" />
                        </StepField>
                        <StepField label="How you work" optional>
                            <Textarea id="culture" value={culture} onChange={(e) => setCulture(e.target.value)} rows={3} maxLength={2000} placeholder="How the team works, what it values." />
                        </StepField>
                    </div>
                </OnboardingStep>
            )}

            {currentStep === 4 && (
                <OnboardingStep
                    key="goals"
                    title="What roles are you hiring for?"
                    hint="Pick every kind you hire for. It shapes the templates you see first."
                    footer={<StepFooter onBack={handleBack} onNext={next} busy={isPending} disabled={!canProceedGoals} nextLabel="Finish setup" />}
                >
                    <div className="flex flex-wrap gap-2">
                        {hiringGoals.map((goal) => {
                            const Icon = goal.icon
                            return <Chip key={goal.id} on={selectedGoals.includes(goal.id)} onClick={() => toggleGoal(goal.id)} icon={<Icon className="size-3.5" />}>{goal.label}</Chip>
                        })}
                    </div>
                </OnboardingStep>
            )}
        </OnboardingFrame>
    )
}
