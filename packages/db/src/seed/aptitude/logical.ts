/**
 * LOGICAL: series, coding, directions, clocks, calendars and seating are
 * generated or solved by code (seating by brute force over every arrangement,
 * which also proves the answer is the only one). Syllogisms, blood relations,
 * statement-conclusion, analogies and odd one out are written by hand; each
 * was checked for exactly one defensible answer.
 */
import type { Draft } from "./helpers";
import { bank } from "./helpers";
import type { AptitudeDifficulty } from "./types";

const Q = bank("LOGICAL");

function hand(topic: string, difficulty: AptitudeDifficulty, prompt: string, answer: string, distractors: string[], explanation: string, recheck?: Draft["recheck"]) {
    Q.add(topic, { difficulty, prompt, answer, distractors, explanation, ...(recheck ? { recheck } : {}) });
}
function permutations<T>(xs: T[]): T[][] {
    if (xs.length <= 1) return [xs];
    return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

// ── Number series ───────────────────────────────────────────────────────────
type Series = { d: AptitudeDifficulty; f: (i: number) => number; shown: number; wrong: number[]; why: string };
const SERIES: Series[] = [
    { d: "EASY", f: (i) => 3 + 4 * i, shown: 5, wrong: [22, 24, 27], why: "Each term is 4 more than the one before." },
    { d: "EASY", f: (i) => 2 * 3 ** i, shown: 4, wrong: [108, 156, 216], why: "Each term is 3 times the one before." },
    { d: "EASY", f: (i) => (i + 1) ** 2, shown: 5, wrong: [30, 35, 49], why: "The terms are the squares 1^2, 2^2, 3^2, ... so the next is 6^2." },
    { d: "EASY", f: (i) => 80 - 8 * i, shown: 4, wrong: [46, 50, 40], why: "Each term is 8 less than the one before." },
    { d: "EASY", f: (i) => (i + 1) ** 2 + 1, shown: 5, wrong: [35, 36, 38], why: "The terms are n^2 + 1 for n = 1, 2, 3, ... so the next is 6^2 + 1." },
    { d: "MEDIUM", f: (i) => 2 ** (i + 1) + 1, shown: 5, wrong: [49, 64, 66], why: "Each term is twice the previous one minus 1 (3, 5, 9, 17, 33 are 2^n + 1)." },
    { d: "MEDIUM", f: (i) => [1, 2, 6, 24, 120, 720][i] as number, shown: 5, wrong: [240, 600, 144], why: "Multiply by 2, 3, 4, 5 and then 6: the terms are 1!, 2!, 3!, 4!, 5!, 6!." },
    { d: "MEDIUM", f: (i) => 7 + (3 * i * (i + 1)) / 2, shown: 5, wrong: [49, 50, 55], why: "The differences are 3, 6, 9, 12, so the next difference is 15." },
    { d: "MEDIUM", f: (i) => (i + 1) ** 3 - 1, shown: 5, wrong: [185, 216, 225], why: "The terms are n^3 - 1 for n = 1, 2, 3, ... so the next is 6^3 - 1." },
    { d: "MEDIUM", f: (i) => { let [a, b] = [1, 1]; for (let k = 0; k < i; k++) [a, b] = [b, a + b]; return a; }, shown: 7, wrong: [18, 20, 26], why: "Each term is the sum of the two before it (8 + 13)." },
    { d: "HARD", f: (i) => 2 + (i * (i + 1) * (2 * i + 1)) / 6, shown: 5, wrong: [48, 50, 62], why: "The differences are 1, 4, 9, 16 (the squares), so the next difference is 25." },
    { d: "HARD", f: (i) => [6, 12, 36, 144, 720, 4320][i] as number, shown: 5, wrong: [2880, 3600, 1440], why: "Multiply by 2, 3, 4, 5 and then 6: 720 x 6 = 4320." },
    { d: "HARD", f: (i) => (i % 2 === 0 ? 3 * 2 ** (i / 2) : 20 - 3 * ((i - 1) / 2)), shown: 7, wrong: [48, 12, 10], why: "Two series alternate: 3, 6, 12, 24 (doubling) and 20, 17, 14, 11 (minus 3). The next term belongs to the second." },
];
for (const s of SERIES) {
    const terms = Array.from({ length: s.shown }, (_, i) => s.f(i));
    const next = s.f(s.shown);
    Q.add("number-series", {
        difficulty: s.d,
        prompt: `What comes next in the series?\n${terms.join(", ")}, ?`,
        answer: String(next),
        distractors: s.wrong.map(String),
        explanation: `${s.why} So the next term is ${next}.`,
        recheck: () => String(s.f(s.shown)),
    });
}

// ── Letter series ───────────────────────────────────────────────────────────
const L = (n: number) => String.fromCharCode(64 + (((n - 1) % 26) + 26) % 26 + 1);
type LSeries = { d: AptitudeDifficulty; f: (i: number) => string; shown: number; wrong: string[]; why: string };
const LETTERS: LSeries[] = [
    { d: "EASY", f: (i) => L(1 + 2 * i), shown: 4, wrong: ["H", "J", "K"], why: "Each letter skips one: A, C, E, G, I." },
    { d: "EASY", f: (i) => L(26 - 3 * i), shown: 4, wrong: ["O", "M", "P"], why: "Each letter moves 3 back: Z, W, T, Q, N." },
    { d: "EASY", f: (i) => L(1 + i) + L(26 - i), shown: 4, wrong: ["EW", "FV", "DV"], why: "The first letter moves forward from A and the second moves back from Z." },
    { d: "MEDIUM", f: (i) => L(2 + (i * (i + 5)) / 2), shown: 4, wrong: ["S", "U", "R"], why: "The gaps grow by one: +3, +4, +5, +6, so after N comes N + 6 = T." },
    { d: "MEDIUM", f: (i) => L(1 + 3 * i) + L(2 + 3 * i), shown: 4, wrong: ["LM", "NO", "MO"], why: "Each pair is two consecutive letters, and each pair starts 3 letters after the previous one: A, D, G, J, M." },
    { d: "MEDIUM", f: (i) => L((i + 1) ** 2), shown: 4, wrong: ["X", "Z", "U"], why: "The letters are at positions 1, 4, 9, 16 (the squares), so the next is position 25, Y." },
    { d: "MEDIUM", f: (i) => L(1 + i) + L(3 + i) + L(5 + i), shown: 3, wrong: ["DEF", "EGI", "DFG"], why: "Each group is every second letter from a starting point, and the start moves forward by one: A, B, C, D." },
    { d: "HARD", f: (i) => L(11 - 2 * i) + L(13 + 3 * i) + String(5 + 3 * i), shown: 4, wrong: ["CX17", "CY15", "DY17"], why: "The first letter moves back by 2 (K, I, G, E, C), the second forward by 3 (M, P, S, V, Y) and the number rises by 3 (5, 8, 11, 14, 17)." },
    { d: "HARD", f: (i) => L(2 + 2 * i) + String(2 + 2 * i) + L(3 + 3 * i), shown: 4, wrong: ["J10N", "K10O", "J12O"], why: "The first letter moves by 2 (B, D, F, H, J), the number by 2 (2, 4, 6, 8, 10) and the last letter by 3 (C, F, I, L, O)." },
];
for (const s of LETTERS) {
    const terms = Array.from({ length: s.shown }, (_, i) => s.f(i));
    const next = s.f(s.shown);
    Q.add("letter-series", {
        difficulty: s.d,
        prompt: `What comes next in the series?\n${terms.join(", ")}, ?`,
        answer: next,
        distractors: s.wrong,
        explanation: `${s.why} So the answer is ${next}.`,
        recheck: () => s.f(s.shown),
    });
}

// ── Coding-decoding ─────────────────────────────────────────────────────────
const shift = (w: string, k: number) => w.split("").map((c) => L(c.charCodeAt(0) - 64 + k)).join("");
const mirror = (w: string) => w.split("").map((c) => L(27 - (c.charCodeAt(0) - 64))).join("");
const reverse = (w: string) => w.split("").reverse().join("");
const swapPairs = (w: string) => w.replace(/(.)(.)/g, "$2$1");
const stepShift = (w: string) => w.split("").map((c, i) => L(c.charCodeAt(0) - 64 + i + 1)).join("");
type Code = { d: AptitudeDifficulty; example: string; word: string; code: (w: string) => string; decode: (w: string) => string; wrong: (w: string) => string[]; why: string };
const CODES: Code[] = [
    { d: "EASY", example: "CAMERA", word: "SIGNAL", code: (w) => shift(w, 1), decode: (w) => shift(w, -1), wrong: (w) => [shift(w, -1), shift(w, 2), reverse(shift(w, 1))], why: "Each letter is replaced by the next letter of the alphabet." },
    { d: "EASY", example: "MOUSE", word: "KEYBOARD", code: reverse, decode: reverse, wrong: () => ["DRAOBEYK", "DRAOBYKE", "KEYBOARD"], why: "The word is written backwards." },
    { d: "MEDIUM", example: "WINDOW", word: "SCREEN", code: (w) => shift(w, -2), decode: (w) => shift(w, 2), wrong: (w) => [shift(w, 2), shift(w, -1), reverse(shift(w, -2))], why: "Each letter is replaced by the letter two places before it." },
    { d: "MEDIUM", example: "GARDEN", word: "FLOWER", code: mirror, decode: mirror, wrong: (w) => [shift(mirror(w), 1), reverse(mirror(w)), shift(w, 13)], why: "Each letter is replaced by its mirror in the alphabet (A and Z, B and Y, ...): the two positions add to 27." },
    { d: "MEDIUM", example: "PENCIL", word: "MARKET", code: swapPairs, decode: swapPairs, wrong: (w) => [reverse(w), reverse(swapPairs(w)), shift(swapPairs(w), 1)], why: "The letters are swapped in pairs: 1st with 2nd, 3rd with 4th, 5th with 6th." },
    { d: "HARD", example: "BAT", word: "CUP", code: stepShift, decode: (w) => w.split("").map((c, i) => L(c.charCodeAt(0) - 64 - i - 1)).join(""), wrong: (w) => [shift(w, 1), shift(w, 2), reverse(stepShift(w))], why: "The 1st letter moves 1 place forward, the 2nd moves 2 places, the 3rd moves 3 places." },
    { d: "HARD", example: "LOGIC", word: "BRAIN", code: (w) => shift(reverse(w), 1), decode: (w) => reverse(shift(w, -1)), wrong: (w) => [shift(w, 1), reverse(w), shift(reverse(w), -1)], why: "The word is reversed and then each letter is moved one place forward." },
];
for (const c of CODES) {
    const ans = c.code(c.word);
    Q.add("coding-decoding", {
        difficulty: c.d,
        prompt: `In a certain code, ${c.example} is written as ${c.code(c.example)}. How is ${c.word} written in that code?`,
        answer: ans,
        distractors: c.wrong(c.word),
        explanation: `${c.why} Applying the same rule to ${c.word} gives ${ans}.`,
        // Decoding the answer must give back the word, and decoding the example's code must give back the example.
        recheck: () => (c.decode(c.code(c.example)) === c.example ? c.code(c.decode(ans) === c.word ? c.word : "") : "(rule does not decode the example)"),
    });
}
{
    const pos = (w: string) => w.split("").reduce((s, ch) => s + ch.charCodeAt(0) - 64, 0);
    Q.add("coding-decoding", {
        difficulty: "EASY",
        prompt: `If CAT is coded as ${pos("CAT")} (the sum of the positions of its letters in the alphabet), what is the code for DOG?`,
        answer: String(pos("DOG")),
        distractors: [String(pos("DOG") - 1), String(pos("DOG") + 2), String(pos("CAT"))],
        explanation: `D = 4, O = 15 and G = 7, so DOG = 4 + 15 + 7 = ${pos("DOG")}.`,
        recheck: () => String(4 + 15 + 7),
    });
}
hand(
    "coding-decoding",
    "MEDIUM",
    `In a code language, "sky is blue" is written as "ta na ro", "blue ink pen" as "ro ki lu", and "pen is new" as "lu na ve". What is the code for "ink"?`,
    "ki",
    ["ro", "lu", "na"],
    `"blue" is the word common to the first two sentences and "ro" is their common code; "pen" is common to the last two (lu); so in "blue ink pen" the remaining code ki means "ink".`,
);

// ── Blood relations ─────────────────────────────────────────────────────────
hand("blood-relations", "EASY", `Pointing to a man, Riya says, "He is the son of my grandfather's only son." How is the man related to Riya?`, "Brother", ["Cousin", "Uncle", "Father"], "Her grandfather's only son is her father, and her father's son is her brother.");
hand("blood-relations", "EASY", "A is the brother of B. B is the sister of C. C is the father of D. How is A related to D?", "Uncle", ["Father", "Grandfather", "Brother"], "A, B and C are siblings, so A is a brother of D's father C, which makes A D's uncle.");
hand("blood-relations", "EASY", "M is the son of N. N is the daughter of O. O is the husband of P. How is P related to M?", "Grandmother", ["Mother", "Aunt", "Sister"], "P is O's wife, so P is the mother of N; N is M's mother, so P is M's grandmother.");
hand("blood-relations", "MEDIUM", "P is the mother of Q. Q is the sister of R. R is the father of S. How is P related to S?", "Grandmother", ["Mother", "Aunt", "Sister"], "P is the mother of both Q and R (they are siblings). R is S's father, so P is S's grandmother.");
hand("blood-relations", "MEDIUM", `Introducing a woman, Arjun says, "Her mother is the only daughter of my mother." How is the woman related to Arjun?`, "Niece", ["Sister", "Daughter", "Cousin"], "The only daughter of Arjun's mother is Arjun's sister, and her daughter is Arjun's niece.");
hand("blood-relations", "MEDIUM", "X and Y are brothers. Z is the father of X. W is the sister of Z. How is Y related to W?", "Nephew", ["Son", "Brother", "Cousin"], "Z is the father of both X and Y, and W is Z's sister, so W is Y's aunt and Y is W's nephew.");
hand("blood-relations", "MEDIUM", `Kiran (a man) says, "Meena's mother is the only daughter of my father." How is Kiran related to Meena?`, "Maternal uncle", ["Father", "Grandfather", "Brother"], "The only daughter of Kiran's father is Kiran's sister, so Meena's mother is his sister and Kiran is Meena's maternal uncle.");
hand("blood-relations", "MEDIUM", `In a code, "A + B" means A is the father of B, "A - B" means A is the wife of B, and "A x B" means A is the brother of B. What does "P + Q - R" mean?`, "P is R's father-in-law", ["P is R's father", "P is R's brother-in-law", "P is R's grandfather"], "P is Q's father and Q is R's wife, so P is the father of R's wife: R's father-in-law.");
hand("blood-relations", "HARD", "A family of six (A, B, C, D, E and F) has two married couples. D is the grandmother of A and the mother of B. C is the wife of B and the mother of F. F is the granddaughter of E. How is E related to A?", "Grandfather", ["Father", "Uncle", "Grandmother"], "B and C are one couple; the other must be D and E, since A and F are grandchildren. D is a woman, so E is her husband and A's grandfather.");
hand("blood-relations", "HARD", `Pointing to a portrait, Sameer says, "I have no brother or sister, but this man's father is my father's son." Who is in the portrait?`, "Sameer's son", ["Sameer himself", "Sameer's father", "Sameer's nephew"], "With no brothers, 'my father's son' is Sameer himself, so the man's father is Sameer: the portrait is of his son.");

// ── Direction sense ─────────────────────────────────────────────────────────
const HEADINGS = ["north", "east", "south", "west"] as const;
const VEC: Record<(typeof HEADINGS)[number], [number, number]> = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
function walk(start: (typeof HEADINGS)[number], legs: [turn: "" | "left" | "right", dist: number][]) {
    let h = HEADINGS.indexOf(start);
    let [x, y] = [0, 0];
    for (const [turn, dist] of legs) {
        if (turn === "right") h = (h + 1) % 4;
        if (turn === "left") h = (h + 3) % 4;
        const [dx, dy] = VEC[HEADINGS[h]!];
        x += dx * dist;
        y += dy * dist;
    }
    return { x, y, dist: Math.hypot(x, y), toward: compass(x, y) };
}
function compass(x: number, y: number): string {
    const ns = y > 0 ? "North" : y < 0 ? "South" : "";
    const ew = x > 0 ? "East" : x < 0 ? "West" : "";
    return ns && ew ? `${ns}-${ew}` : ns || ew || "At the start";
}
function legsText(who: string, start: string, legs: [string, number][], unit: string): string {
    return legs
        .map(([turn, d], i) => (i === 0 ? `${who} starts facing ${start} and walks ${d} ${unit}.` : `Then he turns ${turn} and walks ${d} ${unit}.`))
        .join(" ");
}
type Walk = { d: AptitudeDifficulty; who: string; start: (typeof HEADINGS)[number]; legs: [turn: "" | "left" | "right", dist: number][]; unit: string; ask: "distance" | "both"; wrong: string[] };
const WALKS: Walk[] = [
    { d: "EASY", who: "Anil", start: "north", legs: [["", 6], ["right", 8]], unit: "km", ask: "distance", wrong: ["14 km", "2 km", "12 km"] },
    { d: "EASY", who: "Anil", start: "south", legs: [["", 10], ["left", 15], ["left", 10]], unit: "m", ask: "both", wrong: ["15 m, West", "35 m, East", "25 m, North-East"] },
    { d: "MEDIUM", who: "Anil", start: "east", legs: [["", 5], ["left", 3], ["left", 9], ["left", 3]], unit: "km", ask: "both", wrong: ["4 km, East", "14 km, West", "5 km, North-West"] },
    { d: "MEDIUM", who: "Anil", start: "west", legs: [["", 12], ["right", 5]], unit: "m", ask: "both", wrong: ["17 m, North-West", "13 m, North-East", "13 m, South-West"] },
    { d: "HARD", who: "Anil", start: "north", legs: [["", 10], ["right", 12], ["left", 6], ["right", 4], ["right", 4]], unit: "m", ask: "both", wrong: ["36 m, North-East", "20 m, South-East", "16 m, North"] },
];
for (const w of WALKS) {
    const r = walk(w.start, w.legs);
    const answer = w.ask === "distance" ? `${r.dist} ${w.unit}` : `${r.dist} ${w.unit}, ${r.toward}`;
    Q.add("direction-sense", {
        difficulty: w.d,
        prompt: `${legsText(w.who, w.start, w.legs, w.unit)} ${w.ask === "distance" ? "How far is he from the starting point?" : "How far is he from the starting point, and in which direction?"}`,
        answer,
        distractors: w.wrong,
        explanation: `Tracking east-west and north-south separately, he ends ${[r.x ? `${Math.abs(r.x)} ${w.unit} ${r.x > 0 ? "east" : "west"}` : "", r.y ? `${Math.abs(r.y)} ${w.unit} ${r.y > 0 ? "north" : "south"}` : ""].filter(Boolean).join(" and ")} of the start, so he is ${r.dist} ${w.unit} away${w.ask === "both" ? `, to the ${r.toward}` : ""}.`,
        recheck: () => {
            // Second route: sum the legs as complex numbers, turning by multiplying by -i (right) or i (left).
            let [hx, hy] = VEC[w.start];
            let [x, y] = [0, 0];
            for (const [turn, d] of w.legs) {
                if (turn === "right") [hx, hy] = [hy, -hx];
                if (turn === "left") [hx, hy] = [-hy, hx];
                x += hx * d;
                y += hy * d;
            }
            const dist = Math.sqrt(x * x + y * y);
            return w.ask === "distance" ? `${dist} ${w.unit}` : `${dist} ${w.unit}, ${compass(x, y)}`;
        },
    });
}
{
    // Facing north; +90 clockwise, 180 anticlockwise, 45 clockwise.
    const deg = (0 + 90 - 180 + 45 + 360) % 360;
    const names = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
    Q.add("direction-sense", {
        difficulty: "MEDIUM",
        prompt: "Priya is facing north. She turns 90 degrees clockwise, then 180 degrees anticlockwise, and then 45 degrees clockwise. Which direction is she facing now?",
        answer: names[deg / 45]!,
        distractors: ["North-East", "South-West", "West"],
        explanation: "North + 90 clockwise = East; East + 180 anticlockwise = West; West + 45 clockwise = North-West.",
        recheck: () => names[((90 - 180 + 45) / 45 + 8) % 8]!,
    });
}
{
    const order = ["North", "East", "South", "West"];
    Q.add("direction-sense", {
        difficulty: "EASY",
        prompt: "Rohan is facing east. He turns left, then left again, and then right. Which direction is he facing now?",
        answer: order[(1 + 3 + 3 + 1) % 4]!,
        distractors: ["South", "West", "East"],
        explanation: "East, turn left: North; turn left: West; turn right: North.",
        recheck: () => order[(1 - 1 - 1 + 1 + 4) % 4]!,
    });
}
hand("direction-sense", "MEDIUM", "One morning, shortly after sunrise, Kavya stands facing a pole. The pole's shadow falls exactly to her right. Which direction is she facing?", "South", ["North", "East", "West"], "After sunrise the sun is in the east, so shadows fall to the west. If west is on her right, she is facing south.");
hand("direction-sense", "HARD", "Village P is 12 km north of village Q. Village R is 5 km east of Q. How far is P from R, and in which direction?", "13 km, North-West", ["13 km, North-East", "17 km, North-West", "7 km, North"], "From R, P is 5 km west and 12 km north, so it lies to the north-west at a distance of sqrt(25 + 144) = 13 km.", () => `${Math.hypot(-5, 12)} km, ${compass(-5, 12)}`);

// ── Seating arrangement (solved by brute force) ─────────────────────────────
type Pos = Record<string, number>;
/** Every arrangement of `names` in seats 0..n-1 that meets all the rules. Circular: seat 0 is fixed to names[0]. */
function solve(names: string[], rules: ((p: Pos) => boolean)[], circular = false): Pos[] {
    const rest = circular ? names.slice(1) : names;
    return permutations(rest)
        .map((order) => (circular ? [names[0]!, ...order] : order))
        .map((order) => Object.fromEntries(order.map((n, i) => [n, i])) as Pos)
        .filter((p) => rules.every((r) => r(p)));
}
/** The answer every solution agrees on, or a marker the validator reports. */
function agreed(solutions: Pos[], ask: (p: Pos) => string): string {
    if (!solutions.length) return "(no arrangement fits the clues)";
    const answers = new Set(solutions.map(ask));
    return answers.size === 1 ? [...answers][0]! : `(clues allow ${answers.size} answers)`;
}
const at = (p: Pos, seat: number) => Object.keys(p).find((k) => p[k] === seat) ?? "?";
{
    // Row of five facing north; seat 0 is the left end.
    const names = ["A", "B", "C", "D", "E"];
    const clues = "Five friends A, B, C, D and E sit in a row facing north. B sits at the extreme right end. C sits in the middle. A sits immediately to the left of C. E does not sit at either end.";
    const rules = [(p: Pos) => p.B === 4, (p: Pos) => p.C === 2, (p: Pos) => p.A === p.C! - 1, (p: Pos) => p.E !== 0 && p.E !== 4];
    const sols = () => solve(names, rules);
    Q.add("seating-arrangement", {
        difficulty: "EASY",
        prompt: `${clues} Who sits at the extreme left end?`,
        answer: "D",
        distractors: ["A", "E", "C"],
        explanation: "B is in seat 5, C in seat 3 and A in seat 2. E cannot take an end, so E is in seat 4 and D is left with seat 1, the left end.",
        recheck: () => agreed(sols(), (p) => at(p, 0)),
    });
    Q.add("seating-arrangement", {
        difficulty: "EASY",
        prompt: `${clues} Who sits between C and B?`,
        answer: "E",
        distractors: ["A", "D", "Nobody"],
        explanation: "The order from the left is D, A, C, E, B, so E sits between C and B.",
        recheck: () => agreed(sols(), (p) => at(p, 3)),
    });
}
{
    const names = ["P", "Q", "R", "S", "T", "U"];
    const clues = "Six people P, Q, R, S, T and U sit in a row facing north. R is third from the left. Q sits immediately to the right of R. S sits at the right end. T sits at one of the ends. U does not sit next to R.";
    const rules = [(p: Pos) => p.R === 2, (p: Pos) => p.Q === 3, (p: Pos) => p.S === 5, (p: Pos) => p.T === 0 || p.T === 5, (p: Pos) => Math.abs(p.U! - p.R!) !== 1];
    const sols = () => solve(names, rules);
    Q.add("seating-arrangement", {
        difficulty: "MEDIUM",
        prompt: `${clues} Who sits second from the right?`,
        answer: "U",
        distractors: ["Q", "P", "T"],
        explanation: "S takes the right end, so T takes the left end. P and U fill seats 2 and 5; U cannot be next to R (seat 3), so U is in seat 5, second from the right.",
        recheck: () => agreed(sols(), (p) => at(p, 4)),
    });
    Q.add("seating-arrangement", {
        difficulty: "MEDIUM",
        prompt: `${clues} How many people sit between T and Q?`,
        answer: "2",
        distractors: ["1", "3", "4"],
        explanation: "The order from the left is T, P, R, Q, U, S, so P and R sit between T and Q.",
        recheck: () => agreed(sols(), (p) => String(Math.abs(p.T! - p.Q!) - 1)),
    });
}
{
    // Six seats round a table, equally spaced; opposite = 3 seats apart.
    const names = ["A", "B", "C", "D", "E", "F"];
    const near = (p: Pos, x: string, y: string) => [1, 5].includes((p[x]! - p[y]! + 6) % 6);
    const clues = "Six friends A, B, C, D, E and F sit around a round table, equally spaced and facing the centre. A sits opposite D. B sits next to A. C sits between B and D. E does not sit next to A.";
    const rules = [(p: Pos) => (p.A! - p.D! + 6) % 6 === 3, (p: Pos) => near(p, "B", "A"), (p: Pos) => near(p, "C", "B") && near(p, "C", "D"), (p: Pos) => !near(p, "E", "A")];
    const sols = () => solve(names, rules, true);
    Q.add("seating-arrangement", {
        difficulty: "MEDIUM",
        prompt: `${clues} Who sits opposite B?`,
        answer: "E",
        distractors: ["C", "F", "D"],
        explanation: "Going round from A: B, C, D, then the two seats between D and A. E cannot be next to A, so E sits next to D, which is the seat opposite B; F sits next to A.",
        recheck: () => agreed(sols(), (p) => at(p, (p.B! + 3) % 6)),
    });
    Q.add("seating-arrangement", {
        difficulty: "MEDIUM",
        prompt: `${clues} Who are F's two neighbours?`,
        answer: "A and E",
        distractors: ["B and C", "D and E", "A and B"],
        explanation: "The order round the table is A, B, C, D, E, F, so F sits between E and A.",
        recheck: () => agreed(sols(), (p) => [at(p, (p.F! + 1) % 6), at(p, (p.F! + 5) % 6)].sort().join(" and ")),
    });
}
{
    const names = ["J", "K", "L", "M", "N", "O", "P"];
    const clues = "Seven people J, K, L, M, N, O and P sit in a row facing north. O sits exactly in the middle. J sits immediately to the left of O and L immediately to the right of O. K and N sit at the two ends. M sits next to K. P does not sit at an end and does not sit next to J.";
    const rules = [
        (p: Pos) => p.O === 3,
        (p: Pos) => p.J === 2,
        (p: Pos) => p.L === 4,
        (p: Pos) => [0, 6].includes(p.K!) && [0, 6].includes(p.N!),
        (p: Pos) => Math.abs(p.M! - p.K!) === 1,
        (p: Pos) => ![0, 6].includes(p.P!) && Math.abs(p.P! - p.J!) !== 1,
    ];
    const sols = () => solve(names, rules);
    Q.add("seating-arrangement", {
        difficulty: "HARD",
        prompt: `${clues} Who sits third from the right?`,
        answer: "L",
        distractors: ["P", "O", "M"],
        explanation: "If K were at the right end, M would be sixth and P would have to sit second, next to J, which is not allowed. So K is at the left end, M second, and P sixth; the order is K, M, J, O, L, P, N and L is third from the right.",
        recheck: () => agreed(sols(), (p) => at(p, 4)),
    });
    Q.add("seating-arrangement", {
        difficulty: "HARD",
        prompt: `${clues} How many people sit between M and P?`,
        answer: "3",
        distractors: ["2", "4", "1"],
        explanation: "The order is K, M, J, O, L, P, N, so J, O and L sit between M and P.",
        recheck: () => agreed(sols(), (p) => String(Math.abs(p.M! - p.P!) - 1)),
    });
}

// ── Syllogisms ──────────────────────────────────────────────────────────────
const VERDICTS = ["Only I follows", "Only II follows", "Both I and II follow", "Neither I nor II follows"] as const;
function syllogism(topic: string, d: AptitudeDifficulty, statements: string[], i: string, ii: string, verdict: (typeof VERDICTS)[number], why: string) {
    hand(
        topic,
        d,
        `Statements: ${statements.join(" ")}\nConclusions:\nI. ${i}\nII. ${ii}\nAssuming the statements are true, which conclusion(s) follow?`,
        verdict,
        VERDICTS.filter((v) => v !== verdict),
        why,
    );
}
syllogism("syllogisms", "EASY", ["All cats are animals.", "All animals are living beings."], "All cats are living beings.", "Some living beings are cats.", "Both I and II follow", "All cats are animals and all animals are living beings, so all cats are living beings (I); turning that round, some living beings are cats (II).");
syllogism("syllogisms", "EASY", ["Some pens are books.", "All books are pencils."], "Some pens are pencils.", "All pencils are books.", "Only I follows", "The pens that are books are also pencils, so I follows. 'All books are pencils' does not mean every pencil is a book, so II does not.");
syllogism("syllogisms", "EASY", ["All roses are flowers.", "No flower is a tree."], "No rose is a tree.", "Some trees are roses.", "Only I follows", "Every rose is a flower and no flower is a tree, so no rose is a tree (I), which directly contradicts II.");
syllogism("syllogisms", "MEDIUM", ["Some doctors are singers.", "Some singers are dancers."], "Some doctors are dancers.", "Some singers are doctors.", "Only II follows", "Two 'some' statements give no link between doctors and dancers, so I is not certain. 'Some doctors are singers' can be turned round to 'some singers are doctors', so II follows.");
syllogism("syllogisms", "MEDIUM", ["No car is a bus.", "All buses are trucks."], "Some trucks are not cars.", "No car is a truck.", "Only I follows", "The trucks that are buses cannot be cars, so some trucks are not cars (I). Cars may still be trucks of another kind, so II is not certain.");
syllogism("syllogisms", "MEDIUM", ["All engineers are graduates.", "Some graduates are teachers."], "Some engineers are teachers.", "All teachers are graduates.", "Neither I nor II follows", "The teachers who are graduates need not be engineers, so I is not certain; only some teachers are known to be graduates, so II does not follow either.");
syllogism("syllogisms", "MEDIUM", ["All apples are fruits.", "Some fruits are sweet."], "Some apples are sweet.", "Some fruits are apples.", "Only II follows", "The sweet fruits may all be non-apples, so I is not certain. Since all apples are fruits, some fruits are apples (II).");
syllogism("syllogisms", "HARD", ["Some keys are locks.", "No lock is a door.", "All doors are windows."], "Some keys are not doors.", "Some windows are not locks.", "Both I and II follow", "Keys that are locks cannot be doors, so some keys are not doors (I). Every door is a window and no door is a lock, so those windows are not locks (II).");
syllogism("syllogisms", "HARD", ["All boxes are cartons.", "Some cartons are bags.", "No bag is a sack."], "Some cartons are not sacks.", "Some boxes are bags.", "Only I follows", "The cartons that are bags cannot be sacks, so I follows. The bags among the cartons need not include any box, so II is not certain.");
syllogism("syllogisms", "HARD", ["No stone is a metal.", "Some metals are gold.", "All gold is precious."], "Some precious things are not stones.", "Some gold is not a stone.", "Both I and II follow", "The gold that is metal cannot be stone, so some gold is not a stone (II). That gold is also precious, so some precious things are not stones (I).");

// ── Statement and conclusion ────────────────────────────────────────────────
function statement(d: AptitudeDifficulty, s: string, i: string, ii: string, verdict: (typeof VERDICTS)[number], why: string) {
    hand(
        "statement-conclusion",
        d,
        `Statement: ${s}\nConclusions:\nI. ${i}\nII. ${ii}\nWhich conclusion(s) follow from the statement?`,
        verdict,
        VERDICTS.filter((v) => v !== verdict),
        why,
    );
}
statement("EASY", "Every candidate who scores above 60 in the test will be called for an interview. Riya scored 75 in the test.", "Riya will be called for an interview.", "Only candidates scoring above 70 are interviewed.", "Only I follows", "75 is above 60, so Riya is called (I). Nothing says the cut-off is 70; in fact 61 is enough, so II does not follow.");
statement("EASY", "All students of Class X passed the final exam. Aman did not pass the final exam.", "Aman is a student of Class X.", "Aman is not a student of Class X.", "Only II follows", "If Aman were in Class X he would have passed. He did not pass, so he is not in Class X: II follows and I is false.");
statement("EASY", "The company will hire only those applicants who know both Java and SQL. Neha knows SQL but not Java.", "Neha will not be hired.", "Neha knows SQL.", "Both I and II follow", "Neha lacks Java, so she fails the condition and will not be hired (I). The statement itself says she knows SQL (II).");
statement("MEDIUM", "If it rains, the match will be cancelled. The match was not cancelled.", "It did not rain.", "The match was played in the evening.", "Only I follows", "Rain would have cancelled the match; since it was not cancelled, it did not rain (I). Nothing is said about the time of the match (II).");
statement("MEDIUM", "If it rains, the match will be cancelled. The match was cancelled.", "It rained.", "It did not rain.", "Neither I nor II follows", "The match could have been cancelled for another reason, so rain is not certain (I); nor can we say it did not rain (II).");
statement("MEDIUM", "Some of the bank's branches are open on Sundays. The MG Road branch is one of the bank's branches.", "The MG Road branch is open on Sundays.", "All the bank's branches are open on Sundays.", "Neither I nor II follows", "Only some branches open on Sundays, and the MG Road branch may not be one of them (I); 'some' does not mean 'all' (II).");
statement("HARD", "Every server in the cluster runs either Linux or Windows, but not both. Server S7 is in the cluster and does not run Windows.", "S7 runs Linux.", "No server in the cluster runs both Linux and Windows.", "Both I and II follow", "S7 must run one of the two and it is not Windows, so it runs Linux (I). 'Not both' applies to every server, so II follows as well.");
statement("HARD", "All the trains that left before 6 pm reached on time. Train 12 reached late.", "Train 12 left at or after 6 pm.", "All trains that left after 6 pm reached late.", "Only I follows", "Had Train 12 left before 6 pm it would have been on time, so it left at or after 6 pm (I). The statement says nothing about how the later trains ran (II).");
statement("HARD", "Only members can use the club's gym. Ravi used the club's gym yesterday.", "All members used the gym yesterday.", "Ravi is a member of the club.", "Only II follows", "Only members can use the gym, so Ravi is a member (II). Nothing suggests that every member used it (I).");

// ── Analogies ───────────────────────────────────────────────────────────────
hand("analogies", "EASY", "Doctor : Hospital :: Teacher : ?", "School", ["Student", "Lesson", "Chalk"], "A doctor works in a hospital; a teacher works in a school.");
hand("analogies", "EASY", "Bird : Nest :: Bee : ?", "Hive", ["Honey", "Flower", "Burrow"], "A bird lives in a nest; a bee lives in a hive.");
hand("analogies", "EASY", "Word : Sentence :: Brick : ?", "Wall", ["Cement", "Mason", "Clay"], "Words are the units a sentence is built from; bricks are the units a wall is built from.");
hand("analogies", "MEDIUM", "Thermometer : Temperature :: Barometer : ?", "Atmospheric pressure", ["Humidity", "Rainfall", "Wind speed"], "A thermometer measures temperature; a barometer measures atmospheric pressure.");
hand("analogies", "MEDIUM", "3 : 27 :: 5 : ?", "125", ["25", "15", "243"], "27 is 3 cubed, so the answer is 5 cubed, 125.", () => String(5 ** 3));
hand("analogies", "MEDIUM", "7 : 50 :: 9 : ?", "82", ["81", "80", "90"], "50 = 7^2 + 1, so the answer is 9^2 + 1 = 82.", () => String(9 ** 2 + 1));
hand("analogies", "MEDIUM", "ACE : BDF :: MOQ : ?", "NPR", ["NOP", "LNP", "MPS"], "Each letter of ACE moves one place forward to give BDF; doing the same to MOQ gives NPR.", () => shift("MOQ", 1));
hand("analogies", "EASY", "Carpenter : Wood :: Potter : ?", "Clay", ["Pot", "Wheel", "Kiln"], "A carpenter shapes wood; a potter shapes clay. The wheel and kiln are tools, and the pot is the product.");
hand("analogies", "MEDIUM", "Kilogram : Mass :: Ampere : ?", "Electric current", ["Voltage", "Resistance", "Power"], "The kilogram is the SI unit of mass; the ampere is the SI unit of electric current (voltage is in volts, resistance in ohms, power in watts).");
hand("analogies", "HARD", "Loquacious : Talkative :: Taciturn : ?", "Reserved", ["Talkative", "Tactful", "Angry"], "Loquacious means talkative (a synonym pair); taciturn means reserved, saying little.");

// ── Odd one out ─────────────────────────────────────────────────────────────
hand("odd-one-out", "EASY", "Which is the odd one out? Mango, Apple, Carrot, Banana", "Carrot", ["Mango", "Apple", "Banana"], "Carrot is a vegetable (a root); the others are fruits.");
hand("odd-one-out", "EASY", "Which number is the odd one out? 5, 7, 9, 11", "9", ["5", "7", "11"], "9 = 3 x 3 is not prime; 5, 7 and 11 are prime.", () => ["5", "7", "9", "11"].find((n) => { const x = Number(n); for (let k = 2; k * k <= x; k++) if (x % k === 0) return true; return false; }) ?? "");
hand("odd-one-out", "EASY", "Which is the odd one out? Circle, Triangle, Square, Cube", "Cube", ["Circle", "Triangle", "Square"], "A cube is a three-dimensional solid; the others are flat, two-dimensional shapes.");
hand("odd-one-out", "MEDIUM", "Which number is the odd one out? 121, 169, 225, 290", "290", ["121", "169", "225"], "121, 169 and 225 are the squares of 11, 13 and 15; 290 is not a perfect square.", () => ["121", "169", "225", "290"].find((n) => !Number.isInteger(Math.sqrt(Number(n)))) ?? "");
hand("odd-one-out", "MEDIUM", "Which number is the odd one out? 27, 64, 125, 150", "150", ["27", "64", "125"], "27, 64 and 125 are the cubes of 3, 4 and 5; 150 is not a perfect cube.", () => ["27", "64", "125", "150"].find((n) => Math.round(Math.cbrt(Number(n))) ** 3 !== Number(n)) ?? "");
hand("odd-one-out", "EASY", "Which is the odd one out? Mercury, Venus, Moon, Mars", "Moon", ["Mercury", "Venus", "Mars"], "The Moon is a natural satellite of the Earth; the other three are planets.");
hand("odd-one-out", "MEDIUM", "Which is the odd one out? Python, Java, Linux, Rust", "Linux", ["Python", "Java", "Rust"], "Linux is an operating system kernel; Python, Java and Rust are programming languages.");
hand("odd-one-out", "MEDIUM", "Which is the odd one out? Keyboard, Mouse, Scanner, Monitor", "Monitor", ["Keyboard", "Mouse", "Scanner"], "A monitor is an output device; the keyboard, mouse and scanner are input devices.");
hand("odd-one-out", "MEDIUM", "Which is the odd one out? TCP, UDP, HTTP, HTML", "HTML", ["TCP", "UDP", "HTTP"], "HTML is a markup language for web pages; TCP, UDP and HTTP are network protocols.");
hand("odd-one-out", "HARD", "Which is the odd one out? BCD, FGH, JKL, MOP", "MOP", ["BCD", "FGH", "JKL"], "BCD, FGH and JKL are three consecutive letters; MOP skips N.", () => ["BCD", "FGH", "JKL", "MOP"].find((g) => g.charCodeAt(1) - g.charCodeAt(0) !== 1 || g.charCodeAt(2) - g.charCodeAt(1) !== 1) ?? "");
hand("odd-one-out", "HARD", "Which number is the odd one out? 17, 29, 41, 51", "51", ["17", "29", "41"], "51 = 3 x 17 is not prime; 17, 29 and 41 are prime.", () => ["17", "29", "41", "51"].find((n) => { const x = Number(n); for (let k = 2; k * k <= x; k++) if (x % k === 0) return true; return false; }) ?? "");

// ── Clocks and calendars ────────────────────────────────────────────────────
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const angle = (h: number, m: number) => {
    const a = Math.abs(30 * (h % 12) - 5.5 * m);
    return Math.min(a, 360 - a);
};
const degrees = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} degrees`;
for (const [h, m, d] of [[3, 40, "MEDIUM"], [7, 20, "MEDIUM"], [9, 15, "HARD"]] as const) {
    const a = angle(h, m);
    Q.add("clocks-calendars", {
        difficulty: d,
        prompt: `What is the smaller angle between the hour hand and the minute hand of a clock at ${h}:${String(m).padStart(2, "0")}?`,
        answer: degrees(a),
        distractors: [degrees(Math.abs(30 * h - 6 * m) % 360 > 180 ? 360 - (Math.abs(30 * h - 6 * m) % 360) : Math.abs(30 * h - 6 * m) % 360), degrees(a + 10), degrees(a - 5)],
        explanation: `The hour hand is at ${30 * h} + ${m}/2 = ${30 * h + m / 2} degrees and the minute hand at ${6 * m} degrees. The gap is ${Math.abs(30 * h + m / 2 - 6 * m)} degrees${Math.abs(30 * h + m / 2 - 6 * m) > 180 ? `, so the smaller angle is 360 minus that, ${degrees(a)}` : ""}.`,
        recheck: () => {
            // Simulate the hands minute by minute from 12:00.
            let hour = 0;
            let minute = 0;
            for (let t = 0; t < h * 60 + m; t++) {
                hour += 0.5;
                minute = (minute + 6) % 360;
            }
            const gap = Math.abs(hour - minute) % 360;
            return degrees(Math.min(gap, 360 - gap));
        },
    });
}
{
    const [h, m] = [4, 25];
    const total = 12 * 60 - (h * 60 + m);
    const ans = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    Q.add("clocks-calendars", {
        difficulty: "EASY",
        prompt: `A clock shows ${h}:${m}. What time does its reflection in a vertical mirror appear to show?`,
        answer: ans,
        distractors: ["8:25", "7:25", "8:35"],
        explanation: `A mirror time and the real time add up to 12:00, so the reflection shows 12:00 - ${h}:${m} = ${ans}.`,
        recheck: () => `${11 - h}:${String(60 - m).padStart(2, "0")}`,
    });
}
{
    const h = 4;
    const whole = Math.floor((60 * h) / 11);
    const rem = (60 * h) % 11;
    Q.add("clocks-calendars", {
        difficulty: "HARD",
        prompt: `At what time between ${h} and ${h + 1} o'clock are the hour and minute hands exactly together?`,
        answer: `${whole} ${rem}/11 minutes past ${h}`,
        distractors: [`20 minutes past ${h}`, `22 minutes past ${h}`, `${whole} 3/11 minutes past ${h}`],
        explanation: `The minute hand gains 5.5 degrees a minute on the hour hand and must make up ${30 * h} degrees, which takes ${30 * h}/5.5 = ${60 * h}/11 = ${whole} ${rem}/11 minutes.`,
        recheck: () => {
            // Step in 1/11 minutes until the hands meet.
            for (let k = 0; k < 60 * 11; k++) if (Math.abs(30 * h + (0.5 * k) / 11 - (6 * k) / 11) < 1e-9) return `${Math.floor(k / 11)} ${k % 11}/11 minutes past ${h}`;
            return "none";
        },
    });
}
const utc = (y: number, mo: number, d: number) => new Date(Date.UTC(y, mo - 1, d));
{
    const first = utc(2025, 1, 1).getUTCDay();
    const target = utc(2025, 3, 1).getUTCDay();
    Q.add("clocks-calendars", {
        difficulty: "MEDIUM",
        prompt: `1 January 2025 was a ${DAYS[first]}. What day of the week was 1 March 2025?`,
        answer: DAYS[target]!,
        distractors: [DAYS[(target + 6) % 7]!, DAYS[(target + 1) % 7]!, DAYS[first]!],
        explanation: `From 1 January to 1 March 2025 is 31 + 28 = 59 days (2025 is not a leap year). 59 = 8 weeks + 3 days, so it is 3 days after ${DAYS[first]}: ${DAYS[target]}.`,
        recheck: () => DAYS[(first + 59) % 7]!,
    });
}
{
    const a = utc(2023, 8, 15).getUTCDay();
    const b = utc(2024, 8, 15).getUTCDay();
    Q.add("clocks-calendars", {
        difficulty: "MEDIUM",
        prompt: `15 August 2023 was a ${DAYS[a]}. What day of the week was 15 August 2024?`,
        answer: DAYS[b]!,
        distractors: [DAYS[(a + 1) % 7]!, DAYS[a]!, DAYS[(b + 1) % 7]!],
        explanation: "The year between them includes 29 February 2024, so it has 366 days = 52 weeks + 2 days, and the weekday moves forward by 2.",
        recheck: () => DAYS[(a + 366) % 7]!,
    });
}
{
    Q.add("clocks-calendars", {
        difficulty: "EASY",
        prompt: "Today is Monday. What day of the week will it be 61 days from today?",
        answer: DAYS[(1 + 61) % 7]!,
        distractors: ["Friday", "Sunday", "Monday"],
        explanation: `61 days = 8 weeks + 5 days, and 5 days after Monday is ${DAYS[(1 + 61) % 7]}.`,
        recheck: () => DAYS[new Date(Date.UTC(2024, 0, 1 + 61)).getUTCDay()]!, // 1 Jan 2024 was a Monday
    });
}
{
    const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const years = [1900, 2000, 2100, 2200];
    Q.add("clocks-calendars", {
        difficulty: "EASY",
        prompt: `Which of these years is a leap year? ${years.join(", ")}`,
        answer: String(years.find(leap)),
        distractors: years.filter((y) => !leap(y)).map(String),
        explanation: "A century year is a leap year only if it is divisible by 400. Of these, only 2000 is.",
        recheck: () => String(years.find((y) => new Date(Date.UTC(y, 1, 29)).getUTCMonth() === 1)),
    });
}

export const LOGICAL = Q.out;
