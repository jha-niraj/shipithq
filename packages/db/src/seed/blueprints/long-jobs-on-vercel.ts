import type { SeedSprint } from "./types"

// Work longer than a request, on Vercel (plan/long-jobs-vercel LJV-10). The companion to
// the incident "The export that finished after it failed" and its Pathfinder path. Four
// sprints: a slow function that dies inline, the same work as a workflow, a page the user
// can leave, and the retries, idempotency and operations that make it safe. Every
// criterion is provable on Vercel's free plan: no function needs more than 300 seconds.
const sprints: SeedSprint[] = [
    {
        name: "A slow function that dies",
        goal: "A deployed page runs a ten-step report inline and shows the 504 when the function's time limit ends it.",
        duration: "1 week",
        tasks: [
            {
                title: "Write the slow function as named steps",
                description: [
                    "A weekly report in ten steps: load events, count sign-ups, sum revenue and so on. Each step simulates its work by waiting a fixed time, so a run costs nothing, needs no keys and takes the same time every run.",
                    "Make the steps a list with names, and one function that runs step N. The next sprint turns each call into a workflow step without changing the function.",
                ],
                criteria: [
                    "One module exports the ten step names and a function that runs one step by number",
                    "A step's duration is one constant, and ten steps take at least 2 minutes in total",
                    "An environment variable makes one chosen step throw on its first attempt only, and the throw names the step and the attempt",
                ],
                hints: [
                    "Pass the attempt number into the step function now; the workflow will supply it later.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "backend",
            },
            {
                title: "Run it inline with a 60-second limit",
                description: [
                    "A POST route that awaits all ten steps and returns the report. Export `maxDuration = 60` from the route so it is stopped long before the work is done.",
                    "60 stands in for the 300 seconds every plan allows by default: the same cliff, reached in a minute.",
                ],
                criteria: [
                    "The route exports `maxDuration = 60`",
                    "Run locally, the route finishes and returns all ten lines",
                    "Run on your Vercel deployment, the same request ends with a 504 at about 60 seconds",
                ],
                hints: [
                    "If production finishes too, check the export is in the route file itself and redeploy.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "backend",
            },
            {
                title: "Show the run, and the failure, on a page",
                description: [
                    "A card with a Run button and a clock that counts seconds while the request is open. When it ends, the card says what came back: the report, or the status code and how long it took.",
                ],
                criteria: [
                    "The clock ticks once a second while the request is open",
                    "A 504 shows as \"Failed with 504 after N s\", not as a crash or a blank card",
                    "The button cannot start a second run while one is open",
                ],
                hints: [
                    "A 504 page from the platform is HTML, not JSON: check `res.ok` before parsing.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend",
            },
            {
                title: "Write down what you saw",
                description: [
                    "A short README section: what the route does, the limit, what happened locally, what happened deployed, and why the two differ.",
                ],
                criteria: [
                    "The README names the limit, the status code and the time it failed at in production",
                    "It explains in one sentence why the local run succeeded",
                ],
                hints: [
                    "maxDuration is read by the platform when it runs your function; the dev server never stops a slow route.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "20 minutes",
                category: "deploy",
            },
        ],
    },
    {
        name: "The same work as a workflow",
        goal: "The ten steps run as a Vercel Workflow, each step its own function, and the deployed run finishes where the inline one died.",
        duration: "1 week",
        tasks: [
            {
                title: "Add the Workflow SDK",
                description: [
                    "Install `workflow` and wrap the Next.js config with `withWorkflow`, so the \"use workflow\" and \"use step\" directives are compiled into routes.",
                ],
                criteria: [
                    "`next.config` exports the config wrapped in `withWorkflow`",
                    "`npm run build` succeeds",
                    "`.swc` is in `.gitignore`",
                ],
                hints: ["The SDK's Next.js guide shows the one-line config change."],
                difficulty: "BEGINNER",
                estimatedTime: "20 minutes",
                category: "setup",
            },
            {
                title: "Write the workflow and its step",
                description: [
                    "A workflow function that loops over the steps and calls a step function for each one. The step function runs one report step: the same function the inline route used.",
                    "The workflow function is replayed after a crash or a deploy, so it only decides what runs next. All the work is in the step.",
                ],
                criteria: [
                    "The workflow function contains no waiting, no I/O and no randomness of its own",
                    "Each report step is one call to a \"use step\" function",
                    "The inline route still works, unchanged, beside it",
                ],
                hints: [
                    "If you find yourself reaching for setTimeout or fetch inside the workflow function, that line belongs in a step.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend",
            },
            {
                title: "Start a run from a route",
                description: [
                    "A POST route that starts the workflow and answers at once with the run id.",
                ],
                criteria: [
                    "The route responds in under a second with a run id",
                    "`npx workflow inspect runs` lists the run locally, with its steps",
                    "Deployed, the run completes all ten steps while the inline route still fails at 60 s",
                ],
                hints: ["`start()` returns before the run finishes: do not await the result in the route."],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend",
            },
            {
                title: "Explain why it no longer dies",
                description: [
                    "Add to the README: how long each step runs, what bounds a step, and what bounds a run.",
                ],
                criteria: [
                    "The README states the step duration and that a step is bounded by the function limit",
                    "It states that a run itself has no maximum duration, with a link to Vercel's limits page",
                ],
                hints: ["Vercel's Workflow pricing and limits page lists both."],
                difficulty: "BEGINNER",
                estimatedTime: "20 minutes",
                category: "backend",
            },
        ],
    },
    {
        name: "A page you can leave",
        goal: "A user can start a run, close the tab, and open the same link later to see where it is.",
        duration: "1 week",
        tasks: [
            {
                title: "Status by run id",
                description: [
                    "A GET route that takes a run id and answers with the run's status, and its result once it has completed.",
                ],
                criteria: [
                    "An unknown run id answers 404, not 500",
                    "A running run answers \"running\"; a finished one answers \"completed\" with the report",
                    "A cancelled run answers \"cancelled\"",
                ],
                hints: ["`getRun(id)` gives you `exists`, `status` and `returnValue`, all awaited."],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend",
            },
            {
                title: "Keep the run id in the URL",
                description: [
                    "When the user starts a run, put its id in the page's address. When the page loads with an id, it picks the run up instead of offering a fresh one.",
                ],
                criteria: [
                    "Starting a run changes the URL to include its id without a full page reload",
                    "Closing the tab mid-run and opening the copied URL shows the run's current status",
                    "Opening the URL after it finished shows the completed report",
                ],
                hints: ["Reading the search params in a client component needs a Suspense boundary above it."],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "frontend",
            },
            {
                title: "Stream the steps as they finish",
                description: [
                    "Each step writes its result to the run's stream. A route hands that stream to the page as one JSON line per step, from a given index, so a page that comes back asks only for what it has not seen.",
                ],
                criteria: [
                    "Steps appear on the page within a second or two of finishing, without polling for them",
                    "Reloading the page mid-run shows every finished step once, not twice",
                    "The status poll stops once the run is completed, failed or cancelled",
                ],
                hints: ["`getWritable()` inside the step, `run.getReadable({ startIndex })` in the route."],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "realtime",
            },
        ],
    },
    {
        name: "Safe to retry, ready to run",
        goal: "Steps survive a failure without doing anything twice, and you can watch, cancel and explain every run.",
        duration: "1 week",
        tasks: [
            {
                title: "Watch a step retry",
                description: [
                    "Set the environment variable that makes step 4 fail once, deploy, and run. The step throws, is retried from its first line, and the run completes.",
                ],
                criteria: [
                    "The deployed run completes with the failure switched on",
                    "The Workflows tab in Vercel Observability shows step 4 with a retry",
                    "The finished report has each step exactly once",
                ],
                hints: ["Steps retry three times by default; the step can read its attempt number from its metadata."],
                difficulty: "INTERMEDIATE",
                estimatedTime: "30 minutes",
                category: "testing",
            },
            {
                title: "Make a side effect idempotent",
                description: [
                    "Add a final step that sends a notification (a webhook to a request bin is enough). Make it fail after sending, once, and prove the notification is not sent twice.",
                ],
                criteria: [
                    "With the failure on, exactly one notification arrives",
                    "The step checks before acting, or sends a key built from its step id that the receiver dedupes on",
                    "With a 400 from the receiver, the step stops at once with FatalError instead of retrying",
                ],
                hints: ["`getStepMetadata().stepId` is documented for exactly this kind of key."],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
            {
                title: "Cancel a run, and handle a rollback",
                description: [
                    "Cancel a run from the CLI or the Workflows tab, and make the page show it. Then write down what to do with runs on a deployment you roll back from.",
                ],
                criteria: [
                    "A cancelled run shows as cancelled on the page within one poll",
                    "The README says why runs on a rolled-back deployment keep running, and how to stop them",
                ],
                hints: ["Runs stay on the deployment they started on: Vercel calls this skew protection."],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "deploy",
            },
            {
                title: "Guard the demo",
                description: [
                    "Before you share the link: one run per visitor every 5 minutes and at most 3 runs at once, with a clear message when the limit is hit.",
                ],
                criteria: [
                    "A second run from the same visitor within 5 minutes is refused with the time left",
                    "A fourth concurrent run is refused while three are running",
                    "Refused requests never start a run",
                ],
                hints: ["Count running runs from your own record of run ids; the limit check happens before start()."],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
        ],
    },
]

export default sprints
