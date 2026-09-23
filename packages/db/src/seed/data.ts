/**
 * The seed corpus: companies, the jobs that belong to them, and public projects.
 *
 * Written by hand rather than generated, because the point is to see what a
 * student sees. Faker output ("Lorem Ipsum Inc, Synergist III") tells you the
 * layout renders; it does not tell you whether a job card reads like a job.
 *
 * Every record carries a stable `slug`, which is what makes the seed idempotent -
 * `onConflictDoUpdate` keys on it, so re-running updates rather than duplicating.
 */

export interface SeedCompany {
    slug: string;
    name: string;
    description: string;
    industry: string;
    companySize: string;
    foundedYear: number;
    headquarters: string;
    city: string;
    state: string;
    country: string;
    website: string;
    culture: string;
    benefits: string[];
    techStack: string[];
    responseRatePercent: number;
    avgTimeToHireDays: number;
    interviewToOfferPercent: number;
    totalHired: number;
}

export const COMPANIES: SeedCompany[] = [
    {
        slug: "lumen-labs",
        name: "Lumen Labs",
        description:
            "Lumen Labs builds the observability layer that mid-size engineering teams actually keep. We ingest traces, logs and metrics into one store and answer the only question that matters at 3am: what changed. Around 60 engineers, shipping to production several times a day.",
        industry: "Developer Tools",
        companySize: "51-200",
        foundedYear: 2019,
        headquarters: "Bengaluru, India",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        website: "https://lumenlabs.example.com",
        culture:
            "Written-first. Every non-trivial change starts as a document, and the review happens on the document rather than on the diff. No standups; a weekly written update instead.",
        benefits: [
            "Fully remote within India",
            "Four-day week in December",
            "Home office budget, renewed every two years",
            "Conference travel, one per year, no approval needed under a cap",
        ],
        techStack: ["TypeScript", "Go", "ClickHouse", "Kubernetes", "React", "gRPC"],
        responseRatePercent: 87,
        avgTimeToHireDays: 18,
        interviewToOfferPercent: 22,
        totalHired: 34,
    },
    {
        slug: "northwind-payments",
        name: "Northwind Payments",
        description:
            "Payment infrastructure for Indian marketplaces. We move about ₹400 crore a month across UPI, cards and net banking, and the interesting part of the job is that none of it is allowed to be eventually consistent.",
        industry: "Fintech",
        companySize: "201-500",
        foundedYear: 2016,
        headquarters: "Mumbai, India",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        website: "https://northwindpay.example.com",
        culture:
            "On-call is shared by everyone who writes code, including staff engineers. Incidents get a blameless write-up within 48 hours and the write-ups are public inside the company.",
        benefits: [
            "Hybrid, three days in the Mumbai office",
            "Health cover for you, a partner and parents",
            "ESOPs with a documented buyback window",
            "Six months parental leave, any parent",
        ],
        techStack: ["Java", "Kotlin", "PostgreSQL", "Kafka", "Redis", "AWS"],
        responseRatePercent: 71,
        avgTimeToHireDays: 26,
        interviewToOfferPercent: 14,
        totalHired: 96,
    },
    {
        slug: "verdant-health",
        name: "Verdant Health",
        description:
            "Clinical software for small hospital chains. Scheduling, records and billing in one system, used by roughly 9,000 clinicians daily. Regulated, audited, and unglamorous in the way that good infrastructure usually is.",
        industry: "Health Tech",
        companySize: "51-200",
        foundedYear: 2020,
        headquarters: "Pune, India",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        website: "https://verdanthealth.example.com",
        culture:
            "Pairing is the default for anything touching patient data. Deploys are Tuesday and Thursday, deliberately boring.",
        benefits: [
            "Remote-first with a Pune hub",
            "Annual learning budget",
            "Sabbatical after four years",
        ],
        techStack: ["Python", "Django", "PostgreSQL", "React", "Terraform"],
        responseRatePercent: 64,
        avgTimeToHireDays: 31,
        interviewToOfferPercent: 19,
        totalHired: 41,
    },
    {
        slug: "quanta-retail",
        name: "Quanta Retail",
        description:
            "Demand forecasting for grocery chains. We predict what a store will sell tomorrow so it does not order it the day after. Small data team, very large datasets.",
        industry: "Retail Analytics",
        companySize: "11-50",
        foundedYear: 2021,
        headquarters: "Hyderabad, India",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        website: "https://quantaretail.example.com",
        culture:
            "Twelve engineers, no managers yet, and a strong preference for people who can own a problem end to end rather than a layer of one.",
        benefits: [
            "Fully remote",
            "Flexible hours, four overlapping",
            "Equity from day one",
        ],
        techStack: ["Python", "dbt", "Snowflake", "Airflow", "FastAPI"],
        responseRatePercent: 92,
        avgTimeToHireDays: 12,
        interviewToOfferPercent: 28,
        totalHired: 9,
    },
    {
        slug: "atlas-mobility",
        name: "Atlas Mobility",
        description:
            "Fleet software for logistics operators: routing, driver apps and proof of delivery. About 40,000 vehicles on the platform, most of them in places with no signal for hours at a time, which is the whole engineering problem.",
        industry: "Logistics",
        companySize: "201-500",
        foundedYear: 2017,
        headquarters: "Gurugram, India",
        city: "Gurugram",
        state: "Haryana",
        country: "India",
        website: "https://atlasmobility.example.com",
        culture:
            "Offline-first is a design constraint, not a feature. Engineers spend a day a quarter riding along with drivers.",
        benefits: [
            "Hybrid, two days in the Gurugram office",
            "Relocation support",
            "Health cover including mental health",
        ],
        techStack: ["React Native", "Node.js", "PostgreSQL", "Redis", "MapLibre"],
        responseRatePercent: 58,
        avgTimeToHireDays: 34,
        interviewToOfferPercent: 11,
        totalHired: 120,
    },
    {
        slug: "cobalt-security",
        name: "Cobalt Security",
        description:
            "Application security tooling: SAST that produces findings people actually fix, plus a dependency graph that understands monorepos. Sold to security teams, used by developers, which is the tension the product lives inside.",
        industry: "Security",
        companySize: "11-50",
        foundedYear: 2022,
        headquarters: "Remote, India",
        city: "Remote",
        state: "",
        country: "India",
        website: "https://cobaltsec.example.com",
        culture:
            "Asynchronous by default across four timezones. Everything is decided in writing and nothing important happens in a meeting.",
        benefits: [
            "Fully distributed",
            "Async-first, two required overlap hours",
            "Annual team offsite",
        ],
        techStack: ["Rust", "TypeScript", "tree-sitter", "PostgreSQL", "gRPC"],
        responseRatePercent: 95,
        avgTimeToHireDays: 15,
        interviewToOfferPercent: 31,
        totalHired: 6,
    },
];

