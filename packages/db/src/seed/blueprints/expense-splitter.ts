import type { SeedSprint } from "./types"

// Splitting a bill is arithmetic; settling a house is a graph problem. These
// four sprints build the ledger first, then the splits and the rounding rules
// that keep it exact, then the minimal set of transfers that clears it, and
// finally the concurrency, tests and access rules that make it safe to use with
// other people's money.
const sprints: SeedSprint[] = [
    {
        name: "A house that records who paid",
        goal: "Members of a house can add an expense with its shares and see the ledger, stored in Postgres through Prisma.",
        duration: "1 week",
        tasks: [
            {
                title: "Start the app with Prisma and a database",
                description: [
                    "Get a Next.js app talking to Postgres through Prisma, with a migration applied and a seeded house rendering on a page.",
                    "The one thing worth deciding now is how the Prisma client is created, because a hot reloading dev server will otherwise open a new connection on every file save until the pool is empty."
                ],
                criteria: [
                    "A migration creates the schema and a page renders data read through Prisma",
                    "A seeded house with three members renders their names",
                    "The database URL is read from the environment and the app refuses to start without it rather than falling back to a default"
                ],
                hints: [
                    "The Prisma client wants to be a single instance that survives a hot reload; the documented pattern for that is short."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "setup"
            },
            {
                title: "Model houses, members, expenses and shares",
                description: [
                    "An expense records who paid, the total, a description and a date. A share records how much of that expense one member owes. Every amount is an integer in the smallest unit of the currency.",
                    "The invariant this whole project rests on is that the shares of an expense sum exactly to its total. Decide where that is enforced before you write a single insert."
                ],
                criteria: [
                    "An expense records the payer, a total in integer minor units, a description and a date",
                    "A share records the member, the expense and an amount in integer minor units",
                    "A test asserts that the shares of every expense sum exactly to its total, over seeded data",
                    "Deleting a member who has shares is refused by a foreign key rather than by application code"
                ],
                hints: [
                    "Storing money in a floating point column is the bug that takes three weeks and a spreadsheet to find.",
                    "The sum-to-total rule can live in the database, in the server action, or in both; write down which you chose and what it costs."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Add an expense from a form",
                description: [
                    "A form that takes a payer, a total, a description, a date and an equal split across selected members, and writes the expense and its shares.",
                    "The expense and its shares are one fact, so they are one write. Two statements give you the state where an expense exists with nobody owing anything."
                ],
                criteria: [
                    "Submitting the form writes the expense and all of its shares in a single atomic operation",
                    "A submission whose shares do not sum to the total is refused with a message naming the difference",
                    "The ledger shows the new expense without a full page reload"
                ],
                hints: [
                    "Validate on the server even though the form already validated; the form is a convenience, not a gate."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Show the house ledger",
                description: [
                    "List the expenses newest first with payer, amount, description and date, and show each viewer what their own share of each one was.",
                    "Formatting minor units back into a readable amount belongs in one helper. Done in each component, it will disagree with itself by the third screen."
                ],
                criteria: [
                    "The ledger lists expenses newest first with payer, amount, description and date",
                    "Each row shows the viewing member's own share of that expense",
                    "An expense the viewer has no share in is shown and marked as not involving them"
                ],
                hints: [
                    "One formatting helper, taking minor units and a currency, keeps the ledger and the settle-up screen from rounding differently."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "Restrict everything to house members",
                description: [
                    "A house ledger is a list of what people spend their money on. Every read and every write checks membership first.",
                    "Answer a request for a house you are not in with a 404 rather than a 403. A 403 confirms the house exists, which is information you did not mean to give."
                ],
                criteria: [
                    "A signed-in user who is not a member of a house receives a 404 for its ledger rather than a 403",
                    "Every server action checks membership before reading or writing, and a test proves one of them fails when the check is removed",
                    "An invite link adds a member once and cannot be used again afterwards"
                ],
                hints: [
                    "A single helper that resolves the house and the membership together is harder to forget than a check copied into each action."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Split it the way people actually split",
        goal: "An expense can be split equally, by exact amounts, by percentage or by weights, with the leftover penny handled by a written rule.",
        duration: "1 week",
        tasks: [
            {
                title: "Implement the four split modes",
                description: [
                    "Equal, exact amounts, percentages and weights. Three of those four are the same function with different weights, which is worth noticing before you write four of them.",
                    "Whatever the mode, the result is a list of shares that sums exactly to the total. Anything else is refused at the boundary."
                ],
                criteria: [
                    "All four modes produce share rows that sum exactly to the expense total",
                    "A percentage split whose percentages do not sum to one hundred is refused with a message",
                    "Switching mode on the form recomputes the preview without losing the total already entered"
                ],
                hints: [
                    "Reducing equal, percentage and weighted to one weighted function leaves you with one thing to test instead of three."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Decide where the leftover penny goes",
                description: [
                    "Ten pounds between three people cannot be split evenly. One person pays a penny more, and which one is a decision rather than a side effect of a rounding function.",
                    "Rounding each share independently will not sum to the total. Distribute the remainder deliberately, over a stable ordering, and write the ordering down."
                ],
                criteria: [
                    "Splitting one thousand minor units three ways produces 334, 333 and 333, summing to exactly 1000",
                    "Splitting the same expense twice assigns the extra unit to the same member both times",
                    "Across ten equal splits among the same three members the extra unit does not always land on the same person, and the rule for rotating it is documented",
                    "No split anywhere in the app produces shares that fail to sum to the total, asserted over generated inputs"
                ],
                hints: [
                    "Handing out the remainder one unit at a time over a stable ordering is the usual approach; the ordering is the part you are deciding.",
                    "Half-up rounding applied per share is exactly what does not add up, which is why the remainder is dealt with separately."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Split by items, not just by the bill",
                description: [
                    "A restaurant bill is rarely fair split evenly. Let an expense carry line items, each assigned to one or more members, and apportion tax and service in proportion to what each person actually ordered.",
                    "The apportioning is the weighted split you already wrote, with item subtotals as the weights."
                ],
                criteria: [
                    "An expense can carry line items and each item is assigned to one or more members",
                    "Tax and service are apportioned in proportion to each member's item subtotal",
                    "An itemised expense still satisfies the shares-sum-to-total rule, including after the remainder is distributed"
                ],
                hints: [
                    "An item split between two people is itself an equal split, so the remainder rule applies twice and both applications must agree."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Handle a second currency",
                description: [
                    "A house with one member abroad ends up with expenses in two currencies. Store the currency and the rate that was used, not only a converted figure.",
                    "The rate moves. What somebody owed for last month's dinner does not."
                ],
                criteria: [
                    "An expense stores its own currency and the conversion rate applied at the time",
                    "A house with expenses in two currencies reports balances in the house currency and states the rate used",
                    "Changing today's rate leaves last month's amounts owed unchanged"
                ],
                hints: [
                    "Storing the converted amount alone loses the ability to explain the number later; storing the rate keeps the arithmetic reproducible."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Edit and delete an expense honestly",
                description: [
                    "People mistype amounts. An edit rewrites the shares atomically and keeps the invariant, and it leaves a record of who changed what.",
                    "The awkward case is an expense already included in a completed settlement. The cheapest honest answer is a reversing entry rather than quietly changing history."
                ],
                criteria: [
                    "Editing an expense rewrites its shares atomically and the sum-to-total rule still holds afterwards",
                    "Every edit and deletion leaves a record of who made it and when",
                    "An expense already covered by a completed settlement cannot be edited in place, and the interface says what will happen instead"
                ],
                hints: [
                    "An append-only history with a reversing entry is easier to explain to a housemate than a number that changed overnight."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Settle up with the fewest transfers",
        goal: "The house can be cleared with a minimal set of transfers computed from net balances, and each settlement is recorded and stays recorded.",
        duration: "1 week",
        tasks: [
            {
                title: "Compute net balances for the house",
                description: [
                    "For each member, what they paid minus what they owe. One number per person, in minor units.",
                    "The balances of a house always sum to zero. That property is the check that catches a penny lost in sprint two before it reaches the settle-up."
                ],
                criteria: [
                    "Each member's balance is the sum of what they paid minus the sum of their shares, in minor units",
                    "The balances of a house sum to exactly zero, asserted in a test over generated expenses",
                    "A member with no expenses at all appears with a balance of zero rather than being absent from the list"
                ],
                hints: [
                    "If the balances do not sum to zero, the bug is in the splitting, not in the summing; check the remainder rule first."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Implement the minimal transfer settlement",
                description: [
                    "Settling is not a sum. Everybody in debt has to reach everybody who is owed, and the obvious answer of each debtor paying each creditor produces far more transfers than anybody wants to make. Repeatedly match the largest debtor against the largest creditor and you reduce the set dramatically.",
                    "This greedy match is not provably optimal for every arrangement of balances, which is worth knowing rather than glossing over. Write down what it does guarantee, which is no more transfers than one fewer than the number of members with a non-zero balance."
                ],
                criteria: [
                    "Settling a three-person house with four expenses produces at most two transfers",
                    "For a house of n members with non-zero balances the result never exceeds n minus one transfers, asserted over one thousand generated cases",
                    "Applying the produced transfers to the balances leaves every member at exactly zero",
                    "A house that is already settled produces an empty list rather than a list of zero-amount transfers"
                ],
                hints: [
                    "A heap of debtors and a heap of creditors makes the repeated matching cheap, though correctness does not depend on the data structure.",
                    "Read up on why the fully optimal version of this problem is hard, and put one sentence in the repository about what you chose instead and why."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Explain each transfer",
                description: [
                    "A suggested transfer of 47.20 to somebody you never bought anything with needs an explanation, or nobody will press the button.",
                    "Where a transfer is the direct result of shared expenses, list them. Where it is the result of netting through a third person, say that plainly instead of inventing a plausible list."
                ],
                criteria: [
                    "Each suggested transfer states the payer, the recipient and the amount",
                    "Opening a direct transfer shows the expenses behind it and those contributions sum to the transfer amount",
                    "A transfer produced by netting through a third member says so rather than showing an expense list that does not add up"
                ],
                hints: [
                    "The honest answer for a netted transfer is that it cannot be traced to individual expenses; saying so builds more trust than a convincing list."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend"
            },
            {
                title: "Record a settlement and freeze it",
                description: [
                    "Marking a transfer as paid writes a settlement row, and the balances move accordingly. A settlement is a fact that happened, not a state to be recalculated later.",
                    "Two housemates will press the same button at the same time. That has to end with one settlement."
                ],
                criteria: [
                    "Marking a transfer paid writes a settlement row and the balances update to reflect it",
                    "A settlement references the balance snapshot it was computed against",
                    "Two members marking the same transfer paid simultaneously results in exactly one settlement row"
                ],
                hints: [
                    "A unique constraint on the pair plus the snapshot is cheaper than a lock and keeps working with two servers.",
                    "Storing the snapshot is what lets you detect later that the settlement was computed against balances that have since changed."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Add an expense dated before a settlement",
                description: [
                    "Somebody remembers a receipt from three weeks ago, after the house has settled. Reopening the settlement would rewrite a payment that really happened.",
                    "The back-dated expense creates a new outstanding balance instead. Settled history stays settled and the view separates the two."
                ],
                criteria: [
                    "A back-dated expense produces a new outstanding balance rather than reopening a completed settlement",
                    "The house view separates settled history from what is currently outstanding",
                    "A settle-up run after a back-dated expense includes it and the resulting balances still sum to zero"
                ],
                hints: [
                    "Treating a settlement as an event rather than as a computed state is what keeps the history stable under late data."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour",
                category: "backend"
            }
        ]
    },
    {
        name: "Trust it with real money",
        goal: "Concurrent writes are safe, the arithmetic is tested against generated houses, and the app is deployed and used for a real month.",
        duration: "1 week",
        tasks: [
            {
                title: "Make concurrent writes safe",
                description: [
                    "Two people adding an expense at the same moment must both succeed with correct balances afterwards. One person double-submitting a form must produce one expense.",
                    "The third case is the interesting one: a settlement computed against balances that have since moved should be refused rather than applied to the wrong numbers."
                ],
                criteria: [
                    "Two expenses submitted simultaneously both persist and the balances afterwards are correct",
                    "A resubmitted form carrying the same request identifier creates exactly one expense",
                    "A settlement computed against a stale balance snapshot is refused with a message rather than applied"
                ],
                hints: [
                    "The stale snapshot case is optimistic concurrency, and a version number on the house row is enough to implement it.",
                    "An interactive transaction holds a connection open for its whole duration, so keep what happens inside one short."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "backend"
            },
            {
                title: "Test the arithmetic against generated houses",
                description: [
                    "Generate random houses, expenses and split modes, then assert the properties rather than exact values. Balances sum to zero. Settlements clear them. Shares sum to totals.",
                    "Generating the input is easy. Generating the expected output is as hard as the code under test, which is why this is a property test and not a table of examples."
                ],
                criteria: [
                    "A property test generates random houses and expenses and asserts that balances sum to zero and that the settlement clears every member to zero",
                    "The suite covers a member who owes nothing, a house with one member, and an expense paid by somebody with no share in it",
                    "Changing the remainder rule from sprint two makes a test fail rather than passing quietly"
                ],
                hints: [
                    "When a generated case fails, shrink it by hand to the smallest house that still fails before you start reading code.",
                    "Record the failing seed so the case can be replayed after the fix."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "testing"
            },
            {
                title: "Show each member what they owe",
                description: [
                    "One figure per person: what you owe the house, or what the house owes you. Never both.",
                    "The per-person breakdown is the second screen. The first screen is the number somebody acts on."
                ],
                criteria: [
                    "A member sees a single net figure and it is never both a debt and a credit at the same time",
                    "The figure equals the sum of the suggested transfers involving that member",
                    "The amount states its currency and is legible at a glance rather than buried in a table"
                ],
                hints: [
                    "If the net figure and the transfer list disagree, the settle-up is being computed from a different balance snapshot than the page is showing."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "Invite, remove and leave a house",
                description: [
                    "People move out. A member with an outstanding balance cannot simply disappear, and their past expenses must stay in the ledger whatever happens to their account.",
                    "The rule for leaving is a product decision as much as a technical one. Write it down before implementing it."
                ],
                criteria: [
                    "A member with a non-zero balance cannot leave, and the message names what they must settle first",
                    "A removed member's past expenses and shares remain in the ledger and in past settlements",
                    "An invite link stops working after it is accepted or after its stated expiry, whichever comes first"
                ],
                hints: [
                    "Removing a member is an archive rather than a delete, for the same reason the habits in the ledger keep their history."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "backend"
            },
            {
                title: "Deploy it and use it for one real month",
                description: [
                    "Put it on a hosted URL with a managed database, migrations applied by the deploy rather than by hand, and automated backups.",
                    "Then use it. A month of real expenses with real housemates finds things no test suite will, starting with the expenses that do not fit any of your four split modes."
                ],
                criteria: [
                    "The app runs on a hosted URL against a managed Postgres, with migrations applied by the deploy pipeline",
                    "Three people record a month of real expenses and the settle-up matches what they work out by hand",
                    "Backups run automatically and at least one restore has been performed and verified"
                ],
                hints: [
                    "The restore is the half of the backup that people skip, and it is the half that matters.",
                    "Write down every expense during the month that did not fit the app; that list is the next sprint."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "deploy"
            }
        ]
    }
]

export default sprints
