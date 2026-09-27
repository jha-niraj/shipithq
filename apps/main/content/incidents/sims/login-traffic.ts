import type { TrafficScenario } from "@/components/incidents/sim/schema"

/**
 * Case 2's attack-vs-defence simulator (plan/incidents INC-58): one hour of a login
 * under three attacks and five defences. Illustrative numbers (the case says so once);
 * the mechanics are the ones the chapters teach.
 *
 *   one     one email, one address, 2 guesses a second; its password is guess 3,000
 *   spray   one common password across 2,000 emails, from one address; 1 in 50 use it
 *   botnet  the same spray, each guess from a different address
 *
 * Real users are always there: 30 staff behind one office address, and the owner of the
 * attacked email, who logs in at the half hour from home.
 */

const OFFICE = "192.0.2.10"

export const LOGIN_TRAFFIC: TrafficScenario = {
    kind: "traffic",
    duration: 3600,
    job: "One hour of a login page, from 1 am: an attacker, 30 office staff, and the person whose email is under attack.",
    controls: [
        { id: "attack", label: "The attack", options: [
            { value: "one", label: "One email", hint: "Guess after guess at one account, from one address" },
            { value: "spray", label: "Password spray", hint: "One common password against 2,000 emails, from one address" },
            { value: "botnet", label: "Botnet spray", hint: "The same spray, every guess from a different address" },
        ] },
        { id: "defence", label: "The defence", options: [
            { value: "none", label: "None", hint: "Every guess reaches the password check" },
            { value: "email", label: "Counter per email", hint: "5 failures a minute per email, then 429" },
            { value: "lock", label: "Lock the email", hint: "5 failures, then the email is locked for 15 minutes" },
            { value: "ip", label: "Counter per address", hint: "5 failures a minute from an IP address, then it is blocked for 15 minutes" },
            { value: "combined", label: "Combined score", hint: "Email, address, device and a service-wide spike, one graded answer" },
        ] },
    ],
    defaults: { attack: "one", defence: "none" },
    actors: [
        { id: "attacker-one", label: "Attacker", kind: "attacker", active: { attack: ["one"] }, start: 0, every: 0.5, device: "new",
            email: { mode: "fixed", value: "sam@example.com" }, ip: { mode: "fixed", value: "203.0.113.7" }, hitEvery: 3000 },
        { id: "attacker-spray", label: "Attacker", kind: "attacker", active: { attack: ["spray"] }, start: 0, every: 0.5, device: "new",
            email: { mode: "rotate", prefix: "user", count: 2000 }, ip: { mode: "fixed", value: "203.0.113.7" }, hitEvery: 50 },
        { id: "attacker-botnet", label: "Attacker", kind: "attacker", active: { attack: ["botnet"] }, start: 0, every: 0.5, device: "new",
            email: { mode: "rotate", prefix: "user", count: 2000 }, ip: { mode: "rotate", prefix: "198.51.100.", count: 2000 }, hitEvery: 50 },
        { id: "owner", label: "Sam, whose email is attacked", kind: "user", start: 1800, every: 30, count: 3, device: "known",
            email: { mode: "fixed", value: "sam@example.com" }, ip: { mode: "fixed", value: "198.18.0.44" } },
        { id: "office", label: "Office staff", kind: "user", start: 60, every: 100, count: 30, device: "known",
            email: { mode: "rotate", prefix: "staff", count: 30 }, ip: { mode: "fixed", value: OFFICE } },
    ],
    policies: [
        { id: "per-email", label: "Counter per email", active: { defence: ["email"] }, rules: [
            { type: "counter", key: ["email"], window: 60, limit: 5, action: "block" },
        ] },
        { id: "lock", label: "Lock the email", active: { defence: ["lock"] }, rules: [
            { type: "counter", key: ["email"], window: 60, limit: 5, action: "lock", lockSeconds: 900 },
        ] },
        { id: "per-ip", label: "Counter per address", active: { defence: ["ip"] }, rules: [
            { type: "counter", key: ["ip"], window: 60, limit: 5, action: "lock", lockSeconds: 900 },
        ] },
        { id: "combined", label: "Combined score", active: { defence: ["combined"] }, rules: [
            { type: "score", window: 60, weights: { emailFails: 1, ipFails: 2, newDevice: 3, serviceFails: 0.2 }, slowAt: 4, challengeAt: 8, blockAt: 14, slowSeconds: 5 },
        ] },
    ],
    verdicts: [
        { active: { attack: ["one"], defence: ["none"] }, headline: "The account fell at guess 3,000",
            reason: "Nothing counted, so every guess reached the password check, two a second, until one was right. Every answer was a correct 401 until then." },
        { active: { attack: ["one"], defence: ["email", "lock"] }, headline: "The attack stopped, and so did Sam",
            reason: "Counting per email held the attacker to a handful of guesses a minute. It also refused Sam, logging in with the right password: the email was over its limit because of the attacker. The defence became a way to lock anyone out." },
        { active: { attack: ["one"], defence: ["ip"] }, headline: "Stopped, and Sam got in",
            reason: "One attacker, one address: the address went over its limit in seconds. Sam logs in from home, a different address, so nothing stood in the way." },
        { active: { attack: ["one"], defence: ["combined"] }, headline: "Stopped, and nobody real was bothered",
            reason: "A new device failing fast from one address scored high: slowed, then challenged, then refused. Sam's known device on a quiet address scored nothing." },
        { active: { attack: ["spray", "botnet"], defence: ["none", "email", "lock"] }, headline: "40 accounts taken, and the counter never tripped",
            reason: "One guess per email. A counter per email never goes past 1, so it never fires, and 1 in 50 accounts used the common password." },
        { active: { attack: ["spray"], defence: ["ip"] }, headline: "Stopped at the address",
            reason: "Every guess came from one address, so the address counter caught the spray within seconds. Now look at what a botnet does to this." },
        { active: { attack: ["botnet"], defence: ["ip"] }, headline: "40 accounts taken: every guess was a new address",
            reason: "A botnet sends each guess from a different machine, so no address ever fails twice. Counting per address cannot see it." },
        { active: { attack: ["spray", "botnet"], defence: ["combined"] }, headline: "Stopped, with the office still working",
            reason: "No single email or address stood out, but the whole service suddenly failing two logins a second did. New devices were challenged and failed; the office's known devices were slowed a little, then let in." },
    ],
    fidelity: "Illustrative: one hour, round numbers, and a fixed 1 in 50 hit rate. Faithful: what each defence counts, what it refuses, and who it refuses.",
}