export interface SeedJob {
    slug: string;
    companySlug: string;
    title: string;
    description: string;
    locationType: "REMOTE" | "HYBRID" | "ONSITE";
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    location: string;
    experienceMin: number;
    experienceMax: number;
    salaryMin: number;
    salaryMax: number;
    skillsRequired: string[];
    skillsPreferred: string[];
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    featured: boolean;
    /** Days ago it was published. Spreads the list over a believable window. */
    publishedDaysAgo: number;
}

export const JOBS: SeedJob[] = [
    {
        slug: "lumen-labs-backend-engineer-traces",
        companySlug: "lumen-labs",
        title: "Backend Engineer, Trace Ingestion",
        description:
            "You will own the path a span takes from an agent in somebody else's cluster to a row in ours. That is roughly 400k spans a second at peak, a schema we do not control, and a latency budget measured in single-digit milliseconds. The work is mostly Go, some Rust at the edges, and a lot of thinking about backpressure.",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        location: "Remote, India",
        experienceMin: 2,
        experienceMax: 5,
        salaryMin: 2400000,
        salaryMax: 3600000,
        skillsRequired: ["Go", "PostgreSQL", "Distributed Systems", "gRPC"],
        skillsPreferred: ["ClickHouse", "OpenTelemetry", "Rust"],
        requirements: [
            "Two or more years writing services that other services depend on",
            "Comfortable reasoning about backpressure, retries and idempotency",
            "Have debugged something in production that only failed under load",
        ],
        responsibilities: [
            "Own the ingestion pipeline end to end, including its on-call",
            "Design the schema changes that let us add a column without a migration window",
            "Write the design docs; the review happens on the doc",
        ],
        benefits: ["Fully remote", "Conference budget", "Four-day December"],
        featured: true,
        publishedDaysAgo: 2,
    },
    {
        slug: "lumen-labs-frontend-engineer",
        companySlug: "lumen-labs",
        title: "Frontend Engineer, Query UI",
        description:
            "The query builder is the product for most of our users, and it currently makes them learn a query language to answer a question they could describe in a sentence. You would work on changing that: a React surface over a large, fast dataset, where every interaction has to feel instant against millions of rows.",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        location: "Remote, India",
        experienceMin: 1,
        experienceMax: 4,
        salaryMin: 1800000,
        salaryMax: 2800000,
        skillsRequired: ["React", "TypeScript", "CSS"],
        skillsPreferred: ["Data visualisation", "WebAssembly", "Virtualised lists"],
        requirements: [
            "Shipped a React application people used daily",
            "Can explain why a list of 50,000 rows is slow and what to do about it",
            "Care about keyboard access and focus order",
        ],
        responsibilities: [
            "Own the query builder and the result table",
            "Work directly with the two designers, not through tickets",
        ],
        benefits: ["Fully remote", "Home office budget"],
        featured: false,
        publishedDaysAgo: 6,
    },
    {
        slug: "northwind-payments-backend-engineer",
        companySlug: "northwind-payments",
        title: "Senior Backend Engineer, Settlements",
        description:
            "Settlements is where the money actually moves, and where being eventually consistent is not an option. You would work on the ledger: double-entry, immutable, reconciled against four banks nightly. Java and Kotlin, Postgres, and a lot of care.",
        locationType: "HYBRID",
        employmentType: "FULL_TIME",
        location: "Mumbai, India",
        experienceMin: 4,
        experienceMax: 8,
        salaryMin: 3500000,
        salaryMax: 5500000,
        skillsRequired: ["Java", "PostgreSQL", "Kafka", "System Design"],
        skillsPreferred: ["Kotlin", "Double-entry accounting", "PCI DSS"],
        requirements: [
            "Four or more years on backend systems that handle money or something as unforgiving",
            "Understand transaction isolation levels well enough to argue about them",
            "Have carried a pager",
        ],
        responsibilities: [
            "Own the ledger service and its reconciliation jobs",
            "Write the incident review when it breaks, and mean it",
        ],
        benefits: ["Hybrid Mumbai", "ESOPs with buyback", "Family health cover"],
        featured: true,
        publishedDaysAgo: 1,
    },
    {
        slug: "northwind-payments-sre",
        companySlug: "northwind-payments",
        title: "Site Reliability Engineer",
        description:
            "We are at the size where the thing that breaks is never the thing we watched. You would work on the tooling that makes an outage short: better signals, faster rollbacks, and load tests that resemble a real Diwali weekend.",
        locationType: "HYBRID",
        employmentType: "FULL_TIME",
        location: "Mumbai, India",
        experienceMin: 3,
        experienceMax: 7,
        salaryMin: 3000000,
        salaryMax: 4800000,
        skillsRequired: ["Kubernetes", "Terraform", "Linux", "Prometheus"],
        skillsPreferred: ["Go", "Chaos engineering", "AWS"],
        requirements: [
            "Three or more years keeping production up",
            "Can read a flame graph and a p99 chart and disagree with both",
        ],
        responsibilities: [
            "Own the deployment pipeline and the rollback path",
            "Run the game days",
        ],
        benefits: ["Hybrid Mumbai", "Health cover", "Parental leave"],
        featured: false,
        publishedDaysAgo: 11,
    },
    {
        slug: "verdant-health-fullstack-intern",
        companySlug: "verdant-health",
        title: "Software Engineering Intern, Full Stack",
        description:
            "A six-month internship on the scheduling product, which is the part clinicians touch most and complain about most. You would ship real changes to real users under review, not a side project that gets deleted in September.",
        locationType: "REMOTE",
        employmentType: "INTERNSHIP",
        location: "Remote, India",
        experienceMin: 0,
        experienceMax: 1,
        salaryMin: 480000,
        salaryMax: 600000,
        skillsRequired: ["JavaScript", "React", "Python"],
        skillsPreferred: ["Django", "PostgreSQL", "Testing"],
        requirements: [
            "In your final year, or graduated within the last year",
            "Have built something that someone other than you has used",
            "Willing to pair, most days",
        ],
        responsibilities: [
            "Ship small changes to the scheduling UI weekly",
            "Write the tests for what you ship",
        ],
        benefits: ["Remote", "Mentor assigned on day one", "Return offer for most interns"],
        featured: true,
        publishedDaysAgo: 4,
    },
    {
        slug: "verdant-health-backend-engineer",
        companySlug: "verdant-health",
        title: "Backend Engineer, Records",
        description:
            "Patient records: append-only, audited, and readable by exactly the people allowed to read them. Python and Postgres, with the access-control model as the hard part rather than the throughput.",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        location: "Remote, India",
        experienceMin: 2,
        experienceMax: 6,
        salaryMin: 2000000,
        salaryMax: 3200000,
        skillsRequired: ["Python", "Django", "PostgreSQL"],
        skillsPreferred: ["HL7 / FHIR", "Access control", "Audit logging"],
        requirements: [
            "Two or more years on a backend with real users",
            "Have designed a permissions model and lived with it afterwards",
        ],
        responsibilities: [
            "Own the records service and its audit trail",
            "Pair on anything touching patient data",
        ],
        benefits: ["Remote-first", "Learning budget", "Sabbatical at four years"],
        featured: false,
        publishedDaysAgo: 9,
    },
    {
        slug: "quanta-retail-data-engineer",
        companySlug: "quanta-retail",
        title: "Data Engineer",
        description:
            "Twelve engineers, a few hundred million rows a day, and forecasts that a store manager acts on at 6am. You would own pipelines from raw point-of-sale feeds through to the models, in Python and dbt, with nobody between you and the problem.",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        location: "Remote, India",
        experienceMin: 1,
        experienceMax: 4,
        salaryMin: 1600000,
        salaryMax: 2600000,
        skillsRequired: ["Python", "SQL", "Airflow"],
        skillsPreferred: ["dbt", "Snowflake", "Forecasting"],
        requirements: [
            "One or more years moving data for a living",
            "SQL you would defend in a review",
            "Comfortable owning something end to end",
        ],
        responsibilities: [
            "Own the ingestion and transformation layers",
            "Explain a forecast to a non-engineer when it is wrong",
        ],
        benefits: ["Fully remote", "Equity from day one", "Flexible hours"],
        featured: false,
        publishedDaysAgo: 3,
    },
    {
        slug: "atlas-mobility-mobile-engineer",
        companySlug: "atlas-mobility",
        title: "Mobile Engineer, Driver App",
        description:
            "The driver app has to work with no signal for four hours and then reconcile cleanly when it comes back. React Native, an offline queue we wrote ourselves, and 40,000 devices in conditions no simulator reproduces.",
        locationType: "HYBRID",
        employmentType: "FULL_TIME",
        location: "Gurugram, India",
        experienceMin: 2,
        experienceMax: 6,
        salaryMin: 2200000,
        salaryMax: 3400000,
        skillsRequired: ["React Native", "TypeScript", "Offline sync"],
        skillsPreferred: ["Android", "iOS", "SQLite", "Maps"],
        requirements: [
            "Two or more years shipping a mobile app to a store",
            "Have dealt with conflict resolution on a device that was offline",
        ],
        responsibilities: [
            "Own the offline queue and the sync protocol",
            "Ride along with drivers a day a quarter",
        ],
        benefits: ["Hybrid Gurugram", "Relocation support", "Mental health cover"],
        featured: true,
        publishedDaysAgo: 7,
    },
    {
        slug: "atlas-mobility-backend-contract",
        companySlug: "atlas-mobility",
        title: "Backend Engineer (6-month contract)",
        description:
            "A fixed six-month engagement to rebuild the routing service's API layer before the peak season. Node and Postgres, a clear scope, and an existing test suite that mostly passes.",
        locationType: "REMOTE",
        employmentType: "CONTRACT",
        location: "Remote, India",
        experienceMin: 3,
        experienceMax: 10,
        salaryMin: 1800000,
        salaryMax: 2400000,
        skillsRequired: ["Node.js", "TypeScript", "PostgreSQL", "REST"],
        skillsPreferred: ["Routing algorithms", "OpenAPI"],
        requirements: [
            "Three or more years on backend APIs",
            "Available for six months from the start date, not four",
        ],
        responsibilities: [
            "Rebuild the routing API behind the existing contract",
            "Leave documentation the internal team can pick up",
        ],
        benefits: ["Remote", "Fixed scope", "Paid monthly"],
        featured: false,
        publishedDaysAgo: 14,
    },
    {
        slug: "cobalt-security-rust-engineer",
        companySlug: "cobalt-security",
        title: "Engineer, Static Analysis",
        description:
            "Our analyser walks a monorepo's syntax trees and tries to say something true about it in under a minute. You would work on the engine: tree-sitter, Rust, and the constant fight between precision and the patience of the person waiting for CI.",
        locationType: "REMOTE",
        employmentType: "FULL_TIME",
        location: "Remote",
        experienceMin: 2,
        experienceMax: 7,
        salaryMin: 2800000,
        salaryMax: 4500000,
        skillsRequired: ["Rust", "Compilers", "Data structures"],
        skillsPreferred: ["tree-sitter", "Static analysis", "LLVM"],
        requirements: [
            "Two or more years in a systems language",
            "Have written something that parses a language, even badly",
            "Can work asynchronously and write it down",
        ],
        responsibilities: [
            "Own analysis rules from idea to shipped",
            "Keep the false-positive rate low enough that people keep the tool on",
        ],
        benefits: ["Fully distributed", "Async-first", "Annual offsite"],
        featured: true,
        publishedDaysAgo: 5,
    },
    {
        slug: "cobalt-security-frontend-intern",
        companySlug: "cobalt-security",
        title: "Frontend Intern, Findings UI",
        description:
            "Three months on the surface where a developer sees a security finding and decides whether to fix it or dismiss it. Small team, real users, and your work is the reason someone fixes a bug or ignores it.",
        locationType: "REMOTE",
        employmentType: "INTERNSHIP",
        location: "Remote",
        experienceMin: 0,
        experienceMax: 1,
        salaryMin: 420000,
        salaryMax: 540000,
        skillsRequired: ["React", "TypeScript"],
        skillsPreferred: ["Design systems", "Accessibility"],
        requirements: [
            "Currently studying, or recently finished",
            "Have shipped a UI someone else used",
        ],
        responsibilities: [
            "Own one surface, properly, rather than touching five",
        ],
        benefits: ["Remote", "Async-first", "Return offer possible"],
        featured: false,
        publishedDaysAgo: 8,
    },
    {
        slug: "quanta-retail-ml-intern",
        companySlug: "quanta-retail",
        title: "ML Intern, Forecasting",
        description:
            "Four months working on the demand model with the two people who wrote it. You would own an experiment end to end: a hypothesis, a backtest, and an honest answer about whether it beat the baseline.",
        locationType: "REMOTE",
        employmentType: "INTERNSHIP",
        location: "Remote, India",
        experienceMin: 0,
        experienceMax: 1,
        salaryMin: 400000,
        salaryMax: 520000,
        skillsRequired: ["Python", "pandas", "Statistics"],
        skillsPreferred: ["Time series", "scikit-learn", "dbt"],
        requirements: [
            "Comfortable with statistics beyond fitting a model and hoping",
            "Can explain why a backtest was optimistic",
        ],
        responsibilities: [
            "Run experiments against the current baseline",
            "Write up what did not work, which is most of it",
        ],
        benefits: ["Fully remote", "Flexible hours"],
        featured: false,
        publishedDaysAgo: 16,
    },
];

export interface SeedProject {
    slug: string;
    title: string;
    description: string;
    shortDescription: string;
    technologies: string[];
    generationType: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    estimatedHours: number;
    blueprintOverview: string;
    recruiterSignal: string;
    keyOutcomes: string[];
    stacks: Record<string, string>;
    totalViews: number;
    totalStarted: number;
}

export const PROJECTS: SeedProject[] = [
    {
        slug: "realtime-collaboration-board",
        title: "Realtime Collaboration Board",
        shortDescription: "A shared canvas with live cursors, comments and conflict-free edits.",
        description:
            "Build a multiplayer whiteboard: sticky notes, freehand drawing, live cursors and threaded comments, with every edit converging no matter what order it arrives in. The interesting problem is not the canvas, it is what happens when two people drag the same note while one of them is on hotel wifi.",
        technologies: ["Next.js", "TypeScript", "WebSockets", "PostgreSQL", "Yjs"],
        generationType: "FULL_STACK",
        difficulty: "ADVANCED",
        estimatedHours: 45,
        blueprintOverview:
            "A CRDT-backed board with a websocket relay, presence, and an offline queue that reconciles on reconnect.",
        recruiterSignal:
            "Shows you can reason about distributed state and conflict resolution, which is the part of frontend work most portfolios never touch.",
        keyOutcomes: [
            "Implement a CRDT and explain why last-write-wins was not enough",
            "Build presence and live cursors without flooding the socket",
            "Reconcile an offline queue on reconnect",
        ],
        stacks: { frontend: "Next.js", backend: "Node.js", database: "PostgreSQL" },
        totalViews: 340,
        totalStarted: 21,
    },
    {
        slug: "job-board-with-matching",
        title: "Job Board with Skill Matching",
        shortDescription: "Post jobs, apply, and rank candidates by an explainable match score.",
        description:
            "A full job board where the interesting part is the matching: given a job's required skills and a candidate's profile, produce a score AND the sentence that explains it. Anyone can compute a number; the constraint here is that a candidate must be able to read why they scored what they scored.",
        technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Tailwind"],
        generationType: "FULL_STACK",
        difficulty: "INTERMEDIATE",
        estimatedHours: 30,
        blueprintOverview:
            "Companies, jobs, applications and a scoring service, with an explainable ranking and a recruiter dashboard.",
        recruiterSignal:
            "Covers relational modelling, auth boundaries and a non-trivial ranking problem in one project.",
        keyOutcomes: [
            "Model a many-to-many domain without a junction table becoming a dumping ground",
            "Write a scoring function that explains itself",
            "Separate what a candidate can see from what a recruiter can",
        ],
        stacks: { frontend: "Next.js", backend: "Next.js API", database: "PostgreSQL" },
        totalViews: 512,
        totalStarted: 48,
    },
    {
        slug: "observability-mini-stack",
        title: "Observability Mini Stack",
        shortDescription: "Ingest traces, store them, and answer 'what changed' in one query.",
        description:
            "Build a small tracing backend: an OTLP endpoint, a columnar store, and a UI that finds the slow span. The scale is small but the shape is real, and the lesson is how much of observability is schema design rather than graphing.",
        technologies: ["Go", "ClickHouse", "React", "OpenTelemetry", "Docker"],
        generationType: "FULL_STACK",
        difficulty: "ADVANCED",
        estimatedHours: 50,
        blueprintOverview:
            "An OTLP ingest service, a columnar schema, a query API and a flame-graph UI.",
        recruiterSignal:
            "Very few candidates have built the tool rather than used it. This one reads as systems work.",
        keyOutcomes: [
            "Design a schema for high-cardinality data",
            "Handle backpressure on an ingest path",
            "Render a flame graph that stays fast at 10,000 spans",
        ],
        stacks: { frontend: "React", backend: "Go", database: "ClickHouse" },
        totalViews: 198,
        totalStarted: 7,
    },
    {
        slug: "personal-finance-tracker",
        title: "Personal Finance Tracker",
        shortDescription: "Import statements, categorise spending, and forecast next month.",
        description:
            "Parse bank statement CSVs, categorise transactions, and project the month ahead. A good first full-stack project because the domain is familiar, the data is messy in instructive ways, and the double-entry model teaches you why a balance should never be a stored integer you increment.",
        technologies: ["React", "Node.js", "PostgreSQL", "Chart.js"],
        generationType: "FULL_STACK",
        difficulty: "BEGINNER",
        estimatedHours: 20,
        blueprintOverview:
            "CSV import, a categorisation rules engine, a double-entry ledger and a forecast view.",
        recruiterSignal:
            "Shows you can model money correctly, which a surprising number of senior candidates get wrong.",
        keyOutcomes: [
            "Parse and normalise inconsistent CSV input",
            "Build a rules engine a user can edit",
            "Store money as a ledger rather than a running total",
        ],
        stacks: { frontend: "React", backend: "Node.js", database: "PostgreSQL" },
        totalViews: 890,
        totalStarted: 134,
    },
    {
        slug: "offline-first-delivery-app",
        title: "Offline-First Delivery App",
        shortDescription: "A driver app that works for four hours with no signal, then reconciles.",
        description:
            "A mobile app for delivery drivers that has to keep working when the network does not: a local queue, optimistic UI, and a sync protocol that resolves conflicts without losing a delivery. Build the sync layer yourself rather than reaching for a library, because that is the whole exercise.",
        technologies: ["React Native", "TypeScript", "SQLite", "Node.js"],
        generationType: "APP",
        difficulty: "ADVANCED",
        estimatedHours: 40,
        blueprintOverview:
            "A local-first mobile client with an outbox queue, a sync endpoint and a documented conflict policy.",
        recruiterSignal:
            "Offline-first is the single most-asked-about mobile topic and the least commonly built.",
        keyOutcomes: [
            "Design an outbox that survives a force-quit",
            "Write a conflict policy and defend it",
            "Test against a network you deliberately break",
        ],
        stacks: { frontend: "React Native", backend: "Node.js", database: "SQLite" },
        totalViews: 276,
        totalStarted: 18,
    },
    {
        slug: "markdown-notes-with-search",
        title: "Markdown Notes with Full-Text Search",
        shortDescription: "Local-first notes with instant search and backlinks.",
        description:
            "A note-taking app with wiki-style links, a backlink panel, and search that returns results as you type across thousands of notes. Deceptively small: the search index is the project, and doing it in the browser is the constraint that makes it interesting.",
        technologies: ["React", "TypeScript", "IndexedDB", "Web Workers"],
        generationType: "FRONTEND",
        difficulty: "INTERMEDIATE",
        estimatedHours: 25,
        blueprintOverview:
            "A local-first editor, an inverted index in a worker, and a backlink graph.",
        recruiterSignal:
            "Demonstrates real browser-platform depth: workers, storage, and keeping a UI at 60fps while indexing.",
        keyOutcomes: [
            "Build an inverted index and keep it off the main thread",
            "Persist to IndexedDB without blocking typing",
            "Render a backlink graph that stays readable",
        ],
        stacks: { frontend: "React", backend: "", database: "IndexedDB" },
        totalViews: 421,
        totalStarted: 62,
    },
    {
        slug: "habit-tracker-weekly-review",
        title: "Habit Tracker with a Weekly Review",
        shortDescription: "Track a few habits a day, and get a weekly page that tells the truth.",
        description:
            "Tick off a handful of habits each day and get a weekly review that shows what actually held. The interesting problem is the roll-up: a streak that silently forgives a missed day is a lie, and a tracker nobody believes is a tracker nobody opens.",
        technologies: ["React", "TypeScript", "localStorage"],
        generationType: "FRONTEND",
        difficulty: "BEGINNER",
        estimatedHours: 15,
        blueprintOverview:
            "A local-first habit log with a weekly roll-up, built so the numbers survive a missed day and a refresh.",
        recruiterSignal:
            "Small enough to finish, and it shows you can design a data model and an honest summary rather than only wiring a form.",
        keyOutcomes: [
            "Model a habit and its daily entries so a gap is a gap, not a zero",
            "Compute a weekly roll-up that stays honest about missed days",
            "Persist and restore state without a backend",
        ],
        stacks: { frontend: "React", backend: "None", database: "localStorage" },
        totalViews: 180,
        totalStarted: 34,
    },
    {
        slug: "url-shortener-with-analytics",
        title: "URL Shortener with Click Analytics",
        shortDescription: "Shorten a link, redirect in milliseconds, and still know where the clicks came from.",
        description:
            "Take a long URL, give back a short one, and send anybody who follows it on its way. The constraint is that the redirect has to stay fast while you are also recording the click, which is what makes the counting the interesting half rather than the shortening.",
        technologies: ["Node.js", "Redis", "PostgreSQL", "TypeScript"],
        generationType: "BACKEND",
        difficulty: "BEGINNER",
        estimatedHours: 18,
        blueprintOverview:
            "A redirect service with a cache in front of it and click recording that never sits on the request path.",
        recruiterSignal:
            "Shows you understand that a write can be moved off the hot path, which is the first real performance idea most people meet.",
        keyOutcomes: [
            "Generate short codes that do not collide",
            "Serve a redirect from cache in single-digit milliseconds",
            "Record clicks without making the redirect wait for the write",
        ],
        stacks: { frontend: "None", backend: "Node.js", database: "PostgreSQL" },
        totalViews: 260,
        totalStarted: 41,
    },
    {
        slug: "expense-splitter",
        title: "Expense Splitter for a Shared House",
        shortDescription: "Record who paid for what, and settle up in the fewest transfers.",
        description:
            "Four people, a month of shopping, and nobody can remember who owes whom. Recording the expenses is the easy half. Settling up in the fewest possible transfers is a graph problem, and the naive answer - everybody pays everybody - is exactly the thing this project exists to beat.",
        technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"],
        generationType: "FULL_STACK",
        difficulty: "INTERMEDIATE",
        estimatedHours: 25,
        blueprintOverview:
            "A shared ledger with uneven splits and a settle-up that minimises the number of transfers.",
        recruiterSignal:
            "A real algorithm behind an ordinary-looking app, and you can explain the trade-off you took to keep it fast.",
        keyOutcomes: [
            "Model expenses with uneven splits without losing a penny to rounding",
            "Reduce a web of debts to the fewest transfers that settle it",
            "Show the working, so the house can check the maths",
        ],
        stacks: { frontend: "Next.js", backend: "Next.js API", database: "PostgreSQL" },
        totalViews: 210,
        totalStarted: 27,
    },
    {
        slug: "rate-limiter-service",
        title: "Rate Limiter as a Service",
        shortDescription: "Answer \"is this caller over their limit?\" in under a millisecond, and prove it.",
        description:
            "One endpoint, one question, a very tight budget: given a key, is this request allowed? The naive counter resets on the minute and lets through twice the limit across the boundary, so the real work is a sliding window - and then proving it holds while several instances answer at once.",
        technologies: ["Go", "Redis", "Docker"],
        generationType: "BACKEND",
        difficulty: "ADVANCED",
        estimatedHours: 30,
        blueprintOverview:
            "A sliding-window limiter behind an HTTP API, with a load test that demonstrates the boundary case the fixed window gets wrong.",
        recruiterSignal:
            "Infrastructure work with a measurable claim attached, which is rarer in a portfolio than another CRUD app.",
        keyOutcomes: [
            "Implement a sliding window and show why the fixed window is not enough",
            "Keep the decision correct when several instances share one Redis",
            "Measure the latency, and defend the number",
        ],
        stacks: { frontend: "None", backend: "Go", database: "Redis" },
        totalViews: 190,
        totalStarted: 16,
    },
];
