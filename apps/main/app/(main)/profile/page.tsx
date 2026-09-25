import { Suspense } from 'react'
import type { Metadata } from 'next'
import ProfileClient from './_components/ProfileClient'
import { ProfileEditorSkeleton } from './_components/profile-editor/skeleton'

export const metadata: Metadata = {
  title: 'My Profile | ShipItHQ',
  description: 'Manage your ShipItHQ developer profile, skills, projects, and work experience.',
}

// Suspense because the editor reads `?section=` with useSearchParams.
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileEditorSkeleton />}>
      <ProfileClient />
    </Suspense>
  )
}
