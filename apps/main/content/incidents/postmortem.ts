/*
 * The postmortem the student writes (plan/incidents INC-72): the same five sections for
 * every case, then the case's real postmortem beside it, with a checklist of the points a
 * good one covers. Plain data: the step, the server's check and the player all read it.
 */

export const POSTMORTEM_SECTIONS = [
    { id: "impact", label: "Impact", hint: "Who was affected, how badly, and for how long." },
    { id: "timeline", label: "Timeline", hint: "What happened when: the start, when it was noticed, what was done." },
    { id: "causes", label: "Causes", hint: "The trigger, what let it do damage, and what had been weak all along." },
    { id: "well", label: "What went well", hint: "What helped: a signal, a person, a record that kept the evidence." },
    { id: "actions", label: "What we'll change", hint: "Concrete changes, each one something a person can do." },
] as const

export type PostmortemSection = (typeof POSTMORTEM_SECTIONS)[number]["id"]

/** A section counts as written from this many characters: a sentence, not a word. */
export const POSTMORTEM_MIN_CHARS = 20
/** And no section may run longer than this. */
export const POSTMORTEM_MAX_CHARS = 2000

export type PostmortemDraft = { sections: Partial<Record<PostmortemSection, string>>; covered: string[] }

/** Every section written, at least a sentence each. */
export function postmortemComplete(d: PostmortemDraft): boolean {
    return POSTMORTEM_SECTIONS.every((s) => (d.sections[s.id] ?? "").trim().length >= POSTMORTEM_MIN_CHARS)
}
