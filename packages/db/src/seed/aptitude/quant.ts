/**
 * QUANT: every question is generated from fixed parameters. The code computes
 * the answer and builds the distractors from plausible mistakes, so the answer
 * is right by construction; `recheck` recomputes it by a second route
 * (brute force, simulation, a year-by-year loop) where one exists.
 */
import { bank, fmt, frac, gcd, lcm } from "./helpers";

const Q = bank("QUANT");

const pct = (n: number) => `${fmt(n)}%`;
const rs = (n: number) => `Rs. ${fmt(n)}`;
const change = (n: number, up = "increase", down = "decrease") =>
    Math.abs(n) < 1e-9 ? "No change" : n > 0 ? `${fmt(n)}% ${up}` : `${fmt(-n)}% ${down}`;
const pl = (n: number) => change(n, "profit", "loss");
/** Only the candidates that make a tidy option (integers or halves), formatted. */
const tidy = (f: (n: number) => string, ...xs: number[]) =>
    xs.filter((x) => x > 0 && Math.abs(x * 2 - Math.round(x * 2)) < 1e-9).map(f);
/** Brute force: the first integer in [lo, hi] for which `ok` holds. */
function search(lo: number, hi: number, ok: (x: number) => boolean): number {
    for (let x = lo; x <= hi; x++) if (ok(x)) return x;
    return NaN;
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function choose(n: number, k: number): number {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i;
    return Math.round(r);
}
function combos<T>(xs: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (xs.length < k) return [];
    const [h, ...t] = xs;
    return [...combos(t, k - 1).map((c) => [h as T, ...c]), ...combos(t, k)];
}
function perms<T>(xs: T[]): T[][] {
    if (xs.length <= 1) return [xs];
    return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
const DICE = [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => [a, b] as const));

// ── Percentages ─────────────────────────────────────────────────────────────
for (const [p, n] of [[15, 640], [37.5, 480]] as const) {
    const a = (n * p) / 100;
    Q.add("percentages", {
        difficulty: "EASY",
        prompt: `What is ${p}% of ${n}?`,
        answer: fmt(a),
        distractors: [fmt((n * (100 - p)) / 100), fmt(a * 10), fmt(a + p)],
        explanation: `${p}% of ${n} = ${n} x ${p}/100 = ${fmt(a)}.`,
        recheck: () => fmt((n / 100) * p),
    });
}
for (const [p, s, f] of [[40, 178, 22], [35, 230, 50]] as const) {
    const max = ((s + f) * 100) / p;
    Q.add("percentages", {
        difficulty: "EASY",
        prompt: `A student needs ${p}% of the maximum marks to pass. She scores ${s} marks and fails by ${f} marks. What are the maximum marks?`,
        answer: fmt(max),
        distractors: [...tidy(fmt, ((s - f) * 100) / p, (s * 100) / p), fmt(max - 100), fmt(max + 100), fmt(max - 200)],
        explanation: `The pass mark is ${s} + ${f} = ${s + f}, which is ${p}% of the maximum, so the maximum is ${s + f} x 100/${p} = ${fmt(max)}.`,
        recheck: () => fmt(search(1, 5000, (m) => close((m * p) / 100 - s, f))),
    });
}
for (const [a, b] of [[20, 20], [30, 10]] as const) {
    const net = (1 + a / 100) * (1 - b / 100) * 100 - 100;
    Q.add("percentages", {
        difficulty: "MEDIUM",
        prompt: `The price of an item is first increased by ${a}% and then decreased by ${b}%. What is the net change in its price?`,
        answer: change(net),
        distractors: [change(a - b), change(a - b + (a * b) / 100), change(-net), change(net - 2)],
        explanation: `Net factor = ${fmt(1 + a / 100)} x ${fmt(1 - b / 100)} = ${fmt(1 + net / 100)}, i.e. a ${change(net).toLowerCase()} (a - b - ab/100 = ${fmt(net)}).`,
        recheck: () => change(100 * (1 + a / 100) * (1 - b / 100) - 100),
    });
}
{
    const a = 25;
    const ans = (a / (100 + a)) * 100;
    Q.add("percentages", {
        difficulty: "MEDIUM",
        prompt: `A's salary is ${a}% more than B's. By what percent is B's salary less than A's?`,
        answer: pct(ans),
        distractors: [pct(a), pct((a / (100 - a)) * 100), pct(ans - 5)],
        explanation: `If B earns 100, A earns ${100 + a}. B is ${a} less than ${100 + a}, which is ${a}/${100 + a} x 100 = ${pct(ans)} of A's salary.`,
        recheck: () => pct(((125 - 100) / 125) * 100),
    });
}
{
    const [rent, food, save] = [25, 20, 24000];
    const salary = save / ((1 - rent / 100) * (1 - food / 100));
    Q.add("percentages", {
        difficulty: "MEDIUM",
        prompt: `Ravi spends ${rent}% of his salary on rent and ${food}% of the remaining amount on food. He saves the rest, which is Rs. 24,000. What is his salary?`,
        answer: rs(salary),
        distractors: [
            ...tidy(rs, save / (1 - (rent + food) / 100), save / (1 - food / 100), save / (1 - rent / 100)),
            rs(save * 2),
        ],
        explanation: `He keeps ${100 - rent}% x ${100 - food}% = ${fmt((1 - rent / 100) * (1 - food / 100) * 100)}% of his salary, so salary = 24,000 / ${fmt((1 - rent / 100) * (1 - food / 100))} = ${rs(salary)}.`,
        recheck: () => rs(search(1, 200000, (x) => close(x * 0.75 * 0.8, save))),
    });
}
{
    const [total, turnout, invalid, winner] = [20000, 80, 10, 60];
    const valid = total * (turnout / 100) * (1 - invalid / 100);
    const margin = valid * ((2 * winner) / 100 - 1);
    Q.add("percentages", {
        difficulty: "HARD",
        prompt: `In an election between two candidates, ${turnout}% of the registered voters voted and ${invalid}% of the votes cast were invalid. The winner got ${winner}% of the valid votes and won by ${fmt(margin)} votes. How many voters were registered?`,
        answer: fmt(total),
        distractors: [
            fmt(margin / ((turnout / 100) * (2 * winner / 100 - 1))),
            fmt(margin / ((1 - invalid / 100) * (2 * winner / 100 - 1))),
            fmt(margin / (2 * winner / 100 - 1)),
        ],
        explanation: `Valid votes = 0.${turnout} x 0.${100 - invalid} x T = ${fmt(valid / total)}T, and the margin is ${winner}% - ${100 - winner}% = ${2 * winner - 100}% of that, so ${fmt((valid / total) * (2 * winner / 100 - 1))}T = ${fmt(margin)} and T = ${fmt(total)}.`,
        recheck: () => fmt(search(1, 100000, (t) => close(t * 0.8 * 0.9 * 0.2, margin))),
    });
}
{
    const [h, e, both, passed] = [35, 45, 20, 4000];
    const passPct = 100 - (h + e - both);
    const total = (passed * 100) / passPct;
    Q.add("percentages", {
        difficulty: "HARD",
        prompt: `In an examination, ${h}% of the students failed in Hindi, ${e}% failed in English and ${both}% failed in both. If ${fmt(passed)} students passed in both subjects, how many students took the examination?`,
        answer: fmt(total),
        distractors: [...tidy(fmt, (passed * 100) / (100 - h - e), (passed * 100) / (100 - both)), fmt(total - 2000)],
        explanation: `Failed in at least one = ${h} + ${e} - ${both} = ${h + e - both}%, so ${passPct}% passed both: ${passPct}% of N = ${fmt(passed)}, N = ${fmt(total)}.`,
        recheck: () => fmt(search(1, 100000, (n) => close(n - n * 0.35 - n * 0.45 + n * 0.2, passed))),
    });
}

// ── Profit and loss ─────────────────────────────────────────────────────────
for (const [cp, sp] of [[400, 460], [1250, 1100]] as const) {
    const g = ((sp - cp) / cp) * 100;
    Q.add("profit-and-loss", {
        difficulty: "EASY",
        prompt: `An article bought for Rs. ${fmt(cp)} is sold for Rs. ${fmt(sp)}. What is the profit or loss percent?`,
        answer: pl(g),
        distractors: [pl(-g), pl(((sp - cp) / sp) * 100), pl(g + (g > 0 ? 5 : -5))],
        explanation: `${g > 0 ? "Profit" : "Loss"} = ${fmt(Math.abs(sp - cp))} on a cost of ${fmt(cp)}, which is ${fmt(Math.abs(sp - cp))}/${fmt(cp)} x 100 = ${pct(Math.abs(g))}. Profit and loss percent are always taken on the cost price.`,
        recheck: () => pl(100 * (sp / cp - 1)),
    });
}
{
    const [mp, d] = [1200, 15];
    const sp = mp * (1 - d / 100);
    Q.add("profit-and-loss", {
        difficulty: "EASY",
        prompt: `A shirt is marked at Rs. ${fmt(mp)} and sold at a discount of ${d}%. What is its selling price?`,
        answer: rs(sp),
        distractors: [rs(mp * (1 + d / 100)), rs((mp * d) / 100), rs(mp - d * 10)],
        explanation: `Selling price = ${fmt(mp)} x (100 - ${d})/100 = ${rs(sp)}.`,
        recheck: () => rs(mp - (mp * d) / 100),
    });
}
{
    const [sp, loss, gain] = [540, 10, 20];
    const cp = sp / (1 - loss / 100);
    const ans = cp * (1 + gain / 100);
    Q.add("profit-and-loss", {
        difficulty: "MEDIUM",
        prompt: `By selling a watch for Rs. ${sp}, a shopkeeper loses ${loss}%. At what price should he sell it to gain ${gain}%?`,
        answer: rs(ans),
        distractors: [rs(sp * (1 + (loss + gain) / 100)), rs(sp * (1 + gain / 100)), rs(cp * (1 + loss / 100))],
        explanation: `Cost price = ${sp} / 0.${100 - loss} = ${fmt(cp)}; for a ${gain}% gain he must sell at ${fmt(cp)} x ${fmt(1 + gain / 100)} = ${rs(ans)}.`,
        recheck: () => rs(search(1, 10000, (c) => close(c * 0.9, sp)) * 1.2),
    });
}
for (const [m, d] of [[40, 25], [50, 20]] as const) {
    const net = (1 + m / 100) * (1 - d / 100) * 100 - 100;
    Q.add("profit-and-loss", {
        difficulty: "MEDIUM",
        prompt: `A trader marks his goods ${m}% above the cost price and then allows a discount of ${d}%. What is his profit or loss percent?`,
        answer: pl(net),
        distractors: [pl(m - d), pl(m - d + (m * d) / 100), pl(-net)],
        explanation: `On a cost of 100 the marked price is ${100 + m} and the selling price is ${100 + m} x ${fmt(1 - d / 100)} = ${fmt(100 + net)}, so the result is a ${pl(net).toLowerCase()}.`,
        recheck: () => pl(100 * (1 + m / 100) * (1 - d / 100) - 100),
    });
}
{
    const w = 800;
    const g = ((1000 - w) / w) * 100;
    Q.add("profit-and-loss", {
        difficulty: "MEDIUM",
        prompt: `A dishonest grocer claims to sell rice at cost price but uses a weight of ${w} g in place of 1 kg. What is his gain percent?`,
        answer: pct(g),
        distractors: [pct((1000 - w) / 10), pct(g + 5), pct(g / 2)],
        explanation: `He gives ${w} g but charges for 1000 g, gaining ${1000 - w} g on ${w} g: ${1000 - w}/${w} x 100 = ${pct(g)}.`,
        recheck: () => pct((1000 / w - 1) * 100),
    });
}
{
    const p = 20;
    const net = -(p * p) / 100;
    Q.add("profit-and-loss", {
        difficulty: "MEDIUM",
        prompt: `Two phones are sold for Rs. 9,600 each. One is sold at a ${p}% profit and the other at a ${p}% loss. What is the overall profit or loss percent?`,
        answer: pl(net),
        distractors: ["No profit, no loss", pl(-net), pl(-p / 2)],
        explanation: `Cost prices are 9,600/1.2 = 8,000 and 9,600/0.8 = 12,000, total 20,000, against sales of 19,200: a loss of 800, which is 4%. Equal selling prices with equal gain and loss always give a loss of p^2/100 %.`,
        recheck: () => pl(((19200 - (9600 / 1.2 + 9600 / 0.8)) / (9600 / 1.2 + 9600 / 0.8)) * 100),
    });
}
{
    const [n, g] = [33, 11];
    const gain = (g / (n - g)) * 100;
    Q.add("profit-and-loss", {
        difficulty: "HARD",
        prompt: `By selling ${n} metres of cloth, a merchant gains the selling price of ${g} metres. What is his gain percent?`,
        answer: pct(gain),
        distractors: [pct((g / n) * 100), pct((g / (n + g)) * 100), pct(((n - g) / n) * 100)],
        explanation: `SP(${n}) - CP(${n}) = SP(${g}), so SP(${n - g}) = CP(${n}). The gain is ${g} metres' worth on ${n - g} metres' worth: ${g}/${n - g} x 100 = ${pct(gain)}.`,
        recheck: () => pct((n / (n - g) - 1) * 100),
    });
}
{
    const [a, b] = [20, 10];
    const gain = ((1 + b / 100) / (1 - a / 100) - 1) * 100;
    Q.add("profit-and-loss", {
        difficulty: "HARD",
        prompt: `A dealer buys a bicycle at ${a}% below its list price and sells it at ${b}% above the list price. What is his profit percent?`,
        answer: pct(gain),
        distractors: [pct(a + b), pct(a + b + (a * b) / 100), pct(gain - 5)],
        explanation: `On a list price of 100 he pays ${100 - a} and receives ${100 + b}, a profit of ${a + b} on ${100 - a}: ${a + b}/${100 - a} x 100 = ${pct(gain)}.`,
        recheck: () => pct(((110 - 80) / 80) * 100),
    });
}

// ── Simple and compound interest ────────────────────────────────────────────
for (const [p, r, t] of [[8000, 6, 3], [12500, 8, 2]] as const) {
    const si = (p * r * t) / 100;
    Q.add("interest", {
        difficulty: "EASY",
        prompt: `What is the simple interest on Rs. ${fmt(p)} at ${r}% per annum for ${t} years?`,
        answer: rs(si),
        distractors: [rs(p + si), rs((si * (t - 1)) / t), rs(p * ((1 + r / 100) ** t - 1))],
        explanation: `SI = P x R x T / 100 = ${fmt(p)} x ${r} x ${t} / 100 = ${rs(si)}.`,
        recheck: () => {
            let s = 0;
            for (let y = 0; y < t; y++) s += (p * r) / 100;
            return rs(s);
        },
    });
}
{
    const n = 8;
    const r = 100 / n;
    Q.add("interest", {
        difficulty: "EASY",
        prompt: `At simple interest, a sum of money doubles itself in ${n} years. What is the rate of interest per annum?`,
        answer: pct(r),
        distractors: [pct(r / 2), pct(n), pct(r * 2)],
        explanation: `Doubling means the interest equals the principal: P = P x R x ${n}/100, so R = 100/${n} = ${pct(r)}.`,
        recheck: () => pct(100 / n),
    });
}
for (const [p, r, t] of [[8000, 5, 3], [10000, 10, 2]] as const) {
    const ci = p * ((1 + r / 100) ** t - 1);
    Q.add("interest", {
        difficulty: "MEDIUM",
        prompt: `What is the compound interest on Rs. ${fmt(p)} at ${r}% per annum for ${t} years, compounded annually?`,
        answer: rs(ci),
        distractors: [rs((p * r * t) / 100), rs(p + ci), rs(p * ((1 + r / 100) ** (t - 1) - 1))],
        explanation: `Amount = ${fmt(p)} x (1 + ${r}/100)^${t} = ${fmt(p + ci)}, so CI = ${fmt(p + ci)} - ${fmt(p)} = ${rs(ci)}.`,
        recheck: () => {
            let a = p;
            for (let y = 0; y < t; y++) a += (a * r) / 100;
            return rs(a - p);
        },
    });
}
for (const [p, r] of [[5000, 8], [20000, 5]] as const) {
    const d = (p * r * r) / 10000;
    Q.add("interest", {
        difficulty: "MEDIUM",
        prompt: `What is the difference between the compound interest (compounded annually) and the simple interest on Rs. ${fmt(p)} for 2 years at ${r}% per annum?`,
        answer: rs(d),
        distractors: [rs(d * 2), rs((p * r) / 100), rs(d / 2)],
        explanation: `For 2 years the difference is the interest on the first year's interest: P(R/100)^2 = ${fmt(p)} x (${r}/100)^2 = ${rs(d)}.`,
        recheck: () => {
            let a = p;
            for (let y = 0; y < 2; y++) a += (a * r) / 100;
            return rs(a - p - (p * r * 2) / 100);
        },
    });
}
{
    const [p, r] = [16000, 10];
    const ci = p * ((1 + r / 200) ** 2 - 1);
    Q.add("interest", {
        difficulty: "MEDIUM",
        prompt: `What is the compound interest on Rs. 16,000 for 1 year at ${r}% per annum, compounded half-yearly?`,
        answer: rs(ci),
        distractors: [rs((p * r) / 100), rs(p + ci), rs(ci + 40)],
        explanation: `Half-yearly means ${r / 2}% for 2 periods: 16,000 x 1.05 x 1.05 = ${fmt(p + ci)}, so CI = ${rs(ci)}.`,
        recheck: () => {
            let a = p;
            for (let h = 0; h < 2; h++) a += (a * r) / 200;
            return rs(a - p);
        },
    });
}
{
    const [p, r] = [10000, 20];
    const a2 = p * (1 + r / 100) ** 2;
    const a3 = a2 * (1 + r / 100);
    Q.add("interest", {
        difficulty: "MEDIUM",
        prompt: `A sum of money at compound interest (compounded annually) amounts to Rs. ${fmt(a2)} in 2 years and to Rs. ${fmt(a3)} in 3 years. What is the rate of interest?`,
        answer: pct(r),
        distractors: [pct(((a3 - a2) / a3) * 100), pct(25), pct(r / 2)],
        explanation: `The third year's interest is ${fmt(a3)} - ${fmt(a2)} = ${fmt(a3 - a2)}, earned on ${fmt(a2)}: ${fmt(a3 - a2)}/${fmt(a2)} x 100 = ${pct(r)}.`,
        recheck: () => pct(search(1, 100, (x) => close(a2 * (1 + x / 100), a3))),
    });
}
{
    const [p, r] = [62500, 4];
    const a2 = p * (1 + r / 100) ** 2;
    const a3 = a2 * (1 + r / 100);
    Q.add("interest", {
        difficulty: "HARD",
        prompt: `A sum at compound interest (compounded annually) becomes Rs. ${fmt(a2)} in 2 years and Rs. ${fmt(a3)} in 3 years. What is the sum?`,
        answer: rs(p),
        distractors: [rs(a2 - 2 * (a3 - a2)), rs(a2 - (a3 - a2)), rs(60000)],
        explanation: `The rate is ${fmt(a3 - a2)}/${fmt(a2)} = ${r}%, so the sum is ${fmt(a2)} / (1.0${r})^2 = ${rs(p)}.`,
        recheck: () => rs(search(1, 200000, (x) => close(x * 1.04 * 1.04, a2))),
    });
}

// ── Ratio and proportion ────────────────────────────────────────────────────
{
    const [total, a, b, c] = [7200, 2, 3, 4];
    const big = (total * c) / (a + b + c);
    Q.add("ratio-and-proportion", {
        difficulty: "EASY",
        prompt: `Rs. ${fmt(total)} is divided among three friends in the ratio ${a} : ${b} : ${c}. What is the largest share?`,
        answer: rs(big),
        distractors: [rs((total * b) / (a + b + c)), rs((total * a) / (a + b + c)), rs((total * c) / 10)],
        explanation: `There are ${a + b + c} parts, each worth ${fmt(total / (a + b + c))}; the largest share is ${c} parts = ${rs(big)}.`,
        recheck: () => rs(Math.max(...[a, b, c].map((k) => (k / (a + b + c)) * total))),
    });
}
for (const [a, b] of [[9, 16], [4, 25]] as const) {
    const m = Math.sqrt(a * b);
    Q.add("ratio-and-proportion", {
        difficulty: "EASY",
        prompt: `What is the mean proportional between ${a} and ${b}?`,
        answer: fmt(m),
        distractors: [fmt((a + b) / 2), fmt(m + 2), fmt(m - 2)],
        explanation: `The mean proportional x satisfies ${a} : x = x : ${b}, so x^2 = ${a * b} and x = ${fmt(m)}.`,
        recheck: () => fmt(search(1, 1000, (x) => x * x === a * b)),
    });
}
for (const [a, b, c, d] of [[2, 3, 4, 5], [3, 4, 6, 7]] as const) {
    const [x, y, z] = [a * c, b * c, b * d];
    const g = gcd(gcd(x, y), z);
    const ans = `${x / g} : ${y / g} : ${z / g}`;
    Q.add("ratio-and-proportion", {
        difficulty: "MEDIUM",
        prompt: `If A : B = ${a} : ${b} and B : C = ${c} : ${d}, what is A : B : C?`,
        answer: ans,
        distractors: [`${a} : ${b} : ${d}`, `${a * d} : ${b * c} : ${b * d}`, `${a * c} : ${b * d} : ${c * d}`],
        explanation: `Make B the same in both: multiply the first ratio by ${c} and the second by ${b}, giving ${a * c} : ${b * c} and ${b * c} : ${b * d}, so A : B : C = ${ans}.`,
        recheck: () => {
            // A = 1 unit: B = b/a, C = B x d/c; scale to integers.
            const [A, B, C] = [a * c * 1, b * c, (b * c * d) / c];
            const h = gcd(gcd(A, B), C);
            return `${A / h} : ${B / h} : ${C / h}`;
        },
    });
}
{
    const [a, b] = [3, 4];
    const [num, den] = [4 * a + 5 * b, 3 * a + 2 * b];
    const g = gcd(num, den);
    Q.add("ratio-and-proportion", {
        difficulty: "EASY",
        prompt: `If x : y = ${a} : ${b}, what is (4x + 5y) : (3x + 2y)?`,
        answer: `${num / g} : ${den / g}`,
        distractors: [`${(4 + 5) * 1} : ${3 + 2}`, `${4 * a + 5 * b + 1} : ${den}`, `${den} : ${num}`],
        explanation: `Put x = ${a} and y = ${b}: 4x + 5y = ${num} and 3x + 2y = ${den}, so the ratio is ${num} : ${den}.`,
        recheck: () => `${(4 * 6 + 5 * 8) / 2} : ${(3 * 6 + 2 * 8) / 2}`,
    });
}
{
    const [a, b, c, d, s] = [5, 4, 3, 2, 1600];
    const x = (s * (d - c)) / (a * d - b * c);
    Q.add("ratio-and-proportion", {
        difficulty: "MEDIUM",
        prompt: `The incomes of P and Q are in the ratio ${a} : ${b} and their expenses are in the ratio ${c} : ${d}. If each of them saves Rs. ${fmt(s)}, what is P's income?`,
        answer: rs(a * x),
        distractors: [rs(b * x), rs(s * a), rs(a * x + 800)],
        explanation: `Let incomes be ${a}x, ${b}x and expenses ${c}y, ${d}y. ${a}x - ${c}y = ${b}x - ${d}y = ${fmt(s)} gives x = ${fmt(x)}, so P earns ${rs(a * x)}.`,
        recheck: () => {
            for (let xx = 1; xx < 10000; xx++) {
                const y = (a * xx - s) / c;
                if (y > 0 && Number.isInteger(y) && b * xx - d * y === s) return rs(a * xx);
            }
            return "none";
        },
    });
}
{
    const [a, b, k, c, d] = [3, 5, 10, 5, 7];
    const x = (d * k - c * k) / (c * b - d * a);
    Q.add("ratio-and-proportion", {
        difficulty: "MEDIUM",
        prompt: `Two numbers are in the ratio ${a} : ${b}. If ${k} is added to each, the ratio becomes ${c} : ${d}. What is the smaller number?`,
        answer: fmt(a * x),
        distractors: [fmt(b * x), fmt(a * x + a), fmt(a * 2)],
        explanation: `(${a}x + ${k}) / (${b}x + ${k}) = ${c}/${d} gives ${d * a}x + ${d * k} = ${c * b}x + ${c * k}, so x = ${fmt(x)} and the numbers are ${fmt(a * x)} and ${fmt(b * x)}.`,
        recheck: () => fmt(a * search(1, 1000, (t) => (a * t + k) * d === (b * t + k) * c)),
    });
}
{
    const [one, half, quarter, value] = [5, 6, 8, 210];
    const unit = one * 1 + half * 0.5 + quarter * 0.25;
    const x = value / unit;
    Q.add("ratio-and-proportion", {
        difficulty: "HARD",
        prompt: `A bag has Re. 1, 50-paise and 25-paise coins in the ratio ${one} : ${half} : ${quarter}, worth Rs. ${value} in all. How many 50-paise coins are there?`,
        answer: fmt(half * x),
        distractors: [fmt(one * x), fmt(quarter * x), fmt((half * x) / 2)],
        explanation: `Counts ${one}x, ${half}x, ${quarter}x are worth ${one}x + ${half / 2}x + ${quarter / 4}x = ${unit}x = ${value}, so x = ${fmt(x)} and there are ${fmt(half * x)} 50-paise coins.`,
        recheck: () => fmt(half * search(1, 1000, (t) => close(t * 5 + t * 6 * 0.5 + t * 8 * 0.25, value))),
    });
}
{
    const [a, b, bMonths, profit] = [50000, 60000, 7, 34000];
    const [sa, sb] = [a * 12, b * bMonths];
    const share = (profit * sb) / (sa + sb);
    Q.add("ratio-and-proportion", {
        difficulty: "HARD",
        prompt: `A starts a business with Rs. 50,000. After 5 months B joins with Rs. 60,000. At the end of the year the profit is Rs. 34,000. What is B's share?`,
        answer: rs(share),
        distractors: [rs(profit - share), rs(profit / 2), rs(12000)],
        explanation: `Capital x months: A = 50,000 x 12 = 6,00,000 and B = 60,000 x ${bMonths} = 4,20,000, a ratio of 10 : 7. B gets 7/17 of 34,000 = ${rs(share)}.`,
        recheck: () => rs(profit * (420000 / 1020000)),
    });
}

// ── Averages ────────────────────────────────────────────────────────────────
{
    const xs = [12, 18, 25, 31, 44];
    const avg = xs.reduce((s, x) => s + x, 0) / xs.length;
    Q.add("averages", {
        difficulty: "EASY",
        prompt: `What is the average of ${xs.join(", ")}?`,
        answer: fmt(avg),
        distractors: [fmt(xs[2] as number), fmt(avg + 0.5), fmt((xs.reduce((s, x) => s + x, 0)) / (xs.length - 1))],
        explanation: `The sum is ${xs.reduce((s, x) => s + x, 0)} and there are ${xs.length} numbers, so the average is ${fmt(avg)}.`,
        recheck: () => fmt((12 + 18 + 25 + 31 + 44) / 5),
    });
}
{
    const [n, a, b] = [10, 24, 25];
    const x = (n + 1) * b - n * a;
    Q.add("averages", {
        difficulty: "EASY",
        prompt: `The average of ${n} numbers is ${a}. When one more number is added, the average becomes ${b}. What is the number added?`,
        answer: fmt(x),
        distractors: [fmt(n * (b - a)), fmt(b + (b - a)), fmt(x + 1)],
        explanation: `The new total is ${n + 1} x ${b} = ${(n + 1) * b} and the old one is ${n} x ${a} = ${n * a}; the difference, ${fmt(x)}, is the number added.`,
        recheck: () => fmt(search(0, 1000, (t) => (n * a + t) / (n + 1) === b)),
    });
}
{
    const [n, a, b] = [12, 30, 29];
    const x = n * a - (n - 1) * b;
    Q.add("averages", {
        difficulty: "EASY",
        prompt: `The average of ${n} numbers is ${a}. If one number is removed, the average of the rest is ${b}. What number was removed?`,
        answer: fmt(x),
        distractors: [fmt(a + 1), fmt(b), fmt(x - 1)],
        explanation: `${n} x ${a} = ${n * a} and ${n - 1} x ${b} = ${(n - 1) * b}, so the removed number is ${n * a} - ${(n - 1) * b} = ${fmt(x)}.`,
        recheck: () => fmt(search(0, 1000, (t) => (n * a - t) / (n - 1) === b)),
    });
}
{
    const [avg, first, last] = [50, 49, 52];
    const sixth = 6 * first + 6 * last - 11 * avg;
    Q.add("averages", {
        difficulty: "MEDIUM",
        prompt: `The average of 11 results is ${avg}. The average of the first six is ${first} and that of the last six is ${last}. What is the sixth result?`,
        answer: fmt(sixth),
        distractors: [fmt((first + last) / 2), fmt(avg), fmt(sixth + 6)],
        explanation: `The first six and last six together count the sixth result twice: ${6 * first} + ${6 * last} - ${11 * avg} = ${fmt(sixth)}.`,
        recheck: () => fmt(294 + 312 - 550),
    });
}
{
    const [n, score, rise] = [16, 85, 3];
    const old = score - (n + 1) * rise;
    Q.add("averages", {
        difficulty: "MEDIUM",
        prompt: `A batsman scores ${score} runs in his ${n + 1}th innings and thereby increases his average by ${rise}. What is his average after the ${n + 1}th innings?`,
        answer: fmt(old + rise),
        distractors: [fmt(old), fmt(old + rise + 3), fmt(score / rise)],
        explanation: `If the old average is a, then ${n}a + ${score} = ${n + 1}(a + ${rise}), so a = ${score} - ${(n + 1) * rise} = ${old} and the new average is ${old + rise}.`,
        recheck: () => fmt(search(0, 200, (a) => n * a + score === (n + 1) * (a + rise)) + rise),
    });
}
{
    const [n, a] = [30, 14];
    const t = (n + 1) * (a + 1) - n * a;
    Q.add("averages", {
        difficulty: "EASY",
        prompt: `The average age of ${n} students is ${a} years. When the teacher's age is included, the average rises by 1 year. How old is the teacher?`,
        answer: `${t} years`,
        distractors: [`${a + 1} years`, `${t - 1} years`, `${n} years`],
        explanation: `The new total is ${n + 1} x ${a + 1} = ${(n + 1) * (a + 1)} and the old total is ${n * a}, so the teacher is ${t} years old.`,
        recheck: () => `${search(0, 100, (x) => (n * a + x) / (n + 1) === a + 1)} years`,
    });
}
{
    const [abc, ab, bc] = [45, 40, 43];
    const b = 2 * ab + 2 * bc - 3 * abc;
    Q.add("averages", {
        difficulty: "MEDIUM",
        prompt: `The average weight of A, B and C is ${abc} kg. The average weight of A and B is ${ab} kg and that of B and C is ${bc} kg. What is B's weight?`,
        answer: `${b} kg`,
        distractors: [`${b + 4} kg`, `${(ab + bc) / 2} kg`, `${b - 3} kg`],
        explanation: `A + B = ${2 * ab} and B + C = ${2 * bc} add to ${2 * ab + 2 * bc}, which is A + 2B + C; subtracting A + B + C = ${3 * abc} leaves B = ${b} kg.`,
        recheck: () => {
            for (let B = 1; B < 200; B++) {
                const A = 2 * ab - B;
                const C = 2 * bc - B;
                if (A + B + C === 3 * abc) return `${B} kg`;
            }
            return "none";
        },
    });
}
{
    const [t, wt, wr, w] = [7, 12000, 6000, 8000];
    const n = (t * (wt - wr)) / (w - wr);
    Q.add("averages", {
        difficulty: "MEDIUM",
        prompt: `The average salary of all the workers in a workshop is Rs. 8,000. The average salary of the ${t} technicians is Rs. 12,000 and that of the rest is Rs. 6,000. How many workers are there in all?`,
        answer: fmt(n),
        distractors: [fmt(n - t), fmt(n + t), fmt(n + 3)],
        explanation: `With N workers: 8,000N = 7 x 12,000 + (N - 7) x 6,000, so 2,000N = 42,000 and N = ${fmt(n)}.`,
        recheck: () => fmt(search(t + 1, 1000, (x) => x * w === t * wt + (x - t) * wr)),
    });
}
{
    const [abc, abcd, extra, bcde] = [84, 80, 3, 79];
    const d = 4 * abcd - 3 * abc;
    const e = d + extra;
    const a = 3 * abc - (4 * bcde - d - e);
    Q.add("averages", {
        difficulty: "HARD",
        prompt: `The average weight of A, B and C is ${abc} kg. When D joins them, the average becomes ${abcd} kg. E, who weighs ${extra} kg more than D, then replaces A, and the average of B, C, D and E becomes ${bcde} kg. What is A's weight?`,
        answer: `${a} kg`,
        distractors: [`${d} kg`, `${e} kg`, `${a + 4} kg`],
        explanation: `D = ${4 * abcd} - ${3 * abc} = ${d} and E = ${e}. B + C = ${4 * bcde} - ${d} - ${e} = ${4 * bcde - d - e}, so A = ${3 * abc} - ${4 * bcde - d - e} = ${a} kg.`,
        recheck: () => {
            for (let A = 1; A < 200; A++) {
                const BC = 3 * abc - A;
                const D = 4 * abcd - 3 * abc;
                if ((BC + D + D + extra) / 4 === bcde) return `${A} kg`;
            }
            return "none";
        },
    });
}

// ── Time and work ───────────────────────────────────────────────────────────
for (const [a, b] of [[12, 24], [10, 15]] as const) {
    const t = (a * b) / (a + b);
    Q.add("time-and-work", {
        difficulty: "EASY",
        prompt: `A can finish a job in ${a} days and B can finish it in ${b} days. Working together, how long will they take?`,
        answer: `${fmt(t)} days`,
        distractors: [`${fmt((a + b) / 2)} days`, `${fmt(a + b)} days`, `${fmt(b - a)} days`, `${fmt(t + 1)} days`],
        explanation: `Together they do 1/${a} + 1/${b} = ${frac(a + b, a * b)} of the job a day, so they need ${fmt(t)} days.`,
        recheck: () => `${fmt(1 / (1 / a + 1 / b))} days`,
    });
}
{
    const [x, y] = [12, 20];
    const b = (x * y) / (y - x);
    Q.add("time-and-work", {
        difficulty: "MEDIUM",
        prompt: `A and B together can do a piece of work in ${x} days, and A alone can do it in ${y} days. In how many days can B alone do it?`,
        answer: `${fmt(b)} days`,
        distractors: [`${fmt(y - x)} days`, `${fmt(x + y)} days`, `${fmt((x * y) / (x + y))} days`],
        explanation: `B's rate = 1/${x} - 1/${y} = ${frac(y - x, x * y)} of the job a day, so B alone takes ${fmt(b)} days.`,
        recheck: () => `${search(1, 1000, (t) => close(1 / x - 1 / y, 1 / t))} days`,
    });
}
{
    const [a, b, k] = [12, 18, 4];
    const done = k * (1 / a + 1 / b);
    const rest = (1 - done) * b;
    Q.add("time-and-work", {
        difficulty: "MEDIUM",
        prompt: `A can do a job in ${a} days and B in ${b} days. They work together for ${k} days, after which A leaves. In how many more days will B finish the job?`,
        answer: `${fmt(rest)} days`,
        distractors: [`${fmt(b - k)} days`, `${fmt(rest + 2)} days`, `${fmt((1 - done) * a)} days`],
        explanation: `In ${k} days they do ${k} x (1/${a} + 1/${b}) = ${frac(k * (a + b), a * b)} of the job. B does the remaining ${frac(a * b - k * (a + b), a * b)} at 1/${b} a day, taking ${fmt(rest)} days.`,
        recheck: () => {
            let left = 1;
            for (let d = 0; d < k; d++) left -= 1 / a + 1 / b;
            return `${fmt(left * b)} days`;
        },
    });
}
{
    const [f, e] = [6, 9];
    const t = (f * e) / (e - f);
    Q.add("time-and-work", {
        difficulty: "MEDIUM",
        prompt: `A pipe can fill a tank in ${f} hours and another pipe can empty the full tank in ${e} hours. If both are opened when the tank is empty, how long will it take to fill?`,
        answer: `${fmt(t)} hours`,
        distractors: [`${fmt((f * e) / (f + e))} hours`, `${fmt(f + e)} hours`, `${fmt(e - f)} hours`],
        explanation: `Net filling rate = 1/${f} - 1/${e} = ${frac(e - f, f * e)} of the tank an hour, so it fills in ${fmt(t)} hours.`,
        recheck: () => `${search(1, 1000, (h) => close(h / f - h / e, 1))} hours`,
    });
}
{
    const [m1, d1, h1, m2, h2] = [12, 18, 8, 16, 9];
    const d2 = (m1 * d1 * h1) / (m2 * h2);
    Q.add("time-and-work", {
        difficulty: "MEDIUM",
        prompt: `${m1} workers working ${h1} hours a day can build a wall in ${d1} days. How many days will ${m2} workers working ${h2} hours a day take to build the same wall?`,
        answer: `${fmt(d2)} days`,
        distractors: [`${fmt((m1 * d1) / m2)} days`, `${fmt((m2 * d1 * h1) / (m1 * h2))} days`, `${fmt(d2 + 2)} days`],
        explanation: `The wall needs ${m1} x ${d1} x ${h1} = ${m1 * d1 * h1} worker-hours; ${m2} workers at ${h2} hours a day supply ${m2 * h2} a day, so it takes ${fmt(d2)} days.`,
        recheck: () => `${search(1, 1000, (d) => m2 * h2 * d === m1 * d1 * h1)} days`,
    });
}
{
    const [a, b, c] = [6, 12, 8];
    const t = 1 / (1 / a + 1 / b - 1 / c);
    Q.add("time-and-work", {
        difficulty: "HARD",
        prompt: `Pipes A and B can fill a tank in ${a} hours and ${b} hours respectively, and pipe C can empty it in ${c} hours. If all three are opened together on an empty tank, how long will it take to fill?`,
        answer: `${fmt(t)} hours`,
        distractors: [`${fmt(1 / (1 / a + 1 / b))} hours`, `${fmt(1 / (1 / a + 1 / b + 1 / c))} hours`, `${fmt(t + 4)} hours`],
        explanation: `Net rate = 1/${a} + 1/${b} - 1/${c} = ${frac(24 / a + 24 / b - 24 / c, 24)} of the tank an hour, so it fills in ${fmt(t)} hours.`,
        recheck: () => `${search(1, 1000, (h) => close(h / a + h / b - h / c, 1))} hours`,
    });
}
{
    const d = 14;
    const aAlone = (3 * d) / 2;
    Q.add("time-and-work", {
        difficulty: "HARD",
        prompt: `A is twice as efficient as B, and together they finish a job in ${d} days. How many days would A alone take?`,
        answer: `${fmt(aAlone)} days`,
        distractors: [`${fmt(2 * d)} days`, `${fmt(3 * d)} days`, `${fmt(d / 2)} days`],
        explanation: `If B does 1 unit a day, A does 2, so the job is 3 x ${d} = ${3 * d} units and A alone needs ${3 * d}/2 = ${fmt(aAlone)} days.`,
        recheck: () => `${search(1, 1000, (t) => close(1 / t + 1 / (2 * t), 1 / d))} days`,
    });
}
{
    const [a, b, days, wage] = [6, 8, 3, 3200];
    const cPart = 1 - days / a - days / b;
    Q.add("time-and-work", {
        difficulty: "HARD",
        prompt: `A alone can do a job in ${a} days and B alone in ${b} days. With the help of C, they finish it in ${days} days and are paid Rs. ${fmt(wage)} in all. What is C's share if pay is in proportion to work done?`,
        answer: rs(wage * cPart),
        distractors: [rs((wage * days) / a), rs((wage * days) / b), rs(wage / 3)],
        explanation: `In ${days} days A does ${frac(days, a)} and B does ${frac(days, b)} of the job, leaving ${frac(24 - (24 * days) / a - (24 * days) / b, 24)} for C, so C gets that share of ${fmt(wage)} = ${rs(wage * cPart)}.`,
        recheck: () => rs(wage - (wage * days) / a - (wage * days) / b),
    });
}

// ── Time, speed and distance ────────────────────────────────────────────────
{
    const [len, v] = [240, 72];
    const t = len / ((v * 5) / 18);
    Q.add("time-speed-distance", {
        difficulty: "EASY",
        prompt: `A train ${len} m long runs at ${v} km/h. How long does it take to pass a signal pole?`,
        answer: `${fmt(t)} seconds`,
        distractors: [`${fmt(len / v)} seconds`, `${fmt(t * 2)} seconds`, `${fmt(t + 3)} seconds`],
        explanation: `${v} km/h = ${v} x 5/18 = ${fmt((v * 5) / 18)} m/s, and ${len} / ${fmt((v * 5) / 18)} = ${fmt(t)} seconds.`,
        recheck: () => `${search(1, 1000, (s) => close((s * v * 1000) / 3600, len))} seconds`,
    });
}
{
    const [d, t] = [150, 2.5];
    Q.add("time-speed-distance", {
        difficulty: "EASY",
        prompt: `A car covers ${d} km in ${t} hours. What is its speed in metres per second?`,
        answer: `${fmt(((d / t) * 5) / 18)} m/s`,
        distractors: [`${fmt(d / t)} m/s`, `${fmt(((d / t) * 18) / 5)} m/s`, `${fmt(((d / t) * 5) / 18 + 2)} m/s`],
        explanation: `Speed = ${d}/${t} = ${fmt(d / t)} km/h, and ${fmt(d / t)} x 5/18 = ${fmt(((d / t) * 5) / 18)} m/s.`,
        recheck: () => `${fmt((d * 1000) / (t * 3600))} m/s`,
    });
}
{
    const [len, plat, v] = [180, 120, 54];
    const t = (len + plat) / ((v * 5) / 18);
    Q.add("time-speed-distance", {
        difficulty: "MEDIUM",
        prompt: `A ${len} m long train running at ${v} km/h crosses a platform ${plat} m long. How long does it take?`,
        answer: `${fmt(t)} seconds`,
        distractors: [`${fmt(len / ((v * 5) / 18))} seconds`, `${fmt(plat / ((v * 5) / 18))} seconds`, `${fmt(t + 10)} seconds`],
        explanation: `The train must cover its own length plus the platform, ${len + plat} m, at ${fmt((v * 5) / 18)} m/s: ${fmt(t)} seconds.`,
        recheck: () => `${search(1, 1000, (s) => close((s * v) / 3.6, len + plat))} seconds`,
    });
}
{
    const [l1, l2, v1, v2] = [150, 100, 54, 36];
    const rel = ((v1 + v2) * 5) / 18;
    const t = (l1 + l2) / rel;
    Q.add("time-speed-distance", {
        difficulty: "MEDIUM",
        prompt: `Two trains ${l1} m and ${l2} m long run on parallel tracks in opposite directions at ${v1} km/h and ${v2} km/h. How long do they take to cross each other completely?`,
        answer: `${fmt(t)} seconds`,
        distractors: [`${fmt((l1 + l2) / (((v1 - v2) * 5) / 18))} seconds`, `${fmt(l1 / rel)} seconds`, `${fmt(t + 5)} seconds`],
        explanation: `In opposite directions the speeds add: ${v1 + v2} km/h = ${fmt(rel)} m/s. They must cover ${l1 + l2} m, taking ${fmt(t)} seconds.`,
        recheck: () => `${search(1, 1000, (s) => close((s * v1) / 3.6 + (s * v2) / 3.6, l1 + l2))} seconds`,
    });
}
{
    const [l1, l2, v1, v2] = [120, 80, 72, 54];
    const rel = ((v1 - v2) * 5) / 18;
    const t = (l1 + l2) / rel;
    Q.add("time-speed-distance", {
        difficulty: "MEDIUM",
        prompt: `A ${l1} m train at ${v1} km/h overtakes an ${l2} m train running at ${v2} km/h in the same direction. How long does the overtaking take?`,
        answer: `${fmt(t)} seconds`,
        distractors: [`${fmt((l1 + l2) / (((v1 + v2) * 5) / 18))} seconds`, `${fmt(l1 / rel)} seconds`, `${fmt(l2 / rel)} seconds`],
        explanation: `In the same direction the relative speed is ${v1 - v2} km/h = ${fmt(rel)} m/s; covering ${l1 + l2} m takes ${fmt(t)} seconds.`,
        recheck: () => `${search(1, 1000, (s) => close((s * v1) / 3.6 - (s * v2) / 3.6, l1 + l2))} seconds`,
    });
}
{
    const [u, v] = [40, 60];
    const avg = (2 * u * v) / (u + v);
    Q.add("time-speed-distance", {
        difficulty: "MEDIUM",
        prompt: `A cyclist rides from home to a town at ${u} km/h and returns along the same road at ${v} km/h. What is the average speed for the whole journey?`,
        answer: `${fmt(avg)} km/h`,
        distractors: [`${fmt((u + v) / 2)} km/h`, `${fmt(avg - 3)} km/h`, `${fmt(avg + 4)} km/h`],
        explanation: `For equal distances the average speed is 2uv/(u + v) = 2 x ${u} x ${v} / ${u + v} = ${fmt(avg)} km/h, not the simple mean.`,
        recheck: () => {
            const d = 120;
            return `${fmt((2 * d) / (d / u + d / v))} km/h`;
        },
    });
}
{
    const [down, up] = [18, 12];
    Q.add("time-speed-distance", {
        difficulty: "MEDIUM",
        prompt: `A boat goes downstream at ${down} km/h and upstream at ${up} km/h. What is the speed of the boat in still water?`,
        answer: `${fmt((down + up) / 2)} km/h`,
        distractors: [`${fmt((down - up) / 2)} km/h`, `${fmt(down - up)} km/h`, `${fmt(down + up)} km/h`],
        explanation: `Downstream = boat + stream and upstream = boat - stream, so the boat's speed is (${down} + ${up})/2 = ${fmt((down + up) / 2)} km/h.`,
        recheck: () => `${search(1, 100, (b) => b + (down - b) === down && b - (down - b) === up)} km/h`,
    });
}
{
    const [v1, v2, late, early] = [5, 6, 7, 5];
    const d = (late + early) / 60 / (1 / v1 - 1 / v2);
    Q.add("time-speed-distance", {
        difficulty: "HARD",
        prompt: `Walking at ${v1} km/h, a student reaches school ${late} minutes late. Walking at ${v2} km/h, she is ${early} minutes early. How far is the school?`,
        answer: `${fmt(d)} km`,
        distractors: [`${fmt(d / 2)} km`, `${fmt(((late - early) / 60) / (1 / v1 - 1 / v2))} km`, `${fmt(d + 1.5)} km`],
        explanation: `The two times differ by ${late + early} minutes = ${fmt((late + early) / 60)} h, so D/${v1} - D/${v2} = D/30 = ${fmt((late + early) / 60)} and D = ${fmt(d)} km.`,
        recheck: () => `${search(1, 100, (x) => close((x / v1) * 60 - (x / v2) * 60, late + early))} km`,
    });
}
{
    const [b, s, dist] = [10, 2, 24];
    const t = dist / (b + s) + dist / (b - s);
    Q.add("time-speed-distance", {
        difficulty: "HARD",
        prompt: `A boat takes ${fmt(t)} hours to go ${dist} km downstream and come back. If the stream flows at ${s} km/h, what is the speed of the boat in still water?`,
        answer: `${b} km/h`,
        distractors: [`${fmt((2 * dist) / t)} km/h`, `${b + s} km/h`, `${b - s} km/h`],
        explanation: `Try b = ${b}: downstream ${dist}/${b + s} = ${fmt(dist / (b + s))} h and upstream ${dist}/${b - s} = ${fmt(dist / (b - s))} h, total ${fmt(t)} h; the total time falls as b grows, so ${b} km/h is the only solution.`,
        recheck: () => `${search(s + 1, 100, (x) => close(dist / (x + s) + dist / (x - s), t))} km/h`,
    });
}

// ── Mixtures and alligation ─────────────────────────────────────────────────
{
    const [q1, p1, q2, p2] = [20, 30, 30, 40];
    const avg = (q1 * p1 + q2 * p2) / (q1 + q2);
    Q.add("mixtures", {
        difficulty: "EASY",
        prompt: `${q1} kg of rice at Rs. ${p1}/kg is mixed with ${q2} kg of rice at Rs. ${p2}/kg. What is the price of the mixture per kg?`,
        answer: `Rs. ${fmt(avg)}/kg`,
        distractors: [`Rs. ${fmt((p1 + p2) / 2)}/kg`, `Rs. ${fmt((q2 * p1 + q1 * p2) / (q1 + q2))}/kg`, `Rs. ${fmt(avg + 1)}/kg`],
        explanation: `Total cost = ${q1 * p1} + ${q2 * p2} = ${q1 * p1 + q2 * p2} for ${q1 + q2} kg, which is Rs. ${fmt(avg)} per kg.`,
        recheck: () => `Rs. ${fmt((600 + 1200) / 50)}/kg`,
    });
}
{
    const [v, p, w] = [10, 30, 5];
    const ans = ((v * p) / 100 / (v + w)) * 100;
    Q.add("mixtures", {
        difficulty: "EASY",
        prompt: `${v} litres of a solution contain ${p}% alcohol. If ${w} litres of water are added, what is the alcohol percentage of the new solution?`,
        answer: pct(ans),
        distractors: [pct(p), pct(p - w), pct(p / 2)],
        explanation: `Alcohol stays ${fmt((v * p) / 100)} litres in ${v + w} litres: ${fmt((v * p) / 100)}/${v + w} x 100 = ${pct(ans)}.`,
        recheck: () => pct((3 / 15) * 100),
    });
}
for (const [cheap, dear, mean] of [[60, 85, 70], [32, 50, 38]] as const) {
    const [x, y] = [dear - mean, mean - cheap];
    const g = gcd(x, y);
    const ans = `${x / g} : ${y / g}`;
    Q.add("mixtures", {
        difficulty: "MEDIUM",
        prompt: `In what ratio must tea at Rs. ${cheap}/kg be mixed with tea at Rs. ${dear}/kg so that the mixture is worth Rs. ${mean}/kg?`,
        answer: ans,
        distractors: [`${y / g} : ${x / g}`, "1 : 1", `${cheap / gcd(cheap, dear)} : ${dear / gcd(cheap, dear)}`],
        explanation: `By alligation, cheap : dear = (${dear} - ${mean}) : (${mean} - ${cheap}) = ${x} : ${y} = ${ans}.`,
        recheck: () => {
            for (let a = 1; a <= 20; a++)
                for (let b = 1; b <= 20; b++)
                    if (gcd(a, b) === 1 && a * cheap + b * dear === mean * (a + b)) return `${a} : ${b}`;
            return "none";
        },
    });
}
{
    const [v, m, w, m2, w2] = [40, 7, 1, 7, 3];
    const milk = (v * m) / (m + w);
    const water = v - milk;
    const add = (milk * w2) / m2 - water;
    Q.add("mixtures", {
        difficulty: "MEDIUM",
        prompt: `A ${v}-litre mixture has milk and water in the ratio ${m} : ${w}. How much water must be added to make the ratio ${m2} : ${w2}?`,
        answer: `${fmt(add)} litres`,
        distractors: [`${fmt((milk * w2) / m2)} litres`, `${fmt(add + 4)} litres`, `${fmt(add - 2)} litres`],
        explanation: `Milk = ${fmt(milk)} L and water = ${fmt(water)} L. For ${m2} : ${w2}, water must be ${fmt(milk)} x ${w2}/${m2} = ${fmt((milk * w2) / m2)} L, so add ${fmt(add)} L.`,
        recheck: () => `${search(0, 1000, (x) => close(milk / (water + x), m2 / w2))} litres`,
    });
}
{
    const [v, m, w, add] = [60, 2, 1, 10];
    const milk = (v * m) / (m + w);
    const water = v - milk + add;
    const g = gcd(milk, water);
    Q.add("mixtures", {
        difficulty: "EASY",
        prompt: `A can holds ${v} litres of milk and water in the ratio ${m} : ${w}. If ${add} litres of water are added, what is the new ratio of milk to water?`,
        answer: `${milk / g} : ${water / g}`,
        distractors: [`${m} : ${w}`, "4 : 1", `${water / g} : ${milk / g}`],
        explanation: `Milk = ${milk} L and water = ${v - milk} + ${add} = ${water} L, so the ratio is ${milk} : ${water} = ${milk / g} : ${water / g}.`,
        recheck: () => {
            const [a, b] = [40, 30];
            return `${a / gcd(a, b)} : ${b / gcd(a, b)}`;
        },
    });
}
for (const [v, x, n] of [[40, 4, 2], [80, 8, 3]] as const) {
    const left = v * (1 - x / v) ** n;
    Q.add("mixtures", {
        difficulty: "MEDIUM",
        prompt: `A container holds ${v} litres of milk. ${x} litres are taken out and replaced with water, and this is done ${n === 2 ? "twice" : "three times"} in all. How much milk is left?`,
        answer: `${fmt(left)} litres`,
        distractors: [`${fmt(v - n * x)} litres`, `${fmt(v * (1 - x / v) ** (n - 1))} litres`, `${fmt(left - 1)} litres`],
        explanation: `Each round keeps ${fmt(1 - x / v)} of the milk, so after ${n} rounds ${v} x ${fmt(1 - x / v)}^${n} = ${fmt(left)} litres remain.`,
        recheck: () => {
            let milk = v;
            for (let i = 0; i < n; i++) milk -= (milk / v) * x;
            return `${fmt(milk)} litres`;
        },
    });
}
{
    const [m1, w1, m2, w2] = [3, 1, 5, 3];
    const milk = m1 / (m1 + w1) + m2 / (m2 + w2);
    const water = w1 / (m1 + w1) + w2 / (m2 + w2);
    const [a, b] = [milk * 8, water * 8];
    const g = gcd(a, b);
    Q.add("mixtures", {
        difficulty: "HARD",
        prompt: `Vessel P has milk and water in the ratio ${m1} : ${w1} and vessel Q has them in the ratio ${m2} : ${w2}. If equal quantities from both are mixed, what is the ratio of milk to water in the mixture?`,
        answer: `${a / g} : ${b / g}`,
        distractors: [`${(m1 + m2) / gcd(m1 + m2, w1 + w2)} : ${(w1 + w2) / gcd(m1 + m2, w1 + w2)}`, `${m1} : ${w1}`, `${b / g} : ${a / g}`],
        explanation: `Take 1 litre of each: milk = 3/4 + 5/8 = 11/8 and water = 1/4 + 3/8 = 5/8, so the ratio is 11 : 5.`,
        recheck: () => {
            // 8 litres from each, measured in litres.
            const mk = 8 * (3 / 4) + 8 * (5 / 8);
            const wt = 8 * (1 / 4) + 8 * (3 / 8);
            return `${mk / gcd(mk, wt)} : ${wt / gcd(mk, wt)}`;
        },
    });
}

// ── Number properties ───────────────────────────────────────────────────────
{
    const [a, b] = [36, 84];
    Q.add("number-properties", {
        difficulty: "EASY",
        prompt: `What is the LCM of ${a} and ${b}?`,
        answer: fmt(lcm(a, b)),
        distractors: [fmt(gcd(a, b)), fmt(a * b), fmt(lcm(a, b) * 2)],
        explanation: `${a} = 2^2 x 3^2 and ${b} = 2^2 x 3 x 7; the LCM takes the highest powers: 2^2 x 3^2 x 7 = ${lcm(a, b)}.`,
        recheck: () => fmt(search(1, a * b, (x) => x % a === 0 && x % b === 0)),
    });
}
{
    const [h, l, one] = [6, 180, 36];
    const other = (h * l) / one;
    Q.add("number-properties", {
        difficulty: "EASY",
        prompt: `The HCF of two numbers is ${h} and their LCM is ${l}. If one number is ${one}, what is the other?`,
        answer: fmt(other),
        distractors: [fmt(h * l), fmt(other * 2), fmt(l / 2)],
        explanation: `The product of two numbers equals HCF x LCM = ${h * l}, so the other number is ${h * l} / ${one} = ${fmt(other)}.`,
        recheck: () => fmt(search(1, 1000, (x) => gcd(x, one) === h && lcm(x, one) === l)),
    });
}
for (const [base, exp] of [[3, 47], [7, 95]] as const) {
    const cycle = [1, 2, 3, 4].map((k) => base ** k % 10);
    const ans = cycle[(exp - 1) % 4] as number;
    Q.add("number-properties", {
        difficulty: "EASY",
        prompt: `What is the unit digit of ${base}^${exp}?`,
        answer: String(ans),
        distractors: cycle.filter((c) => c !== ans).map(String),
        explanation: `Unit digits of powers of ${base} repeat as ${cycle.join(", ")}. ${exp} leaves remainder ${exp % 4 || 4} on division by 4 (taking 0 as 4), so the unit digit is ${ans}.`,
        recheck: () => {
            let d = 1;
            for (let i = 0; i < exp; i++) d = (d * base) % 10;
            return String(d);
        },
    });
}
{
    const [n, d] = [2347, 9];
    const add = (d - (n % d)) % d;
    Q.add("number-properties", {
        difficulty: "MEDIUM",
        prompt: `What is the smallest number that must be added to ${n} to make it divisible by ${d}?`,
        answer: String(add),
        distractors: [String(n % d), String(add + 3), String(d - 1)],
        explanation: `The digit sum of ${n} is 16, which leaves remainder 7 on division by 9, so adding ${add} makes the digit sum 18 and the number (${n + add}) divisible by 9.`,
        recheck: () => String(search(0, d, (x) => (n + x) % d === 0)),
    });
}
for (const n of [360, 720]) {
    const f: [number, number][] = [];
    let m = n;
    for (let p = 2; m > 1; p++) {
        let e = 0;
        while (m % p === 0) {
            m /= p;
            e++;
        }
        if (e) f.push([p, e]);
    }
    const count = f.reduce((s, [, e]) => s * (e + 1), 1);
    Q.add("number-properties", {
        difficulty: "MEDIUM",
        prompt: `How many positive divisors does ${n} have?`,
        answer: String(count),
        distractors: [String(f.reduce((s, [, e]) => s * e, 1)), String(count - 2), String(count + 6)],
        explanation: `${n} = ${f.map(([p, e]) => `${p}^${e}`).join(" x ")}, so it has ${f.map(([, e]) => `(${e}+1)`).join(" x ")} = ${count} divisors.`,
        recheck: () => String(Array.from({ length: n }, (_, i) => i + 1).filter((x) => n % x === 0).length),
    });
}
{
    const [n, a, b] = [100, 3, 5];
    const count = Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / lcm(a, b));
    Q.add("number-properties", {
        difficulty: "MEDIUM",
        prompt: `How many integers from 1 to ${n} are divisible by ${a} or ${b}?`,
        answer: String(count),
        distractors: [String(Math.floor(n / a) + Math.floor(n / b)), String(Math.floor(n / lcm(a, b))), String(count - 1)],
        explanation: `${Math.floor(n / a)} multiples of ${a} plus ${Math.floor(n / b)} of ${b}, minus the ${Math.floor(n / lcm(a, b))} multiples of ${lcm(a, b)} counted twice: ${count}.`,
        recheck: () => String(Array.from({ length: n }, (_, i) => i + 1).filter((x) => x % a === 0 || x % b === 0).length),
    });
}
{
    const [a, b, c, r] = [12, 18, 21, 5];
    const l = lcm(lcm(a, b), c);
    const ans = Math.ceil(1000 / l) * l + r;
    Q.add("number-properties", {
        difficulty: "HARD",
        prompt: `What is the smallest four-digit number that leaves a remainder of ${r} when divided by each of ${a}, ${b} and ${c}?`,
        answer: String(ans),
        distractors: [String(ans - r), String(ans + l), String(1000 + r)],
        explanation: `The LCM of ${a}, ${b} and ${c} is ${l}. The smallest four-digit multiple is ${ans - r}, so the number is ${ans - r} + ${r} = ${ans}.`,
        recheck: () => String(search(1000, 9999, (x) => x % a === r && x % b === r && x % c === r)),
    });
}
{
    const n = 250;
    let z = 0;
    for (let p = 5; p <= n; p *= 5) z += Math.floor(n / p);
    Q.add("number-properties", {
        difficulty: "HARD",
        prompt: `How many zeros are there at the end of ${n}! (${n} factorial)?`,
        answer: String(z),
        distractors: [String(n / 5), String(n / 5 + n / 25), String(n / 10)],
        explanation: `Count the factors of 5: ${n}/5 = ${n / 5}, ${n}/25 = ${n / 25}, ${n}/125 = ${Math.floor(n / 125)}, total ${z}; there are always more 2s than 5s.`,
        recheck: () => {
            let f = 1n;
            for (let i = 2n; i <= BigInt(n); i++) f *= i;
            const s = f.toString();
            return String(s.length - s.replace(/0+$/, "").length);
        },
    });
}

