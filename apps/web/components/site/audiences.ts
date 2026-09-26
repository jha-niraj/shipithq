import { Building2, GraduationCap, UserRound, Briefcase, ListChecks, Users, MessagesSquare, BookOpenCheck, UserCog, BarChart3 } from 'lucide-react'
import { NAV_ITEMS, type NavIcon, type NavItem } from '@/components/landingpage/nav-links'
import { APP_LINKS, HIRING_LINKS, UNI_LINKS } from '@/lib/site'
import { HIRING_GUIDE_SLUGS } from '@/content/hiring-guides'
import { UNI_GUIDE_SLUGS } from '@/content/uni-guides'

/**
 * Who the site is talking to (plan/web/revamp REV-3). One navbar serves three
 * audiences; the switcher picks one and the links, CTA and sign-in origin follow.
 *
 * The audience is read from the path, never stored: `/hire*` is companies, `/uni*` is
 * universities, and everything else - including the shared pages (blog, compare,
 * pricing, legal) - is students, who are most of the traffic.
 *
 * `available: false` shows the audience in the switcher with a "Soon" tag and no link.
 * That is how Universities ships until `/uni` exists: a switcher row that 404s would
 * break the no-dead-links rule (apps/web/CLAUDE.md).
 */

export type AudienceId = 'students' | 'companies' | 'universities'

export interface Audience {
    id: AudienceId
    label: string
    /** One line under the label in the switcher panel. */
    description: string
    icon: NavIcon
    home: string
    available: boolean
    links: readonly NavItem[]
    cta: { label: string; href: string }
    signin: string
}

/** The /hire page's own sections. Anchors, because the page is one long read. */
const COMPANY_LINKS: readonly NavItem[] = [
    {
        href: '/hire',
        label: 'Product',
        children: [
            { href: '/hire/pipelines', title: 'Pipelines', description: 'Aptitude, coding, design and voice rounds with pass marks', icon: ListChecks },
            { href: '/hire/questions', title: 'Questions', description: 'A pool of 320 aptitude questions and 12 design prompts', icon: MessagesSquare },
            { href: '/hire/jobs', title: 'Jobs', description: 'Post a role with its interview attached', icon: Briefcase },
            { href: '/hire/candidates', title: 'Candidates', description: 'One board from Applied to Hired, with take-homes', icon: Users },
            { href: '/hire/team', title: 'Team', description: 'Invite by company email, with custom roles', icon: Building2 },
        ],
    },
    { href: '/hire/guides', label: 'Guides' },
    { href: '/hire/pricing', label: 'Pricing' },
]

/** The /uni pages (plan/web/revamp REV-31). */
const UNI_NAV: readonly NavItem[] = [
    {
        href: '/uni',
        label: 'Product',
        children: [
            { href: '/uni/students', title: 'Students', description: 'Verified students by department, and how ready they are', icon: GraduationCap },
            { href: '/uni/assignments', title: 'Assignments', description: 'AI projects, voice mocks and code assessments with deadlines', icon: BookOpenCheck },
            { href: '/uni/faculty', title: 'Faculty', description: 'Six campus roles and fourteen permissions', icon: UserCog },
            { href: '/uni/placements', title: 'Placements', description: 'Campus-only jobs, referrals, applied to placed', icon: Briefcase },
            { href: '/uni/analytics', title: 'Analytics', description: 'Readiness by department, completion and credits', icon: BarChart3 },
        ],
    },
    { href: '/uni/guides', label: 'Guides' },
    { href: '/uni/pricing', label: 'Pricing' },
]

export const AUDIENCES: Record<AudienceId, Audience> = {
    students: {
        id: 'students',
        label: 'Students',
        description: 'Practice, build projects and get hired',
        icon: UserRound,
        home: '/',
        available: true,
        links: NAV_ITEMS,
        cta: { label: 'Start free', href: APP_LINKS.signup },
        signin: APP_LINKS.signin,
    },
    companies: {
        id: 'companies',
        label: 'Companies',
        description: 'Hire engineers who already passed your rounds',
        icon: Building2,
        home: '/hire',
        available: true,
        links: COMPANY_LINKS,
        cta: { label: 'Start hiring', href: HIRING_LINKS.signup },
        signin: HIRING_LINKS.signin,
    },
    universities: {
        id: 'universities',
        label: 'Universities',
        description: 'Placement readiness for your whole campus',
        icon: GraduationCap,
        home: '/uni',
        // Live since REV-31 (Niraj, 2026-09-26).
        available: true,
        links: UNI_NAV,
        cta: { label: 'Set up your campus', href: UNI_LINKS.signup },
        signin: UNI_LINKS.signin,
    },
}

export const AUDIENCE_ORDER: readonly AudienceId[] = ['students', 'companies', 'universities']

export function audienceFor(pathname: string): Audience {
    if (pathname === '/hire' || pathname.startsWith('/hire/')) return AUDIENCES.companies
    // Hiring guides live in the blog system but are written for companies (REV-83).
    if (pathname === '/blogs/topics/hiring') return AUDIENCES.companies
    if (pathname.startsWith('/blogs/') && HIRING_GUIDE_SLUGS.includes(pathname.slice('/blogs/'.length))) return AUDIENCES.companies
    if ((pathname === '/uni' || pathname.startsWith('/uni/')) && AUDIENCES.universities.available) return AUDIENCES.universities
    // Placement guides are blog posts written for universities (REV-31).
    if (pathname === '/blogs/topics/placements') return AUDIENCES.universities
    if (pathname.startsWith('/blogs/') && UNI_GUIDE_SLUGS.includes(pathname.slice('/blogs/'.length))) return AUDIENCES.universities
    return AUDIENCES.students
}

