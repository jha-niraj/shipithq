/**
 * Print a repeatable random sample of the aptitude bank for a human spot check
 * (plan/hiring-rounds HR-3: "a spot check of 30 random questions finds no
 * wrong answer"). Reads the bank in code, not the database.
 *
 *   pnpm script aptitude-sample                 30 questions, seed 1
 *   pnpm script aptitude-sample --seed=7        a different 30
 *   pnpm script aptitude-sample --count=50      more or fewer
 *   pnpm script aptitude-sample --section=QUANT one section only
 */
import { APTITUDE_BANK } from "../seed/aptitude"

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
const seed = Number(arg("seed") ?? 1)
const count = Number(arg("count") ?? 30)
const section = arg("section")?.toUpperCase()

/** mulberry32: small, seeded, repeatable. */
function rng(s: number) {
    let a = s >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const pool = APTITUDE_BANK.filter((q) => !section || q.section === section)
const next = rng(seed)
// Fisher-Yates on a copy, then take the first `count`.
const shuffled = [...pool]
for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
}
const sample = shuffled.slice(0, Math.min(count, shuffled.length))

console.log(`Aptitude bank sample: ${sample.length} of ${pool.length} questions${section ? ` (${section})` : ""}, seed ${seed}\n`)
sample.forEach((q, n) => {
    console.log(`${n + 1}. [${q.key}] ${q.section} / ${q.topic} / ${q.difficulty}`)
    console.log(q.prompt.split("\n").map((l) => `   ${l}`).join("\n"))
    q.options.forEach((o, i) => console.log(`   ${"ABCD"[i]}. ${o}`))
    console.log(`   Answer: ${"ABCD"[q.correctIndex]}`)
    console.log(`   Why: ${q.explanation}\n`)
})
