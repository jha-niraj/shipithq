import type { IncidentCase, SourceRef } from "./types"
import { getIncidentMeta } from "./index"
import { LOGIN_CHAPTERS, LOGIN_GLOSSARY, LOGIN_LEARN } from "./the-login-chapters"
import { LOGIN_TRAFFIC } from "./sims/login-traffic"

/**
 * Case 2 (plan/incidents INC-57; outline plan/incidents/case-login.md, approved 2026-09-28).
 * A composite incident, from a reel Niraj described: rate limiting a login, from one
 * counter to many signals. The numbers are illustrative (chapter 1 says so); the
 * mechanics are sourced. The chapters are the case; the fields here feed the final
 * quiz, the round, the lead's brief and the closing talk.
 */

const S = (source: string, section: string): SourceRef => ({ source, section })
const meta = getIncidentMeta("the-login-that-said-yes-to-guessing")!

export const loginThatSaidYes: IncidentCase = {
    ...meta,
    sources: {
        RFC6585: { title: "RFC 6585: Additional HTTP Status Codes", author: "IETF", date: "2012-04" },
        RFC9110: { title: "RFC 9110: HTTP Semantics", author: "IETF", date: "2022-06" },
        NIST: { title: "NIST SP 800-63B: Authentication and Lifecycle Management", author: "NIST", date: "2025" },
        "OWASP-AUTH": { title: "Authentication Cheat Sheet", author: "OWASP", date: "2026" },
        "OWASP-CS": { title: "Credential Stuffing Prevention Cheat Sheet", author: "OWASP", date: "2026" },
        "OWASP-PW": { title: "Password Storage Cheat Sheet", author: "OWASP", date: "2026" },
        "CF-RL": { title: "Workers: Rate Limiting binding", author: "Cloudflare", date: "2026" },
        "CF-DO": { title: "Durable Objects", author: "Cloudflare", date: "2026" },
        SRE: { title: "Site Reliability Engineering, chapter 14: Managing Incidents", author: "Google", date: "2016" },
    },
    story: [],
    model: {
        diagram: "login",
        intro: "A login judges each attempt alone. Nothing in it counts.",
        steps: [
            { id: "judge", title: "Each attempt is judged alone", body: "Look up the account, check the hash, answer 200 or 401. Ten guesses a second is 36,000 an hour, and every one is answered correctly.", focus: "login", sources: [S("OWASP-CS", "Brute force")] },
            { id: "429", title: "429 means slow down", body: "Too many requests in a given amount of time, optionally with Retry-After. It must not be cached. How to count is left to you.", focus: "codes", sources: [S("RFC6585", "4. 429 Too Many Requests")] },
            { id: "shapes", title: "Attacks change shape", body: "Brute force is many passwords at one account. Spraying is one password at many accounts. A botnet spreads either across thousands of addresses.", focus: "night", sources: [S("OWASP-CS", "Brute force, credential stuffing and password spraying")] },
            { id: "lockout", title: "A lockout can lock the owner out", body: "Locking an account after failures lets anyone lock a real user out. Lock with care, or grade the answer instead.", focus: "trap", sources: [S("OWASP-AUTH", "Account lockout")] },
            { id: "signals", title: "Many signals, one graded answer", body: "Failures per email and per address, a known device, a service-wide spike: one score that allows, slows, challenges or refuses. Same message and timing for an unknown email as for a wrong password.", focus: "score", sources: [S("NIST", "3.2.2 Rate limiting"), S("OWASP-AUTH", "Authentication and error messages")] },
        ],
    },
    simulator: LOGIN_TRAFFIC,
    predict: [
        { id: "spray-email", setup: "The login counts failures per email: 5 a minute, then 429.", prompt: "An attacker tries one common password against 2,000 different emails, one guess each. What happens?",
            scenario: { attack: "spray", defence: "email" },
            options: [{ id: "stopped", label: "The counter stops it within a minute" }, { id: "through", label: "Every guess reaches the password check; the counter never trips" }, { id: "locked", label: "All 2,000 accounts get locked" }],
            answer: "through", explanation: "One guess per email never passes a limit of five. Spraying is invisible to a per email count.", sources: [S("OWASP-CS", "Brute force, credential stuffing and password spraying")] },
        { id: "lock-owner", setup: "After 5 failures, the email is locked for 15 minutes.", prompt: "An attacker keeps guessing at Sam's email. Sam then logs in with the right password. What happens?",
            scenario: { attack: "one", defence: "lock" },
            options: [{ id: "in", label: "Sam gets in: the password is right" }, { id: "refused", label: "Sam is refused: the email is locked" }, { id: "challenge", label: "Sam is asked for a code" }],
            answer: "refused", explanation: "The lock does not know who is typing. The attacker's failures lock the account for its owner too.", sources: [S("OWASP-AUTH", "Account lockout")] },
        { id: "botnet-ip", setup: "The login counts failures per IP address, and blocks an address for 15 minutes after 5.", prompt: "A botnet sprays, each guess from a different address. What happens?",
            scenario: { attack: "botnet", defence: "ip" },
            options: [{ id: "stopped", label: "Stopped: the addresses are blocked" }, { id: "through", label: "It gets through: no address ever fails twice" }, { id: "office", label: "Only the office gets blocked" }],
            answer: "through", explanation: "Each address makes one guess, so none reaches the limit.", sources: [S("OWASP-CS", "IP blocklisting and rate limiting")] },
        { id: "combined-office", setup: "The login scores each attempt: failures per email and address, a known device, and a service-wide spike.", prompt: "A botnet sprays while 30 office staff log in from one address. What happens to the staff?",
            scenario: { attack: "botnet", defence: "combined" },
            options: [{ id: "in", label: "They get in: their devices are known and their address is quiet" }, { id: "blocked", label: "They are refused with the botnet" }, { id: "challenged", label: "Every one of them has to solve a challenge" }],
            answer: "in", explanation: "The spike raises the bar for devices the service has never seen. The staff's known devices on a quiet address score low.", sources: [S("NIST", "3.2.2 Rate limiting")] },
    ],
    fix: {
        intro: "Count, then grade: one signal is never enough.",
        tree: {
            start: "many",
            nodes: [{ id: "many", question: "Is the attack spread across many emails or many addresses?", yes: "score", no: "counter" }],
            leaves: [
                { id: "counter", title: "A counter per email and per address", body: "Refuse before the password check, with a sliding window; never a hard lock that anyone can trigger." },
                { id: "score", title: "One score from many signals", body: "Email and address failures, a known device and a service-wide spike, answered with allow, slow, challenge or refuse, kept in one shared place per key." },
            ],
        },
        patterns: [],
        twist: {
            title: "The fix that locked out the owner",
            body: ["Locking an email after five failures stopped the guessing, and let anyone lock a real person out of their account.", "The fix for the fix: grade the answer instead of locking, and weigh the device and the address, not only the account."],
            signature: "Attack stopped, and the account's owner refused with the right password.",
            code: [],
            sources: [S("OWASP-AUTH", "Account lockout")],
        },
        afterShip: [],
    },
    // The postmortem as the team would write it (INC-72): a composite, from the chapters.
    postmortem: {
        summary: "A customer's account was taken over overnight after a script guessed its password about three thousand times. Every guess got a correct 401, and nothing counted them. The first fix, a counter per email, missed password spraying two weeks later and could lock real people out.",
        sections: [
            { title: "Root cause", items: [
                "Nothing counted failed logins, so each guess cost the attacker only a 401.",
                "The first counter was per email: spraying one password across many emails never passed one failure per email.",
            ] },
            { title: "Why nobody saw it coming", items: [
                "A 401 looks like the system defending itself; it only says this guess was wrong.",
                "No alert watched failed logins, so a customer was the only alarm.",
            ] },
            { title: "What we changed", items: [
                "Failures are counted per email and per address in one shared place, updated in one step.",
                "A score from four signals picks a graded answer: allow, slow, ask for proof, or refuse.",
                "The login answers the same way, in the same time, whether or not the email exists.",
                "We decided in advance whether logins fail open or closed when the counter is down.",
            ] },
        ],
        sources: [S("OWASP-CS", "Brute force, credential stuffing and password spraying"), S("OWASP-AUTH", "Account lockout"), S("CF-DO", "Durable Objects")],
    },
    postmortemPoints: {
        impact: [
            { id: "i-account", label: "One account taken over; its email changed" },
            { id: "i-owner", label: "The real owner locked out of their own account" },
        ],
        timeline: [
            { id: "t-night", label: "Guessing from 1:04 am, the break-in at 4:52" },
            { id: "t-report", label: "Noticed only when the customer wrote in, at 9:02" },
        ],
        causes: [
            { id: "c-count", label: "Nothing counted failed logins" },
            { id: "c-401", label: "A 401 looked like a defence" },
            { id: "c-alert", label: "No alert watched failed logins" },
        ],
        well: [
            { id: "w-log", label: "The login log kept every attempt, so the story could be rebuilt" },
            { id: "w-report", label: "The customer wrote in, and the team pulled the log at once" },
        ],
        actions: [
            { id: "a-shared", label: "Count per email and per address in one shared place" },
            { id: "a-score", label: "A score from several signals: slow, challenge, or refuse" },
            { id: "a-alert", label: "Alert on a spike in failed logins" },
        ],
    },

    // The system as one picture (INC-63), and the fix as a change to it (INC-68).
    system: {
        caption: "The login's system: every guess reached the password check.",
        groups: [{ id: "service", label: "The service" }],
        nodes: [
            { id: "attacker", label: "Attacker's script", sub: "guess after guess", kind: "client", col: 0, row: 0 },
            { id: "sam", label: "Sam", sub: "the account's owner", kind: "client", col: 0, row: 1 },
            { id: "login", label: "Login endpoint", sub: "answers 200 or 401", kind: "compute", group: "service", col: 1, row: 0 },
            { id: "hash", label: "Password check", sub: "slow hash, on purpose", kind: "compute", group: "service", col: 2, row: 0 },
            { id: "users", label: "Users table", sub: "email + hash", kind: "store", group: "service", col: 1, row: 1 },
        ],
        links: [
            { from: "attacker", to: "login", label: "guesses" },
            { from: "sam", to: "login", label: "signs in" },
            { from: "login", to: "hash", label: "check" },
            { from: "login", to: "users", label: "look up" },
        ],
        incident: {
            broken: ["login"],
            blast: ["users", "sam"],
            note: "Every guess got a correct 401, and nothing counted them. At 4:52 one guess was right, and Sam's account changed hands.",
        },
        after: {
            note: "Every attempt is counted in one place and weighed. Guessers are slowed and challenged; Sam still gets in.",
            added: [
                { id: "score", label: "Risk score", sub: "four signals, one verdict", kind: "compute", group: "service", col: 2, row: 0 },
                { id: "count", label: "Shared count", sub: "a Durable Object per key", kind: "cache", group: "service", col: 2, row: 1 },
            ],
            addedLinks: [
                { from: "login", to: "score", label: "score it first" },
                { from: "score", to: "count", label: "one step" },
                { from: "score", to: "hash", label: "if allowed" },
            ],
            removedLinks: [{ from: "login", to: "hash" }],
            changed: ["login"],
            move: { hash: { col: 3, row: 0 } },
            notes: {
                count: "Every request for an email reaches the same object, so the count is exact. Decide in advance whether logins fail open or closed if it is down.",
                score: "Adds the signals into one graded answer: allow, slow, ask for proof, or refuse. No single counter locks a real person out.",
                login: "Answers the same way, in the same time, whether the email exists or the password is wrong.",
            },
        },
        chapters: {
            "incident": ["login", "users"],
            "what-login-does": ["login", "hash", "users"],
            "too-many": ["attacker", "login"],
            "per-email": ["login"],
            "second-incident": ["attacker", "login", "sam"],
            "per-ip": ["attacker", "login"],
            "signals": ["login"],
            "where-counts-live": ["login"],
        },
    },
    chapters: LOGIN_CHAPTERS,
    learn: LOGIN_LEARN,
    glossary: LOGIN_GLOSSARY,
    mock: {
        role: "the security lead reviewing the login incidents",
        opening: "You're shipping the login defence next week. Walk me through what you'd build, and what it costs a real user.",
        probe: [
            "why a counter per email alone misses a spray",
            "how a lockout can be turned against real users",
            "what signals feed the score, and what each answer does",
            "where the counts live when there are many servers, and what happens when that store is down",
        ],
        minutes: 8,
    },
    checklist: [
        { id: "before", text: "Refuse before the password check", why: "The attacker learns nothing and the server skips the slow hash." },
        { id: "sliding", text: "Count in a sliding window or a token bucket", why: "A fixed window leaks a double burst at its edge." },
        { id: "no-hard-lock", text: "Never a hard lock anyone can trigger", why: "A lockout on an account is a way to lock its owner out." },
        { id: "signals", text: "Score many signals, answer in grades", why: "Email, address, device and a spike together catch sprays and botnets that one counter misses." },
        { id: "same", text: "Same message, same timing, for an unknown email", why: "Otherwise the login tells anyone who has an account." },
        { id: "shared", text: "Keep counts in one shared place", why: "A count in one server's memory sees only a piece of the attack." },
        { id: "fail", text: "Decide fail open or fail closed in advance", why: "The counter store will go down at the worst time." },
    ],
    round: [
        { id: "fixed", symptom: "The limit is 5 a minute, counted from the start of each minute. Logs show 10 guesses in 2 seconds at every minute's edge.",
            options: [{ id: "window", label: "A fixed window leaks a double burst at its edge" }, { id: "bug", label: "The counter has an off-by-one bug" }, { id: "cache", label: "The 429 was cached" }],
            answer: "window", explanation: "Five just before the minute and five just after: both windows are under the limit. Use a sliding window or a bucket.", sources: [S("RFC6585", "4. 429 Too Many Requests")] },
        { id: "lock", symptom: "After a lockout rule shipped, support gets dozens of \"I can't log in\" tickets from real users with the right password.",
            options: [{ id: "abuse", label: "Someone is triggering the lockout on their emails" }, { id: "passwords", label: "The users forgot their passwords" }, { id: "429", label: "Their browsers ignore Retry-After" }],
            answer: "abuse", explanation: "A lockout on the account can be triggered by anyone who knows the email. The defence became the attack.", sources: [S("OWASP-AUTH", "Account lockout")] },
        { id: "memory", symptom: "The limit is 5 failures a minute, kept in each server's memory. The attacker makes 40 a minute and is never refused.",
            options: [{ id: "pieces", label: "Each of many servers sees only a few of the attempts" }, { id: "slow", label: "The counter is too slow" }, { id: "botnet", label: "It must be a botnet" }],
            answer: "pieces", explanation: "Ten servers each seeing four attempts never reach five. The count has to live in one shared place.", sources: [S("CF-DO", "Durable Objects: one place per key")] },
        { id: "enum", symptom: "The login says \"No account for that email\" for unknown emails. The next week, a spray targets only real accounts.",
            options: [{ id: "enum", label: "The message told the attacker which emails exist" }, { id: "leak", label: "The database leaked" }, { id: "luck", label: "Coincidence" }],
            answer: "enum", explanation: "Different messages for unknown email and wrong password let anyone list your users. Same message, same timing.", sources: [S("OWASP-AUTH", "Authentication and error messages")] },
    ],
    closing: [
        "A login answers each guess correctly. Something has to count the guesses.",
        "Attackers change shape: many passwords at one account, one password at many, and a thousand addresses for either.",
        "No single counter is enough, and a hard lockout turns your defence into their weapon. Score many signals and answer in grades.",
    ],
}
