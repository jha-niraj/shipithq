/**
 * VERBAL: written by hand. Each question has exactly one defensible answer:
 * distractors are chosen to be clearly wrong on reflection (for para jumbles,
 * orders that break a connector or a pronoun reference), and close
 * alternatives that could also be argued are kept out of the options.
 */
import { bank } from "./helpers";
import type { AptitudeDifficulty } from "./types";

const Q = bank("VERBAL");

function add(topic: string, difficulty: AptitudeDifficulty, prompt: string, answer: string, distractors: string[], explanation: string) {
    Q.add(topic, { difficulty, prompt, answer, distractors, explanation });
}

// ── Synonyms ────────────────────────────────────────────────────────────────
const syn = (d: AptitudeDifficulty, word: string, answer: string, wrong: string[], why: string) =>
    add("synonyms", d, `Choose the word closest in meaning to ${word}.`, answer, wrong, why);
syn("EASY", "ABUNDANT", "Plentiful", ["Scarce", "Tiny", "Expensive"], "Abundant means existing in large quantities, which is what plentiful means.");
syn("EASY", "BRIEF", "Short", ["Long", "Clear", "Loud"], "A brief talk or note is a short one.");
syn("EASY", "VACANT", "Empty", ["Full", "Quiet", "Dark"], "A vacant seat or room is empty, with no one in it.");
syn("EASY", "COURAGE", "Bravery", ["Fear", "Anger", "Wisdom"], "Courage is the ability to face danger or difficulty, which is bravery.");
syn("EASY", "RAPID", "Fast", ["Slow", "Steady", "Heavy"], "Rapid means happening at great speed: fast.");
syn("MEDIUM", "METICULOUS", "Painstaking", ["Careless", "Hurried", "Talkative"], "Meticulous means showing great attention to detail, the same as painstaking.");
syn("MEDIUM", "CANDID", "Frank", ["Secretive", "Sweet", "Cautious"], "A candid person speaks openly and honestly, that is, frankly.");
syn("MEDIUM", "DILIGENT", "Hardworking", ["Lazy", "Clever", "Polite"], "Diligent means showing steady, careful effort in one's work.");
syn("MEDIUM", "FEASIBLE", "Practicable", ["Impossible", "Expensive", "Popular"], "A feasible plan is one that can actually be carried out: practicable.");
syn("MEDIUM", "LUCID", "Clear", ["Vague", "Lengthy", "Humorous"], "A lucid explanation is clear and easy to understand.");
syn("MEDIUM", "AUGMENT", "Increase", ["Reduce", "Argue", "Examine"], "To augment something is to make it larger or add to it.");
syn("MEDIUM", "OBSOLETE", "Outdated", ["Modern", "Obvious", "Durable"], "Obsolete means no longer in use because something newer has replaced it.");
syn("HARD", "EPHEMERAL", "Short-lived", ["Eternal", "Ethereal", "Enormous"], "Ephemeral means lasting a very short time. Ethereal (delicate, heavenly) only sounds similar.");
syn("HARD", "PRAGMATIC", "Practical", ["Idealistic", "Dogmatic", "Pessimistic"], "A pragmatic person deals with things in a practical, realistic way rather than by theory.");
syn("HARD", "UBIQUITOUS", "Found everywhere", ["Rare", "Unique", "Mysterious"], "Ubiquitous means present or found everywhere.");

// ── Antonyms ────────────────────────────────────────────────────────────────
const ant = (d: AptitudeDifficulty, word: string, answer: string, wrong: string[], why: string) =>
    add("antonyms", d, `Choose the word most nearly opposite in meaning to ${word}.`, answer, wrong, why);
