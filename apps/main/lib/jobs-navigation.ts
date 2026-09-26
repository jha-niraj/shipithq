import {
    Briefcase, Search, Heart, ClipboardCheck, Building2, Star
} from "lucide-react"

export type LucideIcon = typeof Briefcase

export interface NavigationItem {
    name: string
    path: string
    icon: LucideIcon
    children?: NavigationItem[]
    status?: string | "active" | "coming"
    comingSoon?: boolean
    badge?: string | number
}

export interface JobsNavigationConfig {
    primary: NavigationItem[]
    secondary: NavigationItem[]
}

export const jobsNavigation: JobsNavigationConfig = {
    primary: [
        {
            name: "Browse Jobs",
            path: "jobs",
            icon: Search,
            status: "active"
        },
        {
            name: "My rounds",
            path: "jobs/rounds",
            icon: ClipboardCheck,
            status: "active"
        },
        {
            name: "Saved Jobs",
            path: "jobs/saved",
            icon: Heart,
            status: "active"
        },
    ],
    secondary: [
        {
            name: "Companies",
            path: "companies",
            icon: Building2,
            status: "active"
        },
        {
            name: "Following",
            path: "companies/following",
            icon: Star,
            status: "active"
        },
    ]
}