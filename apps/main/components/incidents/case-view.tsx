"use client"

import { getIncidentCase } from "@/content/incidents/cases"
import { CaseProgressProvider, type Progress } from "./case-progress"
import { CaseProvider, IncidentStyles, Section } from "./primitives"
import { CaseCover } from "./case-cover"
import { ProgressRail } from "./progress-rail"
import { Story } from "./story"
import { Model } from "./model"
import { Simulator } from "./simulator"
import { Predict } from "./predict"
import { Fix } from "./fix"
import { Checklist, Closing, Round } from "./checklist-round"

/**
 * One case, all six parts (plan/incidents INC-3, INC-9). Inside the app shell: the cover,
 * then a 44rem reading column for the story and the questions that widens for the
 * diagram, the simulator and the fix; the parts index sticky on the RIGHT at xl (Niraj,
 * 2026-09-26), a thin bar under the cover below it.
 */
export function CaseView({ slug, initial, signedIn }: { slug: string; initial?: Progress; signedIn: boolean }) {
    const c = getIncidentCase(slug)
    if (!c) return null
    return (
        <CaseProvider value={c}>
            <CaseProgressProvider incident={c} initial={initial} signedIn={signedIn}>
                <IncidentStyles />
                <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
                    <div className="min-w-0">
                        <CaseCover />
                        <ProgressRail mobile />

                        <div className="pt-12">
                            <Section id="incident" n={1} eyebrow="The incident" title="What happened">
                                <Story />
                            </Section>
                            <Section id="model" n={2} eyebrow="The model" title="Three limits, one number">
                                <Model />
                            </Section>
                            <Section id="simulator" n={3} eyebrow="The simulator" title="Run it yourself" intro="Pick a platform, where the work runs and what the user does. Watch what survives, and read why.">
                                <Simulator />
                            </Section>
                            <Section id="predict" n={4} eyebrow="Make the call" title="Predict, then watch" intro="Commit to an answer before the simulator plays it. First-try answers earn XP.">
                                <Predict />
                            </Section>
                            <Section id="fix" n={5} eyebrow="The fix" title="What it should have been" intro={c.fix.intro}>
                                <Fix />
                            </Section>
                            <Section id="checklist" n={6} eyebrow="Take it to work" title="Checklist and the round">
                                <div className="space-y-16">
                                    <Checklist />
                                    <Round />
                                </div>
                            </Section>
                            <Closing />
                        </div>
                    </div>
                    <ProgressRail />
                </div>
            </CaseProgressProvider>
        </CaseProvider>
    )
}
