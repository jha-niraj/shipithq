import { BRAND, SITE } from '@/lib/site'

export type AuthorKey = 'niraj'

export interface Author {
    key: AuthorKey
    name: string
    role: string
    email: string
    bio: string
    /** Path relative to /public, e.g. '/icon-512.png' */
    image: string
    sameAs: readonly string[]
    /**
     * E-E-A-T signal: topics this author has demonstrable expertise in. Feeds the
     * Person JSON-LD emitted on every post, which is what lets Google attach an
     * article to a real, identifiable expert rather than an anonymous byline.
     */
    knowsAbout: readonly string[]
}

export const AUTHORS: Record<AuthorKey, Author> = {
    niraj: {
        key: 'niraj',
        name: 'Niraj Kumar Jha',
        role: `Founder & Lead Engineer, ${BRAND.name}`,
        email: BRAND.email,
        image: '/icon-512.png',
        bio: 'Building ShipItHQ, where CS students and working software engineers build projects, practise and prepare for interviews. Full-stack engineer across database architecture, AI systems, and frontend delivery, who has sat on both sides of the technical interview table. These guides come from what actually moves the needle for candidates, not from recycled interview advice.',
        sameAs: [
            'https://www.linkedin.com/in/nirajjha31/',
            'https://x.com/iamnirajjha',
            'https://github.com/jha-niraj',
        ],
        knowsAbout: [
            'Technical Interview Preparation',
            'System Design',
            'Data Structures and Algorithms',
            'Software Engineering Careers',
            'Developer Portfolios',
            'ATS and Resume Screening',
            'Open Source Contribution',
            'Full-Stack Engineering',
        ],
    },
} as const

/** Absolute author profile URL used as the JSON-LD Person `url`. */
export const AUTHOR_PAGE_URL = `${SITE}/aboutus`
