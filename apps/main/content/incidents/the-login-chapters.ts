import type { Chapter, SourceRef } from "./types"

/**
 * Case 2, "The login that said yes to guessing", as chapters (plan/incidents INC-57,
 * outline approved in plan/incidents/case-login.md, 2026-09-28). Written for the ear:
 * each chapter opens on a hook, every narrated paragraph names the visual part it is
 * about (`focus`), and flows build as the lead reaches them. No code.
 *
 * Sources, every claim checked 2026-09-28:
 *   RFC6585     RFC 6585, section 4 (429 Too Many Requests)
 *   RFC9110     RFC 9110 (the Retry-After header)
 *   NIST        NIST SP 800-63B, 3.2.2 (rate limiting)
 *   OWASP-AUTH  OWASP Authentication Cheat Sheet
 *   OWASP-CS    OWASP Credential Stuffing Prevention Cheat Sheet
 *   OWASP-PW    OWASP Password Storage Cheat Sheet
 *   CF-RL       Cloudflare Workers, the rate limiting binding
 *   CF-DO       Cloudflare Durable Objects
 * The story's numbers are illustrative (said once, in chapter 1); the mechanics are sourced.
 */

const S = (source: string, section: string): SourceRef => ({ source, section })

export const LOGIN_CHAPTERS: Chapter[] = [
    // ── 1 ─────────────────────────────────────────────────────────────────────
    {
        id: "incident",
        act: "What happened",
        title: "The incident",
        lead: "Thousands of correct answers, and one account gone.",
        terms: ["bruteforce"],
        blocks: [
            { kind: "say", focus: "log", text: "Hold one question while you listen. Nothing crashed, and every response the login gave was correct. So what was missing?" },
            { kind: "say", focus: "log:0", text: "Monday, nine in the morning. A customer writes in. Someone logged into their account overnight and changed its email address. The team pulls the login log for that account." },
            { kind: "say", focus: "log:1", text: "From just after one in the morning, a failed login every half second. Wrong password, wrong password, wrong password. Every one answered correctly: 401, not you." },
            { kind: "say", focus: "log:3", text: "Just before five, one attempt got a 200. The password was right. A minute later, the email on the account was changed, and the real owner was locked out of their own account." },
            {
                kind: "see", id: "log", title: "Login log, account sam@example.com",
                lines: [
                    { t: "09:02", who: "Support", text: "Customer says someone changed their email overnight." },
                    { t: "01:04", who: "401", text: "wrong password (and every half second after that)", tone: "muted" },
                    { t: "04:51", who: "401", text: "wrong password, attempt 3,112", tone: "muted" },
                    { t: "04:52", who: "200", text: "signed in", tone: "bad" },
                    { t: "04:53", who: "account", text: "email address changed", tone: "bad" },
                ],
            },
            { kind: "say", focus: "doing", text: "Here's the answer to the question. The login did its job three thousand times. Nothing was counting the attempts. That was the problem." },
            { kind: "note", id: "doing", text: "Every answer was correct, and nothing counted how many answers there had been." },
            { kind: "say", focus: "composite", text: "One thing before we go on. This is a composite incident. The numbers are illustrative. The mechanics are real, and every one of them is sourced." },
            { kind: "note", id: "composite", text: "A composite incident: the numbers are illustrative, the mechanics are real and sourced." },
            { kind: "say", focus: "clock:first", text: "Put the night on one clock. T plus zero is the first wrong guess, at four minutes past one." },
            { kind: "say", focus: "clock:unseen", text: "Look at the first span. Three hours and forty eight minutes of guessing before the break-in, and nothing noticed. Then eight hours before anyone knew, and only because the customer wrote in." },
            {
                kind: "timeline", id: "clock", timeline: {
                    start: "Monday, 1:04 am: the first wrong guess",
                    caption: "A composite incident: the times come from the case's login log, and are illustrative.",
                    events: [
                        { id: "first", at: 0, kind: "signal", label: "First wrong guess", detail: "401, wrong password. The guesses keep coming all night." },
                        { id: "guess", at: 13620000, kind: "signal", label: "Attempt 3,112: 401", detail: "Still a correct answer. Still nothing counting." },
                        { id: "in", at: 13680000, kind: "mistake", label: "Password guessed", detail: "One guess was right: 200, signed in." },
                        { id: "email", at: 13740000, kind: "mistake", label: "Email changed", detail: "The real owner is locked out of their own account." },
                        { id: "report", at: 28680000, kind: "signal", label: "Customer writes in", detail: "\"Someone changed my email overnight.\" The team pulls the login log." },
                    ],
                    spans: [
                        { id: "unseen", label: "Guessing, unseen", from: "first", to: "in" },
                        { id: "detect", label: "Time to notice", from: "first", to: "report" },
                    ],
                },
            },
            { kind: "say", focus: "board:failed", text: "Here's what a dashboard could have shown. Failed logins, steady all night, at an hour when almost nobody signs in." },
            { kind: "say", focus: "board:alerts", text: "And the alerts: zero. Nothing was watching failed logins, so nothing fired. The only alarm was a customer." },
            {
                kind: "dashboard", id: "board", dashboard: {
                    caption: "Failed logins ran all night at a steady rate, and no alert watched them.",
                    series: [
                        { id: "failed", name: "Failed logins", unit: "per min", bad: true, points: [[0, 0], [60000, 14], [13680000, 14], [13740000, 0], [28680000, 0]] },
                        { id: "total", name: "Failures on sam@example.com", unit: "total", points: [[0, 0], [13620000, 3112], [13680000, 3112], [28680000, 3112]] },
                        { id: "success", name: "Successful logins", unit: "per min", points: [[0, 2], [7200000, 1], [13680000, 2], [21600000, 3], [28680000, 6]] },
                        { id: "alerts", name: "Alerts fired", unit: "alerts", points: [[0, 0], [28680000, 0]] },
                    ],
                    markers: [
                        { id: "m-in", at: 13680000, label: "break-in" },
                        { id: "m-report", at: 28680000, label: "reported" },
                    ],
                },
            },
        ],
        check: [
            { id: "should-count", kind: "pick", figure: "map", prompt: "Tap the part that should have been counting the guesses.", parts: [
                { id: "attacker", label: "Attacker's script" },
                { id: "sam", label: "Sam" },
                { id: "login", label: "Login endpoint" },
                { id: "hash", label: "Password check" },
                { id: "users", label: "Users table" },
            ], answer: ["login"], explanation: "Every guess goes through the login endpoint, so that's where attempts can be counted and slowed. The password check and the table only ever see one attempt at a time." },
            { id: "log", kind: "single", prompt: "What did the login log show before the break-in?", options: [
                { id: "errors", label: "Server errors, then a crash" },
                { id: "401s", label: "Thousands of correct 401 answers, then one 200" },
                { id: "nothing", label: "Nothing at all" },
            ], answer: "401s", explanation: "Every guess got the right answer, 401, until one guess was right. The system worked exactly as built; it just never counted." },
            { id: "defended", kind: "truefalse", prompt: "A 401 means the system defended itself.", answer: false, explanation: "A 401 only says this guess was wrong. It says nothing about how many guesses there have been, and lets the next one straight through." },
        ],
        sources: [S("OWASP-CS", "Brute force, credential stuffing and password spraying")],
    },

    // ── 2 ─────────────────────────────────────────────────────────────────────
    {
        id: "what-login-does",
        act: "What happened",
        title: "What a login does",
        lead: "Four steps, and none of them counts.",
        terms: ["hash"],
        blocks: [
            { kind: "say", focus: "login:browser", text: "A question to guess at. If nothing stops it, how many guesses can one script make in an hour? Keep your number." },
            { kind: "say", focus: "login:browser", text: "Let's follow one login. The browser sends an email address and a password." },
            { kind: "say", focus: "login:lookup", text: "The server looks up the account for that email." },
            { kind: "say", focus: "login:hash", text: "Then it checks the password. It never stores your password itself, only a hash of it. And that hash is slow to compute on purpose, so that a stolen database is slow to crack." },
            { kind: "say", focus: "login:answer", text: "If the hash matches, the answer is 200, and you're in. If not, 401." },
            {
                kind: "flow", id: "login", flow: {
                    width: 760, height: 230,
                    caption: "One login: look up, check the hash, answer. Nothing in it counts attempts.",
                    nodes: [
                        { id: "browser", label: "Browser", sub: "email + password", x: 10, y: 80, order: 1 },
                        { id: "lookup", label: "Look up the account", x: 210, y: 80, order: 2 },
                        { id: "hash", label: "Check the hash", sub: "slow on purpose", x: 410, y: 80, tone: "strong", order: 3 },
                        { id: "answer", label: "200 or 401", x: 600, y: 80, w: 150, order: 4 },
                    ],
                    edges: [
                        { from: "browser", to: "lookup", flowing: true },
                        { from: "lookup", to: "hash" },
                        { from: "hash", to: "answer" },
                    ],
                },
            },
            { kind: "say", focus: "math", text: "Now your number. A script sending ten guesses a second makes thirty six thousand an hour. The slow hash costs the server work on every one of them, and nothing in these four steps ever says: that's enough." },
            { kind: "note", id: "math", text: "10 guesses a second is 36,000 an hour. The weak spot is not the check. It is that nothing counts." },
            { kind: "say", focus: "night:g1", text: "Now the same login, message by message, over the whole night. Guess one: look up the email, check the hash, answer 401." },
            { kind: "say", focus: "night:in", text: "Three thousand answers later, guess three thousand one hundred and thirteen gets a 200. And a minute after that, the email changes." },
            { kind: "say", focus: "night", text: "Switch to With the fix. The same script now meets a shared count, a growing wait and a challenge, and Sam still gets in with the right password." },
            {
                kind: "sequence", id: "night", sequence: {
                    caption: "The login answered every guess correctly. The fix is the part that counts them.",
                    tabs: { normal: "With the fix", failing: "Nothing counts" },
                    variants: { normal: "A shared count and a score: guessers are slowed, then asked for proof; Sam gets in.", failing: "The night of the incident: every guess answered, none counted." },
                    actors: [
                        { id: "attacker", label: "Attacker's script", sub: "guess after guess" },
                        { id: "sam", label: "Sam", sub: "the account's owner" },
                        { id: "login", label: "Login", sub: "the endpoint" },
                        { id: "count", label: "Shared count", sub: "email + address" },
                        { id: "users", label: "Users table", sub: "email + hash" },
                    ],
                    messages: [
                        { id: "g1", from: "attacker", to: "login", label: "guess 1: sam@ + a password", at: 0 },
                        { id: "look", from: "login", to: "users", label: "look up, check the hash", at: 5 },
                        { id: "no1", from: "login", to: "attacker", label: "401", at: 400, kind: "response" },
                        { id: "c1", from: "login", to: "count", label: "sam@: 1, address: 1", at: 410, only: "normal" },
                        { id: "g6", from: "attacker", to: "login", label: "guess 6", at: 20000, only: "normal" },
                        { id: "c6", from: "login", to: "count", label: "sam@: 6: high score", at: 20005, only: "normal" },
                        { id: "wait", from: "login", to: "attacker", label: "slow down: wait 30 s", at: 20010, kind: "response", only: "normal" },
                        { id: "g8", from: "attacker", to: "login", label: "guess 8", at: 120000, only: "normal" },
                        { id: "prove", from: "login", to: "attacker", label: "prove it: a code by email", at: 120010, kind: "failed", only: "normal" },
                        { id: "sam", from: "sam", to: "login", label: "right password, known device", at: 180000, only: "normal" },
                        { id: "ok", from: "login", to: "sam", label: "200: signed in", at: 180400, kind: "response", only: "normal" },
                        { id: "g3112", from: "attacker", to: "login", label: "guess 3,112", at: 13620000, only: "failing" },
                        { id: "no3112", from: "login", to: "attacker", label: "401", at: 13620400, kind: "response", only: "failing" },
                        { id: "in", from: "login", to: "attacker", label: "guess 3,113: 200, signed in", at: 13680000, kind: "failed", only: "failing" },
                        { id: "email", from: "attacker", to: "login", label: "change the email", at: 13740000, kind: "failed", only: "failing" },
                    ],
                },
            },
        ],
        check: [
            { id: "guess-reaches", kind: "pick", figure: "map", prompt: "Mark every part one guess reaches, before any fix.", parts: [
                { id: "attacker", label: "Attacker's script" },
                { id: "sam", label: "Sam" },
                { id: "login", label: "Login endpoint" },
                { id: "hash", label: "Password check" },
                { id: "users", label: "Users table" },
            ], answer: ["login", "hash", "users"], explanation: "Each guess is looked up in the users table and run through the slow password check. That's why guessing costs the server real work, and why nothing stops it." },
            { id: "order", kind: "order", prompt: "Put one login in order.", items: [
                { id: "send", label: "The browser sends an email and a password" },
                { id: "lookup", label: "The server looks up the account" },
                { id: "hash", label: "It checks the password against the stored hash" },
                { id: "answer", label: "It answers 200 or 401" },
            ], explanation: "Look up, check, answer. Each attempt is judged alone, which is why a loop of attempts is never noticed." },
            { id: "slow", kind: "single", prompt: "Why is the password hash slow to compute on purpose?", options: [
                { id: "crack", label: "So a stolen copy of the database is slow to crack" },
                { id: "limit", label: "To rate limit the login" },
                { id: "old", label: "It isn't; it's just old code" },
            ], answer: "crack", explanation: "A slow hash protects the stored passwords if the database leaks. It is not a rate limit: a script can still try as many times as it likes, and each try costs the server that work." },
        ],
        sources: [S("OWASP-PW", "Work factors"), S("OWASP-CS", "Brute force")],
    },

    // ── 3 ─────────────────────────────────────────────────────────────────────
    {
        id: "too-many",
        act: "What happened",
        title: "429 Too Many Requests",
        lead: "A status code that means: slow down.",
        terms: ["status429", "retryafter"],
        blocks: [
            { kind: "say", focus: "codes", text: "There's a status code that means: you're sending too much. What should a client do when it gets one? Think about a script, not a browser." },
            { kind: "say", focus: "codes:401 Unauthorized", text: "You know 401. It means: I don't know who you are." },
            { kind: "say", focus: "codes:403 Forbidden", text: "403 means: I know who you are, and you're not allowed." },
            { kind: "say", focus: "codes:429 Too Many Requests", text: "And 429 means: you've sent too many requests in a given amount of time. It's the rate limiting code." },
            { kind: "compare", id: "codes", columns: ["It says", "Retry later?"], rows: [
                { label: "401 Unauthorized", cells: ["I don't know who you are", "Only with different credentials"] },
                { label: "403 Forbidden", cells: ["I know who you are, and no", "No"] },
                { label: "429 Too Many Requests", cells: ["Too many requests in this amount of time", "Yes, after Retry-After, if the server sent it"] },
            ] },
            { kind: "say", focus: "retry", text: "A 429 may carry a Retry-After header: how many seconds to wait, or the time to come back. A well behaved client waits. And a 429 must never be cached, so a proxy can't keep serving it." },
            { kind: "say", focus: "retry", text: "Now, the script. It ignores Retry-After and keeps going. That's fine. The point of a 429 is not that the attacker listens. It's that the server refuses cheaply, before the slow hash, and keeps refusing." },
            { kind: "note", id: "retry", text: "429 can carry Retry-After (seconds, or a date). It must not be cached. The standard does not say how to count: that part is yours." },
            { kind: "say", focus: "why:symptom", text: "Before the fix, the causes. Start from what people saw: an account that changed hands overnight." },
            { kind: "say", focus: "why:trigger", text: "The trigger was a script, guessing all night." },
            { kind: "say", focus: "why:nocount", text: "It worked because nothing counted failed attempts, each guess cost the attacker only a 401, and nobody watched the failed logins." },
            { kind: "say", focus: "why:defence", text: "And underneath: a 401 looks like the system defending itself. It isn't. It only says this guess was wrong." },
            {
                kind: "causes", id: "why", causes: {
                    caption: "Read it right to left: every one of these had to be true.",
                    symptom: { id: "symptom", label: "Sam's account changed hands", detail: "Signed in at 4:52 am, the email changed a minute later." },
                    trigger: { id: "trigger", label: "A script guessed all night", detail: "Thousands of passwords against one email." },
                    contributing: [
                        { id: "nocount", label: "Nothing counted failures", detail: "Every attempt was checked on its own, with no memory of the last." },
                        { id: "cheap", label: "Each guess cost only a 401", detail: "No wait, no challenge, no limit." },
                        { id: "unwatched", label: "Nobody watched failed logins", detail: "The only alarm was the customer, eight hours later." },
                    ],
                    latent: [
                        { id: "defence", label: "A 401 looked like a defence", detail: "It says this guess was wrong, and lets the next one straight through." },
                    ],
                },
            },
        ],
        talk: {
            opening: "The attacker ignores Retry-After completely. Does a 429 still help? Tell me why, or why not.",
            probe: ["what the server saves by refusing before the password check", "what the standard leaves to you: how to count, and per what", "what a well behaved client does with Retry-After"],
        },
        sources: [S("RFC6585", "4. 429 Too Many Requests"), S("RFC9110", "10.2.3 Retry-After")],
    },

    // ── 4 ─────────────────────────────────────────────────────────────────────
    {
        id: "per-email",
        act: "How it was fixed",
        title: "Fix one: a counter per email",
        lead: "One counter stops the overnight attack. Its window has a gap.",
        terms: ["ratelimit", "fixedwindow", "slidingwindow", "tokenbucket"],
        blocks: [
            { kind: "say", focus: "counter:fail", text: "The simplest fix is one counter. Where would you put it, and what would it count?" },
            { kind: "say", focus: "counter:fail", text: "Here it is. Every failed login adds one to a counter for that email." },
            { kind: "say", focus: "counter:count", text: "The counter forgets after a minute." },
            { kind: "say", focus: "counter:refuse", text: "Past five failures in that minute, the answer is 429, before the password is even checked." },
            {
                kind: "flow", id: "counter", flow: {
                    width: 760, height: 250,
                    caption: "Count failures per email for a minute; past five, refuse before the password check.",
                    nodes: [
                        { id: "fail", label: "A failed login", sub: "for sam@example.com", x: 10, y: 20, order: 1 },
                        { id: "count", label: "Add one to the count", sub: "forgets after 60 s", x: 270, y: 20, tone: "strong", order: 2 },
                        { id: "refuse", label: "Over 5? Answer 429", sub: "no password check", x: 540, y: 20, tone: "bad", order: 3 },
                        { id: "ok", label: "Otherwise, check as usual", x: 540, y: 150, tone: "muted", order: 3 },
                    ],
                    edges: [
                        { from: "fail", to: "count", flowing: true },
                        { from: "count", to: "refuse", label: "over 5" },
                        { from: "count", to: "ok", label: "5 or fewer" },
                    ],
                },
            },
            { kind: "say", focus: "sim4", text: "Try it. The attack is one email, the defence a counter per email. The attacker gets five guesses a minute, not a hundred and twenty. Three thousand guesses would now take ten hours." },
            { kind: "simulator", id: "sim4", preset: { attack: "one", defence: "email" } },
            { kind: "say", focus: "windows:Fixed window", text: "Now the counter's first flaw. If the minute starts on the clock, five guesses at 12:00:59 and five more at 12:01:00 all get through. Ten in two seconds." },
            { kind: "say", focus: "windows:Sliding window", text: "A sliding window counts the last sixty seconds, whenever they started. No gap at the edge." },
            { kind: "say", focus: "windows:Token bucket", text: "A token bucket holds a few tokens and refills slowly. Each attempt spends one. It allows a small burst, then a steady trickle." },
            { kind: "compare", id: "windows", columns: ["It counts", "The catch"], rows: [
                { label: "Fixed window", cells: ["Attempts since the minute began on the clock", "A burst either side of the edge gets double"] },
                { label: "Sliding window", cells: ["Attempts in the last 60 seconds, from now", "More to store: when each attempt happened"] },
                { label: "Token bucket", cells: ["Tokens left, refilling at a steady rate", "A burst up to the bucket's size is allowed"] },
            ] },
        ],
        check: [
            { id: "windows", kind: "buckets", prompt: "Which way of counting does each describe?", buckets: [
                { id: "fixed", label: "Fixed window" },
                { id: "sliding", label: "Sliding window" },
                { id: "bucket", label: "Token bucket" },
            ], items: [
                { id: "edge", label: "Resets on the minute, so a burst either side of the edge gets through twice", bucket: "fixed" },
                { id: "last60", label: "Counts the last 60 seconds from right now", bucket: "sliding" },
                { id: "refill", label: "Spends a token per attempt and refills at a steady rate", bucket: "bucket" },
            ], explanation: "All three limit a rate. They differ at the edges: fixed windows leak at the boundary, sliding windows do not, and a bucket allows a deliberate small burst." },
            { id: "before", kind: "truefalse", prompt: "The counter should refuse before the password is checked.", answer: true, explanation: "Refusing first is the point: the attacker learns nothing, and the server skips the slow hash." },
        ],
        sources: [S("RFC6585", "4. 429 Too Many Requests"), S("NIST", "3.2.2 Rate limiting")],
    },

    // ── 5 ─────────────────────────────────────────────────────────────────────
    {
        id: "second-incident",
        act: "How it was fixed",
        title: "The second incident",
        lead: "The counter never tripped, and forty accounts fell. Then it locked out the wrong person.",
        terms: ["spraying", "stuffing", "lockout"],
        blocks: [
            { kind: "say", focus: "night", text: "The counter shipped. Two weeks later, forty accounts were taken in one night, and the counter never tripped once. How? Guess before you listen on." },
            { kind: "say", focus: "night:1", text: "The attacker changed shape. Instead of many passwords against one email, they tried one common password against thousands of emails. One guess each." },
            { kind: "say", focus: "night:2", text: "That's password spraying. Per email, the count never goes past one. A counter per email can't see it at all." },
            {
                kind: "see", id: "night", title: "Two weeks later, the same login",
                lines: [
                    { t: "01:00", who: "attack", text: "one password, 2,000 different emails, one guess each" },
                    { t: "01:00", who: "counter", text: "every email: 1 failure. Limit: 5. Never trips.", tone: "muted" },
                    { t: "02:00", who: "result", text: "40 accounts used that password", tone: "bad" },
                ],
            },
            { kind: "say", focus: "sim5", text: "Watch it. Password spray against a counter per email. Every guess reaches the password check." },
            { kind: "simulator", id: "sim5", preset: { attack: "spray", defence: "email" } },
            { kind: "say", focus: "trap", text: "And a second problem was hiding in the first fix. The team made it stricter: after five failures, lock the email for fifteen minutes. Now anyone can lock a real person out of their account, by typing their email with a wrong password five times." },
            { kind: "say", focus: "trap", text: "Go back to the simulator and pick one email, with lock the email. The attack stops. So does Sam, the account's owner, trying to log in with the right password. The defence became the attack." },
            { kind: "note", id: "trap", text: "A lockout on the account can be turned into a way to lock anyone out. Design it so it cannot become a denial of service." },
            { kind: "say", focus: "lock:locked", text: "Here's the trap as states. Five wrong passwords lock the email for fifteen minutes." },
            { kind: "say", focus: "lock:anyone", text: "But the lock can't tell who typed them. Anyone who knows Sam's email can put the account in locked, again and again." },
            {
                kind: "states", id: "lock", states: {
                    caption: "An account lockout's states. The lock is on the account, so anyone can trigger it.",
                    states: [
                        { id: "open", label: "Open", col: 0, row: 0 },
                        { id: "counting", label: "Counting failures", sub: "fewer than 5", col: 1, row: 0 },
                        { id: "locked", label: "Locked 15 min", sub: "Sam is locked out too", col: 2, row: 0 },
                        { id: "anyone", label: "Anyone, typing sam@", sub: "5 wrong passwords", col: 1, row: 1 },
                    ],
                    transitions: [
                        { from: "open", to: "counting", label: "wrong" },
                        { from: "counting", to: "open", label: "right" },
                        { from: "counting", to: "locked", label: "5th failure" },
                        { from: "anyone", to: "locked", label: "on purpose", bad: true },
                    ],
                    stuck: "locked",
                },
            },
        ],
        check: [
            { id: "locked-who", kind: "pick", figure: "map", prompt: "An account lockout is switched on. Whose login does the attacker block by typing Sam's email five times?", parts: [
                { id: "attacker", label: "Attacker's script" },
                { id: "sam", label: "Sam" },
                { id: "login", label: "Login endpoint" },
                { id: "hash", label: "Password check" },
                { id: "users", label: "Users table" },
            ], answer: ["sam"], explanation: "The lock is on the account, not on the person typing, so the attacker can keep Sam out of their own account whenever they like." },
        ],
        talk: {
            opening: "Your counter never tripped, yet forty accounts fell in one night. Walk me through what the attacker changed, and why the counter couldn't see it.",
            probe: ["one password against many emails, versus many passwords against one", "why a per email count never passes one", "how a lockout lets anyone lock a real user out"],
        },
        sources: [S("OWASP-CS", "Brute force, credential stuffing and password spraying"), S("OWASP-AUTH", "Account lockout")],
    },

    // ── 6 ─────────────────────────────────────────────────────────────────────
    {
        id: "per-ip",
        act: "How it was fixed",
        title: "Fix two: a counter per address",
        lead: "Count by IP address. It catches the spray, and misses the botnet.",
        terms: ["botnet"],
        blocks: [
            { kind: "say", focus: "ip", text: "Count by address instead of by email. What could go wrong with that?" },
            { kind: "say", focus: "ip:Spray from one address", text: "Against the spray, it works. Every guess came from one address, so that address goes over its limit in seconds." },
            { kind: "say", focus: "ip:A busy office", text: "But many real people can share one address. An office, a university, a mobile network. A few typos each, and the whole building is refused together." },
            { kind: "say", focus: "ip:A botnet", text: "And a botnet sends each guess from a different machine. No address ever fails twice." },
            { kind: "compare", id: "ip", columns: ["What the address counter sees", "Result"], rows: [
                { label: "Spray from one address", cells: ["One address failing again and again", "Caught within seconds"] },
                { label: "A busy office", cells: ["Many people behind one address", "Real people refused together"] },
                { label: "A botnet", cells: ["Thousands of addresses, one guess each", "Never trips"] },
            ] },
            { kind: "say", focus: "sim6", text: "Try the botnet against a counter per address. Forty accounts again, and the counter sees nothing." },
            { kind: "simulator", id: "sim6", preset: { attack: "botnet", defence: "ip" } },
            { kind: "say", focus: "circumvent", text: "Blocking by address stops simple attacks. It shouldn't be your only defence, because spreading requests across many addresses is easy." },
            { kind: "note", id: "circumvent", text: "An address counter is useful, and easy to get around. Use it as one signal, not the defence." },
        ],
        check: [
            { id: "one-ip", kind: "truefalse", prompt: "One IP address means one person.", answer: false, explanation: "Offices, universities and mobile networks put many people behind one address, and one attacker can use thousands." },
            { id: "botnet", kind: "single", prompt: "Why does a botnet get past a counter per address?", options: [
                { id: "spread", label: "Each guess comes from a different address, so none fails twice" },
                { id: "fast", label: "It guesses faster than the counter can count" },
                { id: "401", label: "It gets a different status code" },
            ], answer: "spread", explanation: "The counter is per address, and the botnet makes sure no address ever repeats." },
        ],
        sources: [S("OWASP-CS", "IP blocklisting and rate limiting")],
    },

    // ── 7 ─────────────────────────────────────────────────────────────────────
    {
        id: "signals",
        act: "How it was fixed",
        title: "One verdict from many signals",
        lead: "No single counter works. So they vote, and the answer is graded.",
        terms: ["backoff", "challenge", "enumeration"],
        blocks: [
            { kind: "say", focus: "score:email", text: "No single counter works on its own. What if they voted?" },
            { kind: "say", focus: "score:email", text: "Start with the signals. How many failures this email has had." },
            { kind: "say", focus: "score:ip", text: "How many this address has had." },
            { kind: "say", focus: "score:device", text: "Whether this is a device the service has seen before, like a browser with a sign in cookie from last week." },
            { kind: "say", focus: "score:spike", text: "And whether the whole service is suddenly failing far more logins than usual." },
            { kind: "say", focus: "score:verdict", text: "They add up to one score, and the score picks a graded answer. Let them in. Slow them down. Ask for proof, like a code by email or a challenge. Or refuse." },
            {
                kind: "flow", id: "score", flow: {
                    width: 760, height: 320,
                    caption: "Signals into one score; the score picks a graded answer.",
                    nodes: [
                        { id: "email", label: "Failures on this email", x: 10, y: 10, w: 220, order: 1 },
                        { id: "ip", label: "Failures from this address", x: 10, y: 85, w: 220, order: 2 },
                        { id: "device", label: "A device seen before?", x: 10, y: 160, w: 220, order: 3 },
                        { id: "spike", label: "A service-wide spike", x: 10, y: 235, w: 220, order: 4 },
                        { id: "verdict", label: "One score", sub: "allow, slow, prove, refuse", x: 470, y: 120, w: 260, tone: "strong", order: 5 },
                    ],
                    edges: [
                        { from: "email", to: "verdict" },
                        { from: "ip", to: "verdict" },
                        { from: "device", to: "verdict" },
                        { from: "spike", to: "verdict", flowing: true },
                    ],
                },
            },
            { kind: "say", focus: "slow", text: "Why slow down instead of refusing? A growing delay costs a real person a second. It costs a script its whole rate. And guidance on logins suggests exactly this: waits that grow as the failures pile up, a bot check, and risk signals like the address and the device." },
            { kind: "note", id: "slow", text: "Graded answers: a delay costs a person a second and a script its rate. Refuse only when the score is sure." },
            { kind: "say", focus: "sim7", text: "Try the combined score against every attack. The attackers are stopped, and the office staff and Sam still get in." },
            { kind: "simulator", id: "sim7", preset: { attack: "botnet", defence: "combined" } },
            { kind: "say", focus: "same", text: "One more leak to close. The login should give the same message, and take the same time, whether the email exists or the password is wrong. Otherwise it tells anyone which emails have accounts." },
            { kind: "note", id: "same", text: "\"Login failed: invalid email or password\", with the same work done either way, so neither the message nor the timing gives away who has an account." },
        ],
        check: [
            { id: "slow-why", kind: "single", prompt: "For a borderline score, why slow down rather than refuse?", options: [
                { id: "cost", label: "A delay costs a real person a second, and a script its whole rate" },
                { id: "polite", label: "Refusing is rude" },
                { id: "cheaper", label: "A delay is cheaper for the server than a 429" },
            ], answer: "cost", explanation: "Graded answers keep real people moving while making automation expensive. Refuse when the score is sure." },
            { id: "enum", kind: "truefalse", prompt: "Saying \"no such account\" for an unknown email is fine, as long as the password check is secure.", answer: false, explanation: "It tells an attacker which emails have accounts, and so where to aim. Give the same message, with the same timing, either way." },
        ],
        sources: [S("NIST", "3.2.2 Rate limiting"), S("OWASP-AUTH", "Authentication and error messages"), S("OWASP-CS", "Device fingerprinting")],
    },

    // ── 8 ─────────────────────────────────────────────────────────────────────
    {
        id: "where-counts-live",
        act: "Running it",
        title: "Where the counters live",
        lead: "Many servers, one count. And a decision for when the count is unreachable.",
        terms: ["durableobject", "failopen"],
        blocks: [
            { kind: "say", focus: "where", text: "Your login runs on many servers at once. Whose memory holds the count? Think it through." },
            { kind: "say", focus: "where:memory", text: "If each server keeps its own count in memory, each one only sees the requests it happened to get. An attacker spread across servers is counted in pieces, and never trips a limit." },
            { kind: "say", focus: "where:shared", text: "So the count needs one shared place. And adding one to it must be a single step, so two requests at the same moment can't both read four and both write five." },
            {
                kind: "flow", id: "where", flow: {
                    width: 760, height: 250,
                    caption: "Per-server memory counts in pieces. One shared place, updated in one step, counts the truth.",
                    nodes: [
                        { id: "memory", label: "A count per server", sub: "each sees a piece", x: 10, y: 20, w: 220, tone: "bad", order: 1 },
                        { id: "shared", label: "One shared count", sub: "one step to add one", x: 280, y: 20, w: 220, tone: "strong", order: 2 },
                        { id: "do", label: "Durable Object per key", sub: "exact, one place", x: 540, y: 20, w: 210, order: 3 },
                        { id: "rl", label: "Rate limiting binding", sub: "per location, approximate", x: 540, y: 150, w: 210, tone: "muted", order: 4 },
                    ],
                    edges: [
                        { from: "memory", to: "shared", label: "instead" },
                        { from: "shared", to: "do" },
                        { from: "shared", to: "rl", dashed: true },
                    ],
                },
            },
            { kind: "say", focus: "where:do", text: "On Cloudflare, a Durable Object per key is that one place. Every request for a given email reaches the same object, which holds that email's count exactly." },
            { kind: "say", focus: "where:rl", text: "Cloudflare also has a rate limiting binding. It's quick and simple, but it counts per Cloudflare location, it catches up a moment late, and its window is ten or sixty seconds. It's built to be permissive, not to be an exact count. Fine for a coarse limit on an endpoint. For an exact count per account, reach for the Durable Object." },
            { kind: "say", focus: "fail", text: "Last, a decision to make before you need it. If the counter store is down, do logins fail open, letting everyone through and risking guessing? Or fail closed, and lock everyone out? Write the answer down in advance." },
            { kind: "note", id: "fail", text: "Fail open risks guessing; fail closed risks locking every user out. Decide before the outage, not during it." },
            { kind: "say", focus: "change:count", text: "Here's the whole fix on the system. Every attempt now goes through one shared count per email and per address." },
            { kind: "say", focus: "change:score", text: "And a score that weighs the signals, so a guesser is slowed and challenged while Sam, on a known device, still gets in." },
            { kind: "map-change", id: "change", caption: "The fix as a change to the system." },
        ],
        talk: {
            opening: "The counter store goes down at 2 am. Fail open or fail closed? Defend your choice.",
            probe: ["what failing open risks, and for how long", "what failing closed does to every real user", "why a count kept in one server's memory is wrong once there are many servers"],
        },
        sources: [S("CF-DO", "Durable Objects: one place per key"), S("CF-RL", "Locality and accuracy"), S("CF-RL", "Configuration")],
    },


    // ── How to run this one (INC-72) ──────────────────────────────────────────
    {
        id: "people",
        act: "Beyond this case",
        title: "How to run this one",
        lead: "An account taken over is a security incident. Here's how a team runs it.",
        blocks: [
            { kind: "say", focus: "roles", text: "An account changing hands isn't a bug report. It's a security incident, and it could be happening to other accounts right now. This is how a team should run it." },
            { kind: "say", focus: "roles:severity", text: "How bad? Critical. Someone got into a real account, and the same guessing works on every account." },
            { kind: "say", focus: "roles:Operations", text: "Operations secures the account first: end its sessions, give Sam their email back. Then the first counter." },
            { kind: "say", focus: "roles:Comms", text: "Comms tells Sam what happened and what to do. If more accounts turn up, comms drafts the notice." },
            {
                kind: "roles", id: "roles", roles: {
                    severity: { level: "Critical (SEV-1)", why: "A real account was taken over, and the same guessing works against every account until something counts it." },
                    roles: [
                        { role: "Incident lead", does: "Declares a security incident, owns the decisions, and keeps a live note of what is known." },
                        { role: "Operations", does: "Ends the account's sessions, restores Sam's email, then adds the first counter on failed logins." },
                        { role: "Comms", does: "Tells Sam what happened and what to do next, and drafts the notice if more accounts turn up." },
                        { role: "Planning", does: "Files the follow-ups: one shared count, the risk score, an alert on failed logins." },
                    ],
                    sources: [S("SRE", "Managing Incidents")],
                },
            },
            { kind: "say", focus: "updates:Investigating", text: "The status page says only what's known, and never how to repeat the attack." },
            {
                kind: "status", id: "updates", status: {
                    caption: "How a team would post them: an example, not the incident's record.",
                    updates: [
                        { at: 28800000, state: "Investigating", text: "We're investigating a report of an account being signed into without its owner. Next update within the hour." },
                        { at: 32400000, state: "Identified", text: "Repeated password guessing reached one account. We've secured it and are checking others. If you reused your password elsewhere, change it." },
                        { at: 50400000, state: "Monitoring", text: "Repeated failed sign-ins are now slowed and then challenged. We're watching sign-in failures." },
                        { at: 86400000, state: "Resolved", text: "No other accounts were affected. Sign-in attempts are now counted across the whole service." },
                    ],
                },
            },
            { kind: "say", focus: "book", text: "And the runbook operations follows, step by step." },
            { kind: "runbook", id: "book", title: "Suspected account takeover", steps: [
                "End every session on the account.",
                "Restore the owner's email, and ask them to set a new password.",
                "Pull the login log for the account, and for the addresses that hit it.",
                "Look for the same pattern on other accounts: one address, many emails, or one email, many guesses.",
            ] },
        ],
        check: [
            { id: "first-move", kind: "single", prompt: "Sam's account was taken over an hour ago. What does operations do first?", options: [
                { id: "counter", label: "Ship the counter on failed logins" },
                { id: "secure", label: "End the account's sessions and restore Sam's email" },
                { id: "notice", label: "Post a notice to every customer" },
            ], answer: "secure", explanation: "Stop the harm first: the attacker is still in. The counter comes next, and a notice only if more accounts turn out to be hit." },
        ],
        sources: [S("SRE", "Managing Incidents")],
    },

    // ── 9 ─────────────────────────────────────────────────────────────────────
    {
        id: "elsewhere",
        act: "Running it",
        title: "The same shape elsewhere",
        lead: "Anything that says yes or no to a guess needs something that counts the guesses.",
        blocks: [
            { kind: "say", focus: "places", text: "Where else in a product can someone guess? Name two before you listen on." },
            { kind: "say", focus: "places:A one-time code", text: "A six digit code is only a million possibilities. Unlimited, a script tries them all. Count failures per code, and let the code expire." },
            { kind: "say", focus: "places:Password reset", text: "A password reset form, and an invite link, are guessable too, and they can be used to send floods of email." },
            { kind: "say", focus: "places:Sign up", text: "Sign up can be scripted to create fake accounts by the thousand." },
            { kind: "say", focus: "places:An API key", text: "And any endpoint that checks an API key is a login with a different name." },
            { kind: "compare", id: "places", columns: ["What someone guesses", "What to count"], rows: [
                { label: "A one-time code", cells: ["1,000,000 six digit codes", "Failures per code and per account; expire the code"] },
                { label: "Password reset", cells: ["Which emails exist; a flood of emails", "Requests per email and per address"] },
                { label: "Sign up", cells: ["Nothing: it makes accounts by the thousand", "Sign ups per address, plus a challenge"] },
                { label: "An API key", cells: ["Keys", "Failures per key prefix and per address"] },
            ] },
            { kind: "say", focus: "own", text: "Now try it on a page you've already used. This site's own sign in page. What would you count, per what, and what would you answer? Talk it through with the lead." },
            { kind: "note", id: "own", text: "An exercise: this site's sign in page. What would you count, per what, and what would you answer?" },
        ],
        check: [
            { id: "otp", kind: "single", prompt: "How many possibilities does a six digit one-time code have?", options: [
                { id: "1m", label: "1,000,000" },
                { id: "999", label: "999,999" },
                { id: "6", label: "About 6 million" },
            ], answer: "1m", explanation: "000000 to 999999: a million. Unlimited, that is an afternoon for a script. Count failures and expire the code." },
            { id: "api", kind: "truefalse", prompt: "An endpoint that checks an API key needs the same protection as a login.", answer: true, explanation: "It answers yes or no to a guess. Anything that does needs something counting the guesses." },
        ],
        sources: [S("NIST", "3.2.2 Rate limiting")],
    },
]

