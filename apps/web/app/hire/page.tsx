import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { HireLanding } from './_components/hire-landing'

// shipithq.com/hire - ShipItHQ for companies. The product itself is the hiring
// app (HIRING_URL, lib/site.ts); every CTA here is a plain link to it.
export const metadata: Metadata = pageMeta({
    title: 'Hiring for engineering teams',
    description:
        'Set your own interview rounds and receive candidates who have already passed them. ShipItHQ Hiring for companies.',
    path: '/hire',
})

export default function HirePage() {
    return <HireLanding />
}