// ── Probability ─────────────────────────────────────────────────────────────
for (const s of [7, 9]) {
    const k = DICE.filter(([a, b]) => a + b === s).length;
    Q.add("probability", {
        difficulty: "EASY",
        prompt: `Two fair dice are thrown. What is the probability that the sum of the numbers is ${s}?`,
        answer: frac(k, 36),
        distractors: [frac(1, 11), frac(k, 12), frac(k + 1, 36)],
        explanation: `There are 36 equally likely outcomes and ${k} of them sum to ${s}, so the probability is ${k}/36 = ${frac(k, 36)}.`,
        recheck: () => {
            let hit = 0;
            for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) hit++;
            return frac(hit, 36);
        },
    });
}
{
    const [r, b] = [5, 7];
    Q.add("probability", {
        difficulty: "EASY",
        prompt: `A bag has ${r} red and ${b} blue balls. One ball is drawn at random. What is the probability that it is red?`,
        answer: frac(r, r + b),
        distractors: [frac(r, b), frac(b, r + b), frac(1, 2)],
        explanation: `${r} of the ${r + b} balls are red, so the probability is ${frac(r, r + b)}.`,
        recheck: () => frac(r, r + b),
    });
}
{
    const k = DICE.filter(([a, b]) => (a * b) % 2 === 0).length;
    Q.add("probability", {
        difficulty: "MEDIUM",
        prompt: `Two fair dice are thrown. What is the probability that the product of the numbers is even?`,
        answer: frac(k, 36),
        distractors: [frac(1, 2), frac(1, 4), frac(2, 3)],
        explanation: `The product is odd only when both are odd: 3 x 3 = 9 of 36 outcomes. So P(even) = 1 - 9/36 = ${frac(k, 36)}.`,
        recheck: () => frac(36 - 9, 36),
    });
}
{
    const [r, b] = [4, 6];
    Q.add("probability", {
        difficulty: "MEDIUM",
        prompt: `A box has ${r} red and ${b} black pens. Two pens are drawn at random without replacement. What is the probability that both are red?`,
        answer: frac(choose(r, 2), choose(r + b, 2)),
        distractors: [frac(r * r, (r + b) ** 2), frac(r, r + b), frac(choose(b, 2), choose(r + b, 2))],
        explanation: `C(${r},2)/C(${r + b},2) = ${choose(r, 2)}/${choose(r + b, 2)} = ${frac(choose(r, 2), choose(r + b, 2))}.`,
        recheck: () => {
            const pens = [...Array(r).fill("R"), ...Array(b).fill("B")];
            const all = combos(pens.map((p, i) => `${p}${i}`), 2);
            return frac(all.filter((c) => c.every((x) => x.startsWith("R"))).length, all.length);
        },
    });
}
{
    const outcomes = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => [m & 1, (m >> 1) & 1, (m >> 2) & 1]);
    const k = outcomes.filter((o) => o.reduce((s, x) => s + x, 0) === 2).length;
    Q.add("probability", {
        difficulty: "EASY",
        prompt: `Three fair coins are tossed. What is the probability of getting exactly two heads?`,
        answer: frac(k, 8),
        distractors: [frac(1, 2), frac(2, 3), frac(1, 4)],
        explanation: `Of the 8 outcomes, HHT, HTH and THH have exactly two heads, so the probability is 3/8.`,
        recheck: () => frac(choose(3, 2), 8),
    });
}
{
    const deck = ["S", "H", "D", "C"].flatMap((s) => Array.from({ length: 13 }, (_, i) => ({ s, r: i + 1 })));
    const k = deck.filter((c) => c.s === "H" || c.r === 13).length;
    Q.add("probability", {
        difficulty: "MEDIUM",
        prompt: `One card is drawn from a well-shuffled deck of 52 cards. What is the probability that it is a heart or a king?`,
        answer: frac(k, 52),
        distractors: [frac(17, 52), frac(1, 52), frac(1, 4)],
        explanation: `13 hearts + 4 kings - 1 king of hearts counted twice = 16 cards, so the probability is 16/52 = ${frac(k, 52)}.`,
        recheck: () => frac(13 + 4 - 1, 52),
    });
}
{
    const [r, g, w] = [5, 4, 3];
    const fav = r * g * w;
    const all = choose(r + g + w, 3);
    Q.add("probability", {
        difficulty: "HARD",
        prompt: `A bag contains ${r} red, ${g} green and ${w} white marbles. Three marbles are drawn at random. What is the probability that they are all of different colours?`,
        answer: frac(fav, all),
        distractors: [frac(r * g * w, (r + g + w) ** 3), frac(1, 3), frac(fav * 6, (r + g + w) * (r + g + w - 1) * (r + g + w - 2) * 2)],
        explanation: `Favourable: ${r} x ${g} x ${w} = ${fav}. Total: C(${r + g + w},3) = ${all}. Probability = ${fav}/${all} = ${frac(fav, all)}.`,
        recheck: () => {
            const bag = [...Array(r).fill("r"), ...Array(g).fill("g"), ...Array(w).fill("w")].map((c, i) => `${c}${i}`);
            const cs = combos(bag, 3);
            return frac(cs.filter((c) => new Set(c.map((x) => x[0])).size === 3).length, cs.length);
        },
    });
}
{
    const [a, b] = [3, 4];
    Q.add("probability", {
        difficulty: "HARD",
        prompt: `A can solve a problem with probability 1/${a} and B with probability 1/${b}, independently. If both try it, what is the probability that the problem is solved?`,
        answer: frac(a * b - (a - 1) * (b - 1), a * b),
        distractors: [frac(a + b, a * b), frac(1, a * b), frac(5, 12)],
        explanation: `It stays unsolved only if both fail: (${a - 1}/${a}) x (${b - 1}/${b}) = ${frac((a - 1) * (b - 1), a * b)}, so it is solved with probability ${frac(a * b - (a - 1) * (b - 1), a * b)}.`,
        recheck: () => {
            let hit = 0;
            for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if (i === 0 || j === 0) hit++;
            return frac(hit, a * b);
        },
    });
}

