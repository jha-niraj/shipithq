"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search, Filter, Building2, Users, MapPin,
    CheckCircle2, Briefcase, Star, Heart,
    Mic, LayoutGrid, LayoutList, X
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
import { CompanyTrustBadge } from "@/components/companies/trust-badge"
import { companyTrust } from "@/lib/company-trust"
import Image from "next/image"
import { useRouter } from "next/navigation"
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
    const router = useRouter()
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

    const getCardClasses = (featured: boolean) => {
        const base = "group relative rounded-2xl p-5 border transition-all h-full hover:shadow-lg"
        if (featured) {
            return `${base} bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-900 dark:to-neutral-800/50 border-neutral-200 dark:border-neutral-700`
        }
        return `${base} bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700`
    }

    const getFollowButtonClasses = (isFollowed: boolean) => {
        if (isFollowed) {
            return "absolute top-3 right-3 h-8 w-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition-all"
        }
        return "absolute top-3 right-3 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all"
    }

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
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Featured Companies
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredCompanies.slice(0, 6).map((company, index) => (
                            <motion.div
                                key={company.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={getCardClasses(true)}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={getFollowButtonClasses(followedIds.has(company.id))}
                                    onClick={(e) => handleFollow(company.id, e)}
                                >
                                    <Heart className={followedIds.has(company.id) ? "w-4 h-4 fill-current" : "w-4 h-4"} />
                                </Button>

                                <Link href={`/companies/${company.slug}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                                            {company.logoUrl && companyTrust(company.claimStatus, company.verificationStatus).showLogo ? (
                                                <Image src={company.logoUrl} alt={company.name} fill className="object-cover" />
                                            ) : (
                                                <Building2 className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* min-w-0 on the outer wrapper bounds ITS width, but this row is a
                                                nested flex context one level deeper - the h3 is a flex item of
                                                THIS row (alongside the verified badge), so it needs its own
                                                min-w-0 or the ancestor's does nothing. Same for the headquarters
                                                row below. See docs/responsiveness.md section 2. */}
                                            <div className="flex items-center gap-2">
                                                <h3 className="min-w-0 flex-1 truncate font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors">
                                                    {company.name}
                                                </h3>
                                            </div>
                                            {company.industry && (
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{company.industry}</p>
                                            )}
                                            <CompanyTrustBadge compact className="mt-1.5" claimStatus={company.claimStatus} verificationStatus={company.verificationStatus} companyName={company.name} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                                        {company.headquarters && (
                                            <div className="flex min-w-0 items-center gap-1">
                                                <MapPin className="w-4 h-4 shrink-0" />
                                                <span className="min-w-0 truncate">{company.headquarters}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Briefcase className="w-4 h-4" />
                                            <span>{company.activeJobsCount} jobs</span>
                                        </div>
                                    </div>

                                    {company.hasTransparentProcess && (
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                            <div className="flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-100">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Transparent Interview Process</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs rounded-lg gap-1"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    router.push(`/companies/${company.slug}#roles`)
                                                }}
                                            >
                                                <Mic className="w-3 h-3" />
                                                Practice
                                            </Button>
                                        </div>
                                    )}
                                </Link>
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
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            : "space-y-4"
                        }>
                            {filteredCompanies.map((company, index) => (
                                <motion.div
                                    key={company.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={getCardClasses(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={getFollowButtonClasses(followedIds.has(company.id))}
                                        onClick={(e) => handleFollow(company.id, e)}
                                    >
                                        <Heart className={followedIds.has(company.id) ? "w-4 h-4 fill-current" : "w-4 h-4"} />
                                    </Button>

                                    <Link href={`/companies/${company.slug}`}>
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                                                {company.logoUrl && companyTrust(company.claimStatus, company.verificationStatus).showLogo ? (
                                                    <Image src={company.logoUrl} alt={company.name} fill className="object-cover" />
                                                ) : (
                                                    <Building2 className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="min-w-0 flex-1 truncate font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors">
                                                        {company.name}
                                                    </h3>
                                                </div>
                                                {company.industry && (
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{company.industry}</p>
                                                )}
                                                <CompanyTrustBadge compact className="mt-1.5" claimStatus={company.claimStatus} verificationStatus={company.verificationStatus} companyName={company.name} />
                                            </div>
                                        </div>

                                        {company.description && viewMode === "list" && (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 line-clamp-2">
                                                {company.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                                            {company.headquarters && (
                                                <div className="flex min-w-0 items-center gap-1">
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="min-w-0 truncate">{company.headquarters}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Briefcase className="w-4 h-4" />
                                                <span>{company.activeJobsCount} jobs</span>
                                            </div>
                                            {company.companySize && (
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>{company.companySize}</span>
                                                </div>
                                            )}
                                        </div>

                                        {company.hasTransparentProcess && (
                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                                <div className="flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-100">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Transparent Interview Process</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs rounded-lg gap-1"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        router.push(`/companies/${company.slug}#roles`)
                                                    }}
                                                >
                                                    <Mic className="w-3 h-3" />
                                                    Practice
                                                </Button>
                                            </div>
                                        )}
                                    </Link>
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