ant("EASY", "GENEROUS", "Stingy", ["Kind", "Wealthy", "Honest"], "Generous means willing to give freely; stingy means unwilling to give or spend.");
ant("EASY", "VICTORY", "Defeat", ["Triumph", "Battle", "Success"], "Victory is winning; defeat is losing. Triumph and success are synonyms.");
ant("EASY", "EXPAND", "Contract", ["Enlarge", "Explain", "Extend"], "To expand is to become larger; to contract is to become smaller.");
ant("EASY", "ANCIENT", "Modern", ["Old", "Historic", "Ruined"], "Ancient means belonging to the distant past; modern means of the present time.");
ant("EASY", "TRANSPARENT", "Opaque", ["Clear", "Shiny", "Fragile"], "Transparent material lets light through; opaque material does not.");
ant("MEDIUM", "ARROGANT", "Humble", ["Proud", "Rude", "Clever"], "Arrogant means having an exaggerated sense of one's importance; humble is the opposite.");
ant("MEDIUM", "SCARCITY", "Abundance", ["Shortage", "Poverty", "Famine"], "Scarcity is a lack of something; abundance is a large supply. Shortage and famine mean the same as scarcity.");
ant("MEDIUM", "OPTIMISTIC", "Pessimistic", ["Hopeful", "Realistic", "Cheerful"], "An optimist expects good outcomes; a pessimist expects bad ones.");
ant("MEDIUM", "CONCEAL", "Reveal", ["Hide", "Cover", "Protect"], "To conceal is to hide something; to reveal is to make it known or visible.");
ant("MEDIUM", "RIGID", "Flexible", ["Stiff", "Strong", "Fixed"], "Rigid means unable to bend or change; flexible means able to bend or adapt.");
ant("MEDIUM", "FRUGAL", "Extravagant", ["Thrifty", "Poor", "Careful"], "Frugal means careful and sparing with money; extravagant means spending wastefully.");
ant("MEDIUM", "HOSTILE", "Friendly", ["Aggressive", "Angry", "Distant"], "Hostile means unfriendly or aggressive; friendly is its opposite.");
ant("HARD", "ACQUIESCE", "Resist", ["Agree", "Acquire", "Comply"], "To acquiesce is to accept or agree without protest; to resist is to oppose. Agree and comply are synonyms.");
ant("HARD", "VERBOSE", "Concise", ["Wordy", "Loud", "Vague"], "Verbose means using more words than needed; concise means brief and to the point.");
ant("HARD", "BENEVOLENT", "Malevolent", ["Kind", "Generous", "Benign"], "Benevolent means wishing others well; malevolent means wishing others harm.");

// ── Sentence correction ─────────────────────────────────────────────────────
const sc = (d: AptitudeDifficulty, answer: string, wrong: string[], why: string) =>
    add("sentence-correction", d, "Which of these sentences is grammatically correct?", answer, wrong, why);
