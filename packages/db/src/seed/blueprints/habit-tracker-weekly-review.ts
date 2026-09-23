import type { SeedSprint } from "./types"

// A small tracker that teaches state modelling and honest reporting. The four
// sprints move from a day you can tick, to a week you can see, to a weekly
// roll-up that refuses to forgive a gap, and finally to data that survives
// midnight, a timezone change and a schema change.
const sprints: SeedSprint[] = [
    {
        name: "Tick a habit off today",
        goal: "You can open the app, see the habits scheduled for today, tick them, and find the ticks still there after a reload.",
        duration: "1 week",
        tasks: [
            {
                title: "Stand up a typed React app you can run",
                description: [
                    "Create a React project with TypeScript and get it rendering a single page with the project name on it. Turn strict mode on in the TypeScript config from the very first commit.",
                    "Every later task in this project leans on the compiler to catch a wrong date or a missing habit id, so the strictness is not decoration."
                ],
                criteria: [
                    "The dev server serves a page showing the project name with no errors in the browser console",
                    "A type check with no emit passes with strict set to true in tsconfig",
                    "The repository has one commit containing an app that runs"
                ],
                hints: [
                    "The standard React and TypeScript template gives you most of this; the part worth checking by hand is which strictness flags the template quietly left off."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "setup"
            },
            {
                title: "Model a habit and a day of ticks",
                description: [
                    "Write the types before any interface. A habit has an id, a name, the weekdays it is meant to happen on, and the date it started. A record of doing it is a pair of habit id and calendar date, and nothing else.",
                    "The choice that matters here is storing a date as a plain calendar string rather than as a timestamp. A tick belongs to a day in the person's own calendar, not to an instant on a clock."
                ],
                criteria: [
                    "A habit type carries an id, a name, a schedule of weekdays and a start date",
                    "A completion is keyed by habit id plus a calendar date in year-month-day form with no time component",
                    "Ticking the same habit twice on one date cannot produce two records, prevented by the shape of the data rather than by a check at the call site"
                ],
                hints: [
                    "A set or a map keyed by habit and date makes the duplicate impossible instead of merely unlikely.",
                    "Decide now what should happen to past history when a habit's schedule changes later, and write your answer in a comment."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Put all storage behind one module",
                description: [
                    "Load the whole tracker from local storage at startup and save it back on every change, through a single module that nothing else bypasses.",
                    "Storage returns strings written by an older version of your own code, so treat what comes back as untrusted input rather than as your types."
                ],
                criteria: [
                    "All reads and writes to local storage happen in one file, and no component reaches for the storage API directly",
                    "Reloading the page restores the habits and today's ticks exactly",
                    "Clearing site data leaves the app rendering an empty state rather than throwing"
                ],
                hints: [
                    "Parsing untrusted JSON out of storage is the first place this breaks; decide what a corrupt value should do before you meet one.",
                    "One load at startup and one save per change is enough at this size, so resist anything cleverer."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Show today and let a tick toggle",
                description: [
                    "Render the habits scheduled for today's weekday, and let a click mark one done or undo it. Show a count of how many of today's scheduled habits are done.",
                    "Keep the toggle a pure function from old state to new state, because the weekly roll-up in sprint three needs to apply exactly the same rules without a click."
                ],
                criteria: [
                    "The page lists only the habits scheduled for today's weekday",
                    "Clicking a habit toggles it done and undone, and the change survives a reload",
                    "The header shows today's date and a count of done against the scheduled total for today"
                ],
                hints: [
                    "If the toggle reads the current date from inside itself rather than taking it as an argument, sprint three will have to rewrite it."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Add, rename and remove habits without losing history",
                description: [
                    "Give the app a way to create a habit with a name and a weekday schedule, rename one, and remove one.",
                    "Removal is the interesting case. A habit with three months of recorded days is worth more than its name, and deleting both together is a decision rather than an implementation detail."
                ],
                criteria: [
                    "A new habit appears in today's list immediately if today is one of its scheduled days",
                    "Renaming a habit leaves every past tick attached to it",
                    "Removing a habit asks for confirmation and states how many recorded days will be affected"
                ],
                hints: [
                    "Deleting by id is easy; deciding whether the past disappears with it is the real question, and sprint four will ask it again."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "frontend"
            }
        ]
    },
    {
        name: "See the whole week at once",
        goal: "Seven days of every habit are on screen, past days can be corrected, and you can move between weeks and share the view.",
        duration: "1 week",
        tasks: [
            {
                title: "Lay out a week as a grid",
                description: [
                    "Draw one row per habit and seven columns for the days of the week. A cell is in one of four states: done, missed, not scheduled, or not yet happened.",
                    "Those four states are the vocabulary the rest of the project uses. Getting them distinct on screen now makes the roll-up in sprint three easier to argue about."
                ],
                criteria: [
                    "The grid shows one row per habit and seven day columns",
                    "Each cell renders exactly one of the four states, and the state is derived rather than stored",
                    "The four states are distinguishable without relying on colour alone"
                ],
                hints: [
                    "Pick the day the week starts on once and put it in a single constant; a grid that starts on Sunday and a roll-up that starts on Monday will disagree quietly for weeks."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "Move between weeks and keep your place",
                description: [
                    "Add back and forward controls that shift the grid by a week, and a way to jump to the current week from anywhere.",
                    "Put the week being viewed in the URL rather than only in component state, so a reload and a shared link both land on the same week."
                ],
                criteria: [
                    "Back and forward move the grid exactly seven days",
                    "The current week is reachable in one action from any other week",
                    "Reloading the page shows the same week that was on screen before the reload"
                ],
                hints: [
                    "Identifying a week by the calendar date of its first day avoids the week-numbering arguments entirely."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "frontend"
            },
            {
                title: "Correct a past day, refuse a future one",
                description: [
                    "A tick that can only be made on the day it happened is a tracker people abandon after the first evening they forget. Let any past cell be toggled.",
                    "The boundaries are the point of this task. A day after today cannot be ticked, and a day before a habit existed is not a failure to record."
                ],
                criteria: [
                    "Clicking a cell for a past date toggles it and the change persists",
                    "A cell for a date after today cannot be ticked and says why",
                    "A cell for a day before a habit's start date renders as out of range rather than as missed"
                ],
                hints: [
                    "The start date is what stops a habit created today reporting a month of failures on its first screen."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Make the grid usable on a phone",
                description: [
                    "A seven column grid with long habit names is the width nobody has. Decide whether the columns shrink, the names truncate, or the grid scrolls inside its own container, then make that decision consistently."
                ],
                criteria: [
                    "At 375 pixels wide the page has no horizontal scrollbar of its own",
                    "Habit names truncate rather than wrapping a row onto two lines",
                    "Every tappable cell is at least 44 pixels on its shorter side"
                ],
                hints: [
                    "Decide between shrinking and scrolling before you start styling; mixing the two gives you a grid that is both cramped and cut off."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "frontend"
            },
            {
                title: "Generate a month of history to develop against",
                description: [
                    "Write a small generator that fills storage with several weeks of plausible history so the weekly review has something to report on before you have used the app for a month.",
                    "Put deliberate gaps in it. A generator that produces a perfect record hides exactly the bugs sprint three is about."
                ],
                criteria: [
                    "One command fills storage with at least four weeks of history across four habits",
                    "The generated history contains deliberate gaps, including one habit that stops halfway through the month",
                    "The generator is not included in the production build"
                ],
                hints: [
                    "A fixed seed makes a bug reproducible; an unseeded random one makes it a story you cannot retell."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "testing"
            }
        ]
    },
    {
        name: "A weekly review that does not flatter you",
        goal: "The review page reports completion, streaks and misses from one written set of rules that treats a gap as a gap.",
        duration: "1 week",
        tasks: [
            {
                title: "Decide what a good week means, and write it down",
                description: [
                    "Before computing anything, answer four questions in a file in the repository. Does a week with one missed day still count as a good week. Does a day the habit was not scheduled for belong in the total. Does a day that has not happened yet count as missed. Is a habit added on Thursday judged on the whole week.",
                    "Everything in this sprint implements that file. The reason it comes first is that these are decisions rather than facts, and a roll-up written without them ends up encoding whichever answer was convenient on the day."
                ],
                criteria: [
                    "The repository contains a file answering all four questions, one or two sentences each",
                    "Each rule names the case that would make it look wrong to a user",
                    "Every function written later in this sprint names the rule it implements"
                ],
                hints: [
                    "Write the answer you would defend to somebody who missed Wednesday and wants the app to tell them they had a great week."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "30 minutes",
                category: "data"
            },
            {
                title: "Compute completion per habit over a week",
                description: [
                    "For each habit and a given week, return how many scheduled days were done and how many were scheduled. Return the two numbers, not a percentage.",
                    "The denominator is where this goes wrong. Seven is almost never the right answer, and a habit with nothing scheduled in the week has no completion rather than a rate of zero."
                ],
                criteria: [
                    "A habit scheduled on five weekdays and done on three reports three of five",
                    "Days before the habit's start date are excluded from the denominator",
                    "A habit with no scheduled days in the week reports no data rather than zero per cent",
                    "The function takes the week and today as arguments and reads no clock of its own"
                ],
                hints: [
                    "Returning the numerator and the denominator and letting the view divide keeps the rounding argument out of the data layer.",
                    "An archived or a not yet started habit is the case that decides whether the denominator is a count or a filter."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Break a streak on a miss, and prove it",
                description: [
                    "Compute the streak as a function over the recorded days, not as a counter incremented on each tick. A stored counter drifts the moment a past day is corrected, and a streak that only ever goes up is the lie this project exists to avoid.",
                    "A streak counts consecutive scheduled days that were done, ending at the most recent day that has already happened. A missed scheduled day ends it. A day the habit was not scheduled for is skipped: it neither extends the streak nor breaks it."
                ],
                criteria: [
                    "A habit scheduled every day, done Monday to Wednesday and missed on Thursday, reports a current streak of zero on Friday before Friday is ticked",
                    "A habit scheduled Monday to Friday and done for three straight weeks reports a streak of fifteen, unaffected by the weekends in between",
                    "Changing a past day from done to missed shortens the streak on the next render, with no stored counter to reset",
                    "The longest streak ever recorded is reported next to the current one, and the two differ after any break"
                ],
                hints: [
                    "Walking backwards from the most recent day that has already happened is simpler than walking forwards from the start date.",
                    "The skip rule for unscheduled days is what decides whether a weekend breaks a weekday habit, and the file from the first task has already decided it."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Keep a miss apart from a day that has not happened",
                description: [
                    "Today, before the day is over, is not a miss. Neither is tomorrow. A review that counts them as misses punishes people for checking in at lunchtime.",
                    "This is one predicate, asked in three places. Make it take today as an argument so a test can sit on any day it likes."
                ],
                criteria: [
                    "Today is never counted as a miss before the day ends",
                    "A week entirely in the future reports no data rather than zero completion",
                    "The current week's completion is stated against the days so far and the page says that is what it is doing",
                    "The predicate takes today as an argument and no part of the roll-up calls the system clock"
                ],
                hints: [
                    "If a function anywhere in the roll-up reads the current date directly, testing a Wednesday becomes a scheduling problem."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Render the review page from the roll-up",
                description: [
                    "Build the weekly page on top of the functions from this sprint and nothing else. Per habit, show the done against scheduled count, the current streak, and the days missed by name.",
                    "The rule for this page is that it does no date arithmetic. If it needs a number the roll-up does not expose, the roll-up gains a function rather than the component gaining a calculation."
                ],
                criteria: [
                    "The review page shows, per habit, the week's done against scheduled count, the current streak, and the missed days named",
                    "A habit with nothing scheduled in the week is listed as not scheduled rather than hidden",
                    "No component on the page performs date arithmetic of its own"
                ],
                hints: [
                    "Naming the missed days rather than showing a percentage is what makes the page feel honest instead of accusing."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "frontend"
            }
        ]
    },
    {
        name: "Survive the boring realities",
        goal: "The tracker keeps its data straight across midnight, a change of timezone, a schema change and a year of use.",
        duration: "1 week",
        tasks: [
            {
                title: "Handle midnight and a change of timezone",
                description: [
                    "Today's date comes from the device's local calendar, never from converting a stored instant. A tick made in one timezone must stay on the calendar day it was made on when the device moves.",
                    "An app left open overnight is the other half of this. At midnight the grid should roll over to the new day without a reload."
                ],
                criteria: [
                    "Today's date is derived from the local calendar rather than from formatting a stored timestamp",
                    "An app left open across midnight shows the new day within a minute with no reload",
                    "Ticks recorded in one timezone remain on their original calendar date after the device timezone changes"
                ],
                hints: [
                    "A timestamp converted to a calendar date in two different zones lands on two different days; storing the calendar date at the moment of the tick removes the second conversion.",
                    "A timer set to fire at the next local midnight is easier to reason about than one that polls every second."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Version the stored shape and migrate it forward",
                description: [
                    "Put a version number in the stored data and read it before anything else. When the stored version is older, upgrade it and write the result back. When it is newer than the code understands, refuse to write.",
                    "Write the migration for the change you already made during sprint two rather than inventing a hypothetical one."
                ],
                criteria: [
                    "Stored data carries a version number and the loader reads it before parsing the rest",
                    "Data written by the previous version loads, upgrades in place and the app works, with the old value kept until the upgraded write succeeds",
                    "Data from an unknown newer version leaves storage untouched and the app says so rather than overwriting it"
                ],
                hints: [
                    "An upgrade that writes before it has finished reading is how a half-migrated file happens."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "45 minutes",
                category: "data"
            },
            {
                title: "Archive a habit instead of erasing it",
                description: [
                    "Answer the question the delete confirmation raised in sprint one. Archiving takes a habit out of today and out of the current week's figures while leaving its past weeks intact.",
                    "The roll-up should need exactly one change to support this. If it needs four, the filtering is in the wrong place."
                ],
                criteria: [
                    "Archiving removes a habit from today's list while past weeks still show its record",
                    "An archived habit is absent from the current week's totals",
                    "Unarchiving resumes the habit from the current day rather than backfilling the archived period"
                ],
                hints: [
                    "If archiving is a date rather than a flag, the roll-up can answer whether the habit was active in any past week without a second field."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "30 minutes",
                category: "frontend"
            },
            {
                title: "Export and import the whole tracker",
                description: [
                    "Local storage belongs to one browser on one device. Give people a file so a year of habits is not hostage to a cleared cache.",
                    "The import is the risky half. Validate the whole file before you touch what is already stored."
                ],
                criteria: [
                    "Export downloads one file containing habits, completions and the schema version",
                    "Importing replaces the current data only after the file parses and validates fully",
                    "Importing a file from a newer schema version is refused with a message naming the version"
                ],
                hints: [
                    "An import that clears the old data first and then fails validation leaves the person with nothing at all."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "30 minutes",
                category: "data"
            },
            {
                title: "Test the roll-up against a month you wrote by hand",
                description: [
                    "Write a fixture describing a month of four habits, with the weekly figures you expect worked out on paper. Then assert the roll-up agrees.",
                    "The last criterion here is the whole point. If you loosen the streak rule to forgive a single gap and the suite stays green, the suite is not testing the rule you argued about in sprint three."
                ],
                criteria: [
                    "A fixture describes one month of four habits with the expected weekly figures written out by hand",
                    "Tests cover a missed day, an unscheduled day, a habit started mid-week and a week entirely in the future",
                    "Changing the streak rule to forgive one missed day makes at least two tests fail"
                ],
                hints: [
                    "Passing today into every function under test is what lets a test sit on a Wednesday in March without changing the machine clock.",
                    "Work the fixture's expected numbers out before you run the code, or you will be asserting what the bug does."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "testing"
            }
        ]
    }
]

export default sprints
