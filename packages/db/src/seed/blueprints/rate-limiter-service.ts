import type { SeedSprint } from "./types"

// A rate limiter is a small service with a hard latency budget, which makes it
// the shortest route to distributed correctness, atomicity in Redis and
// measured performance. The sprints run: answer at all, answer correctly with a
// window that really slides, answer in under a millisecond, and keep answering
// when Redis, the clock or the traffic misbehaves.
const sprints: SeedSprint[] = [
    {
        name: "Answer yes or no over HTTP",
        goal: "A Go service decides against Redis whether a caller is over a fixed-window limit, and reports the decision with the standard headers.",
        duration: "1 week",
        tasks: [
            {
                title: "Stand up the Go service and Redis",
                description: [
                    "A Go binary with a health endpoint, a configured port and a Redis connection established at boot. Configuration from the environment with defaults, logged once at startup so the effective settings are never a mystery.",
                    "Read the Redis client library's pool defaults while you are here. Those defaults become a latency problem in sprint three, and knowing them now saves an afternoon later."
                ],
                criteria: [
                    "Running the server command starts a service answering a health endpoint on the configured port",
                    "The health endpoint reports the Redis round trip time",
                    "The effective configuration is logged once at startup and every value has a documented default"
                ],
                hints: [
                    "Pick the Redis client now and skim what its pool size, dial timeout and read timeout default to."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "setup"
            },
            {
                title: "Define the limit rules and where they live",
                description: [
                    "A rule names a key pattern, a quota and a window. Rules are loaded at startup rather than compiled in, so a new tier of caller does not need a release.",
                    "Decide what happens to a key that matches no rule. Unlimited is the answer that gets discovered in production."
                ],
                criteria: [
                    "A rule carries a key pattern, a quota and a window duration, and rules are loaded from configuration at startup",
                    "Two tiers of caller with different quotas are expressed without changing any code",
                    "A key matching no rule falls back to a documented default rule rather than being unlimited",
                    "An invalid rule set fails at startup with a message naming the offending rule"
                ],
                hints: [
                    "Matching a key against several patterns needs a defined precedence; decide whether it is most specific wins or first match wins and say so in the configuration file."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Implement a fixed window counter",
                description: [
                    "The simplest correct-enough limiter: a counter per caller per window, incremented on each check, compared against the quota. Build it knowing you will replace it.",
                    "Its flaw is the reason sprint two exists. A caller who sends their whole quota in the last second of one window and again in the first second of the next has taken double their rate across two seconds, entirely within the rules."
                ],
                criteria: [
                    "With a quota of ten per minute, the eleventh request inside that minute is refused",
                    "Counter keys expire with their window, verified by counting keys in Redis after an hour of continuous traffic",
                    "No path can leave a counter key without an expiry, including when the process dies between operations",
                    "The boundary burst is demonstrated in a test and the result is written down as the motivation for sprint two"
                ],
                hints: [
                    "An increment and a separate expiry are two commands, and the gap between them is where an immortal key comes from.",
                    "Measure the boundary burst deliberately rather than reasoning about it; the number is more persuasive than the argument."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Expose the decision over HTTP",
                description: [
                    "A check endpoint that takes a key and returns whether the caller may proceed, how much quota remains and how long until it resets.",
                    "Decide whether this service returns 429 itself or reports a decision that the caller acts on. The two lead to different clients, and mixing them leads to neither."
                ],
                criteria: [
                    "A check returns allowed or denied along with the remaining quota and the seconds until reset",
                    "A denied decision carries Retry-After and the standard rate limit headers with values consistent with the body",
                    "A malformed request returns 400 and does not consume the caller's quota"
                ],
                hints: [
                    "The remaining quota in the headers and the one in the body must come from the same computation, not from two.",
                    "Read what the standard rate limit header fields are expected to contain before inventing your own names."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Write the first correctness test",
                description: [
                    "Send exactly the quota, assert every request was allowed, then assert the next one is refused. Advance time and assert the caller is allowed again.",
                    "Inject the clock now. Every test in the remaining three sprints depends on being able to move time without sleeping, and retrofitting that across three algorithms is considerably worse than doing it here."
                ],
                criteria: [
                    "A test sends exactly the quota with every request allowed, then asserts the next one is refused",
                    "The test controls time through an injected clock rather than sleeping, so a one-hour window is exercised in milliseconds",
                    "The test runs against a real Redis instance rather than a mock of one"
                ],
                hints: [
                    "A mocked Redis will agree with whatever you believe about Redis, which is precisely the thing under test.",
                    "The clock belongs in the limiter's dependencies, not in a package-level variable that tests mutate."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "testing"
            }
        ]
    },
    {
        name: "A window that actually slides",
        goal: "The limiter uses a sliding window no boundary burst can beat, the decision is one atomic operation, and the cheaper approximation has a measured error bound.",
        duration: "1 week",
        tasks: [
            {
                title: "Implement the sliding window log",
                description: [
                    "Keep the timestamps of a caller's recent requests, drop the ones older than the window, and count what is left. Exact, and the yardstick everything else is measured against.",
                    "Its cost is memory. Keep it bounded by the quota rather than by the request rate, which means being careful about what a refused request does to the log."
                ],
                criteria: [
                    "A caller sending their whole quota at the end of one minute and again at the start of the next is refused by the log, where the fixed window from sprint one allowed it",
                    "A caller silent for longer than the window is allowed immediately on their next request",
                    "Memory per caller is bounded by the quota rather than by the request rate, verified by inspecting the stored size after a flood of refused requests",
                    "Entries older than the window are removed rather than accumulating until the key expires"
                ],
                hints: [
                    "A sorted set keyed by timestamp gives you the log, and trimming before counting is what keeps it bounded.",
                    "Appending a refused request to the log is how the memory bound is quietly lost."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Make the decision atomic with a Lua script",
                description: [
                    "Trim, count, decide and append are four operations, and between any two of them another instance can act. Under concurrency that gap is how a quota of one hundred lets a hundred and forty requests through.",
                    "Move the whole decision into a single Lua script so Redis runs it as one unit, and pass the time in as an argument rather than reading a clock inside the script."
                ],
                criteria: [
                    "Trimming, counting, deciding and appending happen in one round trip to Redis",
                    "With fifty concurrent clients against a quota of one hundred, exactly one hundred requests are allowed, repeated over twenty runs with no variation",
                    "The script receives the current time as an argument rather than reading Redis's own clock, and a comment explains why",
                    "The script is loaded once and invoked by its hash, with a fallback for the case where Redis has forgotten it"
                ],
                hints: [
                    "A script that reads a clock or generates randomness inside itself is not deterministic, which matters for replication.",
                    "A race here will never appear with one client; the test needs genuine concurrency to find it."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Implement the sliding window counter as the cheaper option",
                description: [
                    "The log costs memory proportional to the quota. The weighted counter costs two integers per caller: the count in the current fixed window plus a fraction of the previous one, weighted by how far into the current window you are.",
                    "It is an approximation, so the honest version of this task is not the code but the error bound. Work out by hand which traffic pattern makes it worst before you write anything."
                ],
                criteria: [
                    "The weighted counter reaches a decision using at most two keys per caller",
                    "Across ten thousand simulated request patterns the counter's decisions differ from the exact log by no more than the documented error bound",
                    "The error bound is stated as a number in the repository along with the traffic pattern that produces the worst case",
                    "Memory per caller is constant regardless of the quota, verified against a quota of ten and a quota of ten thousand"
                ],
                hints: [
                    "The weighting of the previous window by the elapsed fraction of the current one is the entire approximation; derive its error on paper first.",
                    "The worst case is a caller whose traffic all sits at one end of the previous window."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Choose per rule and prove the two agree",
                description: [
                    "A rule names which algorithm it uses, and both reach the same endpoint. Expensive and exact for the limits that matter, cheap and approximate for the rest.",
                    "Then replay one recorded request stream through both and report every disagreement. A differential test of two implementations finds more than either one's own tests."
                ],
                criteria: [
                    "A rule selects its algorithm and both are reachable through the same check endpoint with the same response shape",
                    "A differential test replays one recorded request stream through both algorithms and reports every disagreement",
                    "Each disagreement found falls within the error bound from the previous task, and any that does not fails the test"
                ],
                hints: [
                    "Record a stream with realistic burstiness; a uniform stream will never separate the two implementations."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "testing"
            },
            {
                title: "Support several limits on one call",
                description: [
                    "Real callers hit more than one limit: per key, per tenant, and a global ceiling. One check evaluates all of them and reports which one was exceeded.",
                    "The order of operations is the whole task. Check everything first, then commit, or a request refused by the global limit will still have eaten a caller's per-key quota."
                ],
                criteria: [
                    "One check evaluates per-key, per-tenant and global limits and names the limit that was exceeded",
                    "When several limits apply, the response reports the most restrictive remaining quota",
                    "A request refused by one limit consumes no quota from any of the others, asserted by a test"
                ],
                hints: [
                    "Checking every limit and then committing is a different script from the one you have; the two-phase shape is the point.",
                    "Evaluating limits in a fixed order keeps the error message stable when two are exceeded at once."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Under a millisecond, under load",
        goal: "The service answers at p99 under one millisecond at the target rate, measured against a recorded baseline rather than assumed.",
        duration: "1 week",
        tasks: [
            {
                title: "Build the benchmark harness",
                description: [
                    "A load tool that drives the check endpoint at a configurable rate and reports the tail, separated from connection setup cost. Record a baseline with the date, the hardware and the numbers.",
                    "Find out whether your load generator suffers from coordinated omission before you trust anything it says about p99. Most of the simple ones do."
                ],
                criteria: [
                    "The harness drives a configurable request rate and reports p50, p99 and p99.9 separately from connection setup time",
                    "The harness runs on a different machine from the service, or the repository states that it does not and why the numbers remain comparable",
                    "A baseline run is recorded with the date, the hardware and the full configuration"
                ],
                hints: [
                    "A tool reporting only averages hides the tail you are about to spend a week on.",
                    "Read what coordinated omission is and check whether your tool corrects for it."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "testing"
            },
            {
                title: "Fix the connection and pipeline behaviour",
                description: [
                    "Set the Redis pool size, the timeouts and the retry policy explicitly, with a comment justifying each number. Defaults were chosen for somebody else's workload.",
                    "Profile before tuning. The bottleneck at this stage is as likely to be request decoding as it is to be Redis."
                ],
                criteria: [
                    "Pool size, dial timeout, read timeout and retry policy are all set explicitly with a justification in a comment",
                    "p99 improves measurably against the recorded baseline and the new figure is recorded beside it",
                    "Time spent waiting for a free connection is reported by a counter rather than inferred, and no request waits longer than the configured timeout"
                ],
                hints: [
                    "A pool sized from the CPU count has nothing to do with your concurrency, which is what actually determines contention.",
                    "A retry on a timeout doubles the load exactly when the system is already struggling; decide whether you want one."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Add a bounded local pre-check",
                description: [
                    "Not every call needs to reach Redis. A caller refused a moment ago can be refused locally until their window could plausibly have moved, which removes a round trip from the requests you care least about.",
                    "The trap is that a local cache quietly turns one shared limit into one limit per instance. The safety property is asymmetry: the local path may refuse, never allow."
                ],
                criteria: [
                    "A locally cached refusal is served with no Redis round trip and at under 50 microseconds at p99",
                    "The local path can only refuse and never allow, asserted by a test that fails if any allowed decision is made locally",
                    "With three instances running, the total allowed across all of them matches the configured quota within a stated tolerance, and that tolerance is measured rather than assumed",
                    "The local cache has a bounded size and an eviction policy, verified under a flood of distinct keys"
                ],
                hints: [
                    "Caching a refusal is conservative; caching an allowance over-permits by exactly the number of instances you run.",
                    "An unbounded map keyed by caller is a memory leak that a key-space scan will find for you."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "backend"
            },
            {
                title: "Cut the allocation and serialisation cost",
                description: [
                    "At this latency target the cost of building a key string and encoding a response is a real fraction of the budget. Profile the check path, then drive allocations per request down.",
                    "Record the profile before and after. An optimisation with no measurement attached is a guess that survived review."
                ],
                criteria: [
                    "A CPU profile of the check path is recorded before and after, and allocations per request drop measurably",
                    "An allocation benchmark shows the handler allocating nothing to build the Redis key on the hot path",
                    "Throughput at the same latency target increases and the new figure is recorded with the others"
                ],
                hints: [
                    "Go's benchmark tooling reports allocations per operation; that is the number to drive down.",
                    "String concatenation to build a key is usually near the top of the profile."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Hit the latency target and record the proof",
                description: [
                    "Run at the target rate for long enough that garbage collection, connection churn and Redis background work all happen during the run, then record the result next to every earlier baseline.",
                    "If the target is missed, the profile from the previous task says which of the three changes to revisit. Guessing at this point is expensive."
                ],
                criteria: [
                    "A run of at least fifty thousand checks per second for ten minutes reports p99 under one millisecond",
                    "The run completes with zero errors and zero timeouts",
                    "The result, the configuration and the machine are recorded in the repository alongside the earlier baselines"
                ],
                hints: [
                    "A ten minute run and a ten second run measure different things; the long one includes the garbage collector."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "testing"
            }
        ]
    },
    {
        name: "Hold up when things break",
        goal: "The service behaves predictably when Redis fails, clocks drift and traffic spikes, and it ships with a client, metrics and a runbook.",
        duration: "1 week",
        tasks: [
            {
                title: "Decide and implement the failure policy",
                description: [
                    "When Redis is unreachable, the service still has to answer within its timeout. Whether it answers allow or deny is a policy decision, and it differs per rule.",
                    "Fail open protects your callers. Fail closed protects whatever sits behind you. Both are right somewhere, which is why the choice belongs on the rule."
                ],
                criteria: [
                    "With Redis unreachable the service returns a decision within the configured timeout rather than hanging",
                    "The failure behaviour is configurable per rule as fail open or fail closed, with the default written down and justified",
                    "A circuit breaker stops hammering a dead Redis and closes again within thirty seconds of it returning",
                    "Every decision made under the failure policy is counted in a metric so the blast radius is knowable afterwards"
                ],
                hints: [
                    "A service that retries a dead dependency on every request is slower than one that refuses immediately, and no more available."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Survive clock skew between instances",
                description: [
                    "The timestamps written into the window come from some machine's clock. With several instances, that is several clocks, and they disagree.",
                    "A clock moving backwards is the case to be careful about, because the naive implementation hands the caller extra quota for free."
                ],
                criteria: [
                    "Two instances whose clocks differ by half a second produce a combined allowance within a stated tolerance of the quota",
                    "An instance whose clock is further than the configured tolerance from Redis logs a warning and increments a metric",
                    "A clock moving backwards grants no extra quota, proven by a test that moves the injected clock backwards"
                ],
                hints: [
                    "Deciding whose clock is authoritative removes the problem rather than bounding it; the trade is one more round trip or one more argument.",
                    "A monotonic clock for elapsed time and a wall clock for window boundaries are different needs and mixing them causes exactly this bug."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Instrument it",
                description: [
                    "Allowed and refused counts per rule, decision latency as a histogram, Redis error rate and local cache hit rate. Enough to answer which rule is refusing traffic right now without reading logs.",
                    "The cardinality trap is close by. A label carrying the caller key will take the metrics system down long before the rate limiter fails."
                ],
                criteria: [
                    "Metrics report allowed and refused counts per rule, decision latency as a histogram, Redis error rate and local cache hit rate",
                    "A dashboard or a saved set of queries answers which rule is refusing the most traffic at any moment",
                    "Adding the metrics does not move p99, verified by re-running the sprint three benchmark",
                    "No metric carries a label whose cardinality grows with the number of callers"
                ],
                hints: [
                    "Aggregate by rule, never by caller; the per-caller question is a logging question with sampling."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Run the chaos tests",
                description: [
                    "Kill Redis mid-run. Restart it empty. Add a hundred milliseconds of latency to every Redis call. Each of those has a defined correct behaviour by now, and this task is where you find out whether it happens.",
                    "A proxy that can inject latency and cut connections is easier to control than stopping a container, and it can do it in the middle of a run."
                ],
                criteria: [
                    "Killing Redis during a load run produces the configured failure behaviour with no panics and no leaked goroutines",
                    "Restarting Redis empty allows a refused caller no more than their quota over the following window, and the deviation is measured and stated",
                    "Injecting a hundred milliseconds of Redis latency leaves p99 bounded by the configured timeout rather than unbounded",
                    "Each scenario is scripted so it can be re-run after any change"
                ],
                hints: [
                    "Check the goroutine count before and after; a leak under failure is the bug that only shows up after a week of uptime."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "testing"
            },
            {
                title: "Ship it with a client and a runbook",
                description: [
                    "A small Go client that makes a check in one call and applies the failure policy on the caller's side, plus a runbook for the four things that will go wrong.",
                    "The fourth runbook entry is the one you will actually be asked for: a caller wants to know why they were refused at a particular moment. Make sure the logs can answer that without a code change."
                ],
                criteria: [
                    "A client package makes a check in one call and handles the failure policy without the caller writing it themselves",
                    "A runbook covers Redis being down, a latency spike, a rule refusing everything, and a caller asking why they were refused, one paragraph each",
                    "One command deploys the service and a fresh instance passes the sprint three benchmark before it is given traffic",
                    "The deployment runs at least two instances and losing one does not change the enforced quota"
                ],
                hints: [
                    "Sampling refused decisions into a log with the rule, the key and the remaining quota answers the fourth runbook entry cheaply.",
                    "A client that retries a refusal is a client that turns a limit into an outage; document that it must not."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "deploy"
            }
        ]
    }
]

export default sprints