sc("EASY", "She has been working here since 2019.", ["She is working here since 2019.", "She has been working here for 2019.", "She have been working here since 2019."], "An action that began in the past and continues now takes the present perfect continuous; 'since' marks the starting point and 'has' agrees with 'she'.");
sc("EASY", "He is one of the best players in the team.", ["He is one of the best player in the team.", "He is one of best players in the team.", "He is the one of the best players in the team."], "'One of the' is followed by a plural noun, and the superlative 'best' needs 'the'.");
sc("EASY", "I prefer tea to coffee.", ["I prefer tea than coffee.", "I am preferring tea than coffee.", "I prefer tea over than coffee."], "'Prefer' takes 'to' when comparing two things, and it is not used in the continuous form.");
sc("EASY", "The news is surprising.", ["The news are surprising.", "The news were surprising.", "The newses are surprising."], "'News' is an uncountable noun and takes a singular verb.");
sc("EASY", "One of my friends lives in Pune.", ["One of my friend lives in Pune.", "One of my friends live in Pune.", "One of my friend live in Pune."], "'One of' takes a plural noun (friends), but the subject is 'one', so the verb is singular (lives).");
sc("MEDIUM", "Each of the students has submitted the assignment.", ["Each of the students have submitted the assignment.", "Each of the student has submitted the assignment.", "Each of the students have submit the assignment."], "'Each of the' takes a plural noun, and 'each' itself is singular, so the verb is 'has'.");
sc("MEDIUM", "Neither the manager nor the clerks were present.", ["Neither the manager nor the clerks was present.", "Neither the manager or the clerks were present.", "Neither the manager nor the clerks is present."], "'Neither' pairs with 'nor', and the verb agrees with the nearer subject, 'the clerks', so it is 'were'.");
sc("MEDIUM", "If I had known about the meeting, I would have attended it.", ["If I would have known about the meeting, I would have attended it.", "If I had knew about the meeting, I would have attended it.", "If I had known about the meeting, I will attend it."], "An unreal past condition takes 'had + past participle' in the if-clause and 'would have + past participle' in the result.");
sc("MEDIUM", "Let him and me finish the work.", ["Let he and I finish the work.", "Let him and I finish the work.", "Let he and me finish the work."], "'Let' is followed by object pronouns, so both must be objects: him and me.");
sc("MEDIUM", "She is senior to me by two years.", ["She is senior than me by two years.", "She is senior from me by two years.", "She is seniors to me by two years."], "Adjectives such as senior, junior, superior and prior take 'to', not 'than'.");
sc("MEDIUM", "He suggested that we take the earlier train.", ["He suggested us to take the earlier train.", "He suggested we to take the earlier train.", "He suggested to take the earlier train to us."], "'Suggest' is not followed by object + infinitive; it takes a that-clause, here with the base verb 'take'.");
sc("MEDIUM", "The number of applicants has increased this year.", ["The number of applicants have increased this year.", "The number of applicant has increased this year.", "The number of applicants have been increased this year."], "The subject is 'the number', which is singular, so the verb is 'has'; 'of' is followed by the plural 'applicants'.");
sc("HARD", "Hardly had we reached the station when the train left.", ["Hardly had we reached the station than the train left.", "Hardly we had reached the station when the train left.", "Hardly had we reach the station when the train left."], "'Hardly' at the start inverts the subject and auxiliary ('had we reached') and is followed by 'when', not 'than'.");
sc("HARD", "No sooner did the bell ring than the students rushed out.", ["No sooner did the bell ring when the students rushed out.", "No sooner the bell rang than the students rushed out.", "No sooner did the bell rang than the students rushed out."], "'No sooner' takes inversion with 'did' plus the base verb ('did the bell ring') and is paired with 'than'.");
sc("HARD", "Between you and me, the plan will not work.", ["Between you and I, the plan will not work.", "Among you and me, the plan will not work.", "Between you and myself, the plan will not work."], "'Between' is a preposition, so it takes object pronouns (me), and 'between' rather than 'among' is used for two people.");

// ── Fill in the blank ───────────────────────────────────────────────────────
const fib = (d: AptitudeDifficulty, sentence: string, answer: string, wrong: string[], why: string) =>
    add("fill-in-the-blank", d, `Choose the option that best fills the blank.\n${sentence}`, answer, wrong, why);
