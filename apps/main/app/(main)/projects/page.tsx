import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProjectsHubClient from './_components/ProjectsHubClient'
import Loading from './loading'
import { getMyProjectsOverview } from '@/actions/(main)/projects/overview.action'
import { getModuleActivity } from '@/actions/(common)/stats/module-activity.action'
import { getCurrentOnboarding } from '@/actions/(main)/onboarding/module-onboarding.action'
import { ModuleOnboardingEntry } from '@/components/onboarding/module-onboarding-entry'
import { OnboardingWidget } from '@/components/onboarding/onboarding-widget'

export const metadata: Metadata = {
  title: 'Projects | ShipItHQ',
  description: 'Your projects, what you have finished, and what to do next.',
}

interface PageProps {
  searchParams: Promise<{ resume?: string }>
}

export default async function ProjectsHomePage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <Suspense fallback={<Loading />}>
      <HubContent resume={params.resume === '1'} />
    </Suspense>
  )
}

/**
 * The overview is fetched on the SERVER, not in a `useEffect` the way the old hub
 * fetched its platform stats. It is the page's primary content rather than a
 * decoration, so it should be there on first paint instead of arriving after a
 * client round trip - and it needs the session, which the client does not have.
 */
async function HubContent({ resume }: { resume: boolean }) {
  // The onboarding check comes first: behind the gate the overview is never
  // shown, so the gated page must not pay for it (plan/module-onboarding, MO-7).
  const onboarding = await getCurrentOnboarding('projects')
  if (!onboarding.completed || resume) {
    return (
      <div className="h-[var(--page-h,100vh)] min-h-0">
        <ModuleOnboardingEntry
          moduleKey="projects"
          inProgress={onboarding.inProgress}
          autoStart={resume || Boolean(onboarding.inProgress)}
          hasCompleted={Boolean(onboarding.completed)}
        />
      </div>
    )
  }

  // In parallel: they touch different tables and neither needs the other.
  const [result, activity] = await Promise.all([
    getMyProjectsOverview(),
    getModuleActivity('projects', 30),
  ])
  return (
    <ProjectsHubClient
      overview={result.success ? result.data : null}
      activity={activity}
      widget={
        <OnboardingWidget
          moduleKey="projects"
          completed={onboarding.completed}
          inProgress={onboarding.inProgress}
        />
      }
    />
  )
}
