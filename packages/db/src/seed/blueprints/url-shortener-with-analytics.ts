import type { SeedSprint } from "./types"

// A link shortener is the smallest honest excuse to put a cache in front of a
// database and a queue behind a request. The sprints go in that order: make the
// redirect correct, make it fast, then count every click without the visitor
// waiting for the write, and finally show the numbers and prove they survive
// load.
const sprints: SeedSprint[] = [
    {
        name: "Shorten a link and follow it",
        goal: "A request creates a short code and a visit to that code redirects to the original URL, stored in Postgres.",
        duration: "1 week",
        tasks: [
            {
                title: "Run a Node service against Postgres and Redis",
                description: [
                    "Get a Node service, a Postgres instance and a Redis instance running together with one command, and have the service connect to both at boot.",
                    "Redis has nothing to do yet. It is here from the start so that sprint two is a change of behaviour rather than a change of infrastructure."
                ],
                criteria: [
                    "One command starts Postgres and Redis and the service connects to both during startup",
                    "A health endpoint returns 200 and reports the state of each connection",
                    "The service exits with a non-zero code if a required connection fails at startup rather than serving requests that will fail"
                ],
                hints: [
                    "Failing loudly at boot beats failing on the first request; the health endpoint is there to report, not to repair."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "setup"
            },
            {
                title: "Design the links table",
                description: [
                    "One table holds the short code, the destination, who created it, when, and an optional expiry. The lookup by code is the query that will run millions of times, so it gets the unique index.",
                    "One decision to settle before writing the insert: do two people shortening the same URL share a code. Both answers are defensible and they lead to different tables."
                ],
                criteria: [
                    "The table stores a short code, a destination URL, a creation time and a nullable expiry",
                    "The short code has a unique index and the query plan for a lookup by code uses it rather than scanning",
                    "A destination longer than the agreed maximum is rejected at the boundary with a 400 rather than truncated on the way in"
                ],
                hints: [
                    "Write down your answer to the shared-code question in the migration file itself; the next person will ask.",
                    "An expiry column that is null means no expiry, which is one fewer table than an expiry table."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Generate a short code that does not collide",
                description: [
                    "Produce a short, readable code for each link. Random with a uniqueness constraint, or a counter with an encoding: pick one and be able to say why.",
                    "A collision is not an exception to log and forget. It is the expected outcome of the approach you chose, so it needs a retry path that terminates."
                ],
                criteria: [
                    "Codes are a fixed length from an alphabet that excludes visually ambiguous characters",
                    "Creating one hundred thousand links produces no duplicate codes and no unhandled uniqueness error",
                    "A collision is retried a bounded number of times and then fails with a clear server error rather than looping"
                ],
                hints: [
                    "Random plus a unique constraint needs a retry; a counter needs a source of sequence that survives two instances. Neither is free.",
                    "Work out the collision probability for your alphabet and length at your expected volume before choosing the length."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Redirect on a visit",
                description: [
                    "Resolve the code and send the visitor on. The status code you choose here decides whether the browser ever asks you again, which decides whether you can count the second click.",
                    "Unknown and expired are different answers and should look different to a client."
                ],
                criteria: [
                    "A visit to a known code returns a redirect with the destination in the Location header, and the repository states why that particular status was chosen",
                    "An unknown code returns 404 with a short body",
                    "An expired link returns 410 rather than 404"
                ],
                hints: [
                    "A permanent redirect is cached by the browser and by everything in between, which is excellent for latency and fatal for analytics."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Write the create endpoint and its validation",
                description: [
                    "Accept a destination and return the short URL. Most of the work here is refusing things: a URL with no scheme, a script URL, a link that points back at the shortener itself.",
                    "Add an idempotency key so a retried request from a flaky client does not mint a second code for the same link."
                ],
                criteria: [
                    "A valid destination returns 201 with the short URL in the body",
                    "A URL with no scheme, a javascript scheme URL and a link to the shortener's own domain are each rejected with 400",
                    "Two requests carrying the same idempotency key return the same short code and create one row"
                ],
                hints: [
                    "Validating a URL with a regular expression is the trap; the runtime already ships a parser that knows the grammar.",
                    "A link to your own shortener is how a redirect loop starts, and the loop is discovered by whoever is on call."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "backend"
            }
        ]
    },
    {
        name: "Redirect without touching Postgres",
        goal: "The common redirect is served from Redis, the miss path fills the cache, and you have the before and after numbers to show for it.",
        duration: "1 week",
        tasks: [
            {
                title: "Measure the redirect before you cache it",
                description: [
                    "Load test the redirect against Postgres alone and write the numbers down. Percentiles, not an average.",
                    "A figure taken before the change is the only way to know the change helped. Taking it afterwards is guessing with extra steps."
                ],
                criteria: [
                    "A load test reports p50, p95 and p99 for the redirect against Postgres alone and the numbers are committed to the repository",
                    "The test runs against at least one hundred thousand seeded links so the lookup is not served entirely from a warm page cache",
                    "The same command can be re-run later against the same data to compare"
                ],
                hints: [
                    "A load tool that reports only an average hides exactly the tail you are about to spend a week on."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "testing"
            },
            {
                title: "Serve the redirect from Redis",
                description: [
                    "Put the destination in Redis on the way through, and read it there first on the next request. The database should see one query per link, not one per visit.",
                    "Cache the expiry alongside the destination. A cached destination without its expiry will cheerfully redirect to a link that died an hour ago."
                ],
                criteria: [
                    "A second request for the same code issues no Postgres query, confirmed in the database query log",
                    "A cache hit serves the redirect in under 5 milliseconds at p99 in the same load test as the baseline",
                    "The cached value carries a time to live and that value is set in one place in the configuration"
                ],
                hints: [
                    "Store the whole decision, not just the destination, or the second lookup you avoided comes back as an expiry check."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Handle the miss and the code that does not exist",
                description: [
                    "A miss reads Postgres, fills Redis and redirects in the same request. Nothing queues, nothing waits.",
                    "The harder half is the code that does not exist. Without caching absence, anybody scanning your key space is running a load test against your database for free."
                ],
                criteria: [
                    "A miss reads Postgres, populates Redis and redirects within the same request",
                    "A code that does not exist is cached as absent with a short time to live",
                    "Ten thousand requests for the same unknown code produce no more than a handful of Postgres queries"
                ],
                hints: [
                    "The short time to live on an absent code is what stops a link created a second ago staying invisible for an hour."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Invalidate on update and delete",
                description: [
                    "Deleting or editing a link must be visible immediately, not when the time to live happens to run out.",
                    "The property worth protecting is that an empty Redis changes latency and nothing else. Prove it by emptying Redis in the middle of a run."
                ],
                criteria: [
                    "Deleting a link makes the very next redirect return 410 with no stale hit",
                    "Editing a destination takes effect on the next request rather than after the time to live",
                    "Flushing Redis during a load test changes the latency but produces no errors and no wrong destinations"
                ],
                hints: [
                    "Deleting the cache key before the database write and again after it covers the race where a concurrent read repopulates the old value."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Keep working when Redis is gone",
                description: [
                    "A cache that can take the service down with it is a liability rather than an optimisation. With Redis stopped, the redirect should still resolve from Postgres.",
                    "The whole of the fix is a short client timeout and a failure path that counts rather than throws."
                ],
                criteria: [
                    "With Redis stopped the service stays up and redirects resolve from Postgres",
                    "Redis operations have a timeout of well under a second and a failure increments a counter rather than reaching the client",
                    "The health endpoint reports Redis as degraded while the redirect path keeps answering normally"
                ],
                hints: [
                    "A default client timeout is often measured in tens of seconds, which is long enough to exhaust every connection you have.",
                    "Retrying a dead cache on every request adds latency to a path that is already slow; a short circuit is kinder."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Count clicks off the hot path",
        goal: "Every redirect records a click, and the redirect never waits for that record to be written.",
        duration: "1 week",
        tasks: [
            {
                title: "Decide what a click is and what you will keep",
                description: [
                    "Write down which fields you record per click and which you deliberately do not. Then write down how long you keep them and why.",
                    "Storing a raw visitor address is a decision with legal weight in several countries. Truncating or hashing it is the usual answer, and the reasoning belongs in the repository rather than in somebody's memory."
                ],
                criteria: [
                    "A note in the repository lists the fields recorded per click and the fields deliberately not recorded",
                    "The note says how a likely bot hit is distinguished from a person and what happens to it",
                    "The note states a retention period and the reason for that period"
                ],
                hints: [
                    "Deciding retention before you have a billion rows is considerably cheaper than deciding it afterwards."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Push the click onto a buffer instead of writing it",
                description: [
                    "Append the click to a Redis stream and return the redirect immediately. The visitor must not wait on an analytics write, not even a fast one.",
                    "The interesting part is what happens when the buffer itself is slow or unavailable. A click is worth less than a redirect, so the failure path drops it and counts the drop rather than making somebody wait."
                ],
                criteria: [
                    "The redirect response is sent before any analytics write completes, shown by timings in a trace or a log line",
                    "With the analytics buffer unavailable, redirects continue and a dropped-click counter increases",
                    "p99 redirect latency with click recording on is within 1 millisecond of the figure with it off"
                ],
                hints: [
                    "Look for an awaited write in the handler, including the one hiding inside a logging call.",
                    "A stream gives you an acknowledgement; a plain list does not. That difference is what the next task depends on."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Drain the buffer into Postgres in batches",
                description: [
                    "A separate worker reads the buffer and writes clicks to Postgres in batches. One insert of five hundred rows costs far less than five hundred inserts.",
                    "The order of two lines decides the whole durability story: acknowledge after the insert commits, never before."
                ],
                criteria: [
                    "A separate worker process reads the buffer and inserts clicks in batches of at least five hundred rows per statement",
                    "Killing the worker mid-batch and restarting it loses no acknowledged click and creates no duplicate row",
                    "With five thousand clicks per second arriving, the buffer length stays flat rather than growing without bound"
                ],
                hints: [
                    "A batch with no size limit turns one slow insert into an out of memory error.",
                    "Consumer groups give you the redelivery of an unacknowledged entry for free; using them is cheaper than writing your own tracking."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Enrich a click without slowing the worker",
                description: [
                    "Derive the referrer host, a device class and a country in the worker, not in the redirect. The redirect's job is to redirect.",
                    "Parsing a user agent string exactly is not achievable. Choosing three or four buckets you can defend is."
                ],
                criteria: [
                    "Each stored click carries a referrer host, a device class and a country, all derived in the worker",
                    "Country lookup uses a local dataset and makes no network call per click",
                    "A malformed or absent user agent yields an unknown bucket rather than an error or a dropped row"
                ],
                hints: [
                    "Store the referrer host rather than the full referrer, or your analytics table becomes a log of other people's URLs."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Keep a live counter that is correct enough",
                description: [
                    "People want the total click count immediately, not after the next drain. Keep a counter in Redis, incremented on the redirect path, and read the page total from it.",
                    "Two sources for the same number need a reconciliation step. Write that step now, rather than at three in the morning when the two disagree by ten thousand."
                ],
                criteria: [
                    "A per-link total is readable in under 5 milliseconds without querying Postgres",
                    "After traffic stops, the live counter and the count of rows in Postgres agree within one drain interval",
                    "Losing Redis without persistence does not leave the counter permanently wrong, because it is rebuilt from Postgres"
                ],
                hints: [
                    "Rebuilding from Postgres on a cache miss is simpler than persisting the counter, and it doubles as the reconciliation."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            }
        ]
    },
    {
        name: "Show the numbers and hold the line",
        goal: "Owners can see their analytics, abuse is bounded, and the whole system has been load tested and deployed with a runbook.",
        duration: "1 week",
        tasks: [
            {
                title: "Build the analytics query",
                description: [
                    "Return clicks per day for a link over a range, with days of zero clicks present as zeros rather than missing.",
                    "The size of the click table is the constraint here. Aggregating a million rows per page view stops working at some point, and knowing where that point is matters more than moving it today."
                ],
                criteria: [
                    "An endpoint returns clicks per day over a chosen range and days with no clicks appear as zeros",
                    "Over one million click rows the query returns in under 200 milliseconds and the plan shows an index being used",
                    "A range longer than the documented maximum is rejected rather than served slowly"
                ],
                hints: [
                    "Gaps in a time series are best filled by the database generating the days, not by the client guessing which are missing.",
                    "Look at what a pre-aggregated daily table would change, and write down at what row count you would build one."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Show it on a page",
                description: [
                    "A link page with the total, a daily chart and the leading referrers and countries. Nothing more.",
                    "The page and the API must agree. Where they differ it is almost always formatting of large numbers or the ordering of a tie."
                ],
                criteria: [
                    "The link page shows the total clicks, a daily chart and the top five referrers and countries",
                    "A link with no clicks shows an empty state rather than an empty chart",
                    "Every number on the page matches the API response for the same range"
                ],
                hints: [
                    "Decide how ties are broken in the top five, or the list will reorder itself on every refresh."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Bound abuse on the create path",
                description: [
                    "An open shortener is a phishing tool with hosting. Limit creation per client, and check destinations against a blocklist.",
                    "The redirect path is deliberately not limited by the same mechanism. Write down why, because somebody will ask."
                ],
                criteria: [
                    "An unauthenticated client creating links receives 429 with a Retry-After header on the eleventh request inside one minute",
                    "The redirect path is not limited by the same mechanism and the code says why",
                    "A destination whose host is on the blocklist is refused at creation with a 400"
                ],
                hints: [
                    "The limiter state belongs in Redis, not in process memory, or two instances hand every client twice the allowance."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Load test the whole thing and record the result",
                description: [
                    "Run the full system, redirect plus click recording plus drain, at a rate well above what you expect, for long enough that buffers have to keep up rather than absorb.",
                    "Count what you sent and compare it to what was stored. That comparison is what catches a buffer that is quietly lossy under pressure."
                ],
                criteria: [
                    "A run of at least ten thousand redirects per second for five minutes completes with no server errors",
                    "p99 redirect latency across the run stays under 25 milliseconds and the figure is recorded next to the sprint two baseline",
                    "Stored click count plus the dropped-click counter equals the number of requests the load tool reports"
                ],
                hints: [
                    "Run the load generator on a different machine, or the numbers describe your laptop's scheduler rather than your service.",
                    "Watch the buffer length during the run; a slowly growing queue is a failure that has not happened yet."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "testing"
            },
            {
                title: "Deploy it and write the runbook",
                description: [
                    "Ship the service and the worker as two processes that can be restarted independently, then write down what to do when each part misbehaves.",
                    "Write the runbook now, while the failure modes from the last two sprints are still fresh enough to describe precisely."
                ],
                criteria: [
                    "The service and the worker run as separate processes and either can be restarted without the other",
                    "A runbook covers the buffer backing up, Redis being down and Postgres being at capacity, one paragraph each",
                    "Stopping the worker for ten minutes and restarting it results in no lost clicks"
                ],
                hints: [
                    "The worker being down for ten minutes is a test, not a thought experiment; run it before you write that paragraph."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "deploy"
            }
        ]
    }
]

export default sprints