fib("EASY", "The meeting starts ___ 10 a.m. sharp.", "at", ["on", "in", "since"], "'At' is used with clock times.");
fib("EASY", "He has lived in Delhi ___ ten years.", "for", ["since", "from", "by"], "'For' is used with a length of time; 'since' needs a starting point such as 2015.");
fib("EASY", "Neither Ravi ___ Sita came to the party.", "nor", ["or", "and", "but"], "'Neither' is always paired with 'nor'.");
fib("EASY", "Water ___ at 100 degrees Celsius at sea level.", "boils", ["boil", "is boil", "boiling"], "A general truth takes the simple present, and a singular subject takes 'boils'.");
fib("EASY", "She is very good ___ solving puzzles.", "at", ["on", "for", "with"], "The fixed expression is 'good at' something.");
fib("MEDIUM", "The manager, along with his team members, ___ attending the conference.", "is", ["are", "were", "have"], "A phrase introduced by 'along with' does not change the subject; 'the manager' is singular, so the verb is 'is'.");
fib("MEDIUM", "By the time we reached the cinema, the film ___.", "had started", ["has started", "starts", "was start"], "The film started before we reached, an earlier past action, so the past perfect 'had started' is needed.");
fib("MEDIUM", "He is fond ___ reading novels.", "of", ["for", "about", "with"], "The fixed expression is 'fond of'.");
fib("MEDIUM", "Her explanation was so ___ that everyone understood it at once.", "lucid", ["obscure", "verbose", "ambiguous"], "Everyone understood it at once, so the explanation must have been clear: lucid. The other options would make it harder to understand.");
fib("MEDIUM", "If she ___ harder, she would have passed the exam.", "had worked", ["worked", "has worked", "would work"], "'Would have passed' is an unreal past result, so the condition takes the past perfect 'had worked'.");
fib("MEDIUM", "The new software will ___ the approval process, cutting the waiting time from ten days to two.", "expedite", ["impede", "complicate", "prolong"], "Cutting the wait from ten days to two means speeding the process up, which is what expedite means.");
fib("MEDIUM", "The doctor advised him to ___ from smoking.", "abstain", ["abandon", "absolve", "abstract"], "'Abstain from' means to choose not to do something; none of the other verbs is used with 'from' in this sense.");
fib("HARD", "The witness's account was ___: it contradicted itself several times.", "inconsistent", ["coherent", "credible", "concise"], "An account that contradicts itself is inconsistent; the other words would describe a sound account.");
fib("HARD", "Despite repeated warnings, he remained ___ about the risks, as though nothing could go wrong.", "complacent", ["anxious", "vigilant", "apprehensive"], "Complacent means uncritically satisfied and unaware of danger, which fits 'as though nothing could go wrong'.");
fib("HARD", "Hardly ___ the room when the phone rang.", "had he entered", ["he had entered", "did he entered", "he entered"], "A sentence beginning with 'Hardly' takes inversion with the past perfect: 'Hardly had he entered ... when'.");

// ── Para jumbles ────────────────────────────────────────────────────────────
/**
 * Written with sentences A-D, shown to the candidate as P, Q, R, S so the
 * sentence labels cannot be confused with the option letters A-D.
 */
