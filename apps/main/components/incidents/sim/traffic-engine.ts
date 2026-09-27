import type { TrafficActor, TrafficRule, TrafficScenario } from "./schema"

/**
 * The traffic engine (plan/incidents INC-55): pure and deterministic, so the same choices
 * always give the same result, a script can check a scenario without a browser, and the
 * view can replay it to any second. Event-driven: each actor's next attempt is queued;
 * each attempt passes the active policies in order and gets one answer.
 *
 *   refused     a counter blocked it (429) or its key is locked: never checked
 *   challenged  the score asked for proof: attackers fail it, real users pass
 *   wrong / in  it reached the password check (a wrong one is a failure that counts)
 *
 * A score can also slow an attempt: it is still answered, but the actor's next attempt
 * waits `slowSeconds` longer, which costs a person a second and a script its whole rate.
 */

export type Answer = "refused" | "challenged" | "wrong" | "in"
/** `slowed`: the score held the caller back before answering; the answer still stands. */
export type Attempt = { at: number; actor: string; kind: TrafficActor["kind"]; email: string; ip: string; answer: Answer; slowed: boolean }

export type ActorTally = { attempts: number; refused: number; slowed: number; challenged: number; wrong: number; in: number }
export type TrafficResult = {
    attempts: Attempt[]
    byActor: Record<string, ActorTally>
    /** Accounts the attacker got into (distinct emails). */
    taken: number
    /** Real users who tried with the right password and were refused (locked out, or blocked). */
    lockedOut: number
    /** Attacker guesses that never reached the password check. */
    stopped: number
    /** Attacker guesses that did. */
    checked: number
}

const matches = (active: Record<string, string[]> | undefined, values: Record<string, string>) =>
    !active || Object.entries(active).every(([k, vs]) => vs.includes(values[k] ?? ""))

const poolValue = (p: TrafficActor["email"], n: number) => (p.mode === "fixed" ? p.value : `${p.prefix}${n % p.count}`)

export function runTraffic(s: TrafficScenario, values: Record<string, string>): TrafficResult {
    const actors = s.actors.filter((a) => matches(a.active, values))
    const rules = s.policies.filter((p) => matches(p.active, values)).flatMap((p) => p.rules)

    const fails = new Map<string, number[]>() // key -> times of failed checks
    const locked = new Map<string, number>() // key -> locked until
    const attempts: Attempt[] = []
    const n = new Map<string, number>() // attempts made per actor
    const hits = new Map<string, number>() // attacker checks per actor (for hitEvery)
    const next = new Map<string, number>(actors.map((a) => [a.id, a.start]))
    const takenEmails = new Set<string>()
    const usersRefused = new Set<string>()

    const keyOf = (fields: ("email" | "ip")[], email: string, ip: string) => fields.map((f) => (f === "email" ? `e:${email}` : `i:${ip}`)).join("|")
    const recent = (key: string, t: number, window: number) => (fails.get(key) ?? []).filter((x) => x > t - window).length
    const fail = (key: string, t: number) => { const l = fails.get(key) ?? []; l.push(t); fails.set(key, l) }

    const decide = (rule: TrafficRule, a: TrafficActor, email: string, ip: string, t: number): Answer | "slowed" | null => {
        if (rule.type === "counter") {
            const key = keyOf(rule.key, email, ip)
            if ((locked.get(key) ?? -1) > t) return "refused"
            if (recent(key, t, rule.window) >= rule.limit) {
                if (rule.action === "lock") locked.set(key, t + (rule.lockSeconds ?? rule.window))
                return "refused"
            }
            return null
        }
        const score = rule.weights.emailFails * recent(`e:${email}`, t, rule.window)
            + rule.weights.ipFails * recent(`i:${ip}`, t, rule.window)
            // A spike across the whole service raises the bar only for devices it has never seen.
            + (a.device === "new" ? (rule.weights.serviceFails ?? 0) * recent("all", t, rule.window) : 0)
            + (a.device === "new" ? rule.weights.newDevice : 0)
        if (score >= rule.blockAt) return "refused"
        if (score >= rule.challengeAt) return "challenged"
        if (score >= rule.slowAt) return "slowed"
        return null
    }

    for (;;) {
        // The actor whose next attempt is soonest; ties go to the first listed.
        let a: TrafficActor | undefined
        let at = Infinity
        for (const x of actors) {
            const t = next.get(x.id)!
            if (t < at) { at = t; a = x }
        }
        if (!a || at > s.duration) break
        const i = n.get(a.id) ?? 0
        n.set(a.id, i + 1)
        const email = poolValue(a.email, i)
        const ip = poolValue(a.ip, i)

        let answer: Answer | null = null
        let slow = 0
        for (const rule of rules) {
            const d = decide(rule, a, email, ip, at)
            if (d === "slowed") { if (rule.type === "score") slow = Math.max(slow, rule.slowSeconds); continue }
            if (d) { answer = d; break }
        }
        if (answer === "challenged" && a.kind === "user") answer = null // a person passes the challenge
        // A failed challenge is a failed login for the address and the service, not for the
        // account: it says a bot is at this address, nothing about the account's owner.
        if (answer === "challenged") { fail(`i:${ip}`, at); fail("all", at) }
        if (!answer) {
            // The password check.
            let right: boolean
            if (a.kind === "attacker") {
                const h = (hits.get(a.id) ?? 0) + 1
                hits.set(a.id, h)
                right = !!a.hitEvery && h % a.hitEvery === 0 && !takenEmails.has(email)
            } else {
                right = i >= (a.typos ?? 0)
            }
            answer = right ? "in" : "wrong"
            if (!right) {
                for (const rule of rules) if (rule.type === "counter") fail(keyOf(rule.key, email, ip), at)
                fail(`e:${email}`, at)
                fail(`i:${ip}`, at)
                fail("all", at)
            }
            if (right && a.kind === "attacker") takenEmails.add(email)
        }
        attempts.push({ at, actor: a.id, kind: a.kind, email, ip, answer, slowed: slow > 0 })
        if (a.kind === "user" && answer === "refused" && i >= (a.typos ?? 0)) usersRefused.add(`${a.id}:${email}`)

        const done = a.count !== undefined && i + 1 >= a.count
        // One person stops once they are in; a group (rotating emails) goes on to the next person.
        const userIn = a.kind === "user" && answer === "in" && a.email.mode === "fixed"
        // A slow-down holds back the caller it answered. An actor rotating addresses is many
        // machines (a botnet): the next guess comes from another one, not held back.
        const held = a.ip.mode === "fixed" ? slow : 0
        next.set(a.id, done || userIn ? Infinity : at + a.every + held)
    }

    const byActor: Record<string, ActorTally> = {}
    for (const x of attempts) {
        const t = (byActor[x.actor] ??= { attempts: 0, refused: 0, slowed: 0, challenged: 0, wrong: 0, in: 0 })
        t.attempts += 1
        t[x.answer] += 1
        if (x.slowed) t.slowed += 1
    }
    const attackerAttempts = attempts.filter((x) => x.kind === "attacker")
    return {
        attempts,
        byActor,
        taken: takenEmails.size,
        lockedOut: usersRefused.size,
        stopped: attackerAttempts.filter((x) => x.answer === "refused" || x.answer === "challenged").length,
        checked: attackerAttempts.filter((x) => x.answer === "wrong" || x.answer === "in").length,
    }
}

/** The verdict for these choices: the first whose `active` matches. */
export function verdictFor(s: TrafficScenario, values: Record<string, string>) {
    return s.verdicts.find((v) => matches(v.active, values)) ?? s.verdicts[s.verdicts.length - 1]!
}
