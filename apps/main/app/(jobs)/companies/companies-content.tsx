"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    ArrowRight, BadgeCheck, CheckCircle2, Search, Filter, Building2, ListChecks,
    Heart, LayoutGrid, LayoutList, X
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@repo/ui/components/ui/sheet"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Label } from "@repo/ui/components/ui/label"
import Link from "next/link"
import { CompanyMark } from "@repo/ui/components/ui/company-mark"
import { cn } from "@repo/ui/lib/utils"
import { companyTrust } from "@/lib/company-trust"
import { followCompany, unfollowCompany } from "@/actions/companies"
import toast from "@repo/ui/components/ui/sonner"

interface Company {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    website: string | null
    industry: string | null
    companySize: string | null
    description: string | null
    verificationStatus: string
    /** UNCLAIMED: a page ShipItHQ built from the company's own site (plan/hiring-rounds HR-6). */
    claimStatus?: string | null
    headquarters: string | null
    activeJobsCount: number
    hasTransparentProcess: boolean
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

interface CompaniesContentProps {
    initialCompanies: Company[]
    initialPagination?: Pagination
    featuredCompanies: Company[]
    followedCompanyIds?: string[]
}

const industryOptions = [
    "Technology",
    "Finance",
    "Healthcare",
    "E-commerce",
    "Education",
    "Manufacturing",
    "Consulting",
    "Media",
    "Gaming",
    "Other"
]

export function CompaniesContent({
    initialCompanies,
    featuredCompanies,
    followedCompanyIds = []
}: CompaniesContentProps) {
    const [companies] = useState<Company[]>(initialCompanies)
    const [searchQuery, setSearchQuery] = useState("")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [onlyTransparent, setOnlyTransparent] = useState(false)
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(followedCompanyIds))
    const [, startTransition] = useTransition()

