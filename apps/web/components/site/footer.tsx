import Link from "next/link";
import { Logo } from "@repo/ui/components/logo"
import { Linkedin, Github } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { NewsletterSubscription } from "@/components/homepage/newslettersubscription";
import { APP_LINKS, BRAND } from "@/lib/site";
import { AUDIENCES, AUDIENCE_ORDER, type AudienceId } from "./audiences";

/**
 * The footer on every page, for all three audiences (plan/web/revamp REV-5). Replaces
 * `landingpage/footer.tsx` and `/hire`'s own footer.
 *
 * Two kinds of destination and no third: a Next <Link> for pages on this site, a plain
 * <a> to an app origin for anything behind a login (apps/web/CLAUDE.md). The footer is
 * always in the markup, unlike the navbar's hover panels, so it is also the site's real
 * internal-linking surface: the full Compare and Guides lists stay here.
 */

type FooterGroup = { title: string; links: { name: string; href: string; external?: boolean }[] };

const STUDENT_GROUPS: {
    title: string;
    links: { name: string; href: string; external?: boolean }[];
}[] = [
        // These point at /features, NOT at the app origin.
        //
        // They used to be absolute links to the app origin, so a signed-out visitor
        // clicking "Practice" in the footer was bounced to a sign-in wall - the footer is
        // where a reader who is not yet convinced goes looking, which is exactly the wrong
        // moment to ask them to log in. It also spent the site's internal links on pages a
        // crawler is redirected away from.
        {
            title: "Platform",
            links: [
                { name: "Features", href: "/features" },
                { name: "Practice", href: "/features/practice" },
                { name: "Projects", href: "/features/projects" },
                { name: "Mock Interviews", href: "/features/mock" },
                { name: "AI Tools", href: "/features/ai" },
                { name: "Pricing", href: "/pricing" },
            ],
        },
        {
            title: "Compare",
            links: [
                { name: "All ten comparisons", href: "/compare" },
                { name: "vs LeetCode", href: "/compare/leetcode" },
                { name: "vs a bootcamp", href: "/compare/bootcamp" },
                { name: "vs ChatGPT", href: "/compare/chatgpt" },
                { name: "vs a CS degree", href: "/compare/cs-degree" },
                { name: "vs your own plan", href: "/compare/diy-study-plan" },
            ],
        },
        // All SEVEN topic hubs, not a sample.
        //
        // The navbar's Guides panel lists them too, but that panel is conditionally
        // rendered - it does not exist in the HTML until somebody hovers - so a crawler
        // never sees those links. The footer is on every page and always in the markup,
        // which makes it the site's real internal-linking surface. Four hubs were reachable
        // only from /blogs before this.
        {
            title: "Guides",
            links: [
                { name: "All guides", href: "/blogs" },
                // Incidents lives in the app, public to read (plan/incidents INC-6).
                { name: "Incidents", href: APP_LINKS.incidents, external: true },
                { name: "Interview Prep", href: "/blogs/topics/interview-prep" },
                { name: "DSA & Practice", href: "/blogs/topics/dsa" },
                { name: "Career", href: "/blogs/topics/career" },
                { name: "Resume & Applications", href: "/blogs/topics/resume" },
                { name: "Portfolio & Projects", href: "/blogs/topics/portfolio" },
                { name: "Open Source", href: "/blogs/topics/open-source" },
                { name: "AI & Developer Tools", href: "/blogs/topics/ai-tools" },
            ],
        },
        {
            title: "Company",
            links: [
                { name: "About", href: "/aboutus" },
                { name: "Contact", href: "/aboutus#contact" },
                { name: "What's new", href: "/changelog" },
                { name: "Terms of Service", href: "/termsofservice" },
                { name: "Privacy Policy", href: "/privacypolicy" },
            ],
        },
    ];


/** /hire's own sections replace the student Platform column for companies. */
const COMPANY_PRODUCT: FooterGroup = {
    title: "Hiring",
    links: [
        { name: "Overview", href: "/hire" },
        { name: "Pipelines", href: "/hire/pipelines" },
        { name: "Questions", href: "/hire/questions" },
        { name: "Jobs", href: "/hire/jobs" },
        { name: "Candidates", href: "/hire/candidates" },
        { name: "Team", href: "/hire/team" },
        { name: "Pricing", href: "/hire/pricing" },
        { name: "Hiring guides", href: "/hire/guides" },
    ],
};

/** The five hiring guides, for the companies footer (REV-83, REV-84). */
const HIRING_GUIDES_GROUP: FooterGroup = {
    title: "Hiring guides",
    links: [
        { name: "All hiring guides", href: "/hire/guides" },
        { name: "Design an interview process", href: "/blogs/technical-interview-process-design" },
        { name: "Structured interviews", href: "/blogs/structured-interviews-engineering-hiring" },
        { name: "Work samples vs take-homes", href: "/blogs/work-sample-vs-take-home-assignment" },
        { name: "Setting pass marks", href: "/blogs/pass-marks-technical-assessments" },
        { name: "Hiring junior engineers", href: "/blogs/hiring-junior-engineers-without-resume-filter" },
    ],
};