// ── Permutations and combinations ───────────────────────────────────────────
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const distinctArrangements = (w: string) => new Set(perms(w.split("")).map((p) => p.join(""))).size;
{
    const w = "PLANET";
    Q.add("permutations-combinations", {
        difficulty: "EASY",
        prompt: `In how many ways can the letters of the word ${w} be arranged?`,
        answer: String(fact(w.length)),
        distractors: [String(fact(w.length - 1)), String(w.length ** 2), String(fact(w.length) / 2)],
        explanation: `${w} has ${w.length} different letters, so they can be arranged in ${w.length}! = ${fact(w.length)} ways.`,
        recheck: () => String(distinctArrangements(w)),
    });
}
{
    const [n, k] = [8, 3];
    Q.add("permutations-combinations", {
        difficulty: "EASY",
        prompt: `In how many ways can a team of ${k} be chosen from ${n} players?`,
        answer: String(choose(n, k)),
        distractors: [String(n * (n - 1) * (n - 2)), String(n * k), String(choose(n, k - 1))],
        explanation: `Order does not matter, so it is C(${n},${k}) = ${n * (n - 1) * (n - 2)}/6 = ${choose(n, k)}.`,
        recheck: () => String(combos(Array.from({ length: n }, (_, i) => i), k).length),
    });
}
for (const w of ["BANANA", "LETTER"]) {
    const counts = [...new Set(w)].map((c) => w.split("").filter((x) => x === c).length).filter((c) => c > 1);
    const ans = fact(w.length) / counts.reduce((s, c) => s * fact(c), 1);
    Q.add("permutations-combinations", {
        difficulty: "MEDIUM",
        prompt: `How many different arrangements can be made of the letters of the word ${w}?`,
        answer: String(ans),
        distractors: [String(fact(w.length)), String(fact(w.length) / fact(Math.max(...counts))), String(ans / 2), String(ans * 2)],
        explanation: `${w.length}! divided by the factorials of the repeated letter counts (${counts.join(", ")}): ${fact(w.length)} / (${counts.map((c) => `${c}!`).join(" x ")}) = ${ans}.`,
        recheck: () => String(distinctArrangements(w)),
    });
}
{
    const [men, women, m, f] = [6, 5, 3, 2];
    const ans = choose(men, m) * choose(women, f);
    Q.add("permutations-combinations", {
        difficulty: "MEDIUM",
        prompt: `A committee of ${m} men and ${f} women is to be formed from ${men} men and ${women} women. In how many ways can this be done?`,
        answer: String(ans),
        distractors: [String(choose(men, m) + choose(women, f)), String(choose(men + women, m + f)), String(ans / 2)],
        explanation: `Choose the men in C(${men},${m}) = ${choose(men, m)} ways and the women in C(${women},${f}) = ${choose(women, f)} ways; multiply: ${ans}.`,
        recheck: () => String(combos([...Array(men).keys()], m).length * combos([...Array(women).keys()], f).length),
    });
}
{
    const n = 12;
    Q.add("permutations-combinations", {
        difficulty: "EASY",
        prompt: `At a meeting, each of ${n} people shakes hands with every other person exactly once. How many handshakes take place?`,
        answer: String(choose(n, 2)),
        distractors: [String(n * (n - 1)), String(n * n), String(choose(n, 2) - n)],
        explanation: `Each handshake is a pair of people: C(${n},2) = ${n} x ${n - 1}/2 = ${choose(n, 2)}.`,
        recheck: () => String(combos([...Array(n).keys()], 2).length),
    });
}
{
    const w = "ORANGE";
    const vowels = w.split("").filter((c) => "AEIOU".includes(c)).length;
    const ans = fact(w.length - vowels + 1) * fact(vowels);
    Q.add("permutations-combinations", {
        difficulty: "HARD",
        prompt: `In how many ways can the letters of the word ${w} be arranged so that all the vowels come together?`,
        answer: String(ans),
        distractors: [String(fact(w.length - vowels + 1)), String(fact(w.length) - ans), String(fact(vowels) * fact(w.length - vowels))],
        explanation: `Treat the ${vowels} vowels as one block: ${w.length - vowels + 1} units give ${fact(w.length - vowels + 1)} arrangements, and the vowels inside the block give ${fact(vowels)}: ${ans}.`,
        recheck: () =>
            String(
                perms(w.split("")).filter((p) => {
                    const idx = p.map((c, i) => ("AEIOU".includes(c) ? i : -1)).filter((i) => i >= 0);
                    return (idx[idx.length - 1] as number) - (idx[0] as number) === vowels - 1;
                }).length,
            ),
    });
}
{
    const digits = [0, 1, 2, 3, 4, 5];
    const ans = 5 * 5 * 4 * 3;
    Q.add("permutations-combinations", {
        difficulty: "HARD",
        prompt: `How many four-digit numbers can be formed from the digits 0, 1, 2, 3, 4 and 5 if no digit is repeated?`,
        answer: String(ans),
        distractors: [String(6 * 5 * 4 * 3), String(5 * 5 * 5 * 5), String(5 * 4 * 3 * 2)],
        explanation: `The first digit cannot be 0, so it has 5 choices; the next three digits then have 5, 4 and 3 choices: 5 x 5 x 4 x 3 = ${ans}.`,
        recheck: () => {
            let c = 0;
            for (let x = 1000; x <= 9999; x++) {
                const s = String(x).split("").map(Number);
                if (s.every((d) => digits.includes(d)) && new Set(s).size === 4) c++;
            }
            return String(c);
        },
    });
}
{
    const [men, women, size, atLeast] = [7, 4, 5, 3];
    let ans = 0;
    for (let m = atLeast; m <= size; m++) ans += choose(men, m) * choose(women, size - m);
    Q.add("permutations-combinations", {
        difficulty: "HARD",
        prompt: `A committee of ${size} is to be chosen from ${men} men and ${women} women so that it has at least ${atLeast} men. In how many ways can this be done?`,
        answer: String(ans),
        distractors: [String(choose(men, atLeast) * choose(men + women - atLeast, size - atLeast)), String(choose(men + women, size)), String(choose(men, 3) * choose(women, 2))],
        explanation: `3 men and 2 women: 35 x 6 = 210; 4 men and 1 woman: 35 x 4 = 140; 5 men: 21. Total ${ans}.`,
        recheck: () => {
            const people = [...Array(men).fill("m"), ...Array(women).fill("w")].map((p, i) => `${p}${i}`);
            return String(combos(people, size).filter((c) => c.filter((x) => x.startsWith("m")).length >= atLeast).length);
        },
    });
}

