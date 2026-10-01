import type { Metadata } from 'next'
import OnboardingSplit from './_components/OnboardingSplit'

export const metadata: Metadata = {
  title: 'Complete Your Profile | ShipItHQ',
  description: 'Set up your ShipItHQ developer profile to get personalized recommendations.',
}

// The split onboarding (plan/auth AUTH-12): the old flow was retired on 2026-10-01.
export default function OnboardingPage() {
  return <OnboardingSplit />
}