/** /uni's own sections replace the student Platform column for universities (REV-31). */
const UNI_PRODUCT: FooterGroup = {
    title: "Universities",
    links: [
        { name: "Overview", href: "/uni" },
        { name: "Students", href: "/uni/students" },
        { name: "Assignments", href: "/uni/assignments" },
        { name: "Faculty", href: "/uni/faculty" },
        { name: "Placements", href: "/uni/placements" },
        { name: "Analytics", href: "/uni/analytics" },
        { name: "Pricing", href: "/uni/pricing" },
    ],
};

/** The five placement guides, for the universities footer (REV-31). */
const UNI_GUIDES_GROUP: FooterGroup = {
    title: "Placement guides",
    links: [
        { name: "All placement guides", href: "/uni/guides" },
        { name: "A placement season plan", href: "/blogs/placement-season-plan" },
        { name: "Readiness beyond CGPA", href: "/blogs/placement-readiness-metrics" },
        { name: "Mock interviews at scale", href: "/blogs/mock-interviews-at-scale" },
        { name: "Projects in coursework", href: "/blogs/project-based-learning-cs" },
        { name: "What companies look for", href: "/blogs/campus-recruiting-what-companies-want" },
    ],
};

const BLURB: Record<AudienceId, string> = {
    students: "The engineering intelligence suite. Build real projects, practise interviews, and land your next software role.",
    companies: "ShipItHQ Hiring. Design your interview once, and meet engineers who already passed it.",
    universities: "ShipItHQ for universities. Placement readiness for your whole campus.",
};

function groupsFor(audience: AudienceId): FooterGroup[] {
    const [platform, ...rest] = STUDENT_GROUPS;
    const product = audience === "companies" ? COMPANY_PRODUCT : audience === "universities" ? UNI_PRODUCT : platform!;
    if (audience === "companies" || audience === "universities") {
        // Hiring and universities: the student Compare and Guides columns do not belong here.
        const company = STUDENT_GROUPS[STUDENT_GROUPS.length - 1]!;
        const forWhom: FooterGroup = {
            title: "ShipItHQ for",
            links: AUDIENCE_ORDER.filter((id) => AUDIENCES[id].available).map((id) => ({ name: AUDIENCES[id].label, href: AUDIENCES[id].home })),
        };
        return [product, audience === "companies" ? HIRING_GUIDES_GROUP : UNI_GUIDES_GROUP, forWhom, company];
    }
    const forWhom: FooterGroup = {
        title: "ShipItHQ for",
        links: AUDIENCE_ORDER.filter((id) => AUDIENCES[id].available).map((id) => ({
            name: AUDIENCES[id].label,
            href: AUDIENCES[id].home,
        })),
    };
    return [product, forWhom, ...rest];
}

const SOCIALS = [
    { name: "X", href: BRAND.social.twitter, Icon: FaXTwitter },
    { name: "GitHub", href: BRAND.social.github, Icon: Github },
    { name: "LinkedIn", href: BRAND.social.linkedin, Icon: Linkedin },
];

export function SiteFooter({ audience = "students" }: { audience?: AudienceId }) {
    const groups = groupsFor(audience);
    return (
        <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
                    <div className="flex h-full flex-col justify-between lg:col-span-4">
                        <div>
                            <Link href={AUDIENCES[audience].home} className="mb-6 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 font-bold text-white dark:bg-white dark:text-neutral-900">
                                    <Logo className="h-[17px] w-[17px]" />
                                </span>
                                <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                    {BRAND.name}
                                </span>
                            </Link>
                            <p className="mb-8 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{BLURB[audience]}</p>
                        </div>
                        <NewsletterSubscription />
                    </div>

                    <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:col-span-8 xl:grid-cols-5">
                        {groups.map((group) => (
                            <div key={group.title}>
                                <h2 className="mb-6 text-sm font-semibold text-neutral-900 dark:text-white">
                                    {group.title}
                                </h2>
                                <ul className="space-y-3">
                                    {group.links.map((link) => (
                                        <li key={link.name}>
                                            {link.external ? (
                                                <a
                                                    href={link.href}
                                                    className="text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                                                >
                                                    {link.name}
                                                </a>
                                            ) : (
                                                <Link
                                                    href={link.href}
                                                    className="text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                                                >
                                                    {link.name}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-neutral-200 pt-8 dark:border-neutral-800 md:flex-row">
                    <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
                        </p>
                        <a
                            href={AUDIENCES[audience].signin}
                            className="text-xs text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                        >
                            Sign in to the app →
                        </a>
                    </div>
                    <div className="flex items-center gap-6">
                        {SOCIALS.map(({ name, href, Icon }) => (
                            <a
                                key={name}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${BRAND.name} on ${name}`}
                                className="text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                            >
                                <Icon className="h-4 w-4" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default SiteFooter;
