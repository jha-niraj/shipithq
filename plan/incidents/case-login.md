# Case 2: "The login that said yes to guessing" (outline for review)

Topic: Security (also Auth and sessions). About 25 minutes, 9 chapters. Written for the ear,
each chapter opening on a hook the reader can guess at. Diagrams build as the lead speaks.
No code. Status: approved 2026-09-28 (plan/incidents INC-57).

Every number below is to be checked against the sources at the end before it ships.
Numbers marked (example) are the case's own story, not claims about the world.

---

## What happened

### 1. The incident
- **Hook:** "Nothing crashed, and every response was correct. So what was missing?"
- **Story:** Monday, 9 am. A customer writes in: someone logged into their account overnight
  and changed their email. The team pulls the login logs for that address.
- **See:** the log: 3,112 failed logins between 1:04 and 4:51 am (example), every one a correct
  `401`, from the same few addresses, then one `200` at 4:52. Then the row: last login 4:52,
  email changed 4:53.
- **Note:** "The login did its job 3,112 times. That was the problem."
- **Check:** what did the logs show? (thousands of correct 401s, then a 200.) True/false: a
  401 means the system defended itself.

### 2. What a login actually does
- **Hook:** "How many guesses can one script make in an hour, if nothing stops it?"
- **Flow (builds):** browser, then look up the user, then compare the password hash (slow on
  purpose), then 401 or 200.
- **Beats:** the hash comparison is deliberately slow, so each guess costs the server real
  work. Unlimited, a loop of 10 tries a second is 36,000 an hour. The weak spot is not the
  check, it is that nothing counts.
- **Check:** order the steps of a login; single choice on why the hash is slow on purpose.

### 3. 429 Too Many Requests
- **Hook:** "There is a status code that means 'slow down'. What should a client do when it
  gets one?"
- **Compare:** 401 (who are you), 403 (not allowed), 429 (too many, try later).
- **Beats:** 429 says you are sending too much; `Retry-After` says when to try again, in
  seconds or as a date. A well-behaved client waits; an attacker does not, so the server
  must keep refusing, cheaply.
- **Talk:** "The attacker ignores Retry-After. Does 429 still help? Why?"

## How it was fixed

### 4. Fix one: a counter per email
- **Hook:** "The simplest fix is one counter. Where would you put it?"
- **Flow (builds):** failed login, then add one to `failures:<email>` (expires in 60 s), then
  over 5? 429 : answer as usual.
- **Beats:** it stops the overnight attack cold. Then its first flaw: a fixed one-minute
  window resets on the minute, so 5 tries at 0:59 and 5 more at 1:00 all get through. A
  sliding window counts the last 60 seconds, whenever they started; a token bucket refills
  slowly and allows a small burst.
- **Simulator (first use):** attack "one email", defence "per email", watch it hold. Try the
  window boundary.
- **Check:** buckets (fixed window / sliding window / token bucket) with short descriptions.

### 5. The second incident
- **Hook:** "The counter worked. Two weeks later, 40 accounts were taken in one night, and
  the counter never tripped. How?"
- **Beats, two twists:**
  - Password spraying: one common password tried against thousands of emails, one try each.
    Per email, the count never passes 1.
  - Lockout as a weapon: when the fix locks an email after 5 failures, anyone can lock a real
    user out by typing their email wrong 5 times. The defence became the attack.
- **Simulator:** attack "spray", defence "per email": everything gets through. Defence "lock
  after 5": real users locked out.
- **Talk:** "Your counter never tripped, yet 40 accounts fell. Walk me through what the
  attacker changed."

### 6. Fix two: a counter per IP
- **Hook:** "Count by address instead. What could go wrong with that?"
- **Beats:** a counter per IP catches the spray from one machine. But many real people share
  one IP (an office, a university, a mobile carrier), so a busy office gets blocked; and a
  botnet sends each guess from a different address, so no IP ever passes 1.
- **Simulator:** spray vs per IP (caught); botnet vs per IP (through); office users (blocked).
- **Check:** true/false on "one IP means one person".

### 7. One verdict from many signals
- **Hook:** "No single counter works. What if they voted?"
- **Flow (builds):** signals (the email's failures, the IP's failures, the network it comes
  from, a known device cookie, whether the password is a known leaked one) feed one score,
  and the score picks a graded answer: allow, slow down (a growing delay), ask for proof (an
  emailed code or a challenge), or block.
- **Beats:** slowing down costs a real user a second and an attacker days. And one more leak
  to close: the same message and the same response time for "no such email" as for "wrong
  password", so the login does not tell anyone who has an account.
- **Simulator:** combined score vs all three attacks, with real users getting through.
- **Check:** single choice on why "slow down" beats "block" for a borderline score.

## Running it

### 8. Where the counters live (the Cloudflare chapter)
- **Hook:** "You run on many servers. Whose memory holds the count?"
- **Beats:** a counter in one server's memory only sees the requests that server got, so an
  attacker spread across servers is counted in pieces. Counters need one shared place, and
  adding one must be a single, un-racy step. On Cloudflare: a Durable Object per key (one
  place that owns that email's count), or the Workers rate limiting binding for simple
  limits. And a decision to make up front: if the store is down, do logins fail open (let
  people in, risk guessing) or closed (lock everyone out)?
- **Talk:** "The counter store goes down at 2 am. Fail open or fail closed, and why?"

### 9. The same shape elsewhere
- **Hook:** "Where else in your product can someone guess?"
- **Compare:** one-time codes (6 digits is only a million guesses), password reset, sign-up
  (fake accounts), API keys, and invite links: what each counts and what it answers.
- **Note:** "Anything that says yes or no to a guess needs something that counts the guesses."

## Final steps (as in case 1)
- **Final quiz:** predictions from chapters 4 to 7 as single choice.
- **Round, "Spot the hole":** short scenarios (a limiter with fixed windows only; a lockout on
  email; a per-instance counter; a login that says "no such user"), each: what is wrong.
- **Closing talk:** "You're the security lead. Walk me through the defence you'd ship, and what
  it costs a real user."
- **Closing:** what to remember, and a checklist.

## Glossary (each with a Pathfinder topic)
429 Too Many Requests, Retry-After, rate limit, fixed window, sliding window, token bucket,
credential stuffing, password spraying, account lockout, backoff, device cookie, fail open /
fail closed, user enumeration.

## Pathfinder path: "Protecting logins" (5 topics)
1. How logins fail under guessing
2. Rate limits: windows and buckets
3. Spraying, stuffing and lockouts
4. Signals and graded responses
5. Running limiters at scale (shared counters, Cloudflare, failure modes)

## Sources to check every claim against
- RFC 6585, section 4: 429 Too Many Requests.
- RFC 9110: the Retry-After header.
- OWASP Authentication Cheat Sheet, and the Credential Stuffing Prevention Cheat Sheet.
- NIST SP 800-63B: rate limiting of failed authentication attempts.
- Cloudflare docs: Durable Objects, and the Workers rate limiting binding.

## Decisions (Niraj, 2026-09-28)
- **The second incident** is spraying plus the lockout trap (chapter 5), as outlined.
- **Chapter 9** uses ShipItHQ's own sign-in page as an exercise ("what would you count, what
  would you answer?"), without describing our real defences.
- **Topics:** Security first (the tag and the cover), and it also shows under Auth and sessions.
  A case gains `topics: string[]`, first = primary.
- **Story numbers are illustrative, said once:** a quiet line at the start, "A composite
  incident; the numbers are illustrative, the mechanics are real and sourced."
