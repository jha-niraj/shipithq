import type { SeedSprint } from "./types"

// A beginner project about the gap between data you have and data you can use: a
// bank CSV is already structured, yet "SQ *COFFEE 4421" tells you nothing until
// you decide what it means. Sprint 1 gets a statement into Postgres so there is
// something to work on, sprint 2 is the real problem of turning raw descriptions
// into merchants and categories, sprint 3 turns those categories into a picture
// of the spending, and sprint 4 makes a second import of the same file safe.
const sprints: SeedSprint[] = [
    {
        name: "Import a statement",
        goal: "A CSV exported from a bank can be uploaded and read back as rows on a page.",
        duration: "1 week",
        tasks: [
            {
                title: "Stand up the app and a Postgres database",
                description: [
                    "Create the Next.js app and point it at a Postgres database you can reach from your machine. Add one table and one page that reads from it, so you have proof the whole chain works before there is anything interesting in it.",
                    "The point of this task is to find the connection problems now, while there is nothing to lose, rather than in the middle of the import work."
                ],
                criteria: [
                    "A page at /transactions renders a row that was inserted into Postgres by hand, not hard coded in the component.",
                    "Stopping and restarting the dev server still shows the row, so the data is in the database and not in memory.",
                    "The connection string lives in an environment file that is not committed."
                ],
                hints: [
                    "Decide early whether queries run on the server or in a route handler, because it changes where the connection string is allowed to be read.",
                    "A hosted Postgres with a free tier saves you a local install, but check whether it limits concurrent connections."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "setup"
            },
            {
                title: "Model an account, an import and a transaction",
                description: [
                    "Write the schema. An account is the thing the statement came from, an import is one upload of one file, and a transaction is one line in it. Every transaction belongs to exactly one import and one account.",
                    "Keeping the import as its own row is what later lets you say which upload produced which rows, undo one of them, and spot the same file arriving twice."
                ],
                criteria: [
                    "A transaction row stores the raw description string exactly as it appeared in the file, in a column nothing else writes to.",
                    "Amounts are stored in a type that does not lose precision: inserting 0.10 and 0.20 and summing them returns 0.30 exactly.",
                    "Deleting an import deletes its transactions and leaves the account alone."
                ],
                hints: [
                    "Floating point money is the classic first bug here. Look at what your database offers for exact decimals, or store minor units as an integer.",
                    "Decide now whether a negative amount means money out or money in, and write the answer in a comment on the column."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Parse a CSV statement in the browser",
                description: [
                    "Add a file input that reads a CSV and turns it into an array of candidate transactions in memory. Show them in a preview table before anything is saved.",
                    "Real statements are not clean. Some have a preamble above the header row, some quote fields that contain commas, and some put the debit and credit in two separate columns rather than one signed amount."
                ],
                criteria: [
                    "Uploading the sample statement shows a preview table with the same number of rows as the file has data lines, ignoring any preamble.",
                    "A description containing a comma inside quotes stays as one field rather than splitting into two columns.",
                    "Nothing is written to the database by this task: reloading the page loses the preview."
                ],
                hints: [
                    "Splitting on commas will pass your first test file and fail on the second. Look at what an established CSV parser handles that a split does not.",
                    "Let the user say which column is the date, the amount and the description, rather than assuming a single bank's layout."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend"
            },
            {
                title: "Write a previewed statement to the database",
                description: [
                    "Turn the confirmed preview into one import row and many transaction rows. The write should be a single request, not one request per line, and the page should end up showing the saved data rather than the preview.",
                    "A thousand-line statement is normal, so this is the first point where doing the obvious thing per row is noticeably slow."
                ],
                criteria: [
                    "Importing the sample CSV of 42 lines creates exactly one import row and 42 transaction rows.",
                    "The import completes in one round trip to the database rather than 42.",
                    "If the write fails halfway, no partial import is left behind: the transaction count is either 0 or 42."
                ],
                hints: [
                    "Look at what your query builder offers for multi-row inserts and for grouping statements that must succeed or fail together.",
                    "Validate the whole batch before you write any of it, so a bad row on line 900 is caught before line 1 is saved."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "backend"
            },
            {
                title: "List transactions with a running balance",
                description: [
                    "Show the saved transactions newest first, with date, description and amount, and a running balance beside each one. Paginate rather than loading every row at once.",
                    "A running balance is a good check on the import: if the final balance does not match what the bank says, something about signs or missing rows is wrong."
                ],
                criteria: [
                    "The list shows 50 rows per page and the second page starts where the first ended, with no row repeated or skipped.",
                    "The running balance on the oldest row equals the opening balance, and on the newest equals the closing balance from the statement.",
                    "Money out and money in are visually distinguishable without reading the sign."
                ],
                hints: [
                    "A running balance computed per page will be wrong, because page two does not know what came before it. Think about where the total ought to be calculated.",
                    "Keyset pagination on date plus id avoids the duplicate-row problem that offset pagination has when rows share a date."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend"
            }
        ]
    },
    {
        name: "Read the messy descriptions",
        goal: "Every imported transaction carries a merchant and a category that were derived from its raw description rather than typed in by hand.",
        duration: "1 week",
        tasks: [
            {
                title: "Normalise a raw description into a merchant name",
                description: [
                    "Write a function that takes a description like \"SQ *COFFEE 4421\" or \"AMZN MKTP UK*2H41K9D03\" and returns something a person would recognise, such as \"Coffee\" or \"Amazon\". Keep it as a pure function with no database access so you can test it directly.",
                    "This is the core of the project. Payment processors prefix their own name, terminals append store and reference numbers, and the same merchant appears in four spellings across one statement."
                ],
                criteria: [
                    "Given a fixture of 30 real-looking descriptions, at least 25 return a merchant string containing no digits, no asterisks and no trailing reference codes.",
                    "\"TESCO STORES 3421\", \"TESCO-STORES LONDON\" and \"TESCO PAY AT PUMP\" all normalise to the same merchant string.",
                    "The function returns the cleaned original rather than an empty string when it cannot do better."
                ],
                hints: [
                    "Strip the known processor prefixes first, then the trailing noise, then collapse whitespace and case. Order matters more than cleverness here.",
                    "Collect the descriptions you cannot handle into a list as you go. That list is the specification for the next task."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Build a rule table from merchant to category",
                description: [
                    "Store the mapping from merchant to category as data, not as a chain of if statements. A rule has a pattern, a category and a priority, and the highest priority match wins.",
                    "Making it data means a new merchant is a row rather than a deploy, and it gives you somewhere to put the corrections the user makes later."
                ],
                criteria: [
                    "Adding a rule row changes the category of matching transactions with no code change and no restart.",
                    "Two rules that both match a description resolve deterministically: running the categoriser twice on the same input gives the same answer.",
                    "A seeded set of at least 20 rules covers groceries, transport, eating out, bills and subscriptions."
                ],
                hints: [
                    "Decide whether a pattern is an exact match, a prefix or a regular expression, and store which kind it is alongside the pattern.",
                    "A rule that matches everything is useful as the lowest priority fallback."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "backend"
            },
            {
                title: "Categorise on import and record the reason",
                description: [
                    "Run the normaliser and the rules as part of the import, and save the merchant, the category and which rule produced it on each transaction.",
                    "Storing the reason is what makes the categoriser debuggable. Without it, a wrong category is a mystery; with it, you can see exactly which rule fired."
                ],
                criteria: [
                    "After importing the sample CSV, every transaction has a merchant, and at least 80 per cent have a category other than uncategorised.",
                    "Each categorised transaction records the id of the rule that matched it, and following that id explains the result.",
                    "Re-running categorisation over an existing import updates categories without creating or deleting any transaction rows."
                ],
                hints: [
                    "Keep categorisation separate from parsing, so you can re-run it over rows that are already stored.",
                    "An uncategorised bucket you can see and count is more useful than guessing a category you are not confident about."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Let the user correct a category inline",
                description: [
                    "Add a control on each row that changes its category, saving immediately and updating the row without a full page reload. Mark corrected rows so they are distinguishable from rules-derived ones.",
                    "The user is the only authority on what a transaction actually was. The categoriser is a first guess."
                ],
                criteria: [
                    "Changing a category updates the row on screen before the server responds and reverts visibly if the save fails.",
                    "A corrected transaction keeps its user-chosen category when categorisation is re-run over the import.",
                    "Correcting 10 rows in a row fires 10 saves, and no row ends up showing another row's category."
                ],
                hints: [
                    "The re-run protection is the part that bites. Something on the row has to say who set the category.",
                    "Look at how optimistic updates are rolled back in your data-fetching layer rather than tracking it yourself."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "Turn a correction into a rule",
                description: [
                    "When the user corrects a category, offer to apply the same category to every other transaction with that merchant, now and on future imports. Accepting should create a rule rather than updating rows one by one.",
                    "This is what turns a manual chore into a system that gets better each month. It also needs care: the user corrected one row, not their whole history."
                ],
                criteria: [
                    "Correcting one \"SQ *COFFEE 4421\" row and accepting the offer recategorises the other rows with the same merchant in the same action.",
                    "The next import of a file containing that merchant categorises it correctly with no further input.",
                    "Declining the offer changes exactly one row and creates no rule."
                ],
                hints: [
                    "The offer should say how many rows it will affect before the user agrees, which means counting them first.",
                    "A rule created this way needs a higher priority than the seeded ones, or the original wrong rule will keep winning."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            }
        ]
    },
    {
        name: "Show where the money went",
        goal: "A dashboard answers what was spent on what, and whether it is going up, from the imported data alone.",
        duration: "1 week",
        tasks: [
            {
                title: "Aggregate spend by category and month",
                description: [
                    "Write the queries behind the dashboard: total spend per category for a period, and total spend per category per month across several months. Do the grouping in the database, not in JavaScript after fetching every row.",
                    "Once there are two years of transactions, the difference between grouping in SQL and grouping in the app is the difference between a fast page and a slow one."
                ],
                criteria: [
                    "The category totals for a month sum to the same figure as the sum of that month's outgoing transactions.",
                    "The monthly query returns a row for a category in a month where there was no spend, showing zero rather than omitting it.",
                    "With 20,000 transactions in the table, the dashboard queries return in under 300 milliseconds."
                ],
                hints: [
                    "Missing months are the awkward part of a time series. Look at generating the date series in the query and joining onto it.",
                    "Check whether an index on the date column changes the query plan before adding several."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "backend"
            },
            {
                title: "Draw the category breakdown",
                description: [
                    "Render the current period's spend by category as a chart, with the categories ordered by size and the small ones grouped into an other bucket.",
                    "A chart with 23 slices communicates nothing. Deciding what to hide is part of the work."
                ],
                criteria: [
                    "The chart shows at most eight categories, with everything below the eighth combined into a single other segment.",
                    "The segments sum to the total shown beside the chart, including the other bucket.",
                    "Hovering a segment shows the category name and its amount formatted as currency, not as a raw number."
                ],
                hints: [
                    "Decide the grouping in the data layer rather than inside the chart component, so the same numbers back the chart and the table.",
                    "Check the chart against your palette before you finish: default chart colours rarely match a monochrome design."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Draw the month on month trend",
                description: [
                    "Add a chart showing total spend per month for the last twelve months, with the ability to overlay one category on top of the total.",
                    "This is the view that answers the question people actually have, which is whether things are getting worse."
                ],
                criteria: [
                    "The chart shows twelve points even when three of those months have no transactions, drawing zero rather than skipping them.",
                    "Selecting a category redraws the overlay without refetching the whole page.",
                    "The current month is visibly marked as incomplete, since it is a partial month against eleven full ones."
                ],
                hints: [
                    "The partial-month trap is what makes trend charts lie. Decide whether to exclude, annotate or pro-rate it, and be consistent.",
                    "Keep the y axis starting at zero unless you have a reason not to, and know the reason."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Filter the whole dashboard by date range and account",
                description: [
                    "Add a date range and account filter that both charts, the totals and the transaction list respect. Put the filter state in the URL so a filtered view can be shared or reloaded.",
                    "Keeping the filter in the URL rather than component state is what stops the charts and the list from disagreeing about what they are showing."
                ],
                criteria: [
                    "Copying the URL into a new tab reproduces exactly the same filtered view.",
                    "Changing the date range updates both charts and the list from one set of queries, not three independent ones.",
                    "Selecting a range with no transactions shows an empty state rather than a chart of zeroes or an error."
                ],
                hints: [
                    "Search params as the single source of truth removes a whole class of state synchronisation bug.",
                    "Watch the default range: last 30 days and this calendar month are different questions and people mean different things by them."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "frontend"
            },
            {
                title: "Surface the largest movers",
                description: [
                    "Compute the categories whose spend changed most against the previous equivalent period, and show the top few with the direction and size of the change.",
                    "A total tells you the number. A mover tells you why the number changed, which is the thing worth reading."
                ],
                criteria: [
                    "A category that went from 40 to 120 is ranked above one that went from 400 to 460, because the comparison is not on absolute change alone.",
                    "A category with no spend in the previous period is handled without dividing by zero and is labelled as new rather than as an infinite increase.",
                    "The movers agree with the charts: the figures quoted match the same period's category totals."
                ],
                hints: [
                    "Ranking by percentage alone makes a 2 to 10 change the headline. Think about a threshold below which a category is not worth reporting.",
                    "Compare like with like: the previous 30 days against this 30 days, not against last calendar month."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Make re-importing safe",
        goal: "The same statement can be imported twice, and statements from three different banks can be imported at all, without corrupting the data.",
        duration: "1 week",
        tasks: [
            {
                title: "Detect duplicates across overlapping imports",
                description: [
                    "Bank exports overlap. A statement downloaded on the 1st and again on the 15th share two weeks of rows. Detect the repeats at import time and offer to skip them rather than creating a second copy.",
                    "There is no transaction id in most CSV exports, so you have to decide what makes two lines the same line, and that decision is a judgement call rather than a lookup."
                ],
                criteria: [
                    "Importing the same 42-line file twice results in 42 transactions, not 84, and the second import reports 42 skipped.",
                    "Two genuinely separate 3.50 coffees on the same day at the same merchant both survive the import.",
                    "The preview screen shows which rows will be skipped before the user confirms."
                ],
                hints: [
                    "A hash over date, amount and raw description gets you most of the way. The identical-coffee case is what the counter in your key is for.",
                    "Store the key on the row so the check is an index lookup rather than a scan of everything."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Handle the date formats and sign conventions banks actually use",
                description: [
                    "Support statements where the date is day first, month first or ISO, and where money out is either a negative number in one column or a positive number in a debit column. Detect the format from the file where you can and ask where you cannot.",
                    "The dangerous case is the ambiguous one: 03/04/2025 is two different dates depending on the bank, and guessing wrong silently shifts a quarter of the year."
                ],
                criteria: [
                    "A file containing 13/04/2025 is detected as day first automatically, because month 13 does not exist.",
                    "A file where every date is ambiguous prompts the user to choose rather than guessing.",
                    "A two-column debit and credit statement imports with the same signs as a single signed-amount statement from the same account."
                ],
                hints: [
                    "Scan the whole column before deciding the format, not the first row. One unambiguous row settles it for the file.",
                    "Keep the parsed format on the import row, so a wrongly parsed import can be identified later."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Fail an import loudly instead of half writing it",
                description: [
                    "Decide what happens when line 900 of a 1,000-line file is malformed. Report the line number and the problem, and leave the database in the state it was in before the upload started.",
                    "Silent partial imports are the worst outcome here, because the totals will be wrong and nothing will say so."
                ],
                criteria: [
                    "Importing a file with a bad row on line 900 leaves zero new transactions and shows an error naming line 900 and the reason.",
                    "The error message names the column that failed, not just the row.",
                    "An import interrupted by closing the browser mid-request leaves either all the rows or none of them."
                ],
                hints: [
                    "A half-finished import is worse than a failed one. Find out whether your database driver supports transactions before you rely on one - some HTTP-based drivers do not.",
                    "Validating the whole file before writing anything gives a better error than failing partway through the write."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "backend"
            },
            {
                title: "Test the categoriser against a fixture of real descriptions",
                description: [
                    "Build a fixture file of at least 60 real descriptions with the merchant and category each one should produce, and a test that runs the whole normalise-and-categorise path against it. Record the accuracy as a number.",
                    "A categoriser without a measured accuracy cannot be improved, because every change feels like progress and some of them are not."
                ],
                criteria: [
                    "The test suite prints an accuracy figure and fails if it drops below the current recorded baseline.",
                    "Adding a rule to fix one description and breaking two others makes the test fail rather than pass.",
                    "The fixture includes at least five descriptions the categoriser currently gets wrong, marked as known failures."
                ],
                hints: [
                    "Keep the fixture as data rather than as assertions, so adding a case is one line.",
                    "Known failures you have written down are useful. Known failures you have deleted from the fixture are not."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "testing"
            },
            {
                title: "Deploy it with the statement file never leaving your control",
                description: [
                    "Deploy the app and the database, and check the one thing that matters for this project: the uploaded CSV is bank data, so confirm where the file goes, how long it stays there and who can read it.",
                    "Deploying a finance tool is mostly a data handling question rather than an infrastructure one."
                ],
                criteria: [
                    "The deployed app imports the sample statement end to end and renders the dashboard from it.",
                    "The uploaded file itself is not persisted anywhere after the import finishes, or if it is, the location is documented and access controlled.",
                    "Database credentials are set as deployment secrets and appear in no committed file and no client bundle."
                ],
                hints: [
                    "Check the client bundle for anything that was meant to be server only. Prefixed public environment variables are inlined at build time.",
                    "Connection limits are the usual first production failure with serverless Postgres. Find out what your provider allows before traffic does."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "30 minutes",
                category: "deploy"
            }
        ]
    }
]

export default sprints