const PQRS: Record<string, string> = { A: "P", B: "Q", C: "R", D: "S" };
const relabel = (s: string) => s.replace(/\b[A-D]\b/g, (m) => PQRS[m]!);
function pj(d: AptitudeDifficulty, sentences: Record<"A" | "B" | "C" | "D", string>, answer: string, wrong: string[], why: string) {
    const lines = (Object.keys(sentences) as ("A" | "B" | "C" | "D")[]).map((k) => `${PQRS[k]}. ${sentences[k]}`).join("\n");
    const order = (o: string) => o.split("").map((c) => PQRS[c]).join("");
    add("para-jumbles", d, `Arrange the sentences in the most logical order.\n${lines}`, order(answer), wrong.map(order), relabel(why));
}
pj("EASY", {
    A: "Then she mixed them with flour and sugar.",
    B: "First, Meera washed and peeled the apples.",
    C: "Finally, she baked the mixture for forty minutes.",
    D: "Next, she cut the apples into small pieces.",
}, "BDAC", ["DBAC", "BACD", "ABDC"], "The markers set the order: First (B), Next (D), Then (A), Finally (C).");
pj("EASY", {
    A: "He opened the door and found a parcel on the step.",
    B: "Early in the morning, Rahul heard the doorbell ring.",
    C: "Inside the parcel was the book he had ordered last week.",
    D: "He picked it up and tore off the wrapping.",
}, "BADC", ["BDAC", "ABDC", "BCAD"], "He hears the bell (B), opens the door and finds the parcel (A), picks it up and unwraps it (D), and finds the book inside (C).");
pj("EASY", {
    A: "After dinner, the family sat together and watched a film.",
    B: "The Sharmas reached the hill station late in the evening.",
    C: "They checked into their hotel and ordered dinner.",
    D: "The next morning, they set out early to see the sunrise.",
}, "BCAD", ["BACD", "CBAD", "BDCA"], "B names the family and the arrival; C follows ('They'), then dinner and the film (A), and D is 'the next morning'.");
pj("EASY", {
    A: "She practised for three hours every day after school.",
    B: "Anita had always dreamed of playing the violin in an orchestra.",
    C: "Two years later, she was selected for the city youth orchestra.",
    D: "When she turned twelve, her parents finally bought her one.",
}, "BDAC", ["BADC", "DBAC", "BCDA"], "B introduces Anita and the violin; D ('one') needs the violin already mentioned; she then practises (A) and is selected 'two years later' (C).");
pj("MEDIUM", {
    A: "As a result, many small shops in the area have closed.",
    B: "Over the last decade, online shopping has grown rapidly.",
    C: "Its growth has been driven by customers who value the convenience of ordering from home.",
    D: "However, some shops have survived by offering personal service.",
}, "BCAD", ["CBAD", "BDAC", "ABCD"], "B introduces online shopping, C ('Its growth') explains it, A gives the result for shops, and D ('However') is the exception.");
pj("MEDIUM", {
    A: "The team then wrote tests to reproduce the bug.",
    B: "A customer reported that the app crashed while uploading photos.",
    C: "Once the tests failed as expected, a developer fixed the code.",
    D: "After the fix, all the tests passed and the update was released.",
}, "BACD", ["BCAD", "ABCD", "BDAC"], "The report comes first (B), then the tests that reproduce the bug (A), the fix once they fail (C), and the release after the fix (D).");
pj("MEDIUM", {
    A: "These leaves use sunlight to make food for the plant.",
    B: "Plants need energy to grow, just like animals.",
    C: "This process is called photosynthesis.",
    D: "Unlike animals, however, they produce their own food through their leaves.",
}, "BDAC", ["BADC", "DBAC", "BCDA"], "B makes the comparison with animals, D contrasts it and mentions leaves, A ('These leaves') explains them, and C names the process.");
pj("MEDIUM", {
    A: "It was built in the seventeenth century by the emperor Shah Jahan.",
    B: "The Taj Mahal stands on the bank of the Yamuna in Agra.",
    C: "He built it in memory of his wife, Mumtaz Mahal.",
    D: "Today, it draws millions of visitors every year.",
}, "BACD", ["BCAD", "ABCD", "BDCA"], "B names the monument; A ('It') gives its builder; C ('He') refers to Shah Jahan; D ('Today') moves to the present.");
pj("MEDIUM", {
    A: "Because of this, doctors recommend at least seven hours of sleep a night.",
    B: "Sleep is essential for both the body and the mind.",
    C: "During sleep, the brain stores memories and the body repairs itself.",
    D: "That is why people who sleep too little often find it hard to concentrate.",
}, "BCDA", ["BACD", "CBDA", "BDAC"], "B states the idea, C gives what happens in sleep, D ('That is why') draws the consequence, and A ('Because of this') gives the recommendation.");
pj("HARD", {
    A: "Yet the same scale that makes them useful makes them hard to audit.",
    B: "Large datasets have made modern recommendation systems remarkably accurate.",
    C: "For this reason, regulators increasingly ask companies to explain how their systems decide.",
    D: "A single hidden bias can affect millions of users before anyone notices it.",
}, "BADC", ["BDAC", "ABDC", "BCAD"], "B makes the claim, A ('Yet') turns to the problem, D illustrates the difficulty of auditing, and C ('For this reason') gives the response.");
pj("HARD", {
    A: "The first, and cheapest, is to reduce what we consume.",
    B: "There are three ways to deal with plastic waste.",
    C: "The last resort is recycling, which saves material but uses energy.",
    D: "The second is to reuse what we already have.",
}, "BADC", ["BDAC", "BCAD", "ABDC"], "B announces three ways; they follow in order: the first (A), the second (D) and the last (C).");
pj("HARD", {
    A: "By contrast, a compiler translates the whole program before it runs.",
    B: "An interpreter executes a program line by line.",
    C: "This makes interpreted code easy to test in small pieces.",
    D: "The machine code it produces usually runs faster.",
}, "BCAD", ["BACD", "ABCD", "BDCA"], "C ('This') must follow B about the interpreter; A ('By contrast') introduces the compiler; D ('it produces') refers to the compiler.");

