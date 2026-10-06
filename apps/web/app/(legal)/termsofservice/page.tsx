import type { Metadata } from 'next'
import TermsClient from './TermsClient'

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'ShipItHQ Terms of Service - the rules and conditions for using ShipItHQ.',
    robots: { index: true, follow: false },
    alternates: { canonical: '/termsofservice' },
}

export default function TermsOfServicePage() {
    return <TermsClient />
}
