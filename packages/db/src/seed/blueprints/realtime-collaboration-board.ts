import type { SeedSprint } from "./types"

// A multiplayer whiteboard teaches one thing properly: state that several people
// edit at once has to converge whatever order the edits arrive in. Sprint 1 gets a
// single-player board on screen and in the database, sprint 2 puts a socket between
// two browsers, sprint 3 replaces the naive broadcast with a CRDT that survives a bad
// network, and sprint 4 hardens what sprint 3 exposed.
const sprints: SeedSprint[] = [
    {
        name: "A board you can draw on",
        goal: "One person can open a board, add and move sticky notes, draw on it, and find everything still there after a refresh.",
        duration: "1 week",
        tasks: [
            {
                title: "Scaffold the app and the board route",
                description: [
                    "Start a Next.js app in TypeScript with strict mode on, and add a route for a single board at a URL that carries the board id. For now the page can render nothing but the board id it was given.",
                    "This is the boring task that decides how painful the next nineteen are. Turn on strict TypeScript now, not later: the CRDT work in sprint 3 is full of shapes that look interchangeable and are not.",
                ],
                criteria: [
                    "Visiting /board/abc renders a page that displays the id abc, read from the route and not hardcoded.",
                    "npx tsc --noEmit passes with strict: true in tsconfig.json.",
                    "An unknown route still renders a not-found page rather than an unhandled error.",
                ],
                hints: [
                    "Decide early whether the board canvas is a client component or a server one, because everything realtime has to live on the client side of that line.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "setup",
            },
            {
                title: "Model boards, notes and strokes in PostgreSQL",
                description: [
                    "Design the tables: a board, the notes on it, the freehand strokes, and the people who are allowed in. A note needs a position, a size, some text and a colour. A stroke needs an ordered list of points and the style it was drawn with.",
                    "The interesting decision is how a point list is stored. A row per point is honest and enormous. A JSON blob per stroke is compact and opaque to SQL. Pick one, and write down in a comment which query you are optimising for.",
                ],
                criteria: [
                    "A migration creates the tables and runs on an empty database without manual editing.",
                    "Inserting a board, three notes and one stroke, then reading the board back, returns all four records with their positions intact.",
                    "Deleting a board removes its notes and strokes rather than leaving orphan rows.",
                ],
                hints: [
                    "Look at what a client needs in one round trip when it opens a board, and let that shape the tables rather than the other way round.",
                    "Every collaborative object will eventually need a stable client-generated id, not a database sequence. Think about why now.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "data",
            },
            {
                title: "Render a canvas of sticky notes you can drag",
                description: [
                    "Draw the notes on screen and let the pointer move them. Dragging should feel immediate: the note follows the cursor on every frame, with no round trip in the middle.",
                    "Keep the drag state separate from the stored state from the very start. The thing on screen while your finger is down is a local prediction, and treating it as anything else is exactly what breaks in sprint 3.",
                ],
                criteria: [
                    "Dragging a note across 500 pixels updates its position continuously rather than snapping once at the end.",
                    "The canvas holds 200 notes and a drag still repaints without visible stutter.",
                    "Releasing a drag outside the viewport leaves the note at the last valid position rather than at a negative coordinate.",
                ],
                hints: [
                    "Pointer events cover mouse and touch in one API, which saves writing the drag twice.",
                    "Watch what re-renders on each pointer move. If the whole board re-renders to move one note, the 200-note criterion will fail.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "frontend",
            },
            {
                title: "Persist an edit and reload the board",
                description: [
                    "Wire the canvas to the database. Adding a note, editing its text, moving it and deleting it all reach the server, and reopening the board shows the same arrangement.",
                    "A drag produces hundreds of position updates per second. Sending all of them is wasteful and sending only the last one loses the note if the tab closes mid-drag. Decide what you send and how often, and say why in a comment.",
                ],
                criteria: [
                    "Moving a note, hard-refreshing the page, and looking again shows the note within a few pixels of where it was released.",
                    "A single 3-second drag results in at most 30 writes, not one per pointer event.",
                    "Editing note text and refreshing preserves the text including leading and trailing spaces.",
                ],
                hints: [
                    "Throttling and debouncing solve different halves of this. Work out which half each one solves before choosing.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "backend",
            },
            {
                title: "Freehand drawing on the same surface",
                description: [
                    "Add a pen tool. Pressing down starts a stroke, moving extends it, lifting ends it and stores it. Strokes and notes share one coordinate space and one z-order.",
                    "Raw pointer samples are noisy and there are a lot of them. Smoothing and thinning the points is what separates a stroke that looks drawn from one that looks like a seismograph.",
                ],
                criteria: [
                    "A stroke drawn quickly across the board renders as a continuous line with no visible gaps between samples.",
                    "A 4-second stroke stores fewer than 400 points after thinning and still visually matches what was drawn.",
                    "Strokes and notes keep their relative stacking order after a refresh.",
                ],
                hints: [
                    "Look up how point simplification algorithms decide which samples matter; you do not need the fanciest one.",
                    "Consider whether the in-progress stroke belongs on the same canvas layer as the finished ones.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "frontend",
            },
        ],
    },
    {
        name: "Two browsers, one board",
        goal: "A second browser sees notes, strokes and cursors move in near real time, and survives the socket dropping.",
        duration: "1 week",
        tasks: [
            {
                title: "Stand up a WebSocket server with a room per board",
                description: [
                    "Run a WebSocket server that puts every connection for a given board id into the same room, and can send a message to everyone in that room. Nothing about notes yet: prove the plumbing with a ping.",
                    "Decide now what a message looks like on the wire. A tagged message type and a versioned envelope costs ten minutes today and saves a rewrite when sprint 3 changes the payload entirely.",
                ],
                criteria: [
                    "Two clients connected to /board/abc both receive a message sent by either of them, and a client on /board/xyz receives none of them.",
                    "Killing and restarting the server causes connected clients to log a close event rather than hang silently.",
                    "A malformed message closes that one connection without taking down the server process.",
                ],
                hints: [
                    "Keep the room registry in memory for now, but note in a comment what breaks the moment there are two server instances.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "realtime",
            },
            {
                title: "Broadcast note edits between clients",
                description: [
                    "Send every note create, move, edit and delete over the socket, and apply incoming ones to the canvas. The mover should not see their own edit bounce back and fight their pointer.",
                    "This version will be wrong, and knowing exactly how it is wrong is the point of the sprint. Two people dragging the same note will produce a tug of war. Write down what you observe before sprint 3 fixes it.",
                ],
                criteria: [
                    "A note dragged in one browser visibly moves in a second browser on the same machine within 200ms.",
                    "The browser that originated a move never sees its own note jump backwards during the drag.",
                    "Two browsers dragging the same note at once produce a documented, reproducible failure written into the repo, not a crash.",
                ],
                hints: [
                    "Attaching an origin id to every message tells a client which updates are echoes of its own.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "realtime",
            },
            {
                title: "Live cursors and a presence list",
                description: [
                    "Show every other person's cursor on the board with their name, and list who is currently in the room. Presence is ephemeral: it is never written to PostgreSQL.",
                    "Cursor updates are the highest frequency messages in the whole system and the least important. They are the right place to learn about coalescing sends and interpolating between them.",
                ],
                criteria: [
                    "A second browser's cursor appears within 200ms of it moving and is labelled with that user's name.",
                    "Cursor messages are sent at most 20 times a second per client even when the pointer fires far more often.",
                    "Closing a tab removes that cursor and that name from every other client within 5 seconds.",
                ],
                hints: [
                    "Interpolating a remote cursor towards its last known point hides a lot of network jitter for very little code.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "realtime",
            },
            {
                title: "Reconnect and resync after the socket drops",
                description: [
                    "Networks drop. Detect it, reconnect with a backoff, and bring the client back to a correct board rather than a stale one. Tell the user what state they are in.",
                    "The trap is a client that reconnects successfully and quietly keeps a board that is missing 30 seconds of other people's edits. Reconnecting is easy; knowing what you missed is the actual task.",
                ],
                criteria: [
                    "Disabling the network for 20 seconds and re-enabling it restores the socket without a page refresh.",
                    "Edits made by another browser during those 20 seconds are all visible within 2 seconds of reconnecting.",
                    "Reconnect attempts back off rather than hammering the server once per frame, and the gap grows between attempts.",
                    "The UI shows a clear disconnected state while the socket is down.",
                ],
                hints: [
                    "There are two honest strategies: replay what was missed, or refetch everything. Try the simple one first and note its cost.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "realtime",
            },
            {
                title: "Clean up presence when someone vanishes",
                description: [
                    "A tab that crashes never sends a leave message. Without a heartbeat, the presence list slowly fills with ghosts and the cursor layer fills with frozen pointers.",
                    "Pick a timeout and defend it. Too short and a person on hotel wifi keeps disappearing from the list; too long and ghosts linger. Write the number and the reasoning in a comment.",
                ],
                criteria: [
                    "Force-quitting a browser removes that user from every other client's presence list within 15 seconds.",
                    "A client that is idle but connected is never removed from the presence list.",
                    "The server's in-memory room map returns to empty after every client has left, verified by logging its size.",
                ],
                hints: [
                    "A heartbeat from the client and a last-seen timestamp on the server is enough. Look at what the close event does and does not guarantee.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "realtime",
            },
        ],
    },
    {
        name: "Edits that always converge",
        goal: "Any order of edits, including ones made offline, produces the same board on every client.",
        duration: "1 to 2 weeks",
        tasks: [
            {
                title: "Move board state into a Yjs document",
                description: [
                    "Replace the ad hoc message types with a Yjs document: a map of notes, and a list of strokes. Local edits mutate the document, and the document emits updates to send.",
                    "The mental shift is that you no longer send intent such as move note 7 to x 200. You send an update produced by a data structure whose merge result does not depend on arrival order. Most of this task is deciding which Yjs type each part of the board should be.",
                ],
                criteria: [
                    "Every note create, edit, move and delete goes through the Yjs document, with no remaining direct mutation of local component state.",
                    "Two clients dragging the same note at once both end at the same final position, and neither freezes.",
                    "Applying the same update twice leaves the document unchanged.",
                ],
                hints: [
                    "A map keyed by note id and a nested map per note behave very differently from an array of note objects when two people edit at once.",
                    "Read what Yjs guarantees about concurrent writes to the same key before you choose the shape.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "realtime",
            },
            {
                title: "Persist the document and hydrate a fresh client",
                description: [
                    "Store the Yjs updates on the server so a board outlives every connection, and hand a new client enough state to be current the moment it connects.",
                    "You now have two representations: the update log that is authoritative, and the PostgreSQL tables from sprint 1 that are pleasant to query. Decide which one is the source of truth and make the other a derived view, or you will spend the rest of the project reconciling them.",
                ],
                criteria: [
                    "Stopping the server, restarting it and opening the board shows every note and stroke that existed before.",
                    "A browser that has never seen the board renders it fully within 2 seconds of connecting on a local network.",
                    "The source of truth is stated in a comment at the top of the persistence module, and the other representation is written only from it.",
                ],
                hints: [
                    "Look at how a state vector lets a joining client ask for only what it lacks.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "backend",
            },
            {
                title: "Edit offline and merge on reconnect",
                description: [
                    "Let a client keep working with the socket down. Edits accumulate locally, and when the connection returns they merge with everything else that happened meanwhile.",
                    "This is the hotel wifi case from the project description. Two people drag the same note, one of them is offline for a minute, and both boards must end identical without either person losing their other work.",
                ],
                criteria: [
                    "With the network disabled, adding three notes and moving one still updates the local board.",
                    "Re-enabling the network results in both browsers showing the same set of notes within 5 seconds, with none of the three lost.",
                    "A note edited offline by one person and deleted online by another resolves to one documented outcome, and the same outcome every time.",
                ],
                hints: [
                    "Local persistence of the document is what turns a refresh while offline from data loss into a non-event.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "3 hours",
                category: "realtime",
            },
            {
                title: "Strokes that do not tear under concurrency",
                description: [
                    "Freehand strokes are appended point by point while someone else is drawing their own. Model them so two simultaneous strokes never interleave their points into one broken line.",
                    "Notes and strokes stress a CRDT in different ways. A note is a small map edited repeatedly; a stroke is a long append-only sequence written once. The same shape is wrong for both.",
                ],
                criteria: [
                    "Two browsers drawing at the same time produce two separate strokes on both screens, with no points from one appearing in the other.",
                    "A stroke drawn while offline appears complete and in order after reconnecting.",
                    "Erasing a stroke removes it on every client and it does not reappear after a refresh.",
                ],
                hints: [
                    "Consider whether an in-progress stroke needs to be in the shared document at all, or only the finished one plus a transient preview.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "realtime",
            },
            {
                title: "Undo that only undoes your own work",
                description: [
                    "Ctrl+Z should take back the last thing you did, not the last thing that happened on the board. Scope undo to the local user's own edits.",
                    "Shared undo is one of the clearest places where multiplayer breaks a single-player assumption. Decide what happens when your undo target was since edited by somebody else, and write that decision down.",
                ],
                criteria: [
                    "Person A moves a note, person B moves a different note, A presses undo, and only A's note returns to its previous place.",
                    "Undo followed by redo restores the note to the position it had before the undo, on both clients.",
                    "Pressing undo ten times when only three local edits exist leaves the board unchanged and does not throw.",
                ],
                hints: [
                    "Yjs tracks the origin of a transaction. Look at how an undo manager can be told to care about only some origins.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "frontend",
            },
        ],
    },
    {
        name: "Make it safe and keep it fast",
        goal: "The board has comments and access control, the stored history stays bounded, and convergence is covered by a test rather than by hope.",
        duration: "1 week",
        tasks: [
            {
                title: "Threaded comments anchored to a note",
                description: [
                    "Let people attach a comment thread to a note, reply within it, and resolve it. A resolved thread collapses but is not deleted.",
                    "Anchoring is the interesting part. The note a comment belongs to may be moved by someone else or deleted entirely while the thread is open.",
                ],
                criteria: [
                    "A comment posted in one browser appears in the other within 500ms, with its author and timestamp.",
                    "Moving the commented note moves its thread marker with it on every client.",
                    "Deleting a commented note leaves its thread reachable in a resolved or orphaned list rather than silently discarding it.",
                ],
                hints: [
                    "Think about whether comment bodies belong in the same CRDT document as the drawing, or in PostgreSQL next to it.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "frontend",
            },
            {
                title: "Authorise the socket, not just the page",
                description: [
                    "A WebSocket upgrade is a request like any other and needs the same checks. Verify the session at connect time and again on every board the connection joins.",
                    "Hiding a board in the UI protects nobody. Anyone can open a socket and join a room id they guessed, which is exactly what you should try yourself before calling this done.",
                ],
                criteria: [
                    "A connection with no valid session is closed during the upgrade, before joining any room.",
                    "A signed-in user who is not a member of board abc is refused when joining it, and receives no updates for it.",
                    "A member removed from a board while connected stops receiving that board's updates within 10 seconds.",
                    "The refusal path is proven with a script that connects directly, not through the app UI.",
                ],
                hints: [
                    "Work out where the session cookie is actually available during an upgrade request, because it is not where it is during a normal fetch.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Keep the stored history from growing forever",
                description: [
                    "An update log grows with every keystroke and every pointer move. Snapshot the document periodically and prune the updates the snapshot already covers.",
                    "Measure before and after. A busy board can easily carry tens of megabytes of history, which every joining client then has to download.",
                ],
                criteria: [
                    "A board edited for 10 minutes by two clients stores less than 1MB after compaction.",
                    "Compaction runs without disconnecting clients or losing edits made while it runs.",
                    "The time to load a compacted board into a fresh client is recorded before and after, with both numbers in the repo.",
                ],
                hints: [
                    "There is a difference between merging updates into one and encoding the current state. Find out which one loses history and decide if you need that history.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Prove convergence with shuffled updates",
                description: [
                    "Write a test that captures a set of updates from several simulated clients, applies them in many different orders, and asserts every resulting document is identical.",
                    "This is the only way to have real confidence in the claim the project is built on. Include a duplicated update and a dropped-then-late update in the mix, because that is what a real network does.",
                ],
                criteria: [
                    "A test applies the same 50 updates in at least 20 random orders and asserts an identical final document state each time.",
                    "The test includes at least one duplicated update and one delivered far out of order, and still passes.",
                    "Deliberately breaking the merge logic makes the test fail, verified once by hand.",
                ],
                hints: [
                    "Seed the shuffle so a failure can be reproduced from the seed printed in the output.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "testing",
            },
            {
                title: "Deploy and measure it on a bad network",
                description: [
                    "Deploy the app and the socket server, then measure what a real user gets. Use the browser's network throttling to simulate slow, lossy conditions and record the numbers.",
                    "Finish with a short document stating the measured latency to see a remote edit, the behaviour when the connection drops, and the one thing you would fix next.",
                ],
                criteria: [
                    "Two browsers on the deployed URL see each other's note moves within 400ms on an unthrottled connection.",
                    "Under a throttled profile with 500ms latency, edits still converge and the disconnected state never sticks after the network returns.",
                    "The repo contains measured numbers for both conditions, dated, not estimates.",
                ],
                hints: [
                    "Check what your host does to an idle WebSocket connection, since many close it after a fixed period.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "deploy",
            },
        ],
    },
]

export default sprints