// ── Reading comprehension ───────────────────────────────────────────────────
const rc = (d: AptitudeDifficulty, passage: string, question: string, answer: string, wrong: string[], why: string) =>
    add("reading-comprehension", d, `Read the passage and answer the question.\n\n${passage}\n\n${question}`, answer, wrong, why);
rc("EASY", "Honeybees tell each other where food is through a movement called the waggle dance. A bee that has found flowers returns to the hive and moves in a figure-of-eight pattern. The angle of the dance shows the direction of the food relative to the sun, and the length of the waggle run shows how far away it is.", "According to the passage, what does the length of the waggle run show?", "How far away the food is", ["The direction of the food relative to the sun", "How much nectar the flowers hold", "The time of day"], "The last sentence says the length of the waggle run shows how far away the food is; the angle, not the length, gives the direction.");
rc("EASY", "Arjun started a small bakery in his neighbourhood three years ago. At first he baked only bread, but customers soon asked for cakes and biscuits. Today he employs four people and supplies two nearby cafes.", "How many people does Arjun employ today?", "Four", ["Two", "Three", "None"], "The passage says 'Today he employs four people'. Two is the number of cafes he supplies.");
rc("EASY", "Drinking enough water is important for good health. Water helps control body temperature and carries nutrients to cells. Most adults need about two litres a day, though people who exercise or live in hot places may need more.", "According to the passage, who may need more than two litres of water a day?", "People who exercise or live in hot places", ["All children", "People who live in cold places", "People who eat a lot of fruit"], "The last sentence names people who exercise or live in hot places; the other groups are not mentioned.");
rc("EASY", "The city council has decided to replace its diesel buses with electric ones over the next five years. The new buses cost more to buy, but they are cheaper to run and maintain. The council also expects them to reduce air pollution along busy routes.", "Which of the following is NOT stated as an advantage of the electric buses?", "They are cheaper to buy", ["They are cheaper to run", "They cost less to maintain", "They should reduce air pollution"], "The passage says the electric buses cost more to buy, so a lower purchase price is not an advantage it gives.");
rc("MEDIUM", "Version control systems keep a history of every change made to a project's files. If a new change introduces a bug, developers can compare it with earlier versions to find what went wrong, or restore a version that worked. Because each change is recorded with its author and a message, a team can also see months later why a decision was made.", "According to the passage, recording the author and a message with each change mainly helps a team to:", "understand the reasons behind past decisions", ["make the project run faster", "prevent bugs from ever appearing", "reduce the size of the project's files"], "The last sentence links the author and message to seeing 'why a decision was made'.");
rc("MEDIUM", "Mangrove forests grow along tropical coastlines where land meets the sea. Their tangled roots slow down waves and trap soil, which protects the shore from erosion. During storms, villages behind healthy mangroves often suffer less damage than those without them. Yet mangroves are being cleared rapidly for fish farms and construction.", "Which of the following best states the main idea of the passage?", "Mangroves protect coastlines but are being lost quickly.", ["Mangroves are useful mainly as sites for fish farms.", "Storms are becoming more frequent in the tropics.", "Coastal villages should move further inland."], "Most of the passage describes how mangroves protect coasts, and the last sentence says they are being cleared; the other options are not argued.");
rc("MEDIUM", "Many people believe that multitasking helps them get more done. Research, however, shows that the brain does not truly perform two demanding tasks at once; it switches rapidly between them. Each switch costs a little time and attention, so work done this way is often slower and contains more errors.", "According to the passage, why does multitasking often lead to more errors?", "Each switch between tasks costs time and attention.", ["The brain performs two demanding tasks at once.", "People choose tasks that are too easy.", "Research on multitasking is incomplete."], "The passage says the brain switches between tasks and each switch costs time and attention, which leads to slower work with more errors.");
rc("MEDIUM", "The printing press, developed in Europe in the fifteenth century, made books far cheaper to produce. Before it, books were copied by hand, a slow process that made them rare and expensive. As books became affordable, more people learned to read, and new ideas spread across the continent faster than before.", "Which of the following can be inferred from the passage?", "Fewer people could read before the printing press.", ["Hand-copied books were cheaper than printed ones.", "The printing press was developed in the twentieth century.", "New ideas spread more slowly after the printing press."], "If more people learned to read once books became affordable, fewer could read before. The other options contradict the passage.");
rc("MEDIUM", "Cloud computing lets companies rent computing power instead of buying their own servers. A start-up can therefore begin with a small bill and pay more only as its number of users grows. However, a company that relies entirely on one provider can find it difficult and costly to move elsewhere later.", "Which drawback of cloud computing does the passage mention?", "It can be hard and costly to switch providers.", ["It requires buying servers in advance.", "It cannot handle a growing number of users.", "It is available only to large companies."], "The last sentence says relying on one provider can make moving elsewhere difficult and costly; the other options contradict the passage.");
rc("MEDIUM", "The word 'robot' was first used in a 1920 play by the Czech writer Karel Capek. In the play, robots are artificial workers made in a factory who eventually rebel against their human owners. The word comes from a Czech term meaning forced labour.", "According to the passage, the word 'robot' comes from a term meaning:", "forced labour", ["artificial intelligence", "factory machine", "human owner"], "The last sentence says the word comes from a Czech term meaning forced labour.");
rc("HARD", "A placebo is a treatment with no active ingredient, such as a sugar pill. In a clinical trial, one group of patients receives the real drug while another receives a placebo, and neither group knows which it has been given. If both groups improve equally, researchers conclude that the drug itself is not responsible for the improvement.", "Why are the patients most likely not told which treatment they receive?", "So that their expectations affect both groups equally", ["Because placebos are expensive to make", "Because the real drug has no active ingredient", "So that the doctors can give each group more pills"], "The trial compares the two groups; if patients knew what they were given, their expectations could make one group improve more, and the comparison would no longer isolate the drug.");
rc("HARD", "Some economists argue that a small, predictable rise in prices each year is healthy for an economy. When people expect prices to rise slightly, they tend to spend and invest rather than hold on to cash. Falling prices, by contrast, can lead consumers to delay purchases in the hope of paying less later, which slows business activity.", "According to the passage, falling prices can slow business activity because:", "consumers put off buying in the hope of lower prices", ["people spend and invest more", "prices rise too quickly", "businesses refuse to hold cash"], "The last sentence says falling prices lead consumers to delay purchases hoping to pay less later, which slows business.");
rc("HARD", "Critics of standardised testing argue that it rewards memorisation over understanding. Supporters reply that a common test is the only fair way to compare students from very different schools. Both sides agree, however, that a single score should not decide a student's future on its own.", "On which point do the critics and the supporters agree?", "A single test score should not by itself decide a student's future.", ["Standardised tests reward memorisation over understanding.", "A common test is the fairest way to compare students.", "Standardised tests should be abolished."], "The last sentence states what 'both sides agree'; the second and third options are each held by only one side, and the last by neither.");
rc("HARD", "One writer on cities argued that streets are safest when many people use them at different times of day. Where shops, homes and offices are mixed together, there are always 'eyes on the street', because someone is around to notice trouble. Areas used for only one purpose, such as office districts that empty at night, lose this natural watchfulness.", "Which of the following would the writer most likely support?", "Allowing shops and homes in the same neighbourhood", ["Building large office districts with no housing", "Closing streets to pedestrians at night", "Keeping homes and businesses in separate zones"], "The writer values a mix of uses that keeps people on the street at all hours; the other options would reduce that mix.");

