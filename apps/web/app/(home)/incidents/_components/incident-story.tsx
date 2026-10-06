"use client"

import { ScrubProvider } from "@repo/ui/components/incidents/scrub"
import { Timeline } from "@repo/ui/components/incidents/timeline"
import { DashboardView } from "@repo/ui/components/incidents/dashboard"
import { SequenceDiagram } from "@repo/ui/components/incidents/sequence"
import { MapChange, SystemMap } from "@repo/ui/components/incidents/system-map"
import type { SystemMap as SystemMapData } from "@repo/ui/lib/incidents/types"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"
import { Chat, QuizCard } from "@/components/story/kit"
import type { StoryCase } from "@/lib/incidents"

/**
 * One case, start to finish (plan/web/story ST-6), told over "The demo that died at 30
 * seconds". Every panel is the case player's own diagram, drawn from that case's data in the
 * database and lit for the step: the incident's clock, the dashboard on-call saw, the first
 * check, the request as it died, the lead's talk, and the fix on the map.
 */
export function IncidentStory({ story }: { story: StoryCase }) {
    const steps: (StoryStep & { panel: () => React.ReactNode })[] = []

    if (story.clock) steps.push({
        id: "on-the-call", tag: "The incident",
        title: "A job died on a live call",
        body: <>Four AI calls behind one button. On the call with the client, it spun for thirty seconds, someone refreshed to nudge it, and the job was never heard from again.</>,
        panel: () => (
            <StoryPanel label="The incident's clock" takeaway="A refresh at 30 seconds, and the job never finished.">
                <ScrubProvider><Timeline timeline={story.clock!} lit="refresh" /></ScrubProvider>
            </StoryPanel>
        ),
    })
    if (story.board) steps.push({
        id: "no-error", tag: "What on-call saw",
        title: "Nothing ever failed",
        body: <>The dashboard shows zero errors, the whole time. A job stopped from outside cannot log that it stopped, so an error alert would never have fired.</>,
        panel: () => (
            <StoryPanel label="The dashboard" takeaway="Errors: zero. The only signal was a job with nothing behind it.">
                <ScrubProvider><DashboardView dashboard={story.board!} lit="errors" /></ScrubProvider>
            </StoryPanel>
        ),
    })
    if (story.check?.options) steps.push({
        id: "make-the-call", tag: "You",
        title: "You make the first call",
        body: <>Before the case explains anything, it asks. Everyone on the call blamed Cloudflare&apos;s 30-second limit. Chapters end with checks like this one, answered before you read on.</>,
        panel: () => (
            <StoryPanel label="A check from the case" takeaway={story.check!.explanation.split(". ")[0] + "."}>
                <QuizCard prompt={story.check!.prompt} options={story.check!.options!} answer={typeof story.check!.answer === "string" ? story.check!.answer : undefined} />
            </StoryPanel>
        ),
    })
    if (story.lifecycle) steps.push({
        id: "watch-it-die", tag: "How a request lives",
        title: "You watch the request die",
        body: <>One request, message by message. The refresh closes the connection at thirty seconds, the handler stops mid-job, and the model&apos;s answers arrive with nobody listening.</>,
        panel: () => (
            <StoryPanel label="The request, as it happened" takeaway="The work lived inside a request, so it had a request's lifetime.">
                <SequenceDiagram sequence={story.lifecycle!} lit="reload" />
            </StoryPanel>
        ),
    })
    if (story.talks.length || story.mock) steps.push({
        id: "talk-it-through", tag: "The incident lead",
        title: "The lead pushes back",
        body: <>An AI incident lead talks it through with you, out loud or typed. It asks what you think happened, then presses on the part you skipped. Record the run, and at the end it writes a review of how you reasoned.</>,
        panel: () => (
            <StoryPanel label="A talk with the lead" takeaway="It asks, you explain, it pushes on what you skipped.">
                <Chat
                    lines={[
                        ...(story.talks[0] ? [{ who: "lead" as const, text: story.talks[0] }] : []),
                        ...(story.mock?.probe[0] ? [{ who: "lead" as const, text: <>Tell me {story.mock.probe[0]}.</> }] : []),
                    ]}
                    reply="Your answer, spoken or typed"
                />
            </StoryPanel>
        ),
    })
    steps.push({
        id: "the-fix", tag: "The fix",
        title: "You fix it on the map",
        body: <>The work moves out of the request, into a job runner no browser can reach, with a reaper for runs that stall. The map shows what was added and what changed, and why.</>,
        panel: () => (
            <StoryPanel label="The fix, on the system map" takeaway="The work left the request; a refresh can no longer strand a job.">
                <MapChange map={story.system} />
            </StoryPanel>
        ),
    })

    return <ScrollStory steps={steps} panel={(i) => steps[i]?.panel() ?? null} />
}

/** The case's system with the broken part lit: the hero's drawing, and each card's. */
export function CaseMap({ map, compact = false }: { map: SystemMapData; compact?: boolean }) {
    return <SystemMap map={map} compact={compact} />
}
