import type { SeedSprint } from "./types"

// A job board is a familiar CRUD app until you have to rank people, at which point
// the only honest ranking is one the candidate can read back. Sprint 1 builds the
// board, sprint 2 the two sides of the market, sprint 3 the explainable score that is
// the whole point, and sprint 4 makes it fast, rate limited and tested.
const sprints: SeedSprint[] = [
    {
        name: "Jobs you can post and read",
        goal: "An employer can post a job and anyone can find and read it, backed by a schema that will still fit in sprint 3.",
        duration: "1 week",
        tasks: [
            {
                title: "Scaffold Next.js, Prisma and Tailwind",
                description: [
                    "Create the app in TypeScript, connect Prisma to a PostgreSQL database, and confirm Tailwind is applying styles. One page that reads one row from the database proves all three at once.",
                    "Keep the database URL in an environment file from the first commit, and make sure that file is ignored by git.",
                ],
                criteria: [
                    "npx prisma migrate dev runs against a local database and creates at least one table.",
                    "A page renders a value read through Prisma at request time, not a hardcoded string.",
                    "The repository contains an example environment file and no real credentials.",
                ],
                hints: [
                    "Decide now where database calls are allowed to live, because a Prisma client imported into a client component fails in a confusing way.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "setup",
            },
            {
                title: "Model jobs, skills, employers and candidates",
                description: [
                    "Write the Prisma schema. A job belongs to an employer and requires a set of skills, each at a required level and marked required or nice to have. A candidate has a profile and a set of skills with a claimed level and years of use.",
                    "The join tables carry data, not just two foreign keys, and that is what makes scoring possible later. A job skill without a required level and a weight gives the scorer nothing to work with.",
                ],
                criteria: [
                    "A migration creates jobs, employers, candidates, skills and both join tables, and runs on an empty database.",
                    "A job skill row stores a required level and whether the skill is required or optional.",
                    "The same skill cannot be attached twice to one job, enforced by a unique constraint rather than by application code.",
                ],
                hints: [
                    "Skills as free text strings will wreck the scoring in sprint 3. Look at what a canonical skill table buys you before deciding.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "data",
            },
            {
                title: "Post a job through a validated form",
                description: [
                    "Build the posting form: title, description, location, salary range, and the required skills with their levels. Validate on the server, and show the specific field that failed rather than a general error.",
                    "Salary ranges are the field that teaches this lesson. A minimum above the maximum has to be caught somewhere, and the client is not a trustworthy somewhere.",
                ],
                criteria: [
                    "Submitting with an empty title returns a field-level error and writes nothing to the database.",
                    "Submitting a minimum salary above the maximum is rejected by the server even when the same request is sent directly with curl.",
                    "A successful post redirects to the new job page and the job is visible there.",
                ],
                hints: [
                    "One schema shared by the client and the server keeps the two validations from drifting apart.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend",
            },
            {
                title: "A public job list and a job detail page",
                description: [
                    "List open jobs newest first with title, employer, location and salary range, and give each one a detail page showing the full description and the required skills.",
                    "Handle the states that are not the happy one: no jobs at all, a job id that does not exist, and a job that has been closed.",
                ],
                criteria: [
                    "The list shows the 20 most recent jobs and paginates rather than loading every job.",
                    "Requesting a job id that does not exist returns a 404 page, not a server error.",
                    "With no jobs in the database the list renders an empty state and no layout collapses.",
                ],
                hints: [
                    "Pagination by offset is simpler and pagination by cursor is stabler. Pick one knowing what you gave up.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend",
            },
            {
                title: "Seed a fixed cast of jobs and candidates",
                description: [
                    "Write a seed script that creates a known set of employers, jobs, candidates and skill rows, including some deliberately awkward cases: a candidate with one perfect skill and nothing else, one with every skill at a low level, and one with no skills at all.",
                    "These fixed characters are what sprint 3 is tested against. Without them you will be tuning a score on data you just invented to make it look good.",
                ],
                criteria: [
                    "Running the seed twice leaves the same row counts, not duplicates.",
                    "The seed includes at least 8 candidates and 5 jobs, with at least one candidate having no skills.",
                    "Each seeded candidate has a short note in the script saying what case they represent.",
                ],
                hints: [
                    "Upserting on a natural key such as an email address is what makes a seed idempotent.",
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "data",
            },
        ],
    },
    {
        name: "Two sides of the market",
        goal: "Candidates have profiles and can apply, employers see their applicants, and skills are named consistently across both.",
        duration: "1 week",
        tasks: [
            {
                title: "Authentication with employer and candidate roles",
                description: [
                    "Add sign up and sign in, and give every account a role. An employer can post jobs; a candidate can apply to them. Neither can do the other's actions.",
                    "Enforce the role in the server action or route handler, not by hiding a button. Test it by calling the endpoint directly while signed in as the wrong role.",
                ],
                criteria: [
                    "A candidate account posting to the job creation endpoint receives a 403 and no job is created.",
                    "An employer account applying to a job receives a 403.",
                    "A signed-out request to either endpoint is redirected or refused rather than throwing.",
                ],
                hints: [
                    "Write the authorisation check once in a helper and call it everywhere, so the next endpoint cannot forget it.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "backend",
            },
            {
                title: "A candidate profile with claimed skill levels",
                description: [
                    "Let a candidate fill in a profile: headline, location, years of experience, and their skills with a level and how long they have used each one.",
                    "Levels need a fixed scale that both sides of the market read the same way. Define it once, name the levels in the UI, and keep it out of free text.",
                ],
                criteria: [
                    "A candidate can add a skill with a level and years, see it listed, and remove it.",
                    "Adding the same skill twice updates the existing entry rather than creating a second row.",
                    "Saving a profile with 0 skills succeeds, and the profile page says clearly that no skills are listed.",
                ],
                hints: [
                    "An enum in the database and one shared label map in the UI keeps the scale from being re-invented per screen.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend",
            },
            {
                title: "One canonical skill vocabulary with aliases",
                description: [
                    "Build the skill table properly: a canonical name, and aliases that map to it, so that js, JS and JavaScript all resolve to one row. Both the job form and the profile form pick from it rather than typing free text.",
                    "This is unglamorous and it is the difference between a score that means something and a score that quietly gives everyone zero because a job asked for Node.js and the candidate wrote NodeJS.",
                ],
                criteria: [
                    "Typing js in the skill picker suggests JavaScript and stores the canonical row.",
                    "Two candidates who entered a skill by different aliases both match a job requiring the canonical skill.",
                    "A skill name not in the vocabulary is either rejected or queued for review, and is never silently stored as a new canonical skill.",
                ],
                hints: [
                    "Case folding and trimming get you most of the way; decide deliberately whether you want fuzzy matching beyond that.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data",
            },
            {
                title: "Apply once, with a status",
                description: [
                    "A signed-in candidate applies to a job with an optional note. The application has a status that starts at submitted and can move through reviewing, rejected and hired.",
                    "Applying twice to the same job must not create two applications, including when the button is double-clicked or the form is replayed from a stale tab.",
                ],
                criteria: [
                    "The same candidate applying twice to one job leaves exactly one application row, enforced by a unique constraint.",
                    "The second attempt shows a message saying they have already applied rather than an unhandled database error.",
                    "Applying to a closed job is refused by the server.",
                ],
                hints: [
                    "Let the database enforce uniqueness and catch the specific constraint violation, rather than checking first and hoping nothing happens in between.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
            {
                title: "The employer's applicant list",
                description: [
                    "An employer opens their job and sees who applied, with each candidate's headline, skills and application status, and can change that status.",
                    "The list is ordered by application date for now. Sprint 3 replaces the ordering with the score, so keep the ordering in one place you can swap.",
                ],
                criteria: [
                    "An employer sees applicants only for their own jobs, and requesting another employer's job by id returns a 403.",
                    "Changing a status persists and is visible after a refresh.",
                    "A job with no applicants renders an empty state naming the job.",
                ],
                hints: [
                    "Fetching applicants and their skills naively gives you one query per applicant. Check the query count before moving on.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
        ],
    },
    {
        name: "A score you can explain",
        goal: "Every application carries a match score with a stored breakdown, and the candidate can read exactly why they scored what they scored.",
        duration: "1 week",
        tasks: [
            {
                title: "Write the scoring rules down before coding them",
                description: [
                    "Write a short document in the repo that defines the score: the components, the weight of each, how a missing required skill is treated, and what a level below the requirement costs. Decide whether the maximum is 100 and whether components can be negative.",
                    "Writing it first turns the rest of the sprint into implementation rather than invention, and gives you the text the explanation UI will need to show anyway.",
                ],
                criteria: [
                    "The document names every component, its weight, and the weights sum to a stated total.",
                    "It states in plain sentences what happens when a required skill is entirely missing, and what happens when a candidate has extra skills the job did not ask for.",
                    "Three of the seeded candidates are scored by hand against one seeded job in the document, with the arithmetic shown.",
                ],
                hints: [
                    "Required and optional skills should not be worth the same. Decide the ratio and defend it in a sentence.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data",
            },
            {
                title: "Implement the scorer as a pure function",
                description: [
                    "Write the scorer as a function from a job's requirements and a candidate's skills to a score plus a list of component contributions. No database calls inside it.",
                    "Keeping it pure is what makes the hand-scored examples from the previous task usable as tests, and what lets you re-run it over historical data later without side effects.",
                ],
                criteria: [
                    "The function takes plain data and returns both a total and an itemised list of contributions, with no imports from Prisma.",
                    "Scoring the three hand-calculated candidates returns exactly the numbers written in the document.",
                    "A candidate with no skills scores the documented floor rather than throwing or returning NaN.",
                ],
                hints: [
                    "Work out what the function should do when a job lists no skills at all, before a real job does it to you.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours 30 minutes",
                category: "backend",
            },
            {
                title: "Store the breakdown, not just the number",
                description: [
                    "When an application is created, compute the score and store both the total and the per-component breakdown alongside it, together with the version of the rules used.",
                    "A stored total with no breakdown cannot be explained a week later, and a breakdown with no rules version cannot be explained after you change the weights.",
                ],
                criteria: [
                    "An application row carries a total score, a structured breakdown and a rules version.",
                    "Two applications created under different rules versions both display correctly, each labelled with its version.",
                    "Deleting a skill from a candidate's profile does not retroactively change the stored breakdown of an existing application.",
                ],
                hints: [
                    "Think about whether the breakdown is a JSON column or its own table, and which one you would want when someone asks for the average contribution of a single skill.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data",
            },
            {
                title: "Show the candidate why they scored that",
                description: [
                    "On the candidate's application page, render the breakdown as sentences a person can act on: which required skills matched, which were missing, where their level was below what the job asked for, and what the single biggest gap was.",
                    "The test of this screen is whether a candidate who scored 42 can say what to learn next without asking anybody. A bare number and a progress bar fails that test.",
                ],
                criteria: [
                    "The page names every required skill the candidate lacks, by name.",
                    "The page states the largest single contribution and the largest single deduction, each with its point value.",
                    "A candidate with a perfect match sees an explanation that says so rather than an empty list of gaps.",
                ],
                hints: [
                    "The sentences come from the stored breakdown, never from re-running the scorer at render time with today's rules.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "2 hours",
                category: "frontend",
            },
            {
                title: "Rank the employer's list by score",
                description: [
                    "Order the applicant list by score descending, show each score with a short summary of its top component, and let the employer sort by date instead.",
                    "Ties are common with a coarse scale. Decide the tiebreak and make it stable, so the list does not reshuffle itself between refreshes.",
                ],
                criteria: [
                    "The applicant list is ordered by stored score descending by default.",
                    "Two applicants with identical scores appear in the same relative order on every refresh.",
                    "Switching the sort to date and back returns the same ordering as before.",
                ],
                hints: [
                    "Sorting in SQL on the stored total is both faster and more honest than sorting in JavaScript after fetching everyone.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
        ],
    },
    {
        name: "Fast, guarded and tested",
        goal: "Search is quick, the endpoints are rate limited, scores stay correct when the inputs change, and the app is deployed.",
        duration: "1 week",
        tasks: [
            {
                title: "Search and filter jobs without scanning the table",
                description: [
                    "Add keyword search over title and description plus filters for location, salary floor and required skill. Check the query plan and add the indexes it asks for.",
                    "Searching on every keystroke against an unindexed text column is fine with 5 jobs and unusable with 50,000. Seed enough rows to find out which one you built.",
                ],
                criteria: [
                    "With 50,000 seeded jobs, a keyword search returns in under 300ms measured server side.",
                    "EXPLAIN on the search query shows an index scan rather than a sequential scan.",
                    "Typing quickly in the search box does not fire one request per character.",
                ],
                hints: [
                    "PostgreSQL full text search and a trigram index solve different problems. Read what each one is good at before choosing.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
            {
                title: "Rate limit applications and search",
                description: [
                    "Put a limit on how often one account can apply and how often one IP can search. Return a 429 with a header saying when to retry.",
                    "Pick the numbers deliberately and write them next to the implementation. A limit nobody can explain gets raised the first time it inconveniences somebody.",
                ],
                criteria: [
                    "The eleventh search request from one IP within a minute returns 429.",
                    "A 429 response carries a Retry-After header with a number of seconds.",
                    "A request that is rate limited does not create any database row.",
                ],
                hints: [
                    "In-memory counters disappear when the process restarts and are per instance. Decide whether that is acceptable here and say so.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend",
            },
            {
                title: "Recompute scores when the inputs change",
                description: [
                    "A candidate adds a skill, or an employer edits the job's requirements. Decide what happens to existing applications, implement it, and make it visible.",
                    "Silently rewriting a score an employer already read is a bad outcome; leaving it permanently stale is a different bad outcome. Pick one, document it, and show the date the score was computed.",
                ],
                criteria: [
                    "Editing a job's required skills triggers a documented behaviour for existing applications, and that behaviour is stated in the repo.",
                    "Every displayed score shows the date it was computed.",
                    "Recomputing 500 applications completes in one batched operation rather than 500 separate updates.",
                ],
                hints: [
                    "Look at what db.batch gives you here, and remember that this driver has no transactions to fall back on.",
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "backend",
            },
            {
                title: "Test the scorer against fixed cases",
                description: [
                    "Turn the hand-worked examples into a test suite, and add the awkward cases: no skills, every skill, a job with no requirements, a level exactly at the requirement and one just below.",
                    "The suite should fail loudly if somebody changes a weight without meaning to. A scoring weight is the easiest thing in a project like this to nudge by accident.",
                ],
                criteria: [
                    "At least 10 scoring cases are asserted against exact expected totals.",
                    "Changing any weight by one point makes at least one test fail.",
                    "The suite runs in under 5 seconds and touches no database.",
                ],
                hints: [
                    "A table of input and expected output keeps this readable as the case count grows.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "testing",
            },
            {
                title: "Deploy with migrations and check the empty states",
                description: [
                    "Deploy the app with a managed PostgreSQL database, run the migrations as part of the deploy rather than by hand, and walk the whole flow on the deployed URL as a new user.",
                    "Then look at every screen with no data in it. A new employer with no jobs and a new candidate with no applications should both see something that tells them what to do next.",
                ],
                criteria: [
                    "A fresh deploy runs pending migrations automatically and the app starts against an empty database.",
                    "Posting a job, applying to it from a second account and viewing the ranked list all work on the deployed URL.",
                    "Every list screen has an empty state with a next action, verified by signing up a brand new account.",
                ],
                hints: [
                    "Check which environment variables are needed at build time and which at runtime, because getting that backwards produces a build that cannot be fixed by setting a variable afterwards.",
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "deploy",
            },
        ],
    },
]

export default sprints
