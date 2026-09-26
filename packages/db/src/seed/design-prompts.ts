import type { DesignRubricCriterion } from "../schema/hiring-rounds"

/**
 * ShipItHQ's system design prompts (plan/hiring-rounds HR-4). Rounds draw one
 * per attempt; the SDE-1 pipelines draw from EASY and MEDIUM. Seeded by
 * `pnpm script seed-pipelines`. Keys are stable: never rename one, because past
 * attempts reference the row.
 *
 * Every rubric's weights sum to 100. The scorer (HR-16) is given `lookFor` as
 * the bar for each criterion, and the student sees it in their feedback, so it
 * says what a strong answer shows, not a model answer.
 */

export type DesignDifficulty = "EASY" | "MEDIUM" | "HARD"

export interface DesignPromptSeed {
    key: string
    title: string
    difficulty: DesignDifficulty
    prompt: string
    rubric: DesignRubricCriterion[]
}

const c = (criterion: string, weight: number, lookFor: string): DesignRubricCriterion => ({ criterion, weight, lookFor })

export const DESIGN_PROMPTS: DesignPromptSeed[] = [
    // ── EASY ────────────────────────────────────────────────────────────────
    {
        key: "design-url-shortener",
        title: "Design a URL shortener",
        difficulty: "EASY",
        prompt: `Design a service like bit.ly. A user submits a long URL and gets a short link; opening the short link redirects to the original.

Scale: 1 million new links a day, 100 redirects for every link created. Links never expire unless the owner deletes them.

Cover: the API, how short codes are generated, the data model, and how redirects stay fast.`,
        rubric: [
            c("Requirements and scope", 15, "States the read-heavy ratio, estimates storage and requests per second, and asks about custom aliases and expiry before designing."),
            c("API and data model", 20, "A create endpoint and a redirect endpoint (301 or 302, with the trade-off for analytics), and a table keyed by short code."),
            c("Short code generation", 25, "A concrete scheme (base62 of a counter or ID, or a hash with collision handling) and why the code length is enough for the volume."),
            c("Read path and caching", 25, "A cache in front of the store for hot codes, and a note on what happens on a cache miss or a deleted link."),
            c("Trade-offs", 15, "Names at least one weakness of the chosen design (guessable codes, a single counter) and how to address it."),
        ],
    },
    {
        key: "design-pastebin",
        title: "Design a text-sharing service",
        difficulty: "EASY",
        prompt: `Design a service like Pastebin. A user pastes text (up to 1 MB), chooses public or unlisted and an optional expiry, and gets a link to share.

Scale: 200,000 new pastes a day, each read about 5 times on average; most reads happen in the first day.

Cover: the API, where the text is stored, how expiry works, and how reads are served.`,
        rubric: [
            c("Requirements and scope", 15, "Estimates daily storage and read traffic, and separates metadata from the paste body."),
            c("API and data model", 20, "Create and read endpoints; a metadata record (id, visibility, expiry, size) apart from the content."),
            c("Storage choice", 25, "Puts large bodies in object storage (or explains why a database row is fine at this size), with the reasoning."),
            c("Expiry and cleanup", 20, "A clear mechanism: expiry checked on read, plus a background sweep or storage lifecycle rule."),
            c("Read path and trade-offs", 20, "Caching or a CDN for fresh, popular pastes, and one trade-off it accepts."),
        ],
    },
    {
        key: "design-game-leaderboard",
        title: "Design a game leaderboard",
        difficulty: "EASY",
        prompt: `Design the leaderboard for a mobile quiz game. Players finish a quiz and submit a score; the app shows the global top 100 and the player's own rank.

Scale: 5 million players, 20 million score submissions a day, a player's best score counts. The leaderboard resets every week.

Cover: the API, how scores are stored and ranked, how "my rank" is answered quickly, and the weekly reset.`,
        rubric: [
            c("Requirements and scope", 15, "Clarifies best score versus latest, estimates writes per second, and notes that reads of the top 100 dominate."),
            c("API and data model", 20, "Submit-score and get-leaderboard endpoints, and where a player's best score lives."),
            c("Ranking structure", 30, "A structure that answers top-N and a single rank fast (a sorted set or equivalent), not a full sort per request."),
            c("Weekly reset", 15, "A reset that does not block reads: a new key or table per week, with the old one archived."),
            c("Trade-offs", 20, "What happens under a write spike, and one consistency or accuracy trade-off stated plainly."),
        ],
    },
    {
        key: "design-parking-booking",
        title: "Design a parking spot booking system",
        difficulty: "EASY",
        prompt: `Design the backend for booking parking spots in office buildings. An employee picks a building, a date and a time window, and books a free spot; they can cancel until the window starts.

Scale: 300 buildings, 50,000 bookings a day, and a rush every morning at 9.

Cover: the API, the data model, and how the system stops two people booking the same spot for overlapping times.`,
        rubric: [
            c("Requirements and scope", 15, "Pins down time granularity, cancellation rules and the morning peak."),
            c("API and data model", 25, "Search, book and cancel endpoints; spots, buildings and bookings with time ranges."),
            c("No double booking", 30, "A real guarantee against overlaps: a constraint, a lock or a conditional write, and why a check-then-insert alone is not enough."),
            c("Handling the peak", 15, "How search stays fast at 9 am (indexes, caching availability) without showing spots that are already taken."),
            c("Trade-offs", 15, "One trade-off named, such as holding a spot for a few minutes during checkout."),
        ],
    },

    // ── MEDIUM ──────────────────────────────────────────────────────────────
    {
        key: "design-news-feed",
        title: "Design a social news feed",
        difficulty: "MEDIUM",
        prompt: `Design the home feed for a social app. Users follow other users; the feed shows posts from people they follow, newest first, with infinite scroll.

Scale: 50 million daily users, 10 million new posts a day. Most users follow under 500 people, but a few accounts have 10 million followers.

Cover: the API, how a feed is built (on write, on read, or both), storage, and how celebrity accounts are handled.`,
        rubric: [
            c("Requirements and scope", 10, "Estimates feed reads versus post writes and asks about ranking versus pure time order."),
            c("API and data model", 15, "Post, follow and get-feed endpoints with cursor pagination; posts, follows and feed entries modelled."),
            c("Feed generation", 30, "Compares fan-out on write with fan-out on read and chooses, with the cost of each at this scale."),
            c("Celebrity problem", 20, "A hybrid: very large accounts are merged in at read time instead of fanned out to millions of feeds."),
            c("Scaling and caching", 15, "Feed caches per user, sharding by user, and what happens when a cache is cold."),
            c("Trade-offs", 10, "States the consistency the design accepts (a post may appear seconds late) and why that is fine."),
        ],
    },
    {
        key: "design-chat",
        title: "Design one-to-one chat",
        difficulty: "MEDIUM",
        prompt: `Design one-to-one messaging like the chat in a delivery app: text messages, delivered and read receipts, and history on every device a user signs in on.

Scale: 20 million daily users, 500 million messages a day. Users often have bad mobile connections.

Cover: how clients connect, how a message travels from sender to receiver, storage of history, and receipts.`,
        rubric: [
            c("Requirements and scope", 10, "Estimates messages per second and storage, and asks about ordering and offline users."),
            c("Connection model", 20, "Persistent connections (WebSockets or similar), how the server knows which gateway holds a user, and reconnects."),
            c("Message flow and delivery", 25, "Store first, then deliver; offline users get messages on reconnect or by push; retries without duplicates (a client message id)."),
            c("Storage and history", 20, "A store partitioned by conversation, ordered within a conversation, and sync to a new device."),
            c("Receipts", 10, "Delivered and read states as small updates, not rewrites of the message."),
            c("Trade-offs", 15, "Ordering guarantees, what happens during a gateway failure, and one thing deliberately left out."),
        ],
    },
    {
        key: "design-ride-matching",
        title: "Design driver matching for a ride-hailing app",
        difficulty: "MEDIUM",
        prompt: `Design how a ride-hailing app finds a driver. Drivers send their location every 4 seconds; a rider requests a ride and should be offered to the nearest available driver within seconds.

Scale: 1 million active drivers at peak, 200,000 ride requests an hour, across 50 cities.

Cover: how locations are ingested and stored, how nearby drivers are found, and how one driver is never assigned two rides.`,
        rubric: [
            c("Requirements and scope", 10, "Estimates location updates per second and clarifies what 'nearest' means (distance or arrival time)."),
            c("Location ingestion", 20, "A write path that absorbs 250,000 updates a second, keeping only the latest location in memory, not a row per update."),
            c("Nearby search", 25, "A spatial index (geohash, quadtree or H3 cells) and how a search widens when no driver is close."),
            c("Assignment without conflicts", 25, "Offering to one driver at a time with a timeout, and an atomic claim so a driver cannot accept two rides."),
            c("Scaling", 10, "Partitioning by city or cell so no single node holds everything."),
            c("Trade-offs", 10, "Staleness of locations and fairness between drivers, stated plainly."),
        ],
    },
    {
        key: "design-notification-service",
        title: "Design a notification service",
        difficulty: "MEDIUM",
        prompt: `Design a service other teams call to send notifications by push, email and SMS. Callers send a user id, a template and data; users have per-channel preferences and quiet hours.

Scale: 100 million notifications a day, with bursts of 5 million in a few minutes for a marketing campaign. Providers (email, SMS) rate-limit you and sometimes fail.

Cover: the API, the pipeline from request to delivery, preferences, and retries.`,
        rubric: [
            c("Requirements and scope", 10, "Separates transactional from marketing traffic and estimates peak throughput."),
            c("API and pipeline", 25, "Accept quickly and enqueue; workers per channel; a queue that absorbs bursts."),
            c("Preferences and quiet hours", 15, "Checked before sending, with deferred delivery for quiet hours rather than dropping."),
            c("Retries and provider limits", 25, "Backoff, a dead-letter path, rate limiting per provider, and idempotency so a retry does not send twice."),
            c("Priorities", 10, "Transactional messages (an OTP) are not stuck behind a marketing campaign."),
            c("Trade-offs", 15, "Delivery guarantees (at least once, and how duplicates are limited) and observability of failures."),
        ],
    },
    {
        key: "design-web-crawler",
        title: "Design a web crawler",
        difficulty: "MEDIUM",
        prompt: `Design a crawler that fetches pages for a search engine. It starts from a list of seed URLs, follows links, and stores each page's content for indexing.

Scale: 1 billion pages a month. It must respect robots.txt, not overload any single site, and avoid fetching the same page twice.

Cover: the URL frontier, fetching, deduplication, and politeness.`,
        rubric: [
            c("Requirements and scope", 10, "Estimates pages per second and storage, and asks about recrawl frequency."),
            c("URL frontier", 25, "Queues with priority and per-host politeness, not one global FIFO."),
            c("Politeness and robots.txt", 20, "Cached robots rules per host and a delay per host, so one site is never hammered."),
            c("Deduplication", 20, "URL normalisation plus a seen-set (a Bloom filter or similar), and content hashing for mirrored pages."),
            c("Scaling fetchers", 15, "Distributed fetch workers partitioned by host, DNS caching, and handling of slow or hostile sites."),
            c("Trade-offs", 10, "Freshness against coverage, and one failure mode named (crawler traps)."),
        ],
    },
    {
        key: "design-api-rate-limiter",
        title: "Design an API rate limiter",
        difficulty: "MEDIUM",
        prompt: `Design a rate limiter that sits in front of a public API. Each API key gets a limit (for example 1,000 requests a minute), and requests over the limit get a 429 with a retry hint.

Scale: 200,000 requests a second across 40 API servers. The limiter must add under 5 ms.

Cover: the algorithm, where counters live, how it stays correct across 40 servers, and what happens when the counter store is down.`,
        rubric: [
            c("Requirements and scope", 10, "Clarifies limits per key or per user, burst tolerance, and the latency budget."),
            c("Algorithm", 25, "Chooses among fixed window, sliding window and token bucket, with the burst behaviour of each."),
            c("Shared counters", 25, "A central fast store with atomic increments (or a script), and why local counters alone are wrong across 40 servers."),
            c("Latency and scale", 15, "Keeps the check in the latency budget: one round trip, pipelining, or local pre-allowance."),
            c("Failure handling", 15, "A decided behaviour when the store is down (fail open or closed), and why."),
            c("Response contract", 10, "429 with Retry-After and remaining-quota headers."),
        ],
    },

    // ── HARD ────────────────────────────────────────────────────────────────
    {
        key: "design-video-streaming",
        title: "Design a video streaming platform",
        difficulty: "HARD",
        prompt: `Design a platform where creators upload videos and viewers stream them on phones and laptops, like a smaller YouTube.

Scale: 500,000 uploads a day, 100 million views a day, viewers on networks from 2G to fibre. A popular video can get 5 million views in its first hour.

Cover: the upload and processing pipeline, how video is delivered and adapts to the viewer's network, metadata and view counts, and the first-hour spike.`,
        rubric: [
            c("Requirements and scope", 10, "Estimates storage per day and egress bandwidth, and separates the upload and watch paths."),
            c("Upload and processing", 20, "Resumable uploads to object storage, then an asynchronous transcoding pipeline into several resolutions."),
            c("Delivery", 25, "Segmented adaptive streaming (HLS or DASH) served through a CDN, and how the player switches quality."),
            c("Metadata and counts", 15, "Metadata in a database; view counts aggregated asynchronously, not a row update per view."),
            c("Spikes and scaling", 20, "Pre-warming or pushing popular segments to the CDN, and protecting the origin from a thundering herd."),
            c("Trade-offs", 10, "Cost of storing many renditions against quality, and one decision made for cost."),
        ],
    },
    {
        key: "design-payments-ledger",
        title: "Design a payments ledger",
        difficulty: "HARD",
        prompt: `Design the ledger for a wallet app: users add money, pay merchants and send money to friends. Every rupee must be accounted for, and balances must never go negative.

Scale: 30 million users, 2,000 payments a second at peak. Clients retry on timeouts, and the bank partner's API is slow and sometimes returns an unknown status.

Cover: the data model, how a payment is recorded, how retries are made safe, and how you reconcile with the bank.`,
        rubric: [
            c("Requirements and scope", 10, "States the correctness bar (no lost or double money) above latency, and the peak rate."),
            c("Ledger model", 25, "Double-entry: immutable entries that debit one account and credit another, with balances derived or updated in the same transaction."),
            c("Atomicity and no negative balance", 20, "A transaction or conditional update that checks the balance and writes the entries together."),
            c("Idempotency", 20, "An idempotency key per client request, stored with the result, so a retry returns the first outcome."),
            c("External bank and reconciliation", 15, "Pending states for unknown outcomes, status polling, and a daily reconciliation against the bank's report."),
            c("Trade-offs", 10, "Hot accounts (a big merchant) and how writes to one account are kept from becoming a bottleneck."),
        ],
    },
]

/** Problems with the prompts, as readable lines. Empty means seedable. */
export function validateDesignPrompts(prompts: DesignPromptSeed[] = DESIGN_PROMPTS): string[] {
    const problems: string[] = []
    const keys = new Set<string>()
    for (const p of prompts) {
        if (!/^design-[a-z0-9-]+$/.test(p.key)) problems.push(`${p.key}: key must look like design-<slug>`)
        if (keys.has(p.key)) problems.push(`${p.key}: duplicate key`)
        keys.add(p.key)
        if (p.prompt.length < 200) problems.push(`${p.key}: prompt is too short to design against`)
        const total = p.rubric.reduce((n, r) => n + r.weight, 0)
        if (total !== 100) problems.push(`${p.key}: rubric weights sum to ${total}, not 100`)
        if (p.rubric.length < 4) problems.push(`${p.key}: rubric needs at least 4 criteria`)
        const text = JSON.stringify(p)
        if (/[\u2013\u2014]/.test(text)) problems.push(`${p.key}: contains an em or en dash`)
    }
    return problems
}
