import type { SeedSprint } from "./types"

// Building a small logs, metrics and traces stack teaches the thing that using a
// hosted one hides: every design choice is about what you refuse to keep. Sprint 1
// gets telemetry from a demo app into storage, sprint 2 makes it queryable, sprint 3
// is cardinality and retention, and sprint 4 is what happens under load.
const sprints: SeedSprint[] = [
    {
        name: "From a demo app into storage",
        goal: "A running demo app emits logs, metrics and traces that land in your own database and can be read back.",
        duration: "1 week",
        tasks: [
            {
                title: "Build a demo app worth observing",
                description: [
                    "Write a small service with a few endpoints that do interesting things: one fast, one that calls two downstream functions in sequence, one that is slow for a small fraction of requests, and one that fails about 2% of the time.",
                    "A demo app where everything succeeds in 5ms teaches nothing. The deliberate long tail and the deliberate error rate are what the rest of the project exists to find.",
                ],
                criteria: [
                    "The service exposes at least 4 endpoints and runs with a single command.",
                    "A load script can drive it at a configurable request rate for a configurable duration.",
                    "Over 1000 requests the error endpoint fails between 1% and 3% of the time, and the slow endpoint shows a visible tail above its median.",
                ],
                hints: [
                    "Make the slowness and the failure rate configurable at startup, because you will want to change them while testing sampling later.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour 30 minutes",
                category: "setup",
            },
            {
                title: "Instrument it with OpenTelemetry",
                description: [
                    "Add the OpenTelemetry SDK to the demo app so it produces spans for incoming requests and for the downstream calls, log records with the active trace context attached, and a couple of metrics such as request count and duration.",
                    "Export to the console first. Read the raw output carefully before you write anything that stores it, because the shape of a resource, a scope, a span and an attribute is the shape everything downstream has to handle.",
                ],
                criteria: [
                    "One request produces a parent span and at least one child span sharing the same trace id.",
                    "A log line emitted during a request carries that request's trace id and span id.",
                    "The console exporter shows a histogram metric for request duration with a bucket layout you can name.",
                ],
                hints: [
                    "Automatic instrumentation gets you the HTTP spans free; the child spans you care about are the ones you add by hand.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "setup",
            },
            {
                title: "An ingest endpoint that accepts OTLP",
                description: [
                    "Write the receiver: an HTTP endpoint that accepts OTLP payloads for traces, metrics and logs, decodes them, and acknowledges. Point the demo app at it instead of the console.",
                    "Decide what the endpoint does with a payload it cannot parse, and what it returns when it is temporarily unable to store. Those two responses decide whether a client retries or throws data away, which makes them a design decision rather than an afterthought.",
                ],
                criteria: [
                    "The demo app configured with your endpoint as its OTLP target sends successfully with no exporter errors in its logs.",
                    "A malformed payload returns a 4xx and is not retried by the client, while a storage failure returns a 5xx that is.",
                    "The endpoint logs a count of spans, log records and metric points received per request.",
                ],
                hints: [
                    "OTLP over HTTP can be JSON or protobuf. Check which one your exporter is actually sending before debugging your parser.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "backend",
            },
            {
                title: "Store spans, logs and metric points",
                description: [
                    "Design the tables and write the receiver's data into them. Spans need a trace id, span id, parent id, name, start and end, status and attributes. Logs need a timestamp, severity, body and trace context. Metric points need a name, labels, a timestamp and a value.",
                    "The three signals have genuinely different write patterns and query patterns, and forcing them into one table to save effort is a decision you will pay for in sprint 2. Write down why you split them the way you did.",
                ],
                criteria: [
                    "A migration creates the tables and a 60-second load run stores every span the receiver counted, verified by comparing counts.",
                    "Inserts are batched: 1000 spans arriving together produce far fewer than 1000 statements.",
                    "Timestamps are stored in a single unit and timezone, stated in a comment, and a span's duration computed from storage matches the one the app reported.",
                ],
                hints: [
                    "Look at how attributes are stored: a JSON column is easy to write and awkward to index, and you will be indexing in sprint 2.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "data",
            },
            {
                title: "One query that proves the pipeline works",
                description: [
                    "Write a query and a tiny endpoint that takes a trace id and returns every span in it, ordered so a parent comes before its children, plus every log line recorded inside that trace.",
                    "This is the smallest thing that proves the whole chain: instrumentation, export, receive, store, read. Get it working before building anything prettier.",
                ],
                criteria: [
                    "Given a trace id taken from the demo app's own log output, the endpoint returns all spans of that trace and nothing from another trace.",
                    "The returned spans include each span's parent id, so the tree can be rebuilt without extra queries.",
                    "An unknown trace id returns an empty result and a 404 or 200 with an empty list, chosen deliberately and documented.",
                ],
                hints: [
                    "Ordering by start time is not the same as ordering parents before children. Decide which one the client needs.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
        ],
    },
    {
        name: "Make the data answerable",
        goal: "A person can open a trace, search logs, and plot a metric over a time range, all within a bounded query cost.",
        duration: "1 to 2 weeks",
        tasks: [
            {
                title: "A waterfall view for a single trace",
                description: [
                    "Render a trace as a waterfall: each span a bar positioned by its start offset and sized by its duration, indented by depth, with errors marked. Clicking a span shows its attributes.",
                    "Two details matter more than the styling: a span whose parent is missing because it was dropped still has to render somewhere, and a trace with 500 spans still has to be readable.",
                ],
                criteria: [
                    "A trace from the slow endpoint renders with bars whose widths are proportional to their durations against a stated total.",
                    "A span whose parent id is not present in the trace is rendered at the root with a visible orphan marker rather than disappearing.",
                    "A 500-span trace renders without freezing the browser tab.",
                ],
                hints: [
                    "Build the tree once from a flat list rather than searching the list for children while rendering.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "frontend",
            },
            {
                title: "Search logs and jump to the span",
                description: [
                    "Build log search over a time range with a text filter and a severity filter, and make each result link to the trace and span it happened inside.",
                    "The link between a log line and its span is the single most useful thing in a stack like this, and it only works if the trace context survived every hop from sprint 1.",
                ],
                criteria: [
                    "Searching for a string that appears in exactly 3 log lines returns exactly those 3.",
                    "A result carrying a trace id links to the waterfall with that span highlighted.",
                    "A search with no time range specified defaults to a bounded window rather than all of history, and says which window it used.",
                ],
                hints: [
                    "Every log query should have a time predicate. Consider making that impossible to forget at the query builder level.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "frontend",
            },
            {
                title: "Time series queries with a range and a step",
                description: [
                    "Implement a metrics query that takes a metric name, a set of label filters, a time range and a step, and returns evenly spaced points. Plot request rate and error rate from it.",
                    "Counters go up and reset when a process restarts. Turning a counter into a rate without producing a huge negative spike at every restart is the real work here.",
                ],
                criteria: [
                    "Querying request count over 10 minutes with a 30-second step returns exactly 20 points, evenly spaced, including empty buckets.",
                    "Restarting the demo app mid-window produces no negative rate in the result.",
                    "A range with no data returns points with an explicit no-data marker rather than zeros.",
                ],
                hints: [
                    "Zero and no data are different answers and rendering them the same way misleads whoever is reading the chart at 3am.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "backend",
            },
            {
                title: "Index labels so queries do not scan everything",
                description: [
                    "Filtering by a label such as endpoint or status currently reads every row in the range. Build the index that makes label lookup cheap, and measure the difference on a realistic amount of data.",
                    "This is where the storage decision from sprint 1 gets judged. If attributes are an opaque blob, you will discover here what that costs.",
                ],
                criteria: [
                    "With at least 5 million stored metric points, a query filtered by one label returns in under 1 second.",
                    "EXPLAIN shows the label filter using an index rather than a sequential scan.",
                    "Query time before and after the index is recorded in the repo with both numbers.",
                ],
                hints: [
                    "Look at how a separate series table, keyed by the label set, changes the shape of this problem.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "data",
            },
            {
                title: "Put a hard cost limit on the query API",
                description: [
                    "Give every query a maximum range, a maximum number of returned points and a timeout, and return a clear error naming the limit that was hit rather than running for two minutes.",
                    "One unbounded query from a dashboard that someone left open is the classic way a stack like this falls over. The limit is not a nicety, it is the availability strategy.",
                ],
                criteria: [
                    "A query spanning 90 days is refused with an error that names the maximum range.",
                    "A query that would return more than the point limit is refused or automatically coarsened, and the response states which happened.",
                    "A query exceeding the timeout is cancelled at the database, verified by checking that no query keeps running after the response is sent.",
                ],
                hints: [
                    "Cancelling the HTTP request does not by itself cancel the query behind it. Find out what does in your driver.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "backend",
            },
        ],
    },
    {
        name: "Cardinality and retention",
        goal: "The stack knows how much unique data it is storing, refuses the labels that would explode it, and keeps old data cheaply rather than completely.",
        duration: "1 to 2 weeks",
        tasks: [
            {
                title: "Measure the cardinality you already have",
                description: [
                    "Build a page that answers: how many distinct time series exist, which metric names contribute most of them, and which labels have the most distinct values. Add a user id or a request id label to the demo app temporarily and watch the number move.",
                    "Nobody intends to store a million series. It happens because one label turned out to be unique per request, and until you can see that, you cannot argue about it.",
                ],
                criteria: [
                    "The page reports the total distinct series count and the top 10 labels by distinct value count.",
                    "Adding a per-request unique label to one metric and running 10,000 requests makes the reported series count rise by roughly 10,000.",
                    "Removing that label and waiting for retention brings the count back down, with the delay documented.",
                ],
                hints: [
                    "Counting distinct label sets exactly on every page load is itself an expensive query. Think about where that count should come from.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "data",
            },
            {
                title: "Decide the label policy and write it down",
                description: [
                    "Produce a short policy document: which labels are allowed on metrics, which attributes are allowed on spans, which are dropped at ingest, and what the per-metric series budget is. Give a reason for each entry, not just a list.",
                    "This is the decision the project is really about. Say explicitly what a developer should do when they need per-user detail, because the answer is that it belongs on a span or a log line and not on a metric label.",
                ],
                criteria: [
                    "The document lists the allowed metric labels with a bounded expected value count for each.",
                    "It states the per-metric series budget as a number, and what happens when a metric exceeds it.",
                    "It names at least three attributes that are deliberately dropped and gives the reason for each.",
                ],
                hints: [
                    "Check every label against one question: how many distinct values can this have at its worst, not at its typical.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "data",
            },
            {
                title: "Enforce the policy at ingest",
                description: [
                    "Implement the limiter in the receiver: drop disallowed labels, truncate oversized attribute values, and when a metric exceeds its series budget, stop creating new series for it and record that it is being limited.",
                    "Dropping silently is worse than not dropping. Every drop has to be counted and attributable, so that the person whose data vanished can find out why.",
                ],
                criteria: [
                    "A metric point carrying a disallowed label is stored with that label removed, and a drop counter for that label increases.",
                    "A metric that exceeds its series budget stops creating new series while continuing to accept points for series it already has.",
                    "The drop counters are queryable by label name and by metric name, and are non-zero after a deliberate violation test.",
                    "An attribute value longer than the configured maximum is truncated and marked as truncated rather than stored in full.",
                ],
                hints: [
                    "Deciding which existing series to keep when the budget is hit is a policy question. First seen is defensible; pick something and say why.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Tail-based sampling for traces",
                description: [
                    "Keeping every span is expensive and keeping a random 1% loses exactly the traces worth having. Buffer spans per trace briefly, then decide: keep everything that errored or exceeded a latency threshold, and sample the rest.",
                    "The hard parts are the buffer window, what happens to a trace whose spans arrive after the decision was made, and making sure a sampled-out trace is not kept half complete.",
                ],
                criteria: [
                    "Over a run of 10,000 requests, 100% of traces containing an error are stored.",
                    "Successful fast traces are stored at the configured rate, within a stated tolerance of it.",
                    "No stored trace is partial: either all its buffered spans are kept or none are, verified by checking for traces with a missing root span.",
                    "The sampling decision and its reason are recorded per kept trace.",
                ],
                hints: [
                    "The buffer is a bounded amount of memory holding a bounded window. Work out what it does when both bounds are reached at once.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Retention tiers and a downsampler",
                description: [
                    "Define how long raw data lives and what replaces it: raw points for a short window, rolled up to a coarser step for longer, and deleted after that. Run the rollup and the deletion on a schedule.",
                    "Say what is lost at each tier. Rolled-up data cannot answer questions about individual requests, and a user who does not know that will trust a chart they should not.",
                ],
                criteria: [
                    "Raw metric points older than the configured raw window are gone, and a rolled-up series covering the same period exists.",
                    "A query spanning both windows returns a continuous series and marks which parts came from rolled-up data.",
                    "Running the rollup twice over the same period does not double any value.",
                    "Total stored bytes are recorded before and after a rollup run.",
                ],
                hints: [
                    "Averaging an average over a longer window is usually wrong. Look at what has to be stored alongside a rollup for it to be re-aggregatable.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "data",
            },
        ],
    },
    {
        name: "Hold up under load",
        goal: "The stack degrades predictably under a burst, alerts on its own data, and can be deployed with a known disk budget.",
        duration: "1 week",
        tasks: [
            {
                title: "Backpressure and a bounded ingest queue",
                description: [
                    "Put a bounded queue between the receiver and the writer. When the writer falls behind, the queue fills, and the receiver has to decide: reject with a retryable status, or drop the oldest data.",
                    "An unbounded queue is not a solution, it is a delayed crash with the memory graph to prove it. Whichever you choose, the choice has to be visible in a metric.",
                ],
                criteria: [
                    "Under a burst of 10x normal rate, the process memory stays below a stated ceiling rather than growing until it is killed.",
                    "When the queue is full the receiver returns a retryable status and a counter of rejected batches increases.",
                    "After the burst ends the queue drains and ingest returns to normal without a restart.",
                ],
                hints: [
                    "Measure what your writer can actually sustain per second before choosing the queue size, otherwise the number is decoration.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "backend",
            },
            {
                title: "Alert rules evaluated on the rollups",
                description: [
                    "Add rules that run on a schedule: error rate above a threshold for 5 minutes, p95 latency above a threshold, and ingest stopped entirely. Firing writes an alert record with the value that triggered it.",
                    "The third rule is the one people forget. A stack that goes quiet looks identical to a system with no problems, which is the worst failure mode a monitoring tool can have.",
                ],
                criteria: [
                    "Raising the demo app's error rate above the threshold fires an alert within one evaluation interval plus the configured duration.",
                    "Stopping the demo app entirely fires the no-data alert rather than resolving the error rate alert to healthy.",
                    "An alert record stores the rule, the triggering value and the time, and resolves automatically when the condition clears.",
                ],
                hints: [
                    "A rule that fires on a single bad sample will fire constantly. Look at why real alerting requires a condition to hold for a duration.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Load test with a recorded burst",
                description: [
                    "Record a realistic traffic pattern, replay it at several multiples of the original rate, and write down where each part of the system stops keeping up: the receiver, the writer, the database or the query API.",
                    "The goal is a number you can quote: sustained spans per second on this hardware, with this much storage used per hour at that rate.",
                ],
                criteria: [
                    "The repo records sustained ingest rate in spans per second, bytes stored per hour at that rate, and p95 query latency under it.",
                    "The first component to saturate is named, with the measurement that identifies it.",
                    "Data loss during the replay is reported as an exact count, with zero being a legitimate result only if proven by comparing sent and stored counts.",
                ],
                hints: [
                    "Compare counters at the sender and the store rather than trusting either one on its own.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "testing",
            },
            {
                title: "Make the stack observe itself",
                description: [
                    "Emit your own telemetry: spans received, points written, batches rejected, series dropped by label, queue depth, writer latency. Put it on one page that answers the question of whether the stack is currently healthy.",
                    "Every drop introduced in sprint 3 should be visible here. A stack that quietly discards data and reports nothing is indistinguishable from one that is working.",
                ],
                criteria: [
                    "The self-telemetry page shows current queue depth, ingest rate and drop counts broken down by reason.",
                    "Triggering each drop reason in turn makes the corresponding counter move, verified once for each.",
                    "The self-telemetry is stored through the same pipeline as everything else, or the reason it is not is documented.",
                ],
                hints: [
                    "Think about what happens if the stack's own telemetry is dropped by its own limiter, and decide whether it deserves an exemption.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "backend",
            },
            {
                title: "Deploy with a disk budget and a runbook",
                description: [
                    "Deploy the receiver, the store and the query UI, point the demo app at the deployed receiver, and size the disk from the bytes per hour you measured rather than from a guess.",
                    "Finish with a short runbook: what to do when the disk is 80% full, when ingest stops, and when a query is slow. Include the retention settings and what each one costs.",
                ],
                criteria: [
                    "The deployed receiver accepts telemetry from the demo app running outside its network.",
                    "The repo states the provisioned disk size and the measured days of retention it buys at the measured ingest rate.",
                    "The runbook covers at least three failure cases with a concrete first step for each, and the retention job is proven to run on the deployed instance.",
                ],
                hints: [
                    "Retention that only runs when someone remembers to trigger it is not retention. Check that the schedule survives a restart.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "deploy",
            },
        ],
    },
]

export default sprints