export const LOGIN_GLOSSARY: Record<string, { term: string; definition: string; pathTopic?: string }> = {
    bruteforce: { term: "Brute force", definition: "Trying many passwords against one account until one works.", pathTopic: "How logins fail under guessing" },
    hash: { term: "Password hash", definition: "What a service stores instead of your password: a one-way scramble, slow to compute on purpose.", pathTopic: "How logins fail under guessing" },
    status429: { term: "429 Too Many Requests", definition: "The status code that says: too many requests in a given amount of time.", pathTopic: "Rate limits: windows and buckets" },
    retryafter: { term: "Retry-After", definition: "A response header saying how many seconds to wait, or when to come back.", pathTopic: "Rate limits: windows and buckets" },
    ratelimit: { term: "Rate limit", definition: "A cap on how many requests are allowed in a stretch of time.", pathTopic: "Rate limits: windows and buckets" },
    fixedwindow: { term: "Fixed window", definition: "Counting from the start of each minute on the clock. Leaks a double burst at the edge.", pathTopic: "Rate limits: windows and buckets" },
    slidingwindow: { term: "Sliding window", definition: "Counting the last minute from right now, whenever it started.", pathTopic: "Rate limits: windows and buckets" },
    tokenbucket: { term: "Token bucket", definition: "Tokens refill at a steady rate; each request spends one. Allows a small burst.", pathTopic: "Rate limits: windows and buckets" },
    spraying: { term: "Password spraying", definition: "One common password tried against many accounts, one guess each.", pathTopic: "Spraying, stuffing and lockouts" },
    stuffing: { term: "Credential stuffing", definition: "Trying email and password pairs leaked from other sites.", pathTopic: "Spraying, stuffing and lockouts" },
    lockout: { term: "Account lockout", definition: "Refusing an account after too many failures. Can be abused to lock real people out.", pathTopic: "Spraying, stuffing and lockouts" },
    botnet: { term: "Botnet", definition: "Many machines sending requests for one attacker, each from its own address.", pathTopic: "Spraying, stuffing and lockouts" },
    backoff: { term: "Backoff", definition: "A delay that grows with each failure: a second for a person, hours for a script.", pathTopic: "Signals and graded responses" },
    challenge: { term: "Challenge", definition: "Asking for proof before going on: a code by email, or a bot check.", pathTopic: "Signals and graded responses" },
    enumeration: { term: "User enumeration", definition: "Learning which emails have accounts from a login's messages or timing.", pathTopic: "Signals and graded responses" },
    durableobject: { term: "Durable Object", definition: "On Cloudflare, one addressable place with its own storage: every request for a key reaches the same one.", pathTopic: "Running limiters at scale" },
    failopen: { term: "Fail open or fail closed", definition: "When a check cannot run: let everyone through, or refuse everyone.", pathTopic: "Running limiters at scale" },
}

export const LOGIN_LEARN: { title: string; summary: string }[] = [
    { title: "How logins fail under guessing", summary: "What a login does, and why nothing in it counts." },
    { title: "Rate limits: windows and buckets", summary: "429, Retry-After, and three ways to count." },
    { title: "Spraying, stuffing and lockouts", summary: "The attacks that slip past one counter, and the fix that locks people out." },
    { title: "Signals and graded responses", summary: "Many signals, one score, and answers between yes and no." },
    { title: "Running limiters at scale", summary: "Shared counters, Cloudflare's options, and failing open or closed." },
]