// ── Idioms ──────────────────────────────────────────────────────────────────
const idiom = (d: AptitudeDifficulty, phrase: string, answer: string, wrong: string[], why: string) =>
    add("idioms", d, `What does the idiom "${phrase}" mean?`, answer, wrong, why);
idiom("EASY", "once in a blue moon", "Very rarely", ["Every night", "Very often", "At midnight"], "Something that happens once in a blue moon happens very rarely.");
idiom("EASY", "break the ice", "Start a conversation in an awkward or unfamiliar situation", ["Cause trouble between friends", "Reveal a secret", "Win a difficult contest"], "To break the ice is to ease the first awkwardness, for example by starting a conversation.");
idiom("EASY", "a piece of cake", "Something very easy", ["A small reward", "Something done in a hurry", "A share of the profit"], "If a task is a piece of cake, it is very easy.");
idiom("EASY", "under the weather", "Feeling unwell", ["Out in the rain", "Very busy", "Worried about money"], "Someone under the weather is slightly ill.");
idiom("EASY", "hit the books", "Study hard", ["Throw books away", "Criticise writers", "Write a book"], "To hit the books is to study with effort, usually for an exam.");
idiom("MEDIUM", "bite the bullet", "Face a difficult situation with courage", ["Get badly hurt", "Speak rudely", "Eat in a hurry"], "To bite the bullet is to make yourself do something unpleasant that cannot be avoided.");
idiom("MEDIUM", "burn the midnight oil", "Work late into the night", ["Waste money", "Start a fire", "Go to bed early"], "Someone burning the midnight oil is working or studying late at night.");
idiom("MEDIUM", "let the cat out of the bag", "Reveal a secret by mistake", ["Set someone free", "Create confusion", "Lose something valuable"], "To let the cat out of the bag is to give away a secret, usually unintentionally.");
idiom("MEDIUM", "cost an arm and a leg", "Be very expensive", ["Cause an injury", "Take a long time", "Need hard physical work"], "Something that costs an arm and a leg is very expensive.");
idiom("MEDIUM", "beat around the bush", "Avoid talking about the main point", ["Work in a garden", "Search very carefully", "Act violently"], "To beat around the bush is to talk indirectly instead of saying what you mean.");
idiom("MEDIUM", "cry over spilt milk", "Regret something that cannot be undone", ["Waste food", "Blame others for mistakes", "Cry easily"], "'There is no use crying over spilt milk' means there is no point regretting what cannot be changed.");
idiom("HARD", "a red herring", "Something that misleads or distracts from the real issue", ["A rare opportunity", "A serious danger", "A secret agreement"], "A red herring is a clue or topic that draws attention away from what matters.");
idiom("HARD", "a Pyrrhic victory", "A win that costs so much it is hardly worth it", ["An easy win", "A victory gained by cheating", "A win celebrated with fireworks"], "A Pyrrhic victory is one where the winner's losses are so great that they almost equal a defeat.");
idiom("HARD", "throw in the towel", "Give up", ["Clean up after work", "Start a fight", "Help a friend"], "To throw in the towel is to admit defeat and stop trying.");
idiom("HARD", "the elephant in the room", "An obvious problem that people avoid discussing", ["A very large guest", "An important visitor", "A loud argument"], "The elephant in the room is a big, obvious issue that everyone ignores.");

export const VERBAL = Q.out;
