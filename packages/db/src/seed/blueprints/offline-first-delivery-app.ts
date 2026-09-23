import type { SeedSprint } from "./types"

// Offline-first is not caching: it is deciding that the local database is the
// truth and the server is a peer you reconcile with later. Sprint 1 builds the
// online courier app so there is a working baseline, sprint 2 inverts it so
// every read and write goes to local storage first, sprint 3 is the hard part of
// syncing a queue against a server that changed meanwhile, and sprint 4 handles
// the failures that only appear on a real phone on a real round.
const sprints: SeedSprint[] = [
    {
        name: "A courier app that works online",
        goal: "A courier can log in, see the day's stops in order, and mark a delivery complete against a real server.",
        duration: "1 week",
        tasks: [
            {
                title: "Model rounds, stops and delivery events",
                description: [
                    "Design the server schema. A round is a courier's day, a stop is one address on it, and a delivery event records what happened there: delivered, refused, nobody in, address not found. Events are append only.",
                    "Making events append only rather than mutating a status column is the decision that makes the rest of the project possible. Two devices can both append; they cannot both set."
                ],
                criteria: [
                    "A stop's current status is derived from its events rather than stored on the stop row.",
                    "Two events appended to the same stop in either order produce the same derived status when the ordering rule is applied.",
                    "Every event carries the device that created it and the time it was created on that device, separately from when the server received it."
                ],
                hints: [
                    "The device clock and the server clock will disagree, sometimes by hours. Storing both is cheaper than deciding now which one wins.",
                    "An event id generated on the device, not the server, is what will make retries safe in sprint 3."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Build the API for fetching a round and posting events",
                description: [
                    "Two endpoints to start with: fetch today's round with its stops, and append a delivery event. Both authenticated as a courier, and the event endpoint must reject events for stops on someone else's round.",
                    "Keep the response shapes small. This payload will be fetched over a patchy mobile connection and stored on the device, so every field you add is a field you have to keep in sync."
                ],
                criteria: [
                    "Fetching a round returns its stops in the planned delivery order, and the same request twice returns the same order.",
                    "Posting an event for a stop belonging to another courier returns a 403 and writes nothing.",
                    "Posting the same event id twice creates one event, not two, and the second call returns success rather than an error."
                ],
                hints: [
                    "That second-post behaviour is idempotency, and building it in now is far easier than retrofitting it around a retry loop later.",
                    "Include a version or updated timestamp on every record you return. Sprint 3 needs something to compare against."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Build the round view and the stop screen",
                description: [
                    "The courier's main screen is the list of stops with address, status and sequence. Tapping one opens the stop, showing the parcel details and the actions available. Build it for one hand on a phone in the rain.",
                    "Interface decisions here are constraints, not decoration: targets that can be hit while walking, text readable in sunlight, and no action that needs two hands."
                ],
                criteria: [
                    "Every interactive target on the stop screen is at least 44 by 44 CSS pixels.",
                    "The round list renders 120 stops with no visible scroll jank on a mid-range device.",
                    "The current stop is identifiable without reading, by position and emphasis rather than by a colour alone."
                ],
                hints: [
                    "Test with the device font size turned up. Couriers are not all using the default.",
                    "Decide what the screen shows when the round is empty and when it is finished. Both happen every day."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "frontend"
            },
            {
                title: "Capture a proof of delivery",
                description: [
                    "Completing a delivery needs evidence: a photo of where the parcel was left, or a signature, plus an optional note. Capture it, compress it on the device, and attach it to the event.",
                    "A raw phone camera image is several megabytes. Sending that over a weak connection is how a round of 120 stops becomes a round that never syncs."
                ],
                criteria: [
                    "A captured photo is compressed to under 300 kilobytes before it leaves the device and is still legible enough to identify a doorstep.",
                    "A signature is captured as a drawn path and replays correctly at a different screen size.",
                    "The event and its proof are one unit: an event requiring proof cannot be created without it."
                ],
                hints: [
                    "Drawing the image to a canvas at a bounded dimension and re-encoding is the usual compression route. Check the orientation metadata survives it.",
                    "Storing the image inline in the event payload will hurt you in sprint 2. Think about the proof as a separate thing the event points at."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "frontend"
            },
            {
                title: "Install the app on a phone home screen",
                description: [
                    "Add the manifest and service worker registration so the app installs and launches standalone. The service worker does nothing useful yet beyond existing and caching the app shell.",
                    "Doing this now rather than at the end means you discover the update problem early: a service worker that serves a stale bundle forever is the classic way to ship an unfixable bug."
                ],
                criteria: [
                    "The app installs to the home screen on both Android and iOS and launches without browser chrome.",
                    "With the app shell cached, launching with the network disabled shows the shell rather than the browser's offline page.",
                    "Deploying a new version and reopening the app loads the new version within one relaunch, not after a manual cache clear."
                ],
                hints: [
                    "The update path is the part to test deliberately. Look at how a waiting worker is activated and what that does to open tabs.",
                    "iOS standalone mode has its own constraints on storage lifetime and on what happens when the app is backgrounded. Find them now."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "deploy"
            }
        ]
    },
    {
        name: "Make the device the source of truth",
        goal: "Every screen reads from local storage and every action writes to a local queue, so the app behaves identically with the network off.",
        duration: "1 week",
        tasks: [
            {
                title: "Mirror the round into a local database",
                description: [
                    "Store the round, its stops and their events in IndexedDB, and make every screen read from there rather than from the network. Fetching becomes a background job that updates local storage; the UI never waits on it.",
                    "This is the inversion the whole project turns on. Once the UI cannot see the network, an offline screen and an online screen are the same code path."
                ],
                criteria: [
                    "With the device in aeroplane mode from a cold launch, the round list and every stop screen render fully from local data.",
                    "No component in the codebase calls fetch directly: all network access goes through the sync layer.",
                    "A round fetched once and then opened with the network off shows identical content to the online render."
                ],
                hints: [
                    "Keep the local schema close to the server's but not identical: local rows need sync state that the server has no concept of.",
                    "A reactive query layer over IndexedDB avoids hand-wiring re-renders every time the sync layer writes."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Queue every write as a local mutation",
                description: [
                    "Actions become entries in a durable outbox: an operation type, a payload, a device-generated id, a created timestamp and an attempt count. Writing to the outbox and updating the local view happen together.",
                    "The outbox is the contract between the app and the network. Anything not in it is lost when the tab dies, and that includes the delivery the courier just recorded."
                ],
                criteria: [
                    "Completing a delivery in aeroplane mode adds exactly one outbox entry and updates the stop status on screen immediately.",
                    "Killing the app immediately after a delivery and relaunching still shows the outbox entry and the updated status.",
                    "Recording 50 deliveries offline produces 50 outbox entries in the order they were made."
                ],
                hints: [
                    "The local write and the outbox append must not be separately failable. Look at what a single IndexedDB transaction across two stores gives you.",
                    "Give each mutation a type discriminator now, so the sync loop can switch on it without parsing the payload."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "data"
            },
            {
                title: "Store proof images outside the queue",
                description: [
                    "Photos and signatures go into their own local store as blobs, with the outbox entry holding a reference. Uploading a proof is a separate step from posting its event.",
                    "Keeping megabytes out of the queue keeps the queue cheap to read, retry and inspect, and lets a large upload fail without blocking the small events behind it."
                ],
                criteria: [
                    "Twenty proof photos captured offline are stored as blobs and still render from local storage after a relaunch.",
                    "An outbox entry references its proof by id, and the queue can be read and re-ordered without loading any image data.",
                    "A proof whose event has synced and whose upload has completed is deleted from local storage, and local usage falls accordingly."
                ],
                hints: [
                    "IndexedDB stores blobs directly. Check what happens to a stored blob after the browser reclaims storage in the background.",
                    "Decide the deletion rule carefully: deleting a proof before the server has confirmed it loses evidence permanently."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Show connection and sync state honestly",
                description: [
                    "The courier needs to know what has reached the office and what has not. Show the connection state, the number of pending items and, per stop, whether its event is local only or confirmed.",
                    "The browser's online flag means the device has a network interface, not that your server is reachable. Captive portals and dead spots both report online."
                ],
                criteria: [
                    "A stop completed offline is visibly marked as pending and loses the mark within five seconds of connectivity returning.",
                    "Connected to a wifi network with no route to the server, the app reports itself offline rather than online.",
                    "The pending count matches the number of unsynced outbox entries exactly, including after a relaunch."
                ],
                hints: [
                    "Deriving connectivity from whether your own requests succeed is more truthful than the navigator flag, which is one input to it.",
                    "Avoid a state that says syncing forever. Every state needs a route out of it, including failure."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend"
            },
            {
                title: "Drain the queue when the connection returns",
                description: [
                    "Write the first version of the sync loop: take outbox entries oldest first, post each one, remove it on success, and back off on failure. No conflict handling yet, only delivery.",
                    "Getting the failure behaviour right matters more than the success path. A loop that retries a permanently rejected entry forever will sit there until the battery goes."
                ],
                criteria: [
                    "Recording 50 deliveries offline and then restoring the connection drains all 50 to the server with no duplicates and no losses.",
                    "An entry the server rejects with a 4xx is moved to a failed state after one attempt rather than retried indefinitely.",
                    "Retries after a 5xx back off increasingly rather than hammering the server at a fixed interval."
                ],
                hints: [
                    "Distinguish a rejection from a failure to arrive. They need opposite responses and the difference is in the status code.",
                    "Add jitter to the backoff. Every courier's phone regaining signal in the same depot at the same time is a real scenario."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            }
        ]
    },
    {
        name: "Reconcile with a changed server",
        goal: "A device that has been offline for hours merges its work with everything that changed on the server meanwhile, and the result is explainable.",
        duration: "1 week and a half",
        tasks: [
            {
                title: "Pull changes with a sync cursor",
                description: [
                    "Replace the full round fetch with an incremental pull: the device sends the point it last synced to, and the server returns everything that has changed since, including deletions.",
                    "The subtleties are all in the cursor. A timestamp cursor drops records written during the same second as the last sync, and a record deleted while the device was offline has to be represented by something rather than by absence."
                ],
                criteria: [
                    "A device offline for four hours pulls exactly the records that changed in those four hours, verified against a full fetch producing identical local state.",
                    "A stop removed from the round while the device was offline is removed locally rather than lingering.",
                    "Two pulls in the same second do not skip a record written between them."
                ],
                hints: [
                    "A monotonic server-assigned sequence avoids the same-timestamp problem that wall clocks have.",
                    "Deletions need a tombstone with a retention window. Decide how long, and what happens to a device offline for longer than that."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "backend"
            },
            {
                title: "Detect conflicts rather than overwriting",
                description: [
                    "When a pulled record has changed on the server and the device also has an unsynced change to it, that is a conflict. Detect it by comparing versions and record it instead of letting the last write win.",
                    "Last write wins is what a system does when nobody decided. Here the outcome is a parcel marked delivered by one person and returned to depot by another, and quietly discarding either is the wrong answer."
                ],
                criteria: [
                    "A stop reassigned to another courier while this device recorded a delivery on it produces a detected conflict, not a silent overwrite.",
                    "Detection is by version comparison, so a device that pulls a record it has not modified never produces a conflict.",
                    "Every detected conflict is stored with both versions and remains inspectable after a relaunch."
                ],
                hints: [
                    "Compare against the version the device last saw, not against the version it currently holds. Those differ exactly when it matters.",
                    "A conflict is a record in its own right. Treating it as an error to log means it disappears the moment the tab closes."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "data"
            },
            {
                title: "Resolve conflicts by rule and by asking",
                description: [
                    "Write the resolution policy per record type. Some conflicts have a right answer that needs no human: a cancelled stop beats an attempted delivery. Others, such as two different delivery outcomes, need the courier to choose.",
                    "The rule is that a delivery event already recorded is never deleted by a sync. It can be superseded, and the supersession is itself recorded."
                ],
                criteria: [
                    "A stop cancelled on the server while the device recorded nobody in resolves automatically to cancelled, with the local event preserved in the history.",
                    "A conflict with no automatic rule blocks on a prompt showing both versions, and the round stays usable while it waits.",
                    "No resolution path deletes a locally recorded delivery event or its proof."
                ],
                hints: [
                    "Write the policy down as a table of record type against conflict type before writing any code. The table is the specification.",
                    "Append-only events give you supersession for free: resolving a conflict is appending a decision, not editing the past."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Keep the queue ordered when entries depend on each other",
                description: [
                    "Some mutations depend on earlier ones: a proof upload needs its event to exist, and a correction to a delivery needs the original. A failed entry must not let its dependants through ahead of it.",
                    "Draining strictly in order is safe and slow, because one stuck entry blocks 40 unrelated ones. Draining in parallel is fast and wrong. The answer is in between."
                ],
                criteria: [
                    "An entry stuck on a repeatedly failing upload does not block unrelated entries for other stops from syncing.",
                    "A dependent entry never reaches the server before the entry it depends on, verified by the server rejecting none of a 50 entry replay.",
                    "Cancelling a stuck entry also cancels its dependants, and the courier is told which those are."
                ],
                hints: [
                    "Ordering per stop rather than globally is usually the right granularity. Think about what a dependency group means for this data.",
                    "An explicit dependency reference on the outbox entry beats inferring order from the timestamps."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Test sync against a scripted network",
                description: [
                    "Build a harness that can script connectivity: offline for a period, a connection that accepts requests but returns 500, a connection that drops mid-upload, and a server that changed while the device was away. Run the sync scenarios against it.",
                    "These failures cannot be reproduced by hand reliably, and they are the failures that matter. This harness is what lets sprint 4 be evidence rather than hope."
                ],
                criteria: [
                    "A scenario with 50 offline deliveries, a 30 second outage mid-drain and a concurrent server change ends with server state matching the expected state exactly.",
                    "A request that is received by the server but whose response is lost results in one record, not two, proving idempotency end to end.",
                    "The scenarios run in CI without a real network and fail when sync logic regresses."
                ],
                hints: [
                    "Intercepting at the sync layer's transport rather than at the network stack makes the harness much easier to control.",
                    "The lost-response case is the one that finds real bugs. Script it explicitly rather than hoping a flaky test catches it."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "testing"
            }
        ]
    },
    {
        name: "Survive a real round",
        goal: "The app holds up through a full day of dead spots, a killed process, a flat battery and a device handed to a different courier.",
        duration: "1 week",
        tasks: [
            {
                title: "Sync when the app is not in the foreground",
                description: [
                    "A courier locks the phone and walks to the next street. When signal returns, the queue should drain without them opening the app. Use the background sync capability where it exists and a foreground catch-up where it does not.",
                    "Support is uneven across platforms, so the design constraint is that background sync is a bonus and never the only path."
                ],
                criteria: [
                    "With the app backgrounded on a supporting platform, a queued delivery reaches the server without the app being reopened.",
                    "On a platform with no background sync, reopening the app drains the queue within five seconds with no user action.",
                    "Background and foreground drains cannot run at once and produce duplicates, verified by the scripted harness."
                ],
                hints: [
                    "The service worker and the page can both try to drain. A lock held in a place both can see is what stops them overlapping.",
                    "Check what iOS actually does with a backgrounded standalone app before designing around a promise it does not keep."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Upload proofs in resumable chunks",
                description: [
                    "A 300 kilobyte photo on a weak connection can fail at 90 per cent, repeatedly. Upload proofs in chunks that resume from where they stopped rather than restarting, and let events sync independently of them.",
                    "This is the difference between a round that clears in five minutes at the depot and one that never clears at all."
                ],
                criteria: [
                    "An upload interrupted at 90 per cent resumes from that point rather than restarting, verified in the scripted harness.",
                    "Twenty pending proofs drain over an intermittent connection without any single one restarting more than twice.",
                    "A proof that fails permanently leaves its delivery event synced and flags the missing proof rather than reverting the delivery."
                ],
                hints: [
                    "The server needs to be able to say how much it already has. That endpoint is the whole protocol.",
                    "Cap concurrent uploads. Twenty at once on a weak connection is slower than three at once, and it starves the event queue."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend"
            },
            {
                title: "Make the queue inspectable and recoverable",
                description: [
                    "Build a screen showing every pending and failed item, why it failed, and how many attempts it has had, with the ability to retry one or all. Include an export of the raw queue for support.",
                    "When a courier rings the office saying the app has not sent anything, somebody needs to be able to see what is actually stuck."
                ],
                criteria: [
                    "The screen lists every outbox entry with its state, attempt count and last error, matching the stored data exactly.",
                    "Retrying a failed entry from the screen attempts it again and either clears it or updates the recorded error.",
                    "The export contains the queue contents and no proof image data, and can be produced with the device offline."
                ],
                hints: [
                    "A dangerous discard action belongs here too, behind a confirmation that says what will be lost.",
                    "Record the error that caused a failure at the time it happened. Reconstructing it afterwards is not possible."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "frontend"
            },
            {
                title: "Handle handover, logout and storage eviction",
                description: [
                    "Deal with the cases that lose data silently: a device handed to the next shift while items are still queued, a logout with unsynced work, and a browser evicting storage under pressure.",
                    "Logging out and clearing local storage with 12 unsynced deliveries in it destroys a morning's work and nobody finds out until the complaints arrive."
                ],
                criteria: [
                    "Logging out with unsynced entries warns, names how many, and refuses to clear local data until they sync or are explicitly discarded.",
                    "Persistent storage is requested at first login, and the app reports whether the request was granted.",
                    "A second courier logging in on the same device cannot see or sync the first courier's queued items."
                ],
                hints: [
                    "There is an API for requesting persistent storage that exempts the origin from routine eviction. It can be refused, so handle both answers.",
                    "Partitioning local data by courier id from the start is far easier than untangling a shared store later."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "data"
            },
            {
                title: "Run a full simulated day before release",
                description: [
                    "Put it all together: 120 stops, signal dropping in and out, the process killed twice, one server-side round change mid-day, and a battery saver mode throttling background work. Record what breaks and fix it.",
                    "This is the acceptance test for the whole project. Everything before it was built against one failure at a time."
                ],
                criteria: [
                    "At the end of the simulated day the server holds exactly 120 delivery events, one per stop, with no duplicates and no missing proofs.",
                    "Killing the process at two random points loses no recorded delivery and no captured proof.",
                    "The complete run is reproducible from the scripted harness and passes twice in a row."
                ],
                hints: [
                    "Compare the server state against an expected state computed from the script, rather than reading the results and judging them by eye.",
                    "Run it once on a genuinely old phone. Emulated throttling and a four year old device with battery saver on are not the same test."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "testing"
            }
        ]
    }
]

export default sprints
