import { judgeStage } from "@/lib/practice/mentor-verdict"
const OPT = `class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { unordered_map<int,int> seen; for (int i = 0; i < (int)nums.size(); i++) { auto it = seen.find(target - nums[i]); if (it != seen.end()) return {it->second, i}; seen[nums[i]] = i; } return {}; } };`
const BRUTE = `class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { for (int i = 0; i < nums.size(); i++) for (int j = i + 1; j < nums.size(); j++) if (nums[i] + nums[j] == target) return {i, j}; return {}; } };`
const D = "Return indices of the two numbers in nums that add up to target. Exactly one answer exists; an element cannot be used twice."
const base = [
  { role: "user", content: "It is O(n^2) time because for every i the inner loop scans the rest, and O(1) space." },
  { role: "assistant", content: "Right. What is the inner loop searching for?" },
  { role: "user", content: "I submitted: all 13 tests passed, including 10 hidden ones." },
  { role: "assistant", content: "Nice. What is the complexity of this version, and why?" },
]
const J = { role: "user", content: "One pass, and each lookup of target - nums[i] in the map is O(1) on average, so O(n) time and O(n) space." }
const cases: Array<[string, boolean, Parameters<typeof judgeStage>[0]]> = [
  ["understand good", true, { stage: "understand", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "user", content: "I get an array and a target and return the indices of the two numbers that add up to it, not reusing one element. [1,6,2,10,3], 7: 1+6 so [0,1]." }] }],
  ["understand no example", false, { stage: "understand", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "user", content: "Return the indices of two numbers that add up to target." }] }],
  ["understand vague", false, { stage: "understand", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "user", content: "find two numbers that add up" }] }],
  ["understand mentor-only", false, { stage: "understand", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "assistant", content: "So you return indices i,j with nums[i]+nums[j]=target; e.g. [1,6,2] target 7 gives [0,1]." }, { role: "user", content: "ok yes" }] }],
  ["approach pairs", true, { stage: "approach", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "user", content: "I'd check every pair i<j and return i,j when nums[i]+nums[j]==target." }] }],
  ["approach vague", false, { stage: "approach", problemTitle: "Two Sum", problemDescription: D, code: "", turns: [{ role: "user", content: "I'll use a loop." }] }],
  ["optimise premature", false, { stage: "optimise", problemTitle: "Two Sum", problemDescription: D, code: OPT, turns: base }],
  ["optimise justified", true, { stage: "optimise", problemTitle: "Two Sum", problemDescription: D, code: OPT, turns: [...base, J] }],
  ["optimise brute + claim", false, { stage: "optimise", problemTitle: "Two Sum", problemDescription: D, code: BRUTE, turns: base.slice(0, 1) }],
  ["optimise wrong claim", false, { stage: "optimise", problemTitle: "Two Sum", problemDescription: D, code: OPT, turns: [...base, { role: "user", content: "It's O(log n) because the map is a tree." }] }],
  ["reflect written", true, { stage: "reflect", problemTitle: "Two Sum", problemDescription: D, code: OPT, turns: [{ role: "user", content: "The key was remembering what I'd already seen so each check is instant instead of rescanning." }] }],
  ["reflect none", false, { stage: "reflect", problemTitle: "Two Sum", problemDescription: D, code: OPT, turns: [{ role: "user", content: "ok thanks" }] }],
]
let right = 0, total = 0
for (let run = 1; run <= 3; run++) {
  const line: string[] = []
  for (const [name, expect, args] of cases) {
    const v = await judgeStage(args)
    total++
    if (v?.complete === expect) right++
    else line.push(`${name}: got ${v?.complete}`)
  }
  console.log(`run ${run}: ${line.length ? "WRONG " + line.join("; ") : "all right"}`)
}
console.log(`verdict on gpt-4o-mini: ${right}/${total} correct`)
process.exit(0)
