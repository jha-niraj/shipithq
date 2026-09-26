import type { Metadata } from 'next'
import ErrorClient from './_components/ErrorClient'

export const metadata: Metadata = {
  title: 'Authentication Error | ShipItHQ',
  description: 'An error occurred during authentication.',
}

export default function AuthErrorPage() {
  return <ErrorClient />
}
