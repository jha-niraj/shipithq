import type { Metadata } from 'next'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'ShipItHQ Privacy Policy - how we collect, use, and protect your personal data on ShipItHQ.',
    robots: { index: true, follow: false },
    alternates: { canonical: '/privacypolicy' },
}

export default function PrivacyPolicyPage() {
    return <PrivacyPolicyClient />
}