// ── Data interpretation ─────────────────────────────────────────────────────
{
    const years = [2019, 2020, 2021, 2022, 2023];
    const laptops = [39, 45, 36, 54, 60];
    const tablets = [25, 30, 35, 32, 40];
    const table =
        "Units sold by a store (in thousands):\n" +
        "Year    | " + years.join(" | ") + "\n" +
        "Laptops | " + laptops.join("   | ") + "\n" +
        "Tablets | " + tablets.join("   | ");
    const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
    const totalL = sum(laptops);
    Q.add("data-interpretation", {
        difficulty: "EASY",
        prompt: `${table}\n\nHow many laptops (in thousands) were sold over the five years?`,
        answer: String(totalL),
        distractors: [String(sum(tablets)), String(totalL - 9), String(totalL + 6)],
        explanation: `${laptops.join(" + ")} = ${totalL} thousand.`,
        recheck: () => String(39 + 45 + 36 + 54 + 60),
    });
    const inc = ((tablets[4]! - tablets[3]!) / tablets[3]!) * 100;
    Q.add("data-interpretation", {
        difficulty: "MEDIUM",
        prompt: `${table}\n\nBy what percent did tablet sales rise from 2022 to 2023?`,
        answer: pct(inc),
        distractors: [pct(((tablets[4]! - tablets[3]!) / tablets[4]!) * 100), pct(tablets[4]! - tablets[3]!), pct(inc + 5)],
        explanation: `Tablets went from ${tablets[3]} to ${tablets[4]}, a rise of ${tablets[4]! - tablets[3]!} on ${tablets[3]}: ${pct(inc)}.`,
        recheck: () => pct((40 / 32 - 1) * 100),
    });
    const ratios = years.map((_, i) => laptops[i]! / tablets[i]!);
    const best = years[ratios.indexOf(Math.max(...ratios))]!;
    Q.add("data-interpretation", {
        difficulty: "MEDIUM",
        prompt: `${table}\n\nIn which year was the ratio of laptops sold to tablets sold the highest?`,
        answer: String(best),
        distractors: years.filter((y) => y !== best).map(String).reverse(),
        explanation: `The ratios are ${years.map((y, i) => `${y}: ${fmt(ratios[i]!)}`).join(", ")}; the highest is in ${best}.`,
        recheck: () => {
            let top = 0;
            for (let i = 1; i < years.length; i++) if (laptops[i]! * tablets[top]! > laptops[top]! * tablets[i]!) top = i;
            return String(years[top]);
        },
    });
    const c0 = laptops[0]! + tablets[0]!;
    const c4 = laptops[4]! + tablets[4]!;
    const g = ((c4 - c0) / c0) * 100;
    Q.add("data-interpretation", {
        difficulty: "HARD",
        prompt: `${table}\n\nBy what percent did the combined sales of laptops and tablets grow from 2019 to 2023?`,
        answer: pct(g),
        distractors: [pct(((c4 - c0) / c4) * 100), pct(((laptops[4]! - laptops[0]!) / laptops[0]!) * 100), pct(((tablets[4]! - tablets[0]!) / tablets[0]!) * 100)],
        explanation: `Combined sales went from ${c0} to ${c4} thousand, a rise of ${c4 - c0} on ${c0}: ${pct(g)}.`,
        recheck: () => pct((100 / 64 - 1) * 100),
    });
}
{
    const names = ["Asha", "Bilal", "Chitra", "Dev"];
    const maths = [78, 92, 65, 84];
    const science = [85, 74, 90, 80];
    const english = [72, 80, 88, 70];
    const table =
        "Marks (out of 100) of four students:\n" +
        "Student | Maths | Science | English\n" +
        names.map((n, i) => `${n.padEnd(7)} | ${maths[i]}    | ${science[i]}      | ${english[i]}`).join("\n");
    const totals = names.map((_, i) => maths[i]! + science[i]! + english[i]!);
    const top = names[totals.indexOf(Math.max(...totals))]!;
    Q.add("data-interpretation", {
        difficulty: "EASY",
        prompt: `${table}\n\nWhich student has the highest total?`,
        answer: top,
        distractors: names.filter((n) => n !== top),
        explanation: `Totals: ${names.map((n, i) => `${n} ${totals[i]}`).join(", ")}. ${top} is highest.`,
        recheck: () => {
            let best = 0;
            for (let i = 1; i < names.length; i++) if (totals[i]! > totals[best]!) best = i;
            return names[best]!;
        },
    });
    const avgSci = science.reduce((s, x) => s + x, 0) / science.length;
    Q.add("data-interpretation", {
        difficulty: "EASY",
        prompt: `${table}\n\nWhat is the average Science score?`,
        answer: fmt(avgSci),
        distractors: [fmt(maths.reduce((s, x) => s + x, 0) / 4), fmt(avgSci + 1.5), fmt((Math.max(...science) + Math.min(...science)) / 2)],
        explanation: `(${science.join(" + ")}) / 4 = ${science.reduce((s, x) => s + x, 0)} / 4 = ${fmt(avgSci)}.`,
        recheck: () => fmt((85 + 74 + 90 + 80) / 4),
    });
    const chitraPct = (totals[2]! / 300) * 100;
    Q.add("data-interpretation", {
        difficulty: "MEDIUM",
        prompt: `${table}\n\nWhat is Chitra's overall percentage across the three subjects?`,
        answer: pct(chitraPct),
        distractors: [pct(chitraPct + 2), pct((totals[2]! / 400) * 100), pct(science[2]!)],
        explanation: `Chitra's total is ${totals[2]} out of 300: ${totals[2]}/300 x 100 = ${pct(chitraPct)}.`,
        recheck: () => pct(((65 + 90 + 88) / 300) * 100),
    });
    const avgs = [maths, science, english].map((xs) => xs.reduce((s, x) => s + x, 0) / xs.length);
    const devScores = [maths[3]!, science[3]!, english[3]!];
    const devAbove = devScores.filter((x, i) => x > avgs[i]!).length;
    Q.add("data-interpretation", {
        difficulty: "HARD",
        prompt: `${table}\n\nIn how many of the three subjects does Dev score above the average of the four students in that subject?`,
        answer: String(devAbove),
        distractors: ["0", "1", "2", "3"],
        explanation: `The subject averages are Maths ${fmt(avgs[0]!)}, Science ${fmt(avgs[1]!)} and English ${fmt(avgs[2]!)}. Dev's ${devScores.join(", ")} beat the average only in ${devAbove === 1 ? "Maths" : "those subjects"}, so the answer is ${devAbove}.`,
        recheck: () => String([84 > 319 / 4, 80 > 329 / 4, 70 > 310 / 4].filter(Boolean).length),
    });
}

export const QUANT = Q.out;