    const handleFollow = async (companyId: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        startTransition(async () => {
            if (followedIds.has(companyId)) {
                const result = await unfollowCompany(companyId)
                if (result.success) {
                    setFollowedIds(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(companyId)
                        return newSet
                    })
                    toast.success("Unfollowed company")
                } else {
                    toast.error(result.error || "Failed to unfollow")
                }
            } else {
                const result = await followCompany(companyId)
                if (result.success) {
                    setFollowedIds(prev => new Set([...prev, companyId]))
                    toast.success("Following company")
                } else {
                    toast.error(result.error || "Failed to follow")
                }
            }
        })
    }

    const toggleIndustry = (industry: string) => {
        setSelectedIndustries(prev => 
            prev.includes(industry) 
                ? prev.filter(i => i !== industry)
                : [...prev, industry]
        )
    }

    const clearFilters = () => {
        setSelectedIndustries([])
        setOnlyTransparent(false)
        setSearchQuery("")
    }

    const filteredCompanies = companies.filter(company => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!company.name.toLowerCase().includes(query) && 
                !company.industry?.toLowerCase().includes(query)) {
                return false
            }
        }
        if (selectedIndustries.length > 0 && company.industry && 
            !selectedIndustries.includes(company.industry)) {
            return false
        }
        if (onlyTransparent && !company.hasTransparentProcess) {
            return false
        }
        return true
    })

    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                        Discover Companies
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Find companies with transparent interview processes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Students ask for a company that isn't here (plan/hiring-rounds HR-7). */}
                    <Button asChild variant="outline" size="sm" className="mr-1 gap-1.5 rounded-lg">
                        <Link href="/companies/request">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Request a company</span>
                        </Link>
                    </Button>
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        className=""
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className=""
                        onClick={() => setViewMode("list")}
                    >
                        <LayoutList className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    <Input
                        placeholder="Search companies by name or industry..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setSearchQuery("")}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={onlyTransparent ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => setOnlyTransparent(!onlyTransparent)}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Transparent Only
                    </Button>
                    <Button 
                        variant="outline" 
                        className=""
                        onClick={() => setIsFilterOpen(true)}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {selectedIndustries.length > 0 && (
                            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {selectedIndustries.length}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Active Filters */}
            {(selectedIndustries.length > 0 || onlyTransparent) && (
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Active filters:</span>
                    {onlyTransparent && (
                        <Badge variant="secondary" className="gap-1">
                            Transparent Process
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setOnlyTransparent(false)} />
                        </Badge>
                    )}
                    {selectedIndustries.map(industry => (
                        <Badge key={industry} variant="secondary" className="gap-1">
                            {industry}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => toggleIndustry(industry)} />
                        </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
                        Clear all
                    </Button>
                </div>
            )}

            {/* Featured Companies */}
            {featuredCompanies.length > 0 && !searchQuery && selectedIndustries.length === 0 && (
                <div className="mb-10">
                    <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Featured</h2>
                    {/* Columns by the grid's own width, not the screen's: the sidebar and Harbor narrow it. */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
                        {featuredCompanies.slice(0, 6).map((company, index) => (
                            <motion.div key={company.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="h-full">
                                <CompanyCard company={company} featured followed={followedIds.has(company.id)} onFollow={(e) => handleFollow(company.id, e)} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Companies */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {searchQuery || selectedIndustries.length > 0 ? "Search Results" : "All Companies"}
                    </h2>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
                    </span>
                </div>

                <AnimatePresence mode="popLayout">
                    {filteredCompanies.length > 0 ? (
                        <div className={viewMode === "grid" 
                            ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4"
                            : "space-y-4"
                        }>
                            {filteredCompanies.map((company, index) => (
                                <motion.div
                                    key={company.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="h-full"
                                >
                                    <CompanyCard company={company} list={viewMode === "list"} followed={followedIds.has(company.id)} onFollow={(e) => handleFollow(company.id, e)} />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <Building2 className="w-16 h-16 text-neutral-600 dark:text-neutral-400 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">
                                No companies found
                            </h3>
                            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
                                Try adjusting your filters, or ask us to add the company you&apos;re looking for.
                            </p>
                            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                                <Button asChild className="gap-1.5">
                                    <Link href={searchQuery.trim() ? `/companies/request?q=${encodeURIComponent(searchQuery.trim())}` : "/companies/request"}>
                                        <Plus className="w-4 h-4" /> Request {searchQuery.trim() ? `"${searchQuery.trim().slice(0, 40)}"` : "a company"}
                                    </Link>
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Filters Sheet */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent className="w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Filter Companies</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                                Industry
                            </h4>
                            <div className="space-y-2">
                                {industryOptions.map(industry => (
                                    <div key={industry} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={industry}
                                            checked={selectedIndustries.includes(industry)}
                                            onCheckedChange={() => toggleIndustry(industry)}
                                        />
                                        <Label htmlFor={industry} className="text-sm cursor-pointer">
                                            {industry}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                                Features
                            </h4>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="transparent"
                                    checked={onlyTransparent}
                                    onCheckedChange={(checked) => setOnlyTransparent(!!checked)}
                                />
                                <Label htmlFor="transparent" className="text-sm cursor-pointer">
                                    Transparent Interview Process Only
                                </Label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={clearFilters}
                            >
                                Clear All
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setIsFilterOpen(false)}
                            >
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

/**
 * One company card for the featured and the full grids (plan/jobs-polish JP-16): the mark,
 * the name with a small verified tick, the industry, one meta line that truncates as a whole,
 * and a footer pinned to the bottom. Every card in a row is the same height (`h-full`). The
 * name is the card's link, stretched over it, so Follow and Practise stay real buttons and
 * links rather than controls nested inside an anchor.
 */
function CompanyCard({ company, featured = false, list = false, followed, onFollow }: {
    company: Company
    featured?: boolean
    list?: boolean
    followed: boolean
    onFollow: (e: React.MouseEvent) => void
}) {
    const trust = companyTrust(company.claimStatus, company.verificationStatus)
    const meta = [
        company.headquarters,
        `${company.activeJobsCount} ${company.activeJobsCount === 1 ? "job" : "jobs"}`,
        company.companySize ? `${company.companySize} people` : null,
    ].filter(Boolean).join(" · ")
    return (
        <article className={cn(
            "group relative flex h-full flex-col rounded-2xl border bg-white transition-colors dark:bg-neutral-900",
            featured ? "border-neutral-300 dark:border-neutral-700" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
        )}>
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start gap-3.5">
                    <CompanyMark seed={company.id} name={company.name} logoUrl={trust.showLogo ? company.logoUrl : null} size={48} />
                    <div className="min-w-0 flex-1 pr-8">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <h3 className="min-w-0 truncate font-semibold text-neutral-900 dark:text-white">
                                <Link href={`/companies/${company.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-neutral-900 dark:focus-visible:after:ring-white">
                                    {company.name}
                                </Link>
                            </h3>
                            {trust.kind === "verified" && (
                                <BadgeCheck className="h-4 w-4 shrink-0 text-neutral-900 dark:text-white" aria-label="Verified" role="img">
                                    <title>{trust.explain(company.name)}</title>
                                </BadgeCheck>
                            )}
                        </div>
                        <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                            {company.industry ?? (trust.kind === "unclaimed" ? "Not claimed yet" : trust.kind === "unverified" ? "Not verified yet" : "Company")}
                        </p>
                    </div>
                </div>
                {list && company.description && (
                    <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{company.description}</p>
                )}
                <p className="mt-auto truncate text-xs text-neutral-600 dark:text-neutral-400" title={meta}>{meta}</p>
            </div>
            <div className="flex h-11 items-center justify-between gap-3 border-t border-neutral-200 px-5 dark:border-neutral-800">
                {company.hasTransparentProcess ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300" title="The company publishes its interview rounds">
                        <ListChecks className="h-3.5 w-3.5" /> Open process
                    </span>
                ) : (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{trust.kind === "verified" ? "Rounds not published yet" : "Practice only"}</span>
                )}
                <Link href={`/companies/${company.slug}?tab=practice`} className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-neutral-900 hover:underline underline-offset-2 dark:text-white">
                    Practise <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
            <Button
                variant="ghost"
                size="icon"
                aria-label={followed ? `Unfollow ${company.name}` : `Follow ${company.name}`}
                aria-pressed={followed}
                className={cn(
                    "absolute right-3 top-3 z-10 h-8 w-8 rounded-full transition-opacity",
                    followed ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                )}
                onClick={onFollow}
            >
                <Heart className={followed ? "h-4 w-4 fill-current" : "h-4 w-4"} />
            </Button>
        </article>
    )
}
