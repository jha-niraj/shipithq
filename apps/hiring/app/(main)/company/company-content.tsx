"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import {
    Building2, Globe, MapPin, Users, Calendar, Briefcase, Camera,
    Plus, X, Save, ExternalLink, Image as ImageIcon, Video, Twitter, 
    Linkedin, Github, Edit2, Check, Sparkles, UserCheck
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import {
    updateCompanyProfile, removeMediaFromGallery
} from "@/actions/company"
import toast from "@repo/ui/components/ui/sonner"
import Link from "next/link"
import { Label } from "@repo/ui/components/ui/label"
import Image from "next/image"
import type { CompanyProfile, CompanyStats, MediaItem } from "@/types"

interface CompanyProfileContentProps {
    profile: CompanyProfile | null
    stats: CompanyStats | null
}

const industries = [
    "Technology", "Finance", "Healthcare", "E-commerce", "Education",
    "Manufacturing", "Consulting", "Media", "Retail", "Real Estate"
]

const companySizes = [
    "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
]

type SocialLinksType = { twitter?: string; linkedin?: string; github?: string };

export function CompanyProfileContent({ profile, stats }: CompanyProfileContentProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    
    // Type cast JSON fields from Prisma to proper types
    const socialLinks = (profile?.socialLinks as SocialLinksType) || { twitter: "", linkedin: "", github: "" };
    const benefits = Array.isArray(profile?.benefits) ? profile.benefits as string[] : [];
    const techStack = Array.isArray(profile?.techStack) ? profile.techStack as string[] : [];
    const mediaGallery = Array.isArray(profile?.mediaGallery) ? profile.mediaGallery as MediaItem[] : [];
    
    const [formData, setFormData] = useState({
        name: profile?.name || "",
        description: profile?.description || "",
        website: profile?.website || "",
        industry: profile?.industry || "",
        size: (profile?.companySize || profile?.size) || "",
        founded: (profile?.foundedYear || profile?.founded)?.toString() || "",
        headquarters: profile?.headquarters || "",
        techStack: Array.isArray(profile?.techStack) ? profile.techStack : [],
        benefits: Array.isArray(profile?.benefits) ? profile.benefits : [],
        socialLinks
    })
    const [newTech, setNewTech] = useState("")
    const [newBenefit, setNewBenefit] = useState("")

    if (!profile) {
        return (
            <div className="page-frame space-y-5 px-page py-6">
                <PageHeader title="Company Profile" subtitle="Manage your company's public profile and branding" />
                <div className="text-center py-16 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-neutral-400" />
                    </div>
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                        Company profile not found
                    </h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                        Unable to load company profile. Please try again.
                    </p>
                </div>
            </div>
        )
    }

    const handleSave = async () => {
        startTransition(async () => {
            const result = await updateCompanyProfile({
                name: formData.name,
                description: formData.description,
                website: formData.website,
                industry: formData.industry,
                companySize: formData.size,
                foundedYear: formData.founded ? parseInt(formData.founded) : undefined,
                headquarters: formData.headquarters,
                techStack: formData.techStack,
                benefits: formData.benefits,
                socialLinks: formData.socialLinks
            })

            if (result.success) {
                toast.success("Profile updated successfully")
                setIsEditing(false)
            } else {
                toast.error(result.error || "Failed to update profile")
            }
        })
    }

    const addItem = (type: 'techStack' | 'benefits', value: string, setter: (v: string) => void) => {
        if (!value.trim()) return
        setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], value.trim()]
        }))
        setter("")
    }

    const removeItem = (type: 'techStack' | 'benefits', index: number) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Company Profile"
                subtitle="Manage your company's public profile and branding"
                actions={
                <>
                    {
                        isEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(false)}
                                    className="rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isPending}
                                    className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    asChild
                                >
                                    <Link href={`/companies/${profile.slug}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View Public Page
                                    </Link>
                                </Button>
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </>
                        )
                    }
                </>
                }
            />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
            >
                <div className="h-48 lg:h-64 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 overflow-hidden relative group">
                    {
                        profile.coverImage && (
                            <Image
                                src={profile.coverImage}
                                alt="Cover"
                                className="w-full h-full object-cover"
                                fill
                            />
                        )
                    }
                    {
                        isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" className="rounded-xl">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Change Cover
                                </Button>
                            </div>
                        )
                    }
                </div>
                <div className="absolute -bottom-10 left-8 w-28 h-28 rounded-2xl bg-white dark:bg-neutral-900 border-4 border-white dark:border-neutral-900 shadow-xl overflow-hidden group">
                    {
                        profile.logo ? (
                            <Image
                                src={profile.logo}
                                alt={profile.name}
                                className="w-full h-full object-cover"
                                fill
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">
                                    {profile.name.charAt(0)}
                                </span>
                            </div>
                        )
                    }
                    {
                        isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        )
                    }
                </div>
                {
                    profile.isVerified && (
                        <div className="absolute -bottom-10 left-40">
                            <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 gap-1">
                                <Check className="w-3 h-3" />
                                Verified
                            </Badge>
                        </div>
                    )
                }
            </motion.div>
            <StatBand
                // The logo overhangs the cover by 40px (-bottom-10), so the band
                // clears it rather than taking the frame's 20px gap.
                className="!mt-16"
                cols={4}
                items={[
                    { icon: Briefcase, label: "Active Jobs", value: stats?.activeJobs || 0 },
                    { icon: UserCheck, label: "Total Hires", value: stats?.totalHires || 0 },
                    { icon: Users, label: "Team Members", value: profile.membersCount || 0 },
                    { icon: Calendar, label: "Avg. Time to Hire", value: `${stats?.avgTimeToHireDays || 0}d` },
                ]}
            />
            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
                    <TabsTrigger value="basic" className="rounded-lg">Basic Info</TabsTrigger>
                    <TabsTrigger value="culture" className="rounded-lg">Culture & Benefits</TabsTrigger>
                    <TabsTrigger value="tech" className="rounded-lg">Tech Stack</TabsTrigger>
                    <TabsTrigger value="media" className="rounded-lg">Media Gallery</TabsTrigger>
                </TabsList>
                <TabsContent value="basic">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                    >
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Company Name
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <p className="text-neutral-900 dark:text-white font-medium">{profile.name}</p>
                                        )
                                    }
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Website
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Input
                                                value={formData.website}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://example.com"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <Link
                                                href={profile.website || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-neutral-800 dark:text-neutral-100 hover:underline flex items-center gap-1"
                                            >
                                                <Globe className="w-4 h-4" />
                                                {profile.website || "Not set"}
                                            </Link>
                                        )
                                    }
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Industry
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Select
                                                value={formData.industry}
                                                onValueChange={(v) => setFormData({ ...formData, industry: v })}
                                            >
                                                <SelectTrigger className="rounded-xl">
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
                                        ) : (
                                            <p className="text-neutral-900 dark:text-white">{profile.industry || "Not set"}</p>
                                        )
                                    }
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Company Size
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Select
                                                value={formData.size}
                                                onValueChange={(v) => setFormData({ ...formData, size: v })}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue placeholder="Select size" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {
                                                        companySizes.map(size => (
                                                            <SelectItem key={size} value={size}>{size} employees</SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="text-neutral-900 dark:text-white">{profile.size ? `${profile.size} employees` : "Not set"}</p>
                                        )
                                    }
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Founded Year
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Input
                                                type="number"
                                                value={formData.founded}
                                                onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                                                placeholder="2020"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <p className="text-neutral-900 dark:text-white">{profile.founded || "Not set"}</p>
                                        )
                                    }
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                        Headquarters
                                    </Label>
                                    {
                                        isEditing ? (
                                            <Input
                                                value={formData.headquarters}
                                                onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                                                placeholder="City, Country"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <p className="text-neutral-900 dark:text-white flex items-center gap-1">
                                                <MapPin className="w-4 h-4 text-neutral-400" />
                                                {profile.headquarters || "Not set"}
                                            </p>
                                        )
                                    }
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                    About Company
                                </Label>
                                {
                                    isEditing ? (
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Tell candidates about your company, culture, and mission..."
                                            rows={6}
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                                            {profile.description || "No description set"}
                                        </p>
                                    )
                                }
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4 block">
                                    Social Links
                                </Label>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="shrink-0 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            <Twitter className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                        </div>
                                        {
                                            isEditing ? (
                                                <Input
                                                    value={formData.socialLinks.twitter}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                                                    })}
                                                    placeholder="Twitter URL"
                                                    className="rounded-xl flex-1 min-w-0"
                                                />
                                            ) : (
                                                <span className="min-w-0 text-neutral-600 dark:text-neutral-400 text-sm truncate">
                                                    {socialLinks.twitter || "Not set"}
                                                </span>
                                            )
                                        }
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="shrink-0 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            <Linkedin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                        </div>
                                        {
                                            isEditing ? (
                                                <Input
                                                    value={formData.socialLinks.linkedin}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                                                    })}
                                                    placeholder="LinkedIn URL"
                                                    className="rounded-xl flex-1 min-w-0"
                                                />
                                            ) : (
                                                <span className="min-w-0 text-neutral-600 dark:text-neutral-400 text-sm truncate">
                                                    {socialLinks.linkedin || "Not set"}
                                                </span>
                                            )
                                        }
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="shrink-0 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            <Github className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                        </div>
                                        {
                                            isEditing ? (
                                                <Input
                                                    value={formData.socialLinks.github}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        socialLinks: { ...formData.socialLinks, github: e.target.value }
                                                    })}
                                                    placeholder="GitHub URL"
                                                    className="rounded-xl flex-1 min-w-0"
                                                />
                                            ) : (
                                                <span className="min-w-0 text-neutral-600 dark:text-neutral-400 text-sm truncate">
                                                    {socialLinks.github || "Not set"}
                                                </span>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>
                <TabsContent value="culture">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                    >
                        <div className="space-y-6">
                            <div>
                                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4 block">
                                    Employee Benefits
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {
                                        (isEditing ? formData.benefits : benefits)?.map((benefit, i) => (
                                            <Badge
                                                key={i}
                                                className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 gap-1 px-3 py-1"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                {benefit}
                                                {
                                                    isEditing && (
                                                        <X
                                                            className="w-3 h-3 cursor-pointer hover:text-red-500 ml-1"
                                                            onClick={() => removeItem('benefits', i)}
                                                        />
                                                    )
                                                }
                                            </Badge>
                                        ))
                                    }
                                    {
                                        isEditing && (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newBenefit}
                                                    onChange={(e) => setNewBenefit(e.target.value)}
                                                    placeholder="Add benefit"
                                                    className="w-40 h-8 text-sm rounded-lg"
                                                    onKeyDown={(e) => e.key === 'Enter' && addItem('benefits', newBenefit, setNewBenefit)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addItem('benefits', newBenefit, setNewBenefit)}
                                                    className="h-8 rounded-lg"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )
                                    }
                                </div>
                                {
                                    !isEditing && benefits.length === 0 && (
                                        <p className="text-neutral-500 text-sm">No benefits listed yet</p>
                                    )
                                }
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>
                <TabsContent value="tech">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                    >
                        <div>
                            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4 block">
                                Technologies We Use
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {
                                    (isEditing ? formData.techStack : techStack)?.map((tech, i) => (
                                        <Badge
                                            key={i}
                                            className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 gap-1 px-3 py-1"
                                        >
                                            {tech}
                                            {
                                                isEditing && (
                                                    <X
                                                        className="w-3 h-3 cursor-pointer hover:text-red-500 ml-1"
                                                        onClick={() => removeItem('techStack', i)}
                                                    />
                                                )
                                            }
                                        </Badge>
                                    ))
                                }
                                {
                                    isEditing && (
                                        <div className="flex gap-2">
                                            <Input
                                                value={newTech}
                                                onChange={(e) => setNewTech(e.target.value)}
                                                placeholder="Add technology"
                                                className="w-40 h-8 text-sm rounded-lg"
                                                onKeyDown={(e) => e.key === 'Enter' && addItem('techStack', newTech, setNewTech)}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => addItem('techStack', newTech, setNewTech)}
                                                className="h-8 rounded-lg"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )
                                }
                            </div>
                            {
                                !isEditing && techStack.length === 0 && (
                                    <p className="text-neutral-500 text-sm">No technologies listed yet</p>
                                )
                            }
                        </div>
                    </motion.div>
                </TabsContent>
                <TabsContent value="media">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">Media Gallery</h3>
                                <p className="text-sm text-neutral-500">Showcase your office, team, and events</p>
                            </div>
                            {
                                isEditing && (
                                    <Button variant="outline" className="rounded-xl">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Media
                                    </Button>
                                )
                            }
                        </div>

                        {
                            mediaGallery.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {
                                        mediaGallery.map((media: MediaItem, i) => (
                                            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                                {
                                                    media.type === 'video' ? (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Video className="w-8 h-8 text-neutral-400" />
                                                        </div>
                                                    ) : (
                                                        <Image
                                                            src={media.url}
                                                            alt={media.title || "Gallery image"}
                                                            className="w-full h-full object-cover"
                                                            fill
                                                        />
                                                    )
                                                }
                                                {
                                                    isEditing && media.id && (
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg"
                                                            onClick={() => removeMediaFromGallery(media.id!)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )
                                                }
                                            </div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                                    <ImageIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                    <p className="text-neutral-500">No media added yet</p>
                                    {
                                        isEditing && (
                                            <Button variant="outline" className="mt-4 rounded-xl">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Upload Images or Videos
                                            </Button>
                                        )
                                    }
                                </div>
                            )
                        }
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    )
}