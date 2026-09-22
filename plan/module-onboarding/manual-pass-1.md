# Module onboarding - manual pass 1 (2026-09-22)

What was verified, how, and what is still open. Written before anything is
marked done in `tasks.md`.

## Method

The Chrome extension was not connected in this session, so the browser run
in MO-9 could not happen. Everything that does not need a signed-in browser
was verified another way:

- **Model loop**: a scratch script (`apps/main/sim-onboarding-tmp.ts`,
  deleted after the run) drove the real `SYSTEM_PROMPT`, `buildUserMessage`,
  the guards and the route's exact retry logic against `gpt-4o-mini`, with a
  second model call playing a persona and picking from the offered options.
  Two personas across all five module keys: ten runs.
- **Schema**: migration `0016_military_mockingbird.sql` applied and the
  table and indexes read back from `information_schema` and `pg_indexes`.
- **Types**: `apps/main`, `apps/worker` and `packages/ui` typecheck clean.
- **Nav**: `pnpm check-nav` passes (36 paths).
- **Contrast**: computed from the exact hex values the classes resolve to.
- **Routes**: the dev server serves `/practice/dsa` and `/projects` (both
  307 to sign-in when signed out) and `POST /api/onboarding/next` (307 when
  signed out, the middleware's behaviour for every API route).

## Run 1: before the retry fix

Seven of ten runs finished (8 to 10 questions). Three died with the route's
"gave up" path after three identical attempts:

| run | died on |
|---|---|
| practice:dsa / fresh | model kept sending a two-option yes/no question |
| practice:web-backend / fresh | model kept sending an open question after both were used |
| projects / both personas | two-option question on question 2 or 3 |

Cause: a retry re-sent the same prompt with no reason, so the model sent
the same reply. Also seen: the 350-problem persona with contests and mocks
graded "developing"; a no-experience student asked what they want to learn
about in detail; facts written in the third person by name.

Changes made:
- retries now carry the rejection reason ("a single or multi question needs
  at least 3 options", "open questions are used up", "you tried to finish
  after N answers");
- rule: a yes/no question still needs an honest middle option;
- rule: no experience in this sub-module means ask about nearby experience,
  not wishes;
- rubric anchors against undercalling (hundreds of problems plus contests or
  mocks is at least intermediate; shipped to real users is at least
  intermediate; a professional role is advanced);
- facts addressed to the person, never third person by name.

Latency run 1, per next-question including retries, n=83: p50 1522 ms,
p95 3711 ms, max 4972 ms.

## Run 2: after the fix

Ten of ten finished. Two single retries in 101 generations, both repaired on
the second call.

| run | answers | open used | level | verdict |
|---|---|---|---|---|
| practice:dsa / fresh | 10 | 1 | beginner | specific, no repeats, honest low options present |
| practice:dsa / final-year | 10 | 1 | advanced | asked platforms, language, comfortable and feared topics, brute force, stuck point, contests, target, hours: the focus paragraph in order |
| practice:system-design / fresh | 9 | 1 | beginner | nearby-experience rule visible: asked about databases used, not wishes |
| practice:system-design / final-year | 10 | 1 | developing | fair: no SD projects, one mock, knows vocabulary from use |
| practice:web-frontend / fresh | 9 | 2 | beginner | asked what the one page was, then time and CSS confidence |
| practice:web-frontend / final-year | 9 | 1 | developing | asked state management and component-from-design; "developing" is one notch low for two shipped UIs |
| practice:web-backend / fresh | 9 | 2 | beginner | one retry (open after cap) repaired |
| practice:web-backend / final-year | 8 | 2 | intermediate | production bug question landed; rubric applied |
| projects / fresh | 9 | 0 | beginner | asked what stopped projects, hours, plan preference |
| projects / final-year | 8 | 1 | developing | one retry (two options) repaired; "1-2 deployed publicly" read as developing, borderline against the shipped rule |

Latency run 2, n=101: **p50 1308 ms, p95 2809 ms, max 3154 ms.** Under the
two-second p50 in item 11 of the overview.

Open quality notes, not blocking: the "why" line on the first question is
sometimes empty or generic (the prompt allows it); two final-year levels sit
one notch low. Both are prompt-tuning candidates for a later pass with real
users' transcripts rather than personas.

## Contrast

Computed from resolved hex values. AA is 4.5:1 for body text.

| text | light | dark |
|---|---:|---:|
| question text (neutral-900 / neutral-50) | 17.9 | 19.0 |
| why line, rail captions (neutral-600 / neutral-400) | 7.8 | 7.9 (7.1 on the neutral-900 card) |
| option label on tf-surface | 17.9 | 17.3 |
| option letter chip, unselected (neutral-700 / neutral-300 on tint) | 9.0 | 10.0 |
| option letter chip, selected | 17.9 | 17.2 |
| rail current row | 16.2 | 15.2 |
| widget dim text | 7.8 | 7.1 |
| textarea placeholder (neutral-500 / neutral-400) | 4.7 | 7.1 (was 3.8 with neutral-500; changed) |

## Not verified, needs a signed-in browser

These are written and typecheck, and their server logic was exercised by
the simulation, but nobody has clicked them:

1. Gate renders on `/practice/dsa` for a user with no completed run; Start
   swaps to the flow without navigation; `?topic=` still gates.
2. Question skeleton between answers, single-choice auto-advance and its
   cancel window, multi OK, keyboard 1 to 9 and Enter.
3. Open question with the mic: Scribe token, partial transcript into the
   field, `viaVoice: true` on the stored answer, mic stops on question
   change.
4. Reload mid-run resumes at the same unanswered question.
5. Rail row click reopens an earlier answer with the old answer preselected
   and the later questions gone.
6. Summary card, Continue into the dashboard, widget with Retake and
   "what you told us"; Retake keeps version 1 showing until version 2 ends;
   abandoning version 2 leaves a Resume link.
7. Projects hub gate and widget; `/projects/myprojects` stays reachable.
8. Below-lg layout: compact rail strip, no horizontal scroll.
9. Reduced motion drops the slide.

Run these with the Chrome extension connected (or by hand) and record the
result here before ticking MO-4 to MO-9.

## Appendix: run 2 transcript


## practice:dsa / fresh first-semester
1. [single, 1883ms] How many data structures and algorithms problems have you solved?
   why: This helps understand your current experience level.
   options: None | 1 to 10 | 11 to 50 | 51 to 100 | Over 100
   -> None
2. [multi, 1265ms] Which platforms have you used for practice?
   why: You said you haven't solved any problems yet, so:
   options: LeetCode | GeeksforGeeks | Codeforces | TakeUforward | College assignments | None
   -> None
3. [single, 1879ms] What programming language do you want to use for DSA?
   why: You said you haven't solved any problems yet, so:
   options: Python | Java | C++ | JavaScript | Other
   -> Python
4. [multi, 1863ms] Which topics in DSA are you most comfortable with?
   why: You said you haven't solved any problems yet, so:
   options: Arrays | Hashing | Trees | Graphs | None
   -> None
5. [multi, 2411ms] Which DSA topics do you want to learn about first?
   why: You said you haven't solved any problems yet, so:
   options: Arrays | Trees | Graphs | Dynamic Programming | Recursion
   -> Arrays, Trees, Recursion
6. [multi, 1395ms] Which DSA topics do you feel least comfortable with?
   why: You said you haven't practiced any DSA topics yet, so:
   options: Hashing | Graphs | Dynamic Programming | Recursion | None
   -> Hashing, Graphs, Dynamic Programming
7. [single, 1410ms] How much time can you dedicate to DSA practice each week?
   why: You have not solved any problems yet, so:
   options: 1-2 hours | 3-5 hours | 6-10 hours | More than 10 hours
   -> 1-2 hours
8. [single, 1356ms] Have you tried solving any problems using brute force?
   why: You said you haven't solved any problems yet, so:
   options: Yes, often | Once or twice | Not sure
   -> Not sure
9. [open, 1024ms] What do you think is the hardest part of solving DSA problems?
   why: You haven't indicated any specific struggles yet.
   options: 
   -> Understanding the problem statement and requirements.
10. [single, 1247ms] Have you participated in any timed contests or mock interviews?
   why: You have not solved any problems yet, so:
   options: Yes, several times | Once or twice | Not at all
   -> Not at all
   DONE after 10 answers. level=beginner
   summary: You have not solved any DSA problems yet. / You want to learn Arrays, Trees, and Recursion first. / You can dedicate 1-2 hours each week for practice.
   facts: You have solved no DSA problems.; You have not used any platforms for practice.; You want to use Python for DSA.; You want to learn about Arrays, Trees, and Recursion first.; You feel least comfortable with Hashing, Graphs, and Dynamic Programming.; You can dedicate 1-2 hours each week to DSA practice.; You are not sure if you have tried solving problems using brute force.; You think understanding the problem statement is the hardest part.; You have not participated in any timed contests or mock interviews.
   gaps: No practice experience; Uncertainty in problem-solving; Weakness in multiple topics
   open questions used: 1

## practice:dsa / final-year with internships
1. [single, 1571ms] How many DSA problems have you solved so far?
   why: This will help gauge your experience level.
   options: None | 1 to 10 | 11 to 50 | 51 to 100 | More than 100
   -> More than 100
2. [multi, 1254ms] Which platforms have you used for DSA practice?
   why: You said you solved more than 100 problems, so:
   options: LeetCode | GeeksforGeeks | Codeforces | TakeUforward | College assignments | None
   -> LeetCode, GeeksforGeeks, Codeforces
3. [single, 1217ms] Which programming language do you use for solving DSA problems?
   why: You mentioned your internships involved backend work.
   options: Python | Java | C++ | JavaScript | Go | Other
   -> C++
4. [multi, 1744ms] Which DSA topics are you most comfortable with?
   why: You have solved more than 100 problems.
   options: Arrays | Hashing | Trees | Graphs | Dynamic Programming | Recursion
   -> Arrays, Hashing, Trees, Graphs
5. [multi, 2852ms] Which DSA topics do you avoid or fear the most?
   why: You listed the topics you're comfortable with, so:
   options: Dynamic Programming | Recursion | Graphs | Trees | None
   -> Dynamic Programming
6. [single, 1250ms] Can you usually get a brute force solution working?
   why: You have solved more than 100 problems, so:
   options: Always | Usually | Sometimes | Rarely | Never
   -> Usually
7. [multi, 1575ms] Where do you usually get stuck after a brute force solution?
   why: You said you usually get a brute force solution working, so:
   options: Optimizing | Proving complexity | Edge cases | Writing code without bugs | Understanding the question
   -> Optimizing, Edge cases
8. [single, 1215ms] Have you done any timed contests or mock interviews?
   why: You have solved more than 100 problems.
   options: Yes, both | Yes, timed contests only | Yes, mock interviews only | No, none
   -> Yes, both
9. [single, 1392ms] What is your weakest area in DSA practice?
   why: You mentioned where you usually get stuck after a brute force solution.
   options: Optimizing | Proving complexity | Edge cases | Writing code without bugs | Understanding the question
   -> Writing code without bugs
10. [single, 1244ms] What are you preparing for with DSA practice?
   why: You mentioned your career goals are SDE at a product company.
   options: Campus placements | Specific company | Internships | General improvement
   -> Campus placements
   DONE after 10 answers. level=advanced
   summary: You have solved more than 100 DSA problems. / You are comfortable with Arrays, Hashing, Trees, and Graphs. / You need to work on writing code without bugs.
   facts: You have solved more than 100 DSA problems.; You have practiced on LeetCode, GeeksforGeeks, and Codeforces.; You use C++ for solving DSA problems.; You are comfortable with Arrays, Hashing, Trees, and Graphs.; You avoid Dynamic Programming.; You usually get a brute force solution working.; You get stuck on Optimizing and Edge cases after brute force.; You have done both timed contests and mock interviews.; Your weakest area is Writing code without bugs.; You are preparing for campus placements.
   gaps: Struggle with Dynamic Programming; Need to improve bug-free coding
   open questions used: 0

## practice:system-design / fresh first-semester
1. [single, 1206ms] How much experience do you have with system design?
   why: This is your first question about your experience.
   options: None | A little | Some projects | Many projects
   -> None
2. [multi, 1356ms] What programming languages do you know that could help with system design?
   why: You said you have no experience with system design, so:
   options: Java | Python | JavaScript | C++ | Ruby | Not sure
   -> Not sure
3. [single, 1140ms] Have you followed any courses or tutorials on system design?
   why: You said you have no experience with system design.
   options: Yes | No | Not sure
   -> No
4. [open, 1091ms] What stopped you from exploring system design so far?
   why: You said you have no experience with system design.
   options: 
   -> I have just started my CS studies and haven't explored system design yet.
5. [single, 1470ms] How much time do you have to learn about system design?
   why: You said you haven't explored system design yet, so:
   options: A few hours | A few days | A few weeks | A few months
   -> A few weeks
6. [multi, 1247ms] What specific areas of system design are you most interested in?
   why: You said you haven't explored system design yet, so:
   options: Load balancing | Databases | Caching | Message queues | Not sure
   -> Not sure
7. [single, 1344ms] What type of system design role are you preparing for?
   why: You mentioned you are just starting your CS studies, so:
   options: SDE-2 or senior loop | Startup role | General understanding
   -> General understanding
8. [single, 1706ms] Which classic system design could you sketch today?
   why: You said you haven't explored system design yet, so:
   options: URL shortener | Chat | News feed | Ride sharing | Rate limiter
   -> URL shortener
9. [open, 1107ms] What trade-off in design can you explain from your studies or projects?
   why: You said you have just started your CS studies.
   options: 
   -> I haven't done any projects yet.
   DONE after 9 answers. level=beginner
   summary: You have just started your CS studies and haven't explored system design yet. / You have a few weeks to learn about it. / You could sketch a URL shortener today.
   facts: You have just started your CS studies.; You have not explored system design yet.; You have a few weeks to learn about system design.; You are preparing for a general understanding of system design.; You could sketch a URL shortener today.
   gaps: No experience in system design; No courses or tutorials followed
   open questions used: 2

## practice:system-design / final-year with internships
1. [open, 1347ms] What have you built or deployed that had multiple users?
   why: 
   options: 
   -> I built and deployed two side projects with real users, hosted on Railway and Vercel.
2. [open, 1121ms] What kind of systems did you design for those projects?
   why: You mentioned you built and deployed two side projects.
   options: 
   -> For my side projects, I designed a user authentication system and a real-time chat application, focusing on scalability and user experience.
3. [multi, 1384ms] Which of these system design concepts are you familiar with?
   why: You mentioned designing systems for your projects, so:
   options: Load balancers | Caching | Message queues | Relational databases | Document databases | Rate limiting
   -> Load balancers, Caching, Message queues
4. [multi, 1279ms] Which of these concepts have you used in your projects?
   why: You mentioned being familiar with these concepts.
   options: Load balancers | Caching | Message queues | Relational databases | Document databases
   -> Caching, Relational databases, Document databases
5. [multi, 1493ms] Which of these design trade-offs have you made in your projects?
   why: You mentioned focusing on scalability and user experience.
   options: Scalability vs. simplicity | Cost vs. performance | Speed vs. reliability
   -> Scalability vs. simplicity, Cost vs. performance
6. [single, 1181ms] How comfortable are you with the vocabulary of system design?
   why: You have built and deployed two side projects.
   options: Very comfortable | Somewhat comfortable | Not sure
   -> Somewhat comfortable
7. [single, 1342ms] Have you done a system design interview or mock? How did it go?
   why: You mentioned your projects, so:
   options: Yes, it went well | Yes, it was challenging | No, not yet
   -> Yes, it was challenging
8. [single, 1272ms] Which classic design could you sketch today?
   why: You mentioned designing a real-time chat application.
   options: URL shortener | Chat application | News feed | Ride sharing | Rate limiter
   -> URL shortener
9. [single, 1311ms] What is your main goal for improving your system design skills?
   why: You mentioned your career goal is to be an SDE at a product company.
   options: Preparing for SDE-2 interviews | Preparing for startup roles | General understanding
   -> Preparing for SDE-2 interviews
10. [multi, 1232ms] What do you consider your weakest area in system design?
   why: You mentioned areas of comfort and challenges.
   options: Trade-offs | Vocabulary | Architectural patterns | Scalability | Databases
   -> Trade-offs, Architectural patterns, Scalability
   DONE after 10 answers. level=developing
   summary: You have built two side projects with real users. / You are familiar with key system design concepts. / You want to improve for SDE-2 interviews.
   facts: You built and deployed two side projects with real users.; You designed a user authentication system and a real-time chat application.; You are familiar with load balancers, caching, and message queues.; You used caching, relational databases, and document databases in your projects.; You made trade-offs between scalability vs. simplicity and cost vs. performance.; You are somewhat comfortable with the vocabulary of system design.; You found your system design interview challenging.; You could sketch a URL shortener today.
   gaps: Trade-offs; Architectural patterns; Scalability
   open questions used: 2

## practice:web-frontend / fresh first-semester
1. [open, 1089ms] What frontend projects have you worked on so far?
   why: I want to understand your experience with frontend projects.
   options: 
   -> I have only created one HTML page from a YouTube tutorial.
2. [multi, 1290ms] What technologies did you use for that HTML page?
   why: You said you created one HTML page.
   options: HTML | CSS | JavaScript | None | Other
   -> HTML
3. [single, 1083ms] What do you feel most comfortable with in frontend development?
   why: You said you created one HTML page.
   options: HTML | CSS | JavaScript | Not sure
   -> HTML
4. [single, 1209ms] What area do you find most challenging in frontend development?
   why: You said you have only created one HTML page.
   options: CSS layout | JavaScript functionality | Forms and validation | Not sure
   -> Not sure
5. [single, 1306ms] How much time do you have to practice frontend development each week?
   why: You have only created one HTML page from a YouTube tutorial.
   options: Less than 5 hours | 5 to 10 hours | More than 10 hours
   -> Less than 5 hours
6. [single, 1156ms] What type of frontend role are you aiming for?
   why: You mentioned your learning goals include web development, so:
   options: Frontend developer | Full stack developer | Own product | Not sure
   -> Not sure
7. [multi, 1097ms] What specific skills do you want to improve in frontend development?
   why: You mentioned not being sure about your challenges, so:
   options: CSS layout | JavaScript functionality | Forms and validation | Responsive design | Testing
   -> CSS layout, JavaScript functionality, Responsive design
8. [single, 1258ms] How often do you practice building layouts with CSS?
   why: You mentioned wanting to improve CSS layout.
   options: Regularly | Occasionally | Haven't tried this yet
   -> Haven't tried this yet
9. [single, 1154ms] How comfortable are you with using JavaScript for functionality?
   why: You mentioned wanting to improve your JavaScript functionality.
   options: Very comfortable | Somewhat comfortable | Not comfortable | Haven't tried this yet
   -> Not comfortable
   DONE after 9 answers. level=beginner
   summary: You have created one HTML page from a tutorial. / You want to improve in CSS layout and JavaScript. / You have less than 5 hours a week for practice.
   facts: You have only created one HTML page from a YouTube tutorial.; You used HTML for that page.; You have less than 5 hours to practice each week.
   gaps: CSS layout skills; JavaScript functionality; Responsive design
   open questions used: 1

## practice:web-frontend / final-year with internships
1. [multi, 1370ms] What frontend technologies have you used in real projects?
   why: I want to understand your experience with frontend technologies.
   options: HTML | CSS | JavaScript | React | Vue | Other
   -> HTML, CSS, JavaScript, React
2. [single, 1072ms] Have you shipped any frontend projects that users interacted with?
   why: You mentioned using HTML, CSS, JavaScript, and React.
   options: Yes, multiple | Yes, one | Not yet
   -> Yes, one
3. [open, 1016ms] What was the main focus of the project you shipped?
   why: You said you shipped one frontend project.
   options: 
   -> The main focus of the project I shipped was to create a user-friendly web application that allows users to track their daily habits and progress over time.
4. [multi, 1272ms] What layout techniques are you comfortable with?
   why: You mentioned using HTML, CSS, and JavaScript, so:
   options: Flexbox | Grid | Responsive design | Not sure
   -> Flexbox, Grid, Responsive design
5. [open, 1164ms] What aspect of frontend development do you struggle with the most?
   why: I want to understand your challenges in frontend development.
   options: 
   -> I struggle with understanding complex state management in frontend frameworks.
6. [single, 1472ms] How do you usually fetch and manage data in your frontend projects?
   why: You mentioned struggling with complex state management.
   options: Using fetch API | Using Axios | State management libraries | Haven't tried this yet
   -> Using Axios
7. [single, 1203ms] How comfortable are you with forms and validation in your projects?
   why: You mentioned your struggles with state management, so:
   options: Very comfortable | Somewhat comfortable | Not comfortable | Haven't tried this yet
   -> Very comfortable
8. [single, 1496ms] How do you handle performance in your frontend projects?
   why: You mentioned you shipped a project, so:
   options: Optimize bundle size | Improve rendering speed | Focus on Core Web Vitals | Not sure
   -> Optimize bundle size
9. [single, 1125ms] What is your goal in frontend development?
   why: You mentioned your career goal is SDE at a product company.
   options: Frontend role | Full stack role | Build my own product | Not sure
   -> Full stack role
   DONE after 9 answers. level=developing
   summary: You have used HTML, CSS, JavaScript, and React in your projects. / You shipped a web app for tracking daily habits. / You are comfortable with layout techniques and forms.
   facts: You have used HTML, CSS, JavaScript, and React in real projects.; You have shipped one frontend project that users interacted with.; The project was a web application to track daily habits.; You are comfortable with Flexbox, Grid, and responsive design.; You struggle with understanding complex state management.; You fetch data using Axios.; You are very comfortable with forms and validation.; You handle performance by optimizing bundle size.; Your goal in frontend development is a full stack role.
   gaps: Struggling with complex state management
   open questions used: 2

## practice:web-backend / fresh first-semester
1. [multi, 1194ms] What backend languages or frameworks have you used in projects?
   why: I'm starting broad to understand your backend experience.
   options: Node with Express | Python with Django | Java with Spring | Go | Others
   -> Others
2. [open, 1029ms] What kind of projects have you built using those backend technologies?
   why: You mentioned using 'Others' for backend languages or frameworks.
   options: 
   -> I haven't built any projects using backend technologies.
3. [open, 964ms] What backend tutorials or courses have you followed?
   why: You said you haven't built any projects using backend technologies.
   options: 
   -> I haven't followed any backend tutorials or courses.
4. [multi, 1272ms] What programming languages do you know well enough for backend work?
   why: You said you haven't built any projects using backend technologies.
   options: JavaScript | Python | Java | Go | Others
   -> JavaScript
5. [single, 1464ms] How much time do you have to learn backend development in the next few months?
   why: You haven't built any projects or followed tutorials yet, so:
   options: Less than 5 hours a week | 5 to 10 hours a week | More than 10 hours a week
   -> Less than 5 hours a week
6. [multi, 1396ms] What specific areas of backend development are you most interested in?
   why: You haven't built any projects, so:
   options: APIs (REST or GraphQL) | Databases (SQL or NoSQL) | Authentication | Deployment (Docker, cloud) | Error handling and validation
   -> APIs (REST or GraphQL)
7. [multi, 1392ms] What backend concepts do you feel least comfortable with?
   why: You expressed interest in APIs, so:
   options: APIs (REST or GraphQL) | Databases (SQL or NoSQL) | Authentication | Deployment (Docker, cloud) | Error handling and validation
   -> APIs (REST or GraphQL), Databases (SQL or NoSQL), Deployment (Docker, cloud)
8. [single, 2 calls, 2302ms] What specific backend skills do you want to focus on first?
   why: You said you're interested in APIs, so:
   options: Building APIs | Working with databases | Authentication methods | Deployment techniques | Error handling
   -> Building APIs
9. [single, 1107ms] Have you worked on any frontend projects that connect to an API?
   why: You mentioned interest in APIs.
   options: Yes, several | Yes, one or two | No, none
   -> No, none
   DONE after 9 answers. level=beginner
   summary: You are starting out in backend development. / You want to focus on building APIs first. / You have not yet connected a frontend to an API.
   facts: You know JavaScript well enough for backend work.; You have not built any projects using backend technologies.; You haven't followed any backend tutorials or courses.; You have less than 5 hours a week to learn backend development.
   gaps: No practical experience; Comfort with backend concepts
   open questions used: 2

## practice:web-backend / final-year with internships
1. [open, 1053ms] What backend projects have you built in your internships?
   why: I want to understand your practical experience.
   options: 
   -> During my internships, I built a RESTful API for a task management application and developed a microservice for user authentication and authorization.
2. [multi, 1253ms] What programming languages and frameworks did you use?
   why: You mentioned using Node and Go during your internships.
   options: Node with Express | Go | Python with Django | Java with Spring | Others
   -> Node with Express, Python with Django, Others
3. [multi, 1974ms] What database technologies did you work with?
   why: You mentioned using Node and Postgres.
   options: Postgres | MySQL | MongoDB | SQLite | Others
   -> Postgres, MongoDB, SQLite
4. [multi, 1273ms] What aspects of backend development do you feel most comfortable with?
   why: You have experience with building APIs and databases, so:
   options: API design | Database management | Authentication | Error handling | Deployment | Not sure
   -> API design, Database management, Error handling
5. [multi, 1223ms] What do you find most challenging in backend development?
   why: You mentioned your comfort areas, so:
   options: Authentication | Database design | Error handling | Deployment | Not sure
   -> Authentication, Database design, Error handling
6. [single, 1670ms] Have you designed a REST or GraphQL API that was used by another team?
   why: You mentioned building a RESTful API during your internships.
   options: Yes, REST API | Yes, GraphQL API | No, not yet
   -> Yes, REST API
7. [open, 1275ms] What backend tools or technologies are you preparing to learn next?
   why: You have experience with backend but haven't mentioned future learning.
   options: 
   -> I am planning to learn more about microservices architecture and explore tools like Docker and Kubernetes for container orchestration.
8. [single, 1579ms] How much time do you have to dedicate to backend learning each week?
   why: I want to understand your availability for learning.
   options: Less than 5 hours | 5 to 10 hours | More than 10 hours
   -> More than 10 hours
   DONE after 8 answers. level=intermediate
   summary: You have built a RESTful API and a user authentication microservice. / You are comfortable with API design and database management. / You aim to learn more about microservices and container orchestration.
   facts: You built a RESTful API for a task management application.; You developed a microservice for user authentication and authorization.; You have experience with Node with Express, Python with Django, and others.; You worked with Postgres, MongoDB, and SQLite.; You feel comfortable with API design, database management, and error handling.; You find authentication, database design, and error handling challenging.; You designed a REST API that was used by another team.; You plan to learn more about microservices architecture and tools like Docker and Kubernetes.; You have more than 10 hours to dedicate to backend learning each week.
   gaps: Authentication; Database design
   open questions used: 2

## projects / fresh first-semester
1. [single, 1182ms] How many projects have you finished or started so far?
   why: This helps understand your building history.
   options: None | 1-2 | 3-5 | More than 5
   -> None
2. [multi, 1333ms] What stopped you from finishing any projects?
   why: You said you haven't finished any projects, so:
   options: Lack of time | Getting stuck technically | Lost interest | Scope too big
   -> Lack of time, Getting stuck technically, Lost interest
3. [single, 1290ms] How many hours a week can you dedicate to building projects now?
   why: You said you have not finished any projects yet.
   options: 1-2 hours | 3-5 hours | More than 5 hours
   -> 1-2 hours
4. [multi, 1543ms] What type of projects do you want to build next?
   why: You haven't finished any projects yet, so:
   options: Portfolio pieces | Learning a new stack | Personal project | Startup idea
   -> Learning a new stack, Personal project
5. [single, 1310ms] Have you worked on projects alone or in a team?
   why: You said you haven't finished any projects, so:
   options: Alone | In a team | Both
   -> Alone
6. [single, 1259ms] Have you used git for version control in your projects?
   why: You said you have worked on projects alone, so:
   options: Yes, regularly | Yes, once or twice | No, haven't tried
   -> No, haven't tried
7. [single, 1303ms] Have you taken a project from idea to working version without a tutorial?
   why: You said you haven't finished any projects yet.
   options: Yes, successfully | No, but tried | Not yet
   -> Not yet
8. [open, 1178ms] What kind of personal project do you want to work on?
   why: You mentioned wanting to build a personal project.
   options: 
   -> I want to create a simple website.
9. [single, 1387ms] Do you prefer a structured plan for projects or more freedom with checkpoints?
   why: You mentioned wanting to build personal projects.
   options: Structured plan | Freedom with checkpoints | Not sure
   -> Not sure
   DONE after 9 answers. level=beginner
   summary: You have not finished any projects yet. / You can dedicate 1-2 hours a week to building. / You want to create a simple website.
   facts: You have not finished any projects.; You can dedicate 1-2 hours a week to building projects.; You want to learn a new stack and work on a personal project.; You have worked on projects alone.; You haven't tried using git for version control.; You have not yet taken a project from idea to working version without a tutorial.
   gaps: No finished projects; Lack of experience with git; Not yet taken a project from idea to working version
   open questions used: 1

## projects / final-year with internships
1. [single, 1395ms] How many projects have you finished or started so far?
   why: I want to understand your building history.
   options: None | 1-3 | 4-6 | 7 or more
   -> 4-6
2. [single, 2 calls, 2718ms] How many of your projects have been shipped or deployed publicly?
   why: You said you have finished or started 4-6 projects.
   options: None | 1-2 | 3 or more
   -> 1-2
3. [single, 1267ms] Did you build your projects alone or in a team?
   why: You have finished 4-6 projects.
   options: Alone | In a team | Both
   -> Both
4. [multi, 1171ms] What stopped your unfinished projects?
   why: You mentioned you have unfinished projects, so:
   options: Scope issues | Time constraints | Losing interest | Getting stuck technically
   -> Time constraints, Scope issues, Getting stuck technically
5. [multi, 1346ms] What tech stack do you usually reach for when building projects?
   why: You mentioned your internships involved backend work.
   options: Node.js | Go | Postgres | Other
   -> Node.js, Postgres
6. [single, 1727ms] How many hours a week can you dedicate to building projects now?
   why: You have finished or started 4-6 projects.
   options: Less than 5 | 5-10 | 10-15 | More than 15
   -> 10-15
7. [open, 1308ms] What do you want to build next?
   why: You have finished 4-6 projects and shipped 1-2.
   options: 
   -> I want to build a collaborative coding platform that helps users learn algorithms and data structures through interactive challenges.
8. [single, 1417ms] Do you prefer a structured plan for your projects or more freedom with checkpoints?
   why: You mentioned wanting to build a collaborative coding platform, so:
   options: Structured plan | Freedom with checkpoints | Not sure
   -> Structured plan
   DONE after 8 answers. level=developing
   summary: You have finished around 4-6 projects, with 1-2 deployed publicly. / You work well both alone and in teams, using Node.js and Postgres. / You want to build a platform for learning algorithms and prefer a structured plan.
   facts: You have finished 4-6 projects; 1-2 of your projects have been shipped or deployed publicly; You have built projects both alone and in a team; Your unfinished projects were stopped by time constraints, scope issues, and getting stuck technically; You usually reach for Node.js and Postgres when building projects; You can dedicate 10-15 hours a week to building projects; You want to build a collaborative coding platform for learning algorithms and data structures; You prefer a structured plan for your projects
   gaps: Time management for projects; Handling project scope
   open questions used: 1

LATENCY per next-question (incl. retries), n=101: p50=1308ms p95=2809ms max=3154ms
