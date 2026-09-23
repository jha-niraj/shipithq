// ─────────────────────────────────────────────────────────────────────────────
// The seeded DSA catalogue (plan/practice-dsa PD-11; titles in
// plan/practice-dsa/catalogue.md). Statements are original wording, drafted
// with gpt-4o from each classic problem's name on 2026-09-22 and kept here as
// literal data so the seed is deterministic and reviewable.
//
// Only statement fields live here. Judge assets (signature, harness, tests,
// reference solution) are generated per problem and validated by execution;
// the seed never writes or clears them.
//
// sortOrder 1000 and up marks a row as seeded: the upsert only updates rows in
// that range, so a user's own problem that happens to share a slug is never
// overwritten.
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedDsaProblem {
    slug: string;
    title: string;
    category: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    description: string;
    requirements: string[];
    hints: string[];
    tags: string[];
    sortOrder: number;
}

export const SEEDED_SORT_ORDER_FLOOR = 1000;

export const DSA_CATALOGUE: SeedDsaProblem[] = [
    {
        "slug": "left-rotate-array-by-one",
        "title": "Left Rotate Array by One",
        "category": "arrays-and-hashing",
        "difficulty": "EASY",
        "description": "Given an integer array `nums`, rotate it to the left by one position, in place.\n\nEvery element moves one index to the left, and the element that was first ends up last. Change the array itself; do not return a new one.\n\n### Example 1\n- **Input:** nums = [10, 20, 30, 40, 50]\n- **Output:** [20, 30, 40, 50, 10]\n- **Explanation:** 20, 30, 40 and 50 each move one place left, and 10 wraps round to the end.\n\n### Example 2\n- **Input:** nums = [7]\n- **Output:** [7]\n- **Explanation:** A single element rotated by one is itself.\n\n### Example 3\n- **Input:** nums = [1, 2]\n- **Output:** [2, 1]\n\n### Constraints\n- 1 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9",
        "requirements": [
            "Rotate the array in place, without returning a new one",
            "Use O(1) extra space",
            "Aim for O(n) time"
        ],
        "hints": [
            "Which single element is about to be overwritten, and where does it need to end up?",
            "If i is the position you are filling, which original position does its value come from?",
            "What is the last index your loop may touch before nums[i + 1] runs off the end?"
        ],
        "tags": [
            "array",
            "two-pointers",
            "in-place"
        ],
        "sortOrder": 1075
    },
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "category": "arrays-and-hashing",
        "difficulty": "EASY",
        "description": "Given an array of integers `nums` and an integer `target`, return the indices (0-indexed) of the two elements in `nums` such that they add up to `target`.\n\nEach input has **exactly one** solution, and you may not use the same element twice. Return the answer in any order.\n\n### Example 1\n- **Input:** nums = [1, 6, 2, 10, 3], target = 7\n- **Output:** [0, 1]\n- **Explanation:** nums[0] + nums[1] = 1 + 6 = 7\n\n### Example 2\n- **Input:** nums = [1, 3, 5, -7, 6, -3], target = 0\n- **Output:** [1, 5]\n- **Explanation:** nums[1] + nums[5] = 3 + (-3) = 0\n\n### Constraints\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i], target <= 10^9\n- Exactly one valid answer exists.",
        "requirements": [
            "Return the two indices, in any order",
            "Do not use the same element twice",
            "Aim for O(n) time"
        ],
        "hints": [
            "For each number, what other number would you need to reach the target?",
            "Could you remember numbers you have already seen, so that question takes O(1)?"
        ],
        "tags": [
            "array",
            "hash-table"
        ],
        "sortOrder": 1000
    },
    {
        "slug": "contains-duplicate",
        "title": "Contains Duplicate",
        "category": "arrays-and-hashing",
        "difficulty": "EASY",
        "description": "Given an integer array `nums`, determine if any value appears at least twice in the array. If any value appears more than once, return `true`. Otherwise, return `false`.\n\n### Example 1\n- **Input:** nums = [1, 2, 3, 1]\n- **Output:** true\n- **Explanation:** The number 1 appears twice.\n\n### Example 2\n- **Input:** nums = [1, 2, 3, 4]\n- **Output:** false\n- **Explanation:** All numbers are distinct.\n\n### Example 3\n- **Input:** nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]\n- **Output:** true\n- **Explanation:** The numbers 1, 3, and 2 appear more than once.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9",
        "requirements": [
            "Check if any element appears more than once.",
            "Return true if duplicates exist, otherwise false.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a data structure to track seen numbers.",
            "Think about how a set can help you identify duplicates.",
            "Iterate through the array and check membership in the set."
        ],
        "tags": [
            "arrays",
            "hashing"
        ],
        "sortOrder": 1001
    },
    {
        "slug": "valid-anagram",
        "title": "Valid Anagram",
        "category": "arrays-and-hashing",
        "difficulty": "EASY",
        "description": "Given two strings, determine if one string is an anagram of the other. An anagram is a word formed by rearranging the letters of another word, using all the original letters exactly once.\n\n### Example 1\n- **Input:** s = \"anagram\", t = \"nagaram\"\n- **Output:** true\n- **Explanation:** The string \"nagaram\" is an anagram of \"anagram\".\n\n### Example 2\n- **Input:** s = \"rat\", t = \"car\"\n- **Output:** false\n- **Explanation:** The string \"car\" is not an anagram of \"rat\".\n\n### Constraints\n- 1 <= s.length, t.length <= 10^4\n- Strings `s` and `t` consist of lowercase English letters.",
        "requirements": [
            "Check if two strings are anagrams.",
            "Use all letters exactly once.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a hash map to count character occurrences.",
            "Compare the frequency of each character in both strings.",
            "Sorting both strings and comparing them is another approach."
        ],
        "tags": [
            "strings",
            "hashing"
        ],
        "sortOrder": 1002
    },
    {
        "slug": "group-anagrams",
        "title": "Group Anagrams",
        "category": "arrays-and-hashing",
        "difficulty": "MEDIUM",
        "description": "Given an array of strings, group the anagrams together. Anagrams are words or phrases formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n### Example 1\n- **Input:** [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]\n- **Output:** [[\"eat\", \"tea\", \"ate\"], [\"tan\", \"nat\"], [\"bat\"]]\n- **Explanation:** The words \"eat\", \"tea\", and \"ate\" are anagrams of each other, as are \"tan\" and \"nat\". \"bat\" stands alone.\n\n### Example 2\n- **Input:** [\"\"]\n- **Output:** [[\"\"]]\n- **Explanation:** An empty string is an anagram of itself.\n\n### Example 3\n- **Input:** [\"a\"]\n- **Output:** [[\"a\"]]\n- **Explanation:** A single character is an anagram of itself.\n\n### Constraints\n- 1 <= strs.length <= 10^4\n- 0 <= strs[i].length <= 100\n- strs[i] consists of lowercase English letters.",
        "requirements": [
            "Group strings that are anagrams.",
            "Return groups in any order.",
            "Aim for O(n * k log k) time, where k is the max string length."
        ],
        "hints": [
            "Consider how you can identify anagrams using sorted strings.",
            "Use a dictionary to map sorted strings to lists of anagrams.",
            "Iterate through the input list, sorting each string and adding it to the dictionary."
        ],
        "tags": [
            "arrays",
            "hashing"
        ],
        "sortOrder": 1003
    },
    {
        "slug": "product-of-array-except-self",
        "title": "Product of Array Except Self",
        "category": "arrays-and-hashing",
        "difficulty": "MEDIUM",
        "description": "Given an integer array `nums`, return an array `result` such that `result[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must solve it without using division and in O(n) time.\n\n### Example 1\n- **Input:** nums = [1, 2, 3, 4]\n- **Output:** [24, 12, 8, 6]\n- **Explanation:** The product of all elements except the first is 2 * 3 * 4 = 24, except the second is 1 * 3 * 4 = 12, and so on.\n\n### Example 2\n- **Input:** nums = [-1, 1, 0, -3, 3]\n- **Output:** [0, 0, 9, 0, 0]\n- **Explanation:** The product of all elements except the third is -1 * 1 * -3 * 3 = 9, and the rest are 0 due to the presence of zero in the array.\n\n### Constraints\n- 2 <= nums.length <= 10^4\n- -30 <= nums[i] <= 30\n- The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.",
        "requirements": [
            "Return an array of products as described.",
            "Do not use division.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider calculating the product of elements to the left of each index.",
            "Similarly, calculate the product of elements to the right of each index.",
            "Combine the left and right products to get the final result."
        ],
        "tags": [
            "arrays",
            "prefix-sum"
        ],
        "sortOrder": 1004
    },
    {
        "slug": "valid-palindrome",
        "title": "Valid Palindrome",
        "category": "two-pointers",
        "difficulty": "EASY",
        "description": "Given a string, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases. A palindrome is a word, phrase, or sequence that reads the same backward as forward.\n\n### Example 1\n- **Input:** \"A man, a plan, a canal: Panama\"\n- **Output:** true\n- **Explanation:** After removing non-alphanumeric characters and converting to lowercase, the string becomes \"amanaplanacanalpanama\", which is a palindrome.\n\n### Example 2\n- **Input:** \"race a car\"\n- **Output:** false\n- **Explanation:** After removing non-alphanumeric characters and converting to lowercase, the string becomes \"raceacar\", which is not a palindrome.\n\n### Constraints\n- The input string consists of printable ASCII characters.\n- The length of the input string will not exceed 10,000 characters.",
        "requirements": [
            "Ignore non-alphanumeric characters.",
            "Check for palindrome ignoring case.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Use two pointers to compare characters from both ends.",
            "Skip non-alphanumeric characters using the pointers.",
            "Convert characters to lowercase for uniform comparison."
        ],
        "tags": [
            "two-pointers",
            "string-manipulation"
        ],
        "sortOrder": 1005
    },
    {
        "slug": "two-sum-ii-input-array-is-sorted",
        "title": "Two Sum II - Input Array Is Sorted",
        "category": "two-pointers",
        "difficulty": "MEDIUM",
        "description": "Given a sorted array of integers `numbers` and a target integer `target`, find two numbers in the array such that they add up to the target. Return the indices of the two numbers (1-indexed) as an array `[index1, index2]`, where `index1 < index2`.\n\n### Example 1\n- **Input:** numbers = [2, 7, 11, 15], target = 9\n- **Output:** [1, 2]\n- **Explanation:** The numbers at indices 1 and 2 (1-indexed) are 2 and 7, which add up to 9.\n\n### Example 2\n- **Input:** numbers = [2, 3, 4], target = 6\n- **Output:** [1, 3]\n- **Explanation:** The numbers at indices 1 and 3 (1-indexed) are 2 and 4, which add up to 6.\n\n### Constraints\n- The length of `numbers` is between 2 and 10^4.\n- Each element of `numbers` is between -10^3 and 10^3.\n- There is exactly one solution.",
        "requirements": [
            "Use the sorted property of the array.",
            "Return indices in 1-based format.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using two pointers to traverse the array.",
            "Start one pointer at the beginning and the other at the end.",
            "Adjust the pointers based on the sum compared to the target."
        ],
        "tags": [
            "two-pointers",
            "array",
            "binary-search"
        ],
        "sortOrder": 1006
    },
    {
        "slug": "three-sum",
        "title": "3Sum",
        "category": "two-pointers",
        "difficulty": "MEDIUM",
        "description": "Given an array of integers, find all unique triplets in the array which give the sum of zero. The solution set must not contain duplicate triplets.\n\n### Example 1\n- **Input:** nums = [-1, 0, 1, 2, -1, -4]\n- **Output:** [[-1, -1, 2], [-1, 0, 1]]\n- **Explanation:** The triplets [-1, -1, 2] and [-1, 0, 1] sum to zero.\n\n### Example 2\n- **Input:** nums = []\n- **Output:** []\n- **Explanation:** No triplets can be formed from an empty array.\n\n### Constraints\n- 0 <= nums.length <= 10^4\n- -10^5 <= nums[i] <= 10^5",
        "requirements": [
            "Return all unique triplets that sum to zero.",
            "Triplets should be returned in any order.",
            "Aim for O(n^2) time."
        ],
        "hints": [
            "Sort the array first to simplify finding duplicates.",
            "Use a two-pointer approach for each element to find pairs that sum to the negative of the current element.",
            "Skip duplicate elements to avoid repeated triplets."
        ],
        "tags": [
            "two-pointers",
            "array",
            "sorting"
        ],
        "sortOrder": 1007
    },
    {
        "slug": "container-with-most-water",
        "title": "Container With Most Water",
        "category": "two-pointers",
        "difficulty": "MEDIUM",
        "description": "You are given an array of integers `height` where each element represents the height of a vertical line drawn at that index. The width between two lines is the difference in their indices. Your task is to find two lines such that together with the x-axis, they form a container that holds the maximum amount of water.\n\nThe container cannot be tilted, and you may not slant the lines. Return the maximum amount of water a container can store.\n\n### Example 1\n- **Input:** `height = [1,8,6,2,5,4,8,3,7]`\n- **Output:** `49`\n- **Explanation:** The lines at indices 1 and 8 form the container with the most water, holding 49 units.\n\n### Example 2\n- **Input:** `height = [1,1]`\n- **Output:** `1`\n- **Explanation:** The only container possible holds 1 unit of water.\n\n### Constraints\n- `2 <= height.length <= 10^4`\n- `0 <= height[i] <= 10^4`",
        "requirements": [
            "Find the maximum water container.",
            "Use two lines from the array.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using two pointers, one at each end of the array.",
            "Move the pointer pointing to the shorter line inward.",
            "Keep track of the maximum area found."
        ],
        "tags": [
            "two-pointers",
            "array",
            "greedy"
        ],
        "sortOrder": 1008
    },
    {
        "slug": "trapping-rain-water",
        "title": "Trapping Rain Water",
        "category": "two-pointers",
        "difficulty": "HARD",
        "description": "Given an array of non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining. The elevation map is represented by an array where each element is the height of a bar.\n\n### Example 1\n- **Input:** height = [0,1,0,2,1,0,1,3,2,1,2,1]\n- **Output:** 6\n- **Explanation:** The elevation map can trap 6 units of rainwater.\n\n### Example 2\n- **Input:** height = [4,2,0,3,2,5]\n- **Output:** 9\n- **Explanation:** The elevation map can trap 9 units of rainwater.\n\n### Constraints\n- The length of the array is between 1 and 10,000.\n- Each element in the array is between 0 and 1000.",
        "requirements": [
            "Process the elevation map to calculate trapped water.",
            "Ensure the solution handles edge cases like flat or single-bar maps.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using two pointers to traverse the elevation map from both ends.",
            "Keep track of the maximum height encountered from both the left and right sides.",
            "Calculate trapped water by comparing the current height with the minimum of the maximum heights from both sides."
        ],
        "tags": [
            "two-pointers",
            "array",
            "water-trapping"
        ],
        "sortOrder": 1009
    },
    {
        "slug": "best-time-to-buy-and-sell-stock",
        "title": "Best Time to Buy and Sell Stock",
        "category": "sliding-window",
        "difficulty": "EASY",
        "description": "You are given an array where each element represents the price of a stock on a given day. Your task is to determine the maximum profit you can achieve by buying on one day and selling on another day after the purchase. You can only complete one transaction (buy one and sell one share). Return the maximum profit you can achieve. If no profit is possible, return 0.\n\n### Example 1\n- **Input:** prices = [7, 1, 5, 3, 6, 4]\n- **Output:** 5\n- **Explanation:** Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.\n\n### Example 2\n- **Input:** prices = [7, 6, 4, 3, 1]\n- **Output:** 0\n- **Explanation:** No transaction is done, as no profit is possible.\n\n### Constraints\n- 1 <= prices.length <= 10^4\n- 0 <= prices[i] <= 10^4",
        "requirements": [
            "Find the maximum profit from one transaction.",
            "Return 0 if no profit is possible.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Track the minimum price seen so far as you iterate.",
            "Calculate potential profit by subtracting the current price from the minimum price.",
            "Update the maximum profit if the current potential profit is higher."
        ],
        "tags": [
            "array",
            "greedy",
            "sliding-window"
        ],
        "sortOrder": 1010
    },
    {
        "slug": "longest-substring-without-repeating-characters",
        "title": "Longest Substring Without Repeating Characters",
        "category": "sliding-window",
        "difficulty": "MEDIUM",
        "description": "Given a string, find the length of the longest substring without repeating characters. A substring is a contiguous sequence of characters within a string.\n\n### Example 1\n- **Input:** \"abcabcbb\"\n- **Output:** 3\n- **Explanation:** The answer is \"abc\", with the length of 3.\n\n### Example 2\n- **Input:** \"bbbbb\"\n- **Output:** 1\n- **Explanation:** The answer is \"b\", with the length of 1.\n\n### Constraints\n- The input string length is between 0 and 10,000.\n- The input string consists of English letters, digits, symbols, and spaces.",
        "requirements": [
            "Find the longest substring without repeating characters.",
            "Return the length of this substring.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Try using a sliding window approach to keep track of the current substring.",
            "Use a set or a map to store characters and their indices.",
            "Adjust the window size dynamically as you encounter repeating characters."
        ],
        "tags": [
            "sliding-window",
            "hash-table"
        ],
        "sortOrder": 1011
    },
    {
        "slug": "longest-repeating-character-replacement",
        "title": "Longest Repeating Character Replacement",
        "category": "sliding-window",
        "difficulty": "MEDIUM",
        "description": "Given a string `s` consisting of uppercase English letters, you are allowed to replace at most `k` characters in the string with any other uppercase English letter. Your task is to find the length of the longest substring that can be obtained by performing these replacements. \n\n### Example 1\n- **Input:** s = \"ABAB\", k = 2\n- **Output:** 4\n- **Explanation:** Replace the two 'A's with 'B's to get \"BBBB\".\n\n### Example 2\n- **Input:** s = \"AABABBA\", k = 1\n- **Output:** 4\n- **Explanation:** Replace the one 'A' in the middle with 'B' to get \"AABBBBA\".\n\n### Constraints\n- 1 <= s.length <= 10^4\n- 0 <= k <= s.length\n- `s` contains only uppercase English letters.",
        "requirements": [
            "Implement a function to find the longest substring.",
            "Use at most k replacements.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a sliding window to track the current substring.",
            "Keep track of the most frequent character in the current window.",
            "Adjust the window size based on the number of replacements needed."
        ],
        "tags": [
            "sliding-window",
            "string-manipulation"
        ],
        "sortOrder": 1012
    },
    {
        "slug": "permutation-in-string",
        "title": "Permutation in String",
        "category": "sliding-window",
        "difficulty": "MEDIUM",
        "description": "Given two strings `s1` and `s2`, determine if `s2` contains a permutation of `s1`. In other words, check if one of `s1`'s permutations is a substring of `s2`.\n\n### Example 1\n- **Input:** s1 = \"ab\", s2 = \"eidbaooo\"\n- **Output:** true\n- **Explanation:** s2 contains one permutation of s1 (\"ba\").\n\n### Example 2\n- **Input:** s1 = \"ab\", s2 = \"eidboaoo\"\n- **Output:** false\n- **Explanation:** s2 does not contain any permutation of s1.\n\n### Constraints\n- 1 <= s1.length, s2.length <= 10^4\n- s1 and s2 consist of lowercase English letters.",
        "requirements": [
            "Check if s2 contains a permutation of s1.",
            "Return true or false.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Use a sliding window approach to check substrings of s2.",
            "Keep track of character counts for comparison.",
            "Adjust the window as you move through s2."
        ],
        "tags": [
            "sliding-window",
            "string-manipulation"
        ],
        "sortOrder": 1013
    },
    {
        "slug": "minimum-window-substring",
        "title": "Minimum Window Substring",
        "category": "sliding-window",
        "difficulty": "HARD",
        "description": "Given two strings `s` and `t`, find the smallest substring in `s` that contains all the characters from `t`. If there are multiple such substrings, return the one that appears first. If no such substring exists, return an empty string.\n\n### Example 1\n- **Input:** `s = \"ADOBECODEBANC\"`, `t = \"ABC\"`\n- **Output:** `\"BANC\"`\n- **Explanation:** The substring \"BANC\" contains all the characters 'A', 'B', and 'C' from `t`.\n\n### Example 2\n- **Input:** `s = \"a\"`, `t = \"a\"`\n- **Output:** `\"a\"`\n- **Explanation:** The entire string `s` is the smallest substring containing 'a'.\n\n### Example 3\n- **Input:** `s = \"a\"`, `t = \"aa\"`\n- **Output:** `\"\"`\n- **Explanation:** There is no substring in `s` that contains two 'a's.\n\n### Constraints\n- `1 <= s.length, t.length <= 10^4`\n- `s` and `t` consist of uppercase and lowercase English letters.",
        "requirements": [
            "Find the smallest substring in s containing all characters of t.",
            "Return the first such substring if multiple exist.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Use two pointers to represent the window.",
            "Expand the window until it contains all characters of t.",
            "Shrink the window from the left to find the minimum."
        ],
        "tags": [
            "sliding-window",
            "two-pointers",
            "string"
        ],
        "sortOrder": 1014
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "category": "stack",
        "difficulty": "EASY",
        "description": "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n\n### Example 1\n- **Input:** \"()\"\n- **Output:** true\n- **Explanation:** The string contains one pair of matching parentheses.\n\n### Example 2\n- **Input:** \"([)]\"\n- **Output:** false\n- **Explanation:** The string has mismatched parentheses.\n\n### Constraints\n- The input string length is between 1 and 10,000.\n- The input string contains only the characters '(', ')', '{', '}', '[' and ']'.",
        "requirements": [
            "Check if all brackets are matched correctly.",
            "Return true if the string is valid, false otherwise.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Use a stack to keep track of opening brackets.",
            "When encountering a closing bracket, check if it matches the top of the stack.",
            "Ensure the stack is empty at the end for a valid string."
        ],
        "tags": [
            "stack",
            "string",
            "parentheses"
        ],
        "sortOrder": 1015
    },
    {
        "slug": "min-stack",
        "title": "Min Stack",
        "category": "stack",
        "difficulty": "MEDIUM",
        "description": "Design a stack that supports standard operations (push, pop, top) and can also retrieve the minimum element in constant time.\n\nImplement the `MinStack` class:\n- `void push(int val)`: Pushes the element `val` onto the stack.\n- `void pop()`: Removes the element on the top of the stack.\n- `int top()`: Gets the top element of the stack.\n- `int getMin()`: Retrieves the minimum element in the stack.\n\n### Example 1\n- **Input:** `MinStack minStack = new MinStack();`, `minStack.push(-2);`, `minStack.push(0);`, `minStack.push(-3);`, `minStack.getMin();`, `minStack.pop();`, `minStack.top();`, `minStack.getMin();`\n- **Output:** `null, null, null, null, -3, null, 0, -2`\n- **Explanation:** After pushing -2, 0, -3, the minimum is -3. After popping, the top is 0 and the minimum is -2.\n\n### Example 2\n- **Input:** `MinStack minStack = new MinStack();`, `minStack.push(1);`, `minStack.push(2);`, `minStack.push(-1);`, `minStack.getMin();`, `minStack.pop();`, `minStack.top();`, `minStack.getMin();`\n- **Output:** `null, null, null, null, -1, null, 2, 1`\n- **Explanation:** After pushing 1, 2, -1, the minimum is -1. After popping, the top is 2 and the minimum is 1.\n\n### Constraints\n- Methods `push`, `pop`, `top`, and `getMin` will be called at most 10^4 times.\n- The stack will not be empty when `pop`, `top`, or `getMin` is called.\n- All input values are within the range of a 32-bit signed integer.",
        "requirements": [
            "Implement a stack with push, pop, top, and getMin methods.",
            "Ensure getMin works in constant time.",
            "Aim for O(1) time for all operations."
        ],
        "hints": [
            "Consider using an auxiliary stack to track the minimums.",
            "Update the auxiliary stack only when the new element is smaller or equal to the current minimum.",
            "Ensure the auxiliary stack is updated during both push and pop operations."
        ],
        "tags": [
            "stack",
            "design",
            "data-structure"
        ],
        "sortOrder": 1016
    },
    {
        "slug": "evaluate-reverse-polish-notation",
        "title": "Evaluate Reverse Polish Notation",
        "category": "stack",
        "difficulty": "MEDIUM",
        "description": "You are given an array of strings `tokens` that represents an arithmetic expression in Reverse Polish Notation (RPN). Your task is to evaluate this expression and return the result as an integer.\n\nIn RPN, each operator follows its operands. For example, to add two numbers 3 and 4, you would write `3 4 +` instead of `3 + 4`. The operators supported are `+`, `-`, `*`, and `/`. Division between two integers should truncate towards zero.\n\n### Example 1\n- **Input:** tokens = [\"2\", \"1\", \"+\", \"3\", \"*\"]\n- **Output:** 9\n- **Explanation:** The expression is equivalent to ((2 + 1) * 3) = 9.\n\n### Example 2\n- **Input:** tokens = [\"4\", \"13\", \"5\", \"/\", \"+\"]\n- **Output:** 6\n- **Explanation:** The expression is equivalent to (4 + (13 / 5)) = 6.\n\n### Constraints\n- The length of `tokens` is between 1 and 10,000.\n- Each element in `tokens` is either an operator: `+`, `-`, `*`, `/`, or an integer in string format.\n- The input is guaranteed to be a valid RPN expression.",
        "requirements": [
            "Parse and evaluate the RPN expression correctly.",
            "Handle integer division by truncating towards zero.",
            "Aim for O(n) time complexity."
        ],
        "hints": [
            "Use a stack to keep track of operands.",
            "When encountering an operator, pop the required number of operands from the stack.",
            "Push the result of the operation back onto the stack."
        ],
        "tags": [
            "stack",
            "expression-evaluation"
        ],
        "sortOrder": 1017
    },
    {
        "slug": "daily-temperatures",
        "title": "Daily Temperatures",
        "category": "stack",
        "difficulty": "MEDIUM",
        "description": "You are given an array `temperatures` where each element represents the daily temperature recorded. Your task is to determine, for each day, how many days you would have to wait until a warmer temperature occurs. If there is no future day with a warmer temperature, put 0 for that day.\n\n### Example 1\n- **Input:** temperatures = [73, 74, 75, 71, 69, 72, 76, 73]\n- **Output:** [1, 1, 4, 2, 1, 1, 0, 0]\n- **Explanation:** For day 0, the next warmer temperature is on day 1. For day 1, it's on day 2. For day 2, it's on day 6, and so on.\n\n### Example 2\n- **Input:** temperatures = [30, 40, 50, 60]\n- **Output:** [1, 1, 1, 0]\n- **Explanation:** Each day has a warmer temperature the next day except for the last day.\n\n### Constraints\n- `1 <= temperatures.length <= 10^4`\n- `30 <= temperatures[i] <= 100`",
        "requirements": [
            "Process each temperature to find the next warmer day.",
            "Use a stack to track indices of unresolved temperatures.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a stack to keep track of indices of temperatures that haven't found a warmer day yet.",
            "Iterate through the temperatures and for each day, check the stack to see if the current temperature is warmer than the temperature at the index stored at the top of the stack.",
            "Pop indices from the stack when you find a warmer temperature and calculate the days difference."
        ],
        "tags": [
            "stack",
            "array",
            "monotonic-stack"
        ],
        "sortOrder": 1018
    },
    {
        "slug": "largest-rectangle-in-histogram",
        "title": "Largest Rectangle in Histogram",
        "category": "stack",
        "difficulty": "HARD",
        "description": "You are given a list of non-negative integers representing the heights of bars in a histogram. Your task is to find the area of the largest rectangle that can be formed within the bounds of the histogram. The rectangle must be entirely contained within the histogram and can span multiple bars.\n\n### Example 1\n- **Input:** `[2, 1, 5, 6, 2, 3]`\n- **Output:** `10`\n- **Explanation:** The largest rectangle can be formed between the third and fourth bars (heights 5 and 6), with an area of 5 * 2 = 10.\n\n### Example 2\n- **Input:** `[2, 4]`\n- **Output:** `4`\n- **Explanation:** The largest rectangle is the second bar itself with an area of 4.\n\n### Constraints\n- The number of bars `n` is between 1 and 10,000.\n- Each bar's height is a non-negative integer and does not exceed 10,000.",
        "requirements": [
            "Implement a function to find the largest rectangle area.",
            "Handle edge cases such as single bar histograms.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a stack to keep track of bar indices.",
            "Think about when you need to calculate the area for a bar.",
            "Pop from the stack when you find a bar shorter than the one at the stack's top."
        ],
        "tags": [
            "stack",
            "array",
            "monotonic-stack"
        ],
        "sortOrder": 1019
    },
    {
        "slug": "binary-search",
        "title": "Binary Search",
        "category": "binary-search",
        "difficulty": "EASY",
        "description": "You are given a sorted array of integers and a target integer. Your task is to determine the index of the target in the array. If the target is not present, return -1.\n\n### Example 1\n- **Input:** nums = [1, 2, 3, 4, 5], target = 3\n- **Output:** 2\n- **Explanation:** The target 3 is at index 2.\n\n### Example 2\n- **Input:** nums = [1, 2, 3, 4, 5], target = 6\n- **Output:** -1\n- **Explanation:** The target 6 is not in the array.\n\n### Constraints\n- The length of `nums` is between 1 and 10^4.\n- `nums` is sorted in non-decreasing order.\n- `nums[i]` and `target` are integers within the range of -10^4 to 10^4.",
        "requirements": [
            "Implement a binary search algorithm.",
            "Return the index of the target or -1 if not found.",
            "Aim for O(log n) time."
        ],
        "hints": [
            "Consider the middle element of the array.",
            "Adjust the search range based on the middle element.",
            "Repeat the process until the range is valid."
        ],
        "tags": [
            "binary-search",
            "array",
            "searching"
        ],
        "sortOrder": 1020
    },
    {
        "slug": "search-a-2d-matrix",
        "title": "Search a 2D Matrix",
        "category": "binary-search",
        "difficulty": "MEDIUM",
        "description": "You are given a 2D matrix of integers where each row is sorted in ascending order from left to right, and each column is sorted in ascending order from top to bottom. Your task is to determine if a given target integer exists in the matrix.\n\n### Example 1\n- **Input:** matrix = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16]], target = 5\n- **Output:** true\n- **Explanation:** The target 5 is present in the matrix.\n\n### Example 2\n- **Input:** matrix = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16]], target = 10\n- **Output:** false\n- **Explanation:** The target 10 is not present in the matrix.\n\n### Constraints\n- The number of rows and columns in the matrix are between 1 and 10^4.\n- The matrix contains integers between -10^9 and 10^9.\n- The target is an integer between -10^9 and 10^9.",
        "requirements": [
            "Implement a function to search for the target in the matrix.",
            "Return true if the target is found, otherwise false.",
            "Aim for O(m + n) time complexity."
        ],
        "hints": [
            "Consider starting the search from the top-right corner of the matrix.",
            "If the current element is greater than the target, move left.",
            "If the current element is less than the target, move down."
        ],
        "tags": [
            "binary-search",
            "matrix",
            "searching"
        ],
        "sortOrder": 1021
    },
    {
        "slug": "koko-eating-bananas",
        "title": "Koko Eating Bananas",
        "category": "binary-search",
        "difficulty": "MEDIUM",
        "description": "Koko loves to eat bananas, and there are several piles of bananas, each with a different number of bananas. Koko can decide her eating speed, which is the number of bananas she eats per hour. Each hour, she chooses a pile of bananas and eats bananas from that pile. If the pile has fewer bananas than her eating speed, she eats all of them and moves to the next hour. Koko wants to finish eating all the bananas within a given number of hours. Determine the minimum eating speed that allows Koko to finish all the bananas in the given time.\n\n### Example 1\n- **Input:** piles = [3, 6, 7, 11], h = 8\n- **Output:** 4\n- **Explanation:** With an eating speed of 4, Koko can eat all the bananas in 8 hours.\n\n### Example 2\n- **Input:** piles = [30, 11, 23, 4, 20], h = 5\n- **Output:** 30\n- **Explanation:** Koko needs to eat at a speed of 30 to finish in 5 hours.\n\n### Constraints\n- 1 <= piles.length <= 10^4\n- 1 <= piles[i] <= 10^9\n- 1 <= h <= 10^9",
        "requirements": [
            "Implement a function to find the minimum eating speed.",
            "Ensure Koko finishes all bananas within the given hours.",
            "Aim for O(n log m) time, where m is the maximum pile size."
        ],
        "hints": [
            "Consider using binary search on the possible speeds.",
            "Check if a given speed allows Koko to finish in time.",
            "Adjust the search range based on whether the current speed is feasible."
        ],
        "tags": [
            "binary-search",
            "greedy",
            "arrays"
        ],
        "sortOrder": 1022
    },
    {
        "slug": "find-minimum-in-rotated-sorted-array",
        "title": "Find Minimum in Rotated Sorted Array",
        "category": "binary-search",
        "difficulty": "MEDIUM",
        "description": "You are given a rotated sorted array of unique integers. Your task is to find the minimum element in this array. The array was originally sorted in increasing order, but then it was rotated at some pivot unknown to you beforehand.\n\n### Example 1\n- **Input:** nums = [3, 4, 5, 1, 2]\n- **Output:** 1\n- **Explanation:** The original array was [1, 2, 3, 4, 5]. After rotation, the minimum element is 1.\n\n### Example 2\n- **Input:** nums = [4, 5, 6, 7, 0, 1, 2]\n- **Output:** 0\n- **Explanation:** The original array was [0, 1, 2, 4, 5, 6, 7]. After rotation, the minimum element is 0.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- -10^4 <= nums[i] <= 10^4\n- All integers in nums are unique.\n- The array is rotated at least once.",
        "requirements": [
            "Find the minimum element in a rotated sorted array.",
            "The array contains unique integers.",
            "Aim for O(log n) time."
        ],
        "hints": [
            "Consider using a modified binary search approach.",
            "Check the middle element against the rightmost element to decide which half to search.",
            "Remember that the minimum element is the only one smaller than its previous element."
        ],
        "tags": [
            "binary-search",
            "array"
        ],
        "sortOrder": 1023
    },
    {
        "slug": "search-in-rotated-sorted-array",
        "title": "Search in Rotated Sorted Array",
        "category": "binary-search",
        "difficulty": "MEDIUM",
        "description": "You are given a rotated sorted array of distinct integers and a target value. The array was originally sorted in ascending order but was then rotated at some pivot. Your task is to find the index of the target value in this array. If the target is not present, return -1.\n\n### Example 1\n- **Input:** nums = [4, 5, 6, 7, 0, 1, 2], target = 0\n- **Output:** 4\n- **Explanation:** The target 0 is at index 4.\n\n### Example 2\n- **Input:** nums = [4, 5, 6, 7, 0, 1, 2], target = 3\n- **Output:** -1\n- **Explanation:** The target 3 is not in the array.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- -10^4 <= nums[i] <= 10^4\n- All values of nums are unique.\n- nums is rotated at some pivot.\n- -10^4 <= target <= 10^4",
        "requirements": [
            "Handle rotated arrays correctly.",
            "Return -1 if target is not found.",
            "Aim for O(log n) time."
        ],
        "hints": [
            "Consider how the array is divided into two sorted subarrays.",
            "Use binary search to determine which subarray to search in.",
            "Adjust the search range based on the middle element's value."
        ],
        "tags": [
            "binary-search",
            "array"
        ],
        "sortOrder": 1024
    },
    {
        "slug": "reverse-linked-list",
        "title": "Reverse Linked List",
        "category": "linked-list",
        "difficulty": "EASY",
        "description": "Given the head of a singly linked list, reverse the list and return the new head. The linked list should be reversed in place, meaning you should not allocate extra nodes.\n\n### Example 1\n- **Input:** head = [1, 2, 3, 4, 5]\n- **Output:** [5, 4, 3, 2, 1]\n- **Explanation:** The linked list is reversed from 1->2->3->4->5 to 5->4->3->2->1.\n\n### Example 2\n- **Input:** head = [1, 2]\n- **Output:** [2, 1]\n- **Explanation:** The linked list is reversed from 1->2 to 2->1.\n\n### Constraints\n- The number of nodes in the list is in the range [0, 10^4].\n- -5000 <= Node.val <= 5000\n- Aim for O(n) time and O(1) space.",
        "requirements": [
            "Reverse the linked list in place.",
            "Return the new head of the reversed list.",
            "Aim for O(n) time and O(1) space."
        ],
        "hints": [
            "Consider using three pointers to keep track of the current node, previous node, and next node.",
            "Iterate through the list and reverse the pointers one by one.",
            "Ensure to update the head of the list at the end of the iteration."
        ],
        "tags": [
            "linked-list",
            "in-place",
            "reversal"
        ],
        "sortOrder": 1025
    },
    {
        "slug": "merge-two-sorted-lists",
        "title": "Merge Two Sorted Lists",
        "category": "linked-list",
        "difficulty": "EASY",
        "description": "You are given two singly linked lists, each sorted in non-decreasing order. Your task is to merge these two lists into a single sorted linked list. The merged list should also be in non-decreasing order.\n\n### Example 1\n- **Input:** list1 = [1, 2, 4], list2 = [1, 3, 4]\n- **Output:** [1, 1, 2, 3, 4, 4]\n- **Explanation:** The merged list is [1, 1, 2, 3, 4, 4].\n\n### Example 2\n- **Input:** list1 = [], list2 = []\n- **Output:** []\n- **Explanation:** Both lists are empty, so the merged list is also empty.\n\n### Example 3\n- **Input:** list1 = [], list2 = [0]\n- **Output:** [0]\n- **Explanation:** The first list is empty, so the merged list is just the second list.\n\n### Constraints\n- The number of nodes in both lists is in the range [0, 10^4].\n- -10^4 <= Node.val <= 10^4\n- Both list1 and list2 are sorted in non-decreasing order.",
        "requirements": [
            "Merge two sorted linked lists.",
            "Return a new sorted linked list.",
            "Aim for O(n + m) time, where n and m are the lengths of the lists."
        ],
        "hints": [
            "Use a dummy node to simplify edge cases.",
            "Iterate through both lists, always choosing the smaller current node.",
            "Attach the remaining nodes from the non-empty list after one list is exhausted."
        ],
        "tags": [
            "linked-list",
            "sorting",
            "two-pointers"
        ],
        "sortOrder": 1026
    },
    {
        "slug": "linked-list-cycle",
        "title": "Linked List Cycle",
        "category": "linked-list",
        "difficulty": "EASY",
        "description": "Given a linked list, determine if it has a cycle in it. A cycle occurs when a node's next pointer points back to a previous node in the list, forming a loop. \n\n### Example 1\n- **Input:** head = [3, 2, 0, -4], pos = 1\n- **Output:** true\n- **Explanation:** There is a cycle in the linked list, where the tail connects to the second node.\n\n### Example 2\n- **Input:** head = [1, 2], pos = 0\n- **Output:** true\n- **Explanation:** There is a cycle in the linked list, where the tail connects to the first node.\n\n### Example 3\n- **Input:** head = [1], pos = -1\n- **Output:** false\n- **Explanation:** There is no cycle in the linked list.\n\n### Constraints\n- The number of nodes in the list is in the range [0, 10^4].\n- -10^5 <= Node.val <= 10^5\n- pos is -1 or a valid index in the linked list.",
        "requirements": [
            "Return true if there is a cycle, otherwise false.",
            "Do not modify the linked list.",
            "Aim for O(n) time and O(1) space."
        ],
        "hints": [
            "Try using two pointers moving at different speeds.",
            "Consider what happens when the faster pointer catches up to the slower pointer.",
            "Think about how you can detect a cycle with minimal space usage."
        ],
        "tags": [
            "linked-list",
            "two-pointers"
        ],
        "sortOrder": 1027
    },
    {
        "slug": "reorder-list",
        "title": "Reorder List",
        "category": "linked-list",
        "difficulty": "MEDIUM",
        "description": "You are given the head of a singly linked list. Your task is to reorder the list in a specific way: the first element should be followed by the last element, then the second element followed by the second last element, and so on. Modify the list in-place without using extra space for another list.\n\n### Example 1\n- **Input:** head = [1, 2, 3, 4]\n- **Output:** [1, 4, 2, 3]\n- **Explanation:** The list is reordered by taking the first element (1), then the last element (4), then the second element (2), and finally the third element (3).\n\n### Example 2\n- **Input:** head = [1, 2, 3, 4, 5]\n- **Output:** [1, 5, 2, 4, 3]\n- **Explanation:** The list is reordered by taking the first element (1), then the last element (5), then the second element (2), then the second last element (4), and finally the middle element (3).\n\n### Constraints\n- The number of nodes in the list is in the range [1, 10^4].\n- The list consists of integers.\n- The list is not empty.",
        "requirements": [
            "Modify the list in-place.",
            "Do not use extra space for another list.",
            "Aim for O(n) time complexity."
        ],
        "hints": [
            "Try to find the middle of the list first.",
            "Reverse the second half of the list.",
            "Merge the two halves alternately."
        ],
        "tags": [
            "linked-list",
            "in-place-algorithm"
        ],
        "sortOrder": 1028
    },
    {
        "slug": "remove-nth-node-from-end-of-list",
        "title": "Remove Nth Node From End of List",
        "category": "linked-list",
        "difficulty": "MEDIUM",
        "description": "Given a singly linked list, remove the n-th node from the end of the list and return its head. You are guaranteed that n is always valid.\n\n### Example 1\n- **Input:** head = [1, 2, 3, 4, 5], n = 2\n- **Output:** [1, 2, 3, 5]\n- **Explanation:** The second node from the end is 4, which is removed.\n\n### Example 2\n- **Input:** head = [1], n = 1\n- **Output:** []\n- **Explanation:** The only node is removed, resulting in an empty list.\n\n### Example 3\n- **Input:** head = [1, 2], n = 1\n- **Output:** [1]\n- **Explanation:** The last node is removed, leaving the list with the first node.\n\n### Constraints\n- The number of nodes in the list is at least 1 and at most 10^4.\n- 1 ≤ n ≤ length of the list.",
        "requirements": [
            "Remove the nth node from the end of the list.",
            "Return the head of the modified list.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using two pointers to find the nth node from the end.",
            "One pointer can be advanced by n nodes first.",
            "Then move both pointers until the first reaches the end."
        ],
        "tags": [
            "linked-list",
            "two-pointers"
        ],
        "sortOrder": 1029
    },
    {
        "slug": "invert-binary-tree",
        "title": "Invert Binary Tree",
        "category": "trees",
        "difficulty": "EASY",
        "description": "Given the root of a binary tree, invert the tree, and return its root. Inverting a binary tree means swapping the left and right children of every node in the tree.\n\n### Example 1\n- **Input:** root = [4, 2, 7, 1, 3, 6, 9]\n- **Output:** [4, 7, 2, 9, 6, 3, 1]\n- **Explanation:** The left and right children of each node are swapped.\n\n### Example 2\n- **Input:** root = [2, 1, 3]\n- **Output:** [2, 3, 1]\n- **Explanation:** The left and right children of the root are swapped.\n\n### Constraints\n- The number of nodes in the tree is in the range [0, 10^4].\n- -100 <= Node.val <= 100",
        "requirements": [
            "Swap left and right children of each node.",
            "Return the root of the inverted tree.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a recursive approach to swap nodes.",
            "A depth-first traversal might be helpful.",
            "Think about how you would swap nodes in a single level."
        ],
        "tags": [
            "trees",
            "binary-tree",
            "recursion"
        ],
        "sortOrder": 1030
    },
    {
        "slug": "maximum-depth-of-binary-tree",
        "title": "Maximum Depth of Binary Tree",
        "category": "trees",
        "difficulty": "EASY",
        "description": "Given the root of a binary tree, determine its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\n### Example 1\n- **Input:** root = [3, 9, 20, null, null, 15, 7]\n- **Output:** 3\n- **Explanation:** The longest path is 3 -> 20 -> 7 or 3 -> 20 -> 15, each with a depth of 3.\n\n### Example 2\n- **Input:** root = [1, null, 2]\n- **Output:** 2\n- **Explanation:** The longest path is 1 -> 2, with a depth of 2.\n\n### Constraints\n- The number of nodes in the tree is in the range [0, 10^4].\n- The tree node values are integers.\n- The depth of the tree will not exceed 10^4.",
        "requirements": [
            "Parse the binary tree from level order input.",
            "Return the maximum depth as an integer.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using recursion to explore each path.",
            "Track the depth as you traverse the tree.",
            "Use a stack or queue for iterative solutions."
        ],
        "tags": [
            "trees",
            "depth-first-search"
        ],
        "sortOrder": 1031
    },
    {
        "slug": "diameter-of-binary-tree",
        "title": "Diameter of Binary Tree",
        "category": "trees",
        "difficulty": "EASY",
        "description": "Given the root of a binary tree, determine the diameter of the tree. The diameter of a binary tree is the length of the longest path between any two nodes in the tree. This path may or may not pass through the root. The length of a path is represented by the number of edges between the nodes.\n\n### Example 1\n- **Input:** root = [1, 2, 3, 4, 5]\n- **Output:** 3\n- **Explanation:** The longest path is [4, 2, 1, 3] or [5, 2, 1, 3], with 3 edges.\n\n### Example 2\n- **Input:** root = [1, 2]\n- **Output:** 1\n- **Explanation:** The longest path is [2, 1], with 1 edge.\n\n### Constraints\n- The number of nodes in the tree is in the range [1, 10^4].\n- The value of each node is unique and in the range [-1000, 1000].",
        "requirements": [
            "Implement a function to find the diameter of a binary tree.",
            "Use depth-first search to explore the tree.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider the longest path as a combination of two depths from a node.",
            "Use a recursive function to calculate the depth of each subtree.",
            "Track the maximum diameter found during the depth calculation."
        ],
        "tags": [
            "trees",
            "depth-first-search"
        ],
        "sortOrder": 1032
    },
    {
        "slug": "binary-tree-level-order-traversal",
        "title": "Binary Tree Level Order Traversal",
        "category": "trees",
        "difficulty": "MEDIUM",
        "description": "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).\n\n### Example 1\n- **Input:** root = [3, 9, 20, null, null, 15, 7]\n- **Output:** [[3], [9, 20], [15, 7]]\n- **Explanation:** The binary tree has three levels. The first level has the node 3, the second level has nodes 9 and 20, and the third level has nodes 15 and 7.\n\n### Example 2\n- **Input:** root = [1]\n- **Output:** [[1]]\n- **Explanation:** The binary tree has only one node, which is the root itself.\n\n### Constraints\n- The number of nodes in the tree is in the range [0, 10^4].\n- -1000 <= Node.val <= 1000",
        "requirements": [
            "Parse the tree in level order.",
            "Return each level as a separate list.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a queue to help with level order traversal.",
            "Think about how to track the end of each level.",
            "You can use a loop to process each level separately."
        ],
        "tags": [
            "binary-tree",
            "breadth-first-search"
        ],
        "sortOrder": 1033
    },
    {
        "slug": "validate-binary-search-tree",
        "title": "Validate Binary Search Tree",
        "category": "trees",
        "difficulty": "MEDIUM",
        "description": "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as follows: the left subtree of a node contains only nodes with keys less than the node's key, the right subtree only nodes with keys greater than the node's key, and both left and right subtrees must also be binary search trees.\n\n### Example 1\n- **Input:** root = [2, 1, 3]\n- **Output:** true\n- **Explanation:** The tree is a valid BST.\n\n### Example 2\n- **Input:** root = [5, 1, 4, null, null, 3, 6]\n- **Output:** false\n- **Explanation:** The root node's value is 5 but the right subtree contains a node with value 3, which is not greater than 5.\n\n### Constraints\n- The number of nodes in the tree is in the range [1, 10^4].\n- -2^31 <= Node.val <= 2^31 - 1",
        "requirements": [
            "Check if a binary tree is a valid BST.",
            "Ensure all nodes follow BST properties.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a helper function to validate the tree recursively.",
            "Keep track of the valid range for each node.",
            "Use in-order traversal to check if the sequence is strictly increasing."
        ],
        "tags": [
            "trees",
            "binary-search-tree"
        ],
        "sortOrder": 1034
    },
    {
        "slug": "implement-trie-prefix-tree",
        "title": "Implement Trie (Prefix Tree)",
        "category": "tries",
        "difficulty": "MEDIUM",
        "description": "Design a Trie (Prefix Tree) that supports the following operations: insert, search, and startsWith. A Trie is a tree-like data structure that efficiently stores strings and supports fast prefix queries.\n\n### Methods\n- **void insert(string word)**: Inserts the word into the trie.\n- **bool search(string word)**: Returns true if the word is in the trie, and false otherwise.\n- **bool startsWith(string prefix)**: Returns true if there is any word in the trie that starts with the given prefix.\n\n### Example 1\n- **Input:** [\"Trie\", \"insert\", \"search\", \"search\", \"startsWith\", \"insert\", \"search\"], [[], [\"apple\"], [\"apple\"], [\"app\"], [\"app\"], [\"app\"], [\"app\"]]\n- **Output:** [null, null, true, false, true, null, true]\n- **Explanation:**\n  - Trie trie = new Trie();\n  - trie.insert(\"apple\"); // Inserts \"apple\" into the trie.\n  - trie.search(\"apple\"); // Returns true because \"apple\" is in the trie.\n  - trie.search(\"app\"); // Returns false because \"app\" is not a complete word in the trie.\n  - trie.startsWith(\"app\"); // Returns true because \"apple\" starts with \"app\".\n  - trie.insert(\"app\"); // Inserts \"app\" into the trie.\n  - trie.search(\"app\"); // Returns true because \"app\" is now a complete word in the trie.\n\n### Example 2\n- **Input:** [\"Trie\", \"insert\", \"search\", \"startsWith\", \"insert\", \"search\", \"startsWith\"], [[], [\"banana\"], [\"ban\"], [\"ban\"], [\"band\"], [\"band\"], [\"ba\"]]\n- **Output:** [null, null, false, true, null, true, true]\n- **Explanation:**\n  - Trie trie = new Trie();\n  - trie.insert(\"banana\");\n  - trie.search(\"ban\"); // Returns false because \"ban\" is not a complete word in the trie.\n  - trie.startsWith(\"ban\"); // Returns true because \"banana\" starts with \"ban\".\n  - trie.insert(\"band\");\n  - trie.search(\"band\"); // Returns true because \"band\" is now in the trie.\n  - trie.startsWith(\"ba\"); // Returns true because both \"banana\" and \"band\" start with \"ba\".\n\n### Constraints\n- The number of calls to insert, search, and startsWith is at most 10^4.\n- All strings are composed of lowercase English letters.\n- The length of each string is at most 100.",
        "requirements": [
            "Implement a Trie class with insert, search, and startsWith methods.",
            "Ensure methods return correct boolean results.",
            "Aim for O(m) time per operation, where m is the key length."
        ],
        "hints": [
            "Consider using a nested dictionary or a node class to represent each character.",
            "Use a special marker to indicate the end of a word in the trie.",
            "Think about how to traverse the trie for both search and prefix operations."
        ],
        "tags": [
            "tries",
            "data-structure",
            "string"
        ],
        "sortOrder": 1035
    },
    {
        "slug": "design-add-and-search-words-data-structure",
        "title": "Design Add and Search Words Data Structure",
        "category": "tries",
        "difficulty": "MEDIUM",
        "description": "Design a data structure that supports adding new words and searching for a word, including support for wildcard character `.` which can match any letter. Implement the class `WordDictionary` with the following methods:\n\n- `void addWord(string word)`: Adds a word to the data structure.\n- `bool search(string word)`: Returns `true` if the word is in the data structure, otherwise returns `false`. A word can contain the dot character `.` which can match any letter.\n\n### Example 1\n- **Input:** `WordDictionary` operations: `[\"addWord\", \"addWord\", \"search\", \"search\", \"search\", \"search\"]`, arguments: `[[\"bad\"], [\"dad\"], [\"pad\"], [\"bad\"], [\".ad\"], [\"b..\"]]`\n- **Output:** `[null, null, false, true, true, true]`\n- **Explanation:**\n  - `addWord(\"bad\")` adds the word \"bad\".\n  - `addWord(\"dad\")` adds the word \"dad\".\n  - `search(\"pad\")` returns `false` because \"pad\" is not added.\n  - `search(\"bad\")` returns `true` because \"bad\" is added.\n  - `search(\".ad\")` returns `true` because \".ad\" matches \"bad\" and \"dad\".\n  - `search(\"b..\")` returns `true` because \"b..\" matches \"bad\".\n\n### Constraints\n- Words are composed only of lowercase English letters.\n- The length of each word is at most 25.\n- The number of `addWord` and `search` operations combined will not exceed 10^4.",
        "requirements": [
            "Implement a class with add and search methods.",
            "Support wildcard character `.` in search.",
            "Aim for efficient search operations."
        ],
        "hints": [
            "Consider using a trie data structure to store words.",
            "For the wildcard character, explore all possible paths in the trie.",
            "Optimize the search by pruning paths that cannot match."
        ],
        "tags": [
            "design",
            "trie",
            "backtracking"
        ],
        "sortOrder": 1036
    },
    {
        "slug": "longest-common-prefix",
        "title": "Longest Common Prefix",
        "category": "tries",
        "difficulty": "EASY",
        "description": "Given an array of strings, find the longest common prefix among them. If there is no common prefix, return an empty string.\n\n### Example 1\n- **Input:** [\"flower\",\"flow\",\"flight\"]\n- **Output:** \"fl\"\n- **Explanation:** The longest common prefix is \"fl\".\n\n### Example 2\n- **Input:** [\"dog\",\"racecar\",\"car\"]\n- **Output:** \"\"\n- **Explanation:** There is no common prefix among the input strings.\n\n### Constraints\n- The input array will have a length between 1 and 10^4.\n- Each string in the array will have a length between 0 and 200.\n- All strings consist of lowercase English letters only.",
        "requirements": [
            "Handle arrays of up to 10,000 strings.",
            "Work with strings up to 200 characters long.",
            "Aim for O(n * m) time, where n is the number of strings and m is the length of the shortest string."
        ],
        "hints": [
            "Consider the shortest string as a starting point for comparison.",
            "Iteratively compare characters of each string at the same position.",
            "Stop when a mismatch is found or the end of the shortest string is reached."
        ],
        "tags": [
            "strings",
            "array"
        ],
        "sortOrder": 1037
    },
    {
        "slug": "word-search-ii",
        "title": "Word Search II",
        "category": "tries",
        "difficulty": "HARD",
        "description": "Given a 2D board of characters and a list of words, find all words from the list that can be formed by sequentially adjacent letters on the board. The same letter cell may not be used more than once per word. Words can be constructed in any direction: horizontally, vertically, or diagonally.\n\n### Example 1\n- **Input:** board = [['o','a','a','n'],['e','t','a','e'],['i','h','k','r'],['i','f','l','v']], words = ['oath','pea','eat','rain']\n- **Output:** ['oath','eat']\n- **Explanation:** The words 'oath' and 'eat' can be found in the board.\n\n### Example 2\n- **Input:** board = [['a','b'],['c','d']], words = ['abcb']\n- **Output:** []\n- **Explanation:** The word 'abcb' cannot be formed as the same letter cell cannot be used more than once.\n\n### Constraints\n- The board dimensions are m x n where 1 <= m, n <= 12.\n- The list of words contains between 1 and 5000 words.\n- Each word has a length between 1 and 10.\n- All characters are lowercase English letters.",
        "requirements": [
            "Implement a function to find words in a grid.",
            "Use each board cell at most once per word.",
            "Aim for O(m * n * 4^l) time, where l is the maximum word length."
        ],
        "hints": [
            "Consider using a trie to store the words for efficient lookup.",
            "Perform a depth-first search from each cell, checking against the trie.",
            "Prune the search space by removing words from the trie as they are found."
        ],
        "tags": [
            "tries",
            "backtracking",
            "depth-first-search"
        ],
        "sortOrder": 1038
    },
    {
        "slug": "kth-largest-element-in-a-stream",
        "title": "Kth Largest Element in a Stream",
        "category": "heap-priority-queue",
        "difficulty": "EASY",
        "description": "Design a class that finds the k-th largest element in a stream of integers. The class should be initialized with an integer k and a list of integers. Implement a method that adds a new integer to the stream and returns the k-th largest element.\n\n### Example 1\n- **Input:** `KthLargest(3, [4, 5, 8, 2])`, `add(3)`, `add(5)`, `add(10)`, `add(9)`, `add(4)`\n- **Output:** `null`, `4`, `5`, `5`, `8`, `8`\n- **Explanation:** The initial stream is [4, 5, 8, 2], and the 3rd largest element is 4. After adding 3, the stream becomes [4, 5, 8, 2, 3], and the 3rd largest is still 4. Adding 5, the stream becomes [4, 5, 8, 2, 3, 5], and the 3rd largest is 5. Adding 10, the stream becomes [4, 5, 8, 2, 3, 5, 10], and the 3rd largest is 5. Adding 9, the stream becomes [4, 5, 8, 2, 3, 5, 10, 9], and the 3rd largest is 8. Finally, adding 4, the stream becomes [4, 5, 8, 2, 3, 5, 10, 9, 4], and the 3rd largest is 8.\n\n### Example 2\n- **Input:** `KthLargest(1, [5])`, `add(2)`, `add(1)`, `add(3)`, `add(4)`\n- **Output:** `null`, `5`, `5`, `5`, `5`\n- **Explanation:** The initial stream is [5], and the 1st largest element is 5. Adding 2, 1, 3, or 4 does not change the largest element, which remains 5.\n\n### Constraints\n- The number of elements in the initial list and the number of calls to `add` will not exceed 10^4.\n- It is guaranteed that k is always valid, i.e., 1 ≤ k ≤ number of elements in the stream.",
        "requirements": [
            "Implement a class with methods to add elements and find the k-th largest.",
            "Ensure the class handles up to 10^4 elements efficiently.",
            "Aim for O(log k) time per add operation."
        ],
        "hints": [
            "Consider using a data structure that efficiently maintains the k largest elements.",
            "A min-heap of size k can help keep track of the k-th largest element.",
            "When adding a new element, compare it with the smallest in the heap."
        ],
        "tags": [
            "heap-priority-queue",
            "design",
            "stream-processing"
        ],
        "sortOrder": 1039
    },
    {
        "slug": "last-stone-weight",
        "title": "Last Stone Weight",
        "category": "heap-priority-queue",
        "difficulty": "EASY",
        "description": "You are given an array of integers representing the weights of stones. Each turn, select the two heaviest stones and smash them together. If they are of equal weight, both stones are destroyed. If they are of different weights, the stone with the smaller weight is destroyed, and the stone with the larger weight has its weight reduced by the weight of the smaller stone. Continue this process until there is at most one stone left. Return the weight of the last remaining stone, or 0 if all stones are destroyed.\n\n### Example 1\n- **Input:** [2, 7, 4, 1, 8, 1]\n- **Output:** 1\n- **Explanation:**\n  - Smash 7 and 8 -> New stones: [2, 4, 1, 1, 1]\n  - Smash 4 and 2 -> New stones: [2, 1, 1, 1]\n  - Smash 2 and 1 -> New stones: [1, 1, 1]\n  - Smash 1 and 1 -> New stones: [1]\n  - Only one stone left with weight 1.\n\n### Example 2\n- **Input:** [1]\n- **Output:** 1\n- **Explanation:** Only one stone is present, so its weight is the result.\n\n### Constraints\n- 1 <= stones.length <= 10^4\n- 1 <= stones[i] <= 1000",
        "requirements": [
            "Use a priority queue to manage stone weights.",
            "Simulate the smashing process until one stone remains.",
            "Aim for O(n log n) time."
        ],
        "hints": [
            "Consider using a max-heap to always access the heaviest stones.",
            "Remember to handle the case where two stones are of equal weight.",
            "Think about how to efficiently update the heap after each smash."
        ],
        "tags": [
            "heap",
            "priority-queue"
        ],
        "sortOrder": 1040
    },
    {
        "slug": "k-closest-points-to-origin",
        "title": "K Closest Points to Origin",
        "category": "heap-priority-queue",
        "difficulty": "MEDIUM",
        "description": "Given a list of points in a 2D plane, find the `k` points that are closest to the origin (0, 0). The distance between two points \\((x_1, y_1)\\) and \\((x_2, y_2)\\) is calculated using the Euclidean distance formula: \\(\\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}\\). However, since we only need to compare distances, you can use the squared distance for simplicity.\n\nReturn the `k` closest points in any order.\n\n### Example 1\n- **Input:** points = [[1, 3], [-2, 2]], k = 1\n- **Output:** [[-2, 2]]\n- **Explanation:** The point (-2, 2) is closer to the origin than (1, 3).\n\n### Example 2\n- **Input:** points = [[3, 3], [5, -1], [-2, 4]], k = 2\n- **Output:** [[3, 3], [-2, 4]]\n- **Explanation:** The two closest points are (3, 3) and (-2, 4).\n\n### Constraints\n- 1 ≤ points.length ≤ 10^4\n- points[i].length == 2\n- -10^4 ≤ points[i][0], points[i][1] ≤ 10^4\n- 1 ≤ k ≤ points.length",
        "requirements": [
            "Implement a function that returns k closest points.",
            "Use Euclidean distance for comparison.",
            "Aim for O(n log k) time."
        ],
        "hints": [
            "Consider using a max-heap to keep track of the closest points.",
            "Remember, you only need to maintain k points in the heap.",
            "Compare squared distances to avoid unnecessary computations."
        ],
        "tags": [
            "heap-priority-queue",
            "sorting",
            "geometry"
        ],
        "sortOrder": 1041
    },
    {
        "slug": "kth-largest-element-in-an-array",
        "title": "Kth Largest Element in an Array",
        "category": "heap-priority-queue",
        "difficulty": "MEDIUM",
        "description": "Given an array of integers `nums` and an integer `k`, your task is to find the k-th largest element in the array. The k-th largest element is the element that would appear in position `n-k` if the array were sorted in non-decreasing order, where `n` is the length of the array.\n\n### Example 1\n- **Input:** nums = [3, 2, 1, 5, 6, 4], k = 2\n- **Output:** 5\n- **Explanation:** The sorted array is [1, 2, 3, 4, 5, 6]. The 2nd largest element is 5.\n\n### Example 2\n- **Input:** nums = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4\n- **Output:** 4\n- **Explanation:** The sorted array is [1, 2, 2, 3, 3, 4, 5, 5, 6]. The 4th largest element is 4.\n\n### Constraints\n- 1 ≤ k ≤ nums.length ≤ 10^4\n- -10^4 ≤ nums[i] ≤ 10^4",
        "requirements": [
            "Implement a function to find the k-th largest element.",
            "Use a heap or sorting for efficient access.",
            "Aim for O(n log k) time."
        ],
        "hints": [
            "Consider using a min-heap to keep track of the k largest elements.",
            "Think about how the heap size relates to k.",
            "Sorting the array is an option, but can you do better?"
        ],
        "tags": [
            "heap",
            "priority-queue",
            "sorting"
        ],
        "sortOrder": 1042
    },
    {
        "slug": "task-scheduler",
        "title": "Task Scheduler",
        "category": "heap-priority-queue",
        "difficulty": "MEDIUM",
        "description": "You are given a list of tasks, each represented by a character. Each task takes one unit of time to complete, and after completing a task, you must wait for a cooldown period of `n` units of time before you can start the same task again. During the cooldown period, you can perform other tasks or remain idle. Your goal is to determine the minimum time required to complete all tasks.\n\n### Example 1\n- **Input:** tasks = ['A', 'A', 'A', 'B', 'B', 'B'], n = 2\n- **Output:** 8\n- **Explanation:** A possible schedule is A -> B -> idle -> A -> B -> idle -> A -> B.\n\n### Example 2\n- **Input:** tasks = ['A', 'A', 'A', 'B', 'B', 'B'], n = 0\n- **Output:** 6\n- **Explanation:** A possible schedule is A -> B -> A -> B -> A -> B, with no idle time needed.\n\n### Constraints\n- The number of tasks is between 1 and 10^4.\n- `n` is a non-negative integer less than 100.\n- Tasks are represented by uppercase English letters.",
        "requirements": [
            "Implement a function to schedule tasks.",
            "Handle cooldown periods correctly.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Count the frequency of each task.",
            "Use a priority queue to manage task execution.",
            "Calculate idle slots based on the most frequent task."
        ],
        "tags": [
            "greedy",
            "heap-priority-queue",
            "scheduling"
        ],
        "sortOrder": 1043
    },
    {
        "slug": "generate-all-subsets",
        "title": "Subsets",
        "category": "backtracking",
        "difficulty": "MEDIUM",
        "description": "Given a list of unique integers, your task is to generate all possible subsets (the power set). The solution should include the empty subset and the set itself. Return the subsets in any order.\n\n### Example 1\n- **Input:** nums = [1, 2, 3]\n- **Output:** [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]\n- **Explanation:** There are 8 subsets of the list [1, 2, 3].\n\n### Example 2\n- **Input:** nums = [0]\n- **Output:** [[], [0]]\n- **Explanation:** There are 2 subsets of the list [0].\n\n### Constraints\n- 1 <= nums.length <= 10\n- -10 <= nums[i] <= 10\n- All elements of nums are unique.",
        "requirements": [
            "Generate all subsets of the list.",
            "Include the empty subset.",
            "Aim for O(2^n) time."
        ],
        "hints": [
            "Consider using a recursive approach to explore each element's inclusion.",
            "Think about how you can build subsets by adding elements one by one.",
            "Backtracking can help you explore all combinations efficiently."
        ],
        "tags": [
            "backtracking",
            "combinatorics"
        ],
        "sortOrder": 1044
    },
    {
        "slug": "combination-sum",
        "title": "Combination Sum",
        "category": "backtracking",
        "difficulty": "MEDIUM",
        "description": "Given an array of distinct integers `candidates` and a target integer `target`, find all unique combinations in `candidates` where the candidate numbers sum to `target`. Each number in `candidates` may be used an unlimited number of times in the combination.\n\nReturn the list of all unique combinations. The combinations can be returned in any order.\n\n### Example 1\n- **Input:** candidates = [2, 3, 6, 7], target = 7\n- **Output:** [[2, 2, 3], [7]]\n- **Explanation:** 2 + 2 + 3 = 7 and 7 = 7 are the combinations that sum to 7.\n\n### Example 2\n- **Input:** candidates = [2, 3, 5], target = 8\n- **Output:** [[2, 2, 2, 2], [2, 3, 3], [3, 5]]\n- **Explanation:** 2 + 2 + 2 + 2 = 8, 2 + 3 + 3 = 8, and 3 + 5 = 8 are the combinations that sum to 8.\n\n### Constraints\n- 1 <= candidates.length <= 30\n- 1 <= candidates[i] <= 200\n- All elements of candidates are distinct.\n- 1 <= target <= 500",
        "requirements": [
            "Return all unique combinations that sum to target.",
            "Each number can be used unlimited times.",
            "Aim for a backtracking approach."
        ],
        "hints": [
            "Consider using a recursive function to explore all possible combinations.",
            "Sort the candidates to help with pruning unnecessary branches.",
            "Use backtracking to explore and backtrack when the sum exceeds the target."
        ],
        "tags": [
            "backtracking",
            "combinations"
        ],
        "sortOrder": 1045
    },
    {
        "slug": "generate-permutations",
        "title": "Permutations",
        "category": "backtracking",
        "difficulty": "MEDIUM",
        "description": "Given a list of distinct integers, your task is to generate all possible permutations of the list. Each permutation should be a unique arrangement of the integers, and you should return all permutations in any order.\n\n### Example 1\n- **Input:** nums = [1, 2, 3]\n- **Output:** [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]\n- **Explanation:** All possible arrangements of [1, 2, 3] are listed.\n\n### Example 2\n- **Input:** nums = [0, 1]\n- **Output:** [[0, 1], [1, 0]]\n- **Explanation:** The two possible arrangements of [0, 1] are listed.\n\n### Constraints\n- 1 <= nums.length <= 6\n- -10 <= nums[i] <= 10\n- All integers in nums are distinct.",
        "requirements": [
            "Generate all unique permutations.",
            "Return permutations in any order.",
            "Aim for O(n!) time."
        ],
        "hints": [
            "Consider using a backtracking approach to explore all possibilities.",
            "Swap elements to generate permutations in place.",
            "Think about how to revert changes after exploring each possibility."
        ],
        "tags": [
            "backtracking",
            "permutations"
        ],
        "sortOrder": 1046
    },
    {
        "slug": "word-search",
        "title": "Word Search",
        "category": "backtracking",
        "difficulty": "MEDIUM",
        "description": "You are given a 2D grid of characters and a word. Your task is to determine if the word can be constructed from letters of sequentially adjacent cells, where 'adjacent' cells are those horizontally or vertically neighboring. The same letter cell may not be used more than once.\n\n### Example 1\n- **Input:** board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = 'ABCCED'\n- **Output:** true\n- **Explanation:** The word 'ABCCED' can be found following the path: (0,0) -> (0,1) -> (0,2) -> (1,2) -> (2,2) -> (2,1).\n\n### Example 2\n- **Input:** board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = 'SEE'\n- **Output:** true\n- **Explanation:** The word 'SEE' can be found following the path: (2,1) -> (2,2) -> (1,2).\n\n### Example 3\n- **Input:** board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = 'ABCB'\n- **Output:** false\n- **Explanation:** The word 'ABCB' cannot be formed as the letter 'B' at (0,1) cannot be reused.\n\n### Constraints\n- The grid dimensions are m x n, where 1 <= m, n <= 200.\n- The word length is between 1 and 10^4.\n- The grid and word contain only uppercase English letters.",
        "requirements": [
            "Check if the word can be formed from the grid.",
            "Use each cell at most once per word.",
            "Aim for O(m * n * 4^L) time, where L is the word length."
        ],
        "hints": [
            "Try using backtracking to explore each possible path.",
            "Mark cells as visited to avoid reusing them.",
            "Consider reverting the state after exploring a path."
        ],
        "tags": [
            "backtracking",
            "matrix",
            "depth-first-search"
        ],
        "sortOrder": 1047
    },
    {
        "slug": "n-queens",
        "title": "N-Queens",
        "category": "backtracking",
        "difficulty": "HARD",
        "description": "The N-Queens problem involves placing N queens on an N x N chessboard so that no two queens threaten each other. This means no two queens can be in the same row, column, or diagonal. Your task is to find all distinct solutions to the N-Queens problem and return them as a list of board configurations. Each configuration should be represented as a list of strings, where 'Q' denotes a queen and '.' denotes an empty space.\n\n### Example 1\n- **Input:** N = 4\n- **Output:** [[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]\n- **Explanation:** There are two distinct solutions for a 4x4 board.\n\n### Example 2\n- **Input:** N = 1\n- **Output:** [[\"Q\"]]\n- **Explanation:** There is only one way to place a queen on a 1x1 board.\n\n### Constraints\n- 1 <= N <= 9\n- The solution set should contain all possible distinct configurations.\n- Aim for an efficient backtracking solution.",
        "requirements": [
            "Place N queens on an N x N board.",
            "Ensure no two queens threaten each other.",
            "Aim for an efficient backtracking solution."
        ],
        "hints": [
            "Consider using backtracking to explore possible board configurations.",
            "Use a recursive function to place queens row by row.",
            "Track columns and diagonals to quickly check for threats."
        ],
        "tags": [
            "backtracking",
            "recursion",
            "combinatorial-search"
        ],
        "sortOrder": 1048
    },
    {
        "slug": "number-of-islands",
        "title": "Number of Islands",
        "category": "graphs",
        "difficulty": "MEDIUM",
        "description": "Given a 2D grid of '1's (land) and '0's (water), your task is to determine the number of distinct islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.\n\n### Example 1\n- **Input:** grid = [['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]\n- **Output:** 3\n- **Explanation:** There are three distinct islands.\n\n### Example 2\n- **Input:** grid = [['1', '0', '1', '0'], ['0', '1', '0', '1'], ['1', '0', '1', '0']]\n- **Output:** 5\n- **Explanation:** There are five distinct islands.\n\n### Constraints\n- The grid is a rectangle with dimensions m x n.\n- 1 <= m, n <= 300.",
        "requirements": [
            "Parse the grid to identify islands.",
            "Use a traversal method to explore connected lands.",
            "Aim for O(m * n) time."
        ],
        "hints": [
            "Consider using depth-first search (DFS) or breadth-first search (BFS) to explore each island.",
            "Mark visited land cells to avoid counting the same island multiple times.",
            "Iterate through each cell in the grid, starting a new search whenever you find unvisited land."
        ],
        "tags": [
            "graphs",
            "depth-first-search",
            "breadth-first-search"
        ],
        "sortOrder": 1049
    },
    {
        "slug": "clone-graph",
        "title": "Clone Graph",
        "category": "graphs",
        "difficulty": "MEDIUM",
        "description": "You are given a reference to a node in a connected undirected graph where each node contains an integer value and a list of its neighbors. Your task is to create a deep copy of the graph. Each node in the graph should be copied such that the new graph is a separate instance with the same structure and values as the original.\n\n### Example 1\n- **Input:** Node 1 with neighbors [2, 4], Node 2 with neighbors [1, 3], Node 3 with neighbors [2, 4], Node 4 with neighbors [1, 3]\n- **Output:** A deep copy of the graph\n- **Explanation:** The graph is a square with nodes 1, 2, 3, and 4 connected in a cycle.\n\n### Example 2\n- **Input:** Node 1 with neighbors [2], Node 2 with neighbors [1]\n- **Output:** A deep copy of the graph\n- **Explanation:** The graph is a simple two-node graph with a single edge between them.\n\n### Constraints\n- The number of nodes in the graph is in the range [0, 100].\n- Node values are unique integers.\n- The graph is connected and undirected.",
        "requirements": [
            "Create a deep copy of the graph.",
            "Ensure no shared references between original and copied nodes.",
            "Aim for O(n) time, where n is the number of nodes."
        ],
        "hints": [
            "Consider using a hash map to track visited nodes.",
            "Use a queue or stack to traverse the graph.",
            "Ensure each node is only copied once."
        ],
        "tags": [
            "graphs",
            "breadth-first-search",
            "depth-first-search"
        ],
        "sortOrder": 1050
    },
    {
        "slug": "course-schedule",
        "title": "Course Schedule",
        "category": "graphs",
        "difficulty": "MEDIUM",
        "description": "You are given a list of courses you need to take, labeled from 0 to n-1. Some courses have prerequisites, meaning you must complete one course before taking another. These prerequisites are given as a list of pairs, where each pair `[a, b]` indicates that course `b` must be completed before course `a`. Determine if it is possible to finish all courses.\n\n### Example 1\n- **Input:** `numCourses = 2`, `prerequisites = [[1, 0]]`\n- **Output:** `true`\n- **Explanation:** You can take course 0 first, then course 1.\n\n### Example 2\n- **Input:** `numCourses = 2`, `prerequisites = [[1, 0], [0, 1]]`\n- **Output:** `false`\n- **Explanation:** There is a cycle: course 1 depends on course 0, and course 0 depends on course 1.\n\n### Constraints\n- `1 <= numCourses <= 10^4`\n- `0 <= prerequisites.length <= 10^4`\n- `prerequisites[i].length == 2`\n- `0 <= a, b < numCourses`",
        "requirements": [
            "Implement a function to check course completion.",
            "Handle cycles in the course prerequisites.",
            "Aim for O(numCourses + prerequisites.length) time."
        ],
        "hints": [
            "Consider representing the courses and prerequisites as a graph.",
            "Think about how you can detect cycles in this graph.",
            "Topological sorting might be useful to determine the order of courses."
        ],
        "tags": [
            "graphs",
            "topological-sort",
            "cycle-detection"
        ],
        "sortOrder": 1051
    },
    {
        "slug": "rotting-oranges",
        "title": "Rotting Oranges",
        "category": "graphs",
        "difficulty": "MEDIUM",
        "description": "You are given a grid of integers where each cell can have one of three values: 0 representing an empty cell, 1 representing a fresh orange, and 2 representing a rotten orange. Every minute, any fresh orange that is adjacent (4-directionally) to a rotten orange becomes rotten.\n\nYour task is to determine the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.\n\n### Example 1\n- **Input:** grid = [[2,1,1],[1,1,0],[0,1,1]]\n- **Output:** 4\n- **Explanation:** The process is as follows:\n  - Minute 1: [[2,2,1],[2,1,0],[0,1,1]]\n  - Minute 2: [[2,2,2],[2,2,0],[0,1,1]]\n  - Minute 3: [[2,2,2],[2,2,0],[0,2,1]]\n  - Minute 4: [[2,2,2],[2,2,0],[0,2,2]]\n\n### Example 2\n- **Input:** grid = [[2,1,1],[0,1,1],[1,0,1]]\n- **Output:** -1\n- **Explanation:** The fresh orange in the bottom left corner cannot be reached, so it will never rot.\n\n### Constraints\n- The grid dimensions are m x n where 1 <= m, n <= 10^4.\n- The grid contains only the values 0, 1, or 2.\n- There is at least one cell in the grid.",
        "requirements": [
            "Implement a function to simulate the rotting process.",
            "Return the minimum time or -1 if not all oranges can rot.",
            "Aim for O(m * n) time."
        ],
        "hints": [
            "Use a queue to track the position of all initially rotten oranges.",
            "Perform a breadth-first search (BFS) to simulate the spread of rot.",
            "Track the time taken and check if any fresh oranges remain."
        ],
        "tags": [
            "graphs",
            "breadth-first-search",
            "matrix"
        ],
        "sortOrder": 1052
    },
    {
        "slug": "pacific-atlantic-water-flow",
        "title": "Pacific Atlantic Water Flow",
        "category": "graphs",
        "difficulty": "MEDIUM",
        "description": "You are given an `m x n` grid representing a map of heights where each cell contains an integer height. Water can flow from a cell to its neighboring cells (up, down, left, or right) if the neighboring cell's height is less than or equal to the current cell's height. Determine the list of grid coordinates where water can flow to both the Pacific and Atlantic oceans. The Pacific Ocean touches the left and top edges of the grid, and the Atlantic Ocean touches the right and bottom edges.\n\n### Example 1\n- **Input:** heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]\n- **Output:** [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]\n- **Explanation:** Water can flow from these coordinates to both oceans.\n\n### Example 2\n- **Input:** heights = [[2,1],[1,2]]\n- **Output:** [[0,0],[0,1],[1,0],[1,1]]\n- **Explanation:** All cells can flow to both oceans.\n\n### Constraints\n- `m == heights.length`\n- `n == heights[i].length`\n- `1 <= m, n <= 200`\n- `0 <= heights[i][j] <= 10^5`",
        "requirements": [
            "Identify cells where water can flow to both oceans.",
            "Return coordinates in any order.",
            "Aim for O(m * n) time."
        ],
        "hints": [
            "Consider using depth-first search (DFS) or breadth-first search (BFS) from the ocean boundaries.",
            "Track cells that can reach each ocean separately and find their intersection.",
            "Start from the ocean edges and work inwards, marking reachable cells."
        ],
        "tags": [
            "graphs",
            "depth-first-search",
            "breadth-first-search"
        ],
        "sortOrder": 1053
    },
    {
        "slug": "climbing-stairs",
        "title": "Climbing Stairs",
        "category": "dynamic-programming",
        "difficulty": "EASY",
        "description": "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\n### Example 1\n- **Input:** n = 2\n- **Output:** 2\n- **Explanation:** There are two ways to climb to the top: 1 step + 1 step, or 2 steps.\n\n### Example 2\n- **Input:** n = 3\n- **Output:** 3\n- **Explanation:** There are three ways to climb to the top: 1 step + 1 step + 1 step, 1 step + 2 steps, or 2 steps + 1 step.\n\n### Constraints\n- 1 <= n <= 45",
        "requirements": [
            "Implement a function to calculate the number of ways.",
            "Use dynamic programming to optimize.",
            "Aim for O(n) time and O(1) space."
        ],
        "hints": [
            "Think about how the number of ways to reach step n relates to the number of ways to reach steps n-1 and n-2.",
            "Use a bottom-up approach to build the solution from the base cases.",
            "Consider using two variables to keep track of the last two results instead of an array."
        ],
        "tags": [
            "dynamic-programming",
            "combinatorics"
        ],
        "sortOrder": 1054
    },
    {
        "slug": "house-robber",
        "title": "House Robber",
        "category": "dynamic-programming",
        "difficulty": "MEDIUM",
        "description": "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, and you cannot rob two adjacent houses because the police will be alerted. Your task is to determine the maximum amount of money you can rob without alerting the police.\n\n### Example 1\n- **Input:** nums = [1, 2, 3, 1]\n- **Output:** 4\n- **Explanation:** Rob house 1 (money = 1) and then house 3 (money = 3). Total amount = 1 + 3 = 4.\n\n### Example 2\n- **Input:** nums = [2, 7, 9, 3, 1]\n- **Output:** 12\n- **Explanation:** Rob house 1 (money = 2), house 3 (money = 9), and house 5 (money = 1). Total amount = 2 + 9 + 1 = 12.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- 0 <= nums[i] <= 10^4",
        "requirements": [
            "Function receives a list of integers.",
            "Return the maximum money that can be robbed.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider the decision at each house: rob it or skip it.",
            "Use dynamic programming to store the maximum money up to each house.",
            "Think about how the decision at each house affects the next house."
        ],
        "tags": [
            "dynamic-programming",
            "greedy",
            "array"
        ],
        "sortOrder": 1055
    },
    {
        "slug": "coin-change",
        "title": "Coin Change",
        "category": "dynamic-programming",
        "difficulty": "MEDIUM",
        "description": "You are given an integer array `coins` representing different denominations of coins and an integer `amount` representing a total amount of money. Your task is to determine the fewest number of coins needed to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\n### Example 1\n- **Input:** `coins = [1, 2, 5]`, `amount = 11`\n- **Output:** `3`\n- **Explanation:** 11 can be made with three coins: 5 + 5 + 1.\n\n### Example 2\n- **Input:** `coins = [2]`, `amount = 3`\n- **Output:** `-1`\n- **Explanation:** It is not possible to make 3 with only coins of denomination 2.\n\n### Constraints\n- `1 <= coins.length <= 12`\n- `1 <= coins[i] <= 10^4`\n- `0 <= amount <= 10^4`",
        "requirements": [
            "Return the minimum number of coins needed.",
            "Return -1 if the amount cannot be formed.",
            "Aim for O(n * amount) time."
        ],
        "hints": [
            "Consider using dynamic programming to build up a solution.",
            "Think about how you can use a table to store the minimum coins needed for each amount up to the target.",
            "Iterate over each coin and update the table for all amounts that can be formed with that coin."
        ],
        "tags": [
            "dynamic-programming",
            "greedy",
            "array"
        ],
        "sortOrder": 1056
    },
    {
        "slug": "longest-increasing-subsequence",
        "title": "Longest Increasing Subsequence",
        "category": "dynamic-programming",
        "difficulty": "MEDIUM",
        "description": "Given an array of integers, your task is to find the length of the longest subsequence that is strictly increasing. A subsequence is derived from another sequence by deleting some or no elements without changing the order of the remaining elements.\n\n### Example 1\n- **Input:** nums = [10, 9, 2, 5, 3, 7, 101, 18]\n- **Output:** 4\n- **Explanation:** The longest increasing subsequence is [2, 3, 7, 101], which has length 4.\n\n### Example 2\n- **Input:** nums = [0, 1, 0, 3, 2, 3]\n- **Output:** 4\n- **Explanation:** The longest increasing subsequence is [0, 1, 2, 3], which has length 4.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- -10^4 <= nums[i] <= 10^4",
        "requirements": [
            "Implement a function to find the LIS length.",
            "Use dynamic programming or binary search.",
            "Aim for O(n log n) time."
        ],
        "hints": [
            "Consider using a dynamic programming approach with an array to store the LIS length at each index.",
            "Think about how you can optimize the solution using binary search.",
            "Remember that the subsequence does not need to be contiguous."
        ],
        "tags": [
            "dynamic-programming",
            "binary-search"
        ],
        "sortOrder": 1057
    },
    {
        "slug": "longest-common-subsequence",
        "title": "Longest Common Subsequence",
        "category": "dynamic-programming",
        "difficulty": "MEDIUM",
        "description": "Given two strings, find the length of their longest common subsequence. A subsequence is a sequence derived from another sequence where some elements may be deleted without changing the order of the remaining elements.\n\n### Example 1\n- **Input:** `text1 = \"abcde\"`, `text2 = \"ace\"`\n- **Output:** `3`\n- **Explanation:** The longest common subsequence is \"ace\" with length 3.\n\n### Example 2\n- **Input:** `text1 = \"abc\"`, `text2 = \"abc\"`\n- **Output:** `3`\n- **Explanation:** The longest common subsequence is \"abc\" with length 3.\n\n### Constraints\n- The length of `text1` and `text2` will be between 1 and 10,000.\n- Both `text1` and `text2` consist of only lowercase English letters.",
        "requirements": [
            "Implement a function to find the longest common subsequence.",
            "Handle strings up to length 10,000.",
            "Aim for O(n * m) time complexity."
        ],
        "hints": [
            "Consider using a 2D table to store lengths of common subsequences.",
            "Think about how you can build the solution from smaller subproblems.",
            "Try to optimize space if you are using a 2D table."
        ],
        "tags": [
            "dynamic-programming",
            "strings"
        ],
        "sortOrder": 1058
    },
    {
        "slug": "maximum-subarray",
        "title": "Maximum Subarray",
        "category": "greedy",
        "difficulty": "MEDIUM",
        "description": "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\n### Example 1\n- **Input:** nums = [-2,1,-3,4,-1,2,1,-5,4]\n- **Output:** 6\n- **Explanation:** The subarray [4,-1,2,1] has the largest sum = 6.\n\n### Example 2\n- **Input:** nums = [1]\n- **Output:** 1\n- **Explanation:** The subarray [1] has the largest sum = 1.\n\n### Constraints\n- 1 <= nums.length <= 10^4\n- -10^4 <= nums[i] <= 10^4",
        "requirements": [
            "Implement a function to find the maximum subarray sum.",
            "Handle both positive and negative numbers.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider how adding a new element affects the current subarray sum.",
            "Think about when you should start a new subarray.",
            "Keep track of the maximum sum encountered so far."
        ],
        "tags": [
            "array",
            "dynamic-programming",
            "greedy"
        ],
        "sortOrder": 1059
    },
    {
        "slug": "jump-game",
        "title": "Jump Game",
        "category": "greedy",
        "difficulty": "MEDIUM",
        "description": "You are given an array of non-negative integers where each element represents the maximum number of steps you can jump forward from that position. Your task is to determine if you can reach the last index starting from the first index.\n\n### Example 1\n- **Input:** [2, 3, 1, 1, 4]\n- **Output:** true\n- **Explanation:** Jump 1 step from index 0 to 1, then 3 steps to the last index.\n\n### Example 2\n- **Input:** [3, 2, 1, 0, 4]\n- **Output:** false\n- **Explanation:** You will always end up at index 3 and cannot move further.\n\n### Constraints\n- The length of the array is between 1 and 10^4.\n- Each element in the array is a non-negative integer and does not exceed 10^5.",
        "requirements": [
            "Return true if the last index is reachable.",
            "Return false otherwise.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Think about the farthest index you can reach at each step.",
            "If you reach an index where you can't move further, check if it's the last index.",
            "Keep track of the maximum index you can reach as you iterate through the array."
        ],
        "tags": [
            "array",
            "greedy"
        ],
        "sortOrder": 1060
    },
    {
        "slug": "circular-gas-station-route",
        "title": "Gas Station",
        "category": "greedy",
        "difficulty": "MEDIUM",
        "description": "You are given a circular route with `n` gas stations. Each station `i` has a certain amount of gas and a cost to travel to the next station. Your task is to determine if you can start at one of the gas stations and complete the entire circuit once, returning to the starting station without running out of gas. If it's possible, return the index of the starting station. If not, return -1.\n\n### Example 1\n- **Input:** gas = [1,2,3,4], cost = [2,3,4,3]\n- **Output:** -1\n- **Explanation:** You cannot start at any station and complete the circuit.\n\n### Example 2\n- **Input:** gas = [2,3,4], cost = [3,4,3]\n- **Output:** 2\n- **Explanation:** Starting at station 2, you can travel to station 0, then to station 1, and finally back to station 2.\n\n### Constraints\n- `1 <= n <= 10^4`\n- `0 <= gas[i], cost[i] <= 10^4`\n- There is exactly one solution if a solution exists.",
        "requirements": [
            "Return the starting index or -1 if not possible.",
            "Handle circular routes correctly.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Calculate the net gas after each station.",
            "Track the total gas and the current gas balance.",
            "If the current gas balance drops below zero, reset the start point."
        ],
        "tags": [
            "greedy",
            "arrays"
        ],
        "sortOrder": 1061
    },
    {
        "slug": "partition-labels",
        "title": "Partition Labels",
        "category": "greedy",
        "difficulty": "MEDIUM",
        "description": "You are given a string `s` consisting of lowercase English letters. Your task is to partition the string into as many parts as possible so that each letter appears in at most one part. Return a list of integers representing the size of these parts.\n\n### Example 1\n- **Input:** `s = \"ababcbacadefegdehijhklij\"`\n- **Output:** `[9, 7, 8]`\n- **Explanation:** The partitions are \"ababcbaca\", \"defegde\", \"hijhklij\". Each letter appears in at most one part.\n\n### Example 2\n- **Input:** `s = \"eccbbbbdec\"`\n- **Output:** `[10]`\n- **Explanation:** The entire string is one partition since each letter appears in at most one part.\n\n### Constraints\n- `1 <= s.length <= 10^4`\n- `s` consists of lowercase English letters only.",
        "requirements": [
            "Return list of partition sizes.",
            "Each letter appears in at most one part.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Track the last occurrence of each character.",
            "Use two pointers to determine the partitions.",
            "Iterate through the string to form partitions."
        ],
        "tags": [
            "greedy",
            "string"
        ],
        "sortOrder": 1062
    },
    {
        "slug": "insert-interval",
        "title": "Insert Interval",
        "category": "intervals",
        "difficulty": "MEDIUM",
        "description": "You are given a list of non-overlapping intervals sorted by their start times, and a new interval to insert into this list. The goal is to insert the new interval into the list while maintaining the sorted order and ensuring that the intervals remain non-overlapping by merging any necessary intervals.\n\n### Example 1\n- **Input:** intervals = [[1,3],[6,9]], newInterval = [2,5]\n- **Output:** [[1,5],[6,9]]\n- **Explanation:** The new interval [2,5] overlaps with [1,3], so they are merged into [1,5].\n\n### Example 2\n- **Input:** intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]\n- **Output:** [[1,2],[3,10],[12,16]]\n- **Explanation:** The new interval [4,8] overlaps with [3,5],[6,7],[8,10], so they are merged into [3,10].\n\n### Constraints\n- The number of intervals is between 0 and 10,000.\n- Each interval is a pair of integers [start, end] with start <= end.\n- The new interval is also a pair of integers [start, end] with start <= end.",
        "requirements": [
            "Handle intervals in sorted order.",
            "Merge overlapping intervals.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider the position of the new interval relative to the existing ones.",
            "Merge intervals when they overlap with the new interval.",
            "Iterate through the list and build the result incrementally."
        ],
        "tags": [
            "intervals",
            "sorting",
            "merging"
        ],
        "sortOrder": 1063
    },
    {
        "slug": "merge-intervals",
        "title": "Merge Intervals",
        "category": "intervals",
        "difficulty": "MEDIUM",
        "description": "You are given a list of intervals, where each interval is represented as a pair of integers `[start, end]`. Your task is to merge all overlapping intervals and return the resulting list of intervals. The intervals should be returned in ascending order based on their starting values.\n\n### Example 1\n- **Input:** `[[1, 3], [2, 6], [8, 10], [15, 18]]`\n- **Output:** `[[1, 6], [8, 10], [15, 18]]`\n- **Explanation:** The intervals `[1, 3]` and `[2, 6]` overlap and are merged into `[1, 6]`.\n\n### Example 2\n- **Input:** `[[1, 4], [4, 5]]`\n- **Output:** `[[1, 5]]`\n- **Explanation:** The intervals `[1, 4]` and `[4, 5]` overlap and are merged into `[1, 5]`.\n\n### Constraints\n- The number of intervals is between 1 and 10,000.\n- Each interval's start and end are integers between -10,000 and 10,000.\n- The input list is not necessarily sorted.",
        "requirements": [
            "Merge overlapping intervals.",
            "Return intervals in ascending order.",
            "Aim for O(n log n) time."
        ],
        "hints": [
            "Sort the intervals by their start values.",
            "Iterate through the sorted intervals and merge them if they overlap.",
            "Use a list to store the merged intervals."
        ],
        "tags": [
            "intervals",
            "sorting",
            "greedy"
        ],
        "sortOrder": 1064
    },
    {
        "slug": "non-overlapping-intervals",
        "title": "Non-overlapping Intervals",
        "category": "intervals",
        "difficulty": "MEDIUM",
        "description": "You are given a collection of intervals, where each interval is a pair of integers representing the start and end times. Your task is to find the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.\n\n### Example 1\n- **Input:** intervals = [[1,2],[2,3],[3,4],[1,3]]\n- **Output:** 1\n- **Explanation:** By removing the interval [1,3], the remaining intervals [1,2], [2,3], and [3,4] are non-overlapping.\n\n### Example 2\n- **Input:** intervals = [[1,2],[1,2],[1,2]]\n- **Output:** 2\n- **Explanation:** You need to remove two intervals to make the rest non-overlapping, leaving only one interval [1,2].\n\n### Constraints\n- 1 <= intervals.length <= 10^4\n- intervals[i].length == 2\n- -5 * 10^4 <= intervals[i][0] < intervals[i][1] <= 5 * 10^4",
        "requirements": [
            "Handle overlapping intervals correctly.",
            "Return the minimum number of intervals to remove.",
            "Aim for O(n log n) time."
        ],
        "hints": [
            "Consider sorting the intervals by their end times.",
            "Try to keep as many intervals as possible by always choosing the next interval that starts after the last chosen interval ends.",
            "Think about a greedy approach where you iteratively select intervals."
        ],
        "tags": [
            "greedy",
            "intervals"
        ],
        "sortOrder": 1065
    },
    {
        "slug": "meeting-rooms-ii",
        "title": "Meeting Rooms II",
        "category": "intervals",
        "difficulty": "MEDIUM",
        "description": "You are given an array of meeting time intervals, where each interval is represented as a pair of integers `[start, end]`. Your task is to determine the minimum number of conference rooms required to hold all the meetings without any overlap.\n\n### Example 1\n- **Input:** `intervals = [[0, 30], [5, 10], [15, 20]]`\n- **Output:** `2`\n- **Explanation:** Two meetings overlap between times 5 and 10, so at least two rooms are needed.\n\n### Example 2\n- **Input:** `intervals = [[7, 10], [2, 4]]`\n- **Output:** `1`\n- **Explanation:** No meetings overlap, so only one room is needed.\n\n### Constraints\n- `1 <= intervals.length <= 10^4`\n- `0 <= start < end <= 10^6`",
        "requirements": [
            "Parse the intervals correctly.",
            "Determine overlaps accurately.",
            "Aim for O(n log n) time."
        ],
        "hints": [
            "Consider sorting the intervals by start time.",
            "Use a min-heap to track end times of ongoing meetings.",
            "Compare the earliest end time with the next start time."
        ],
        "tags": [
            "intervals",
            "greedy",
            "heap"
        ],
        "sortOrder": 1066
    },
    {
        "slug": "rotate-image",
        "title": "Rotate Image",
        "category": "math-and-geometry",
        "difficulty": "MEDIUM",
        "description": "You are given an n x n 2D matrix representing an image. Rotate the image by 90 degrees (clockwise). You must rotate the image in-place, which means you have to modify the input matrix directly without using another matrix.\n\n### Example 1\n- **Input:** matrix = [[1,2,3],[4,5,6],[7,8,9]]\n- **Output:** [[7,4,1],[8,5,2],[9,6,3]]\n- **Explanation:** The matrix is rotated 90 degrees clockwise.\n\n### Example 2\n- **Input:** matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]\n- **Output:** [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]\n- **Explanation:** The matrix is rotated 90 degrees clockwise.\n\n### Constraints\n- n == matrix.length == matrix[i].length\n- 1 <= n <= 20\n- -1000 <= matrix[i][j] <= 1000",
        "requirements": [
            "Modify the matrix in-place.",
            "Rotate the matrix 90 degrees clockwise.",
            "Aim for O(n^2) time."
        ],
        "hints": [
            "Think about how the indices change when rotating a matrix.",
            "Consider transposing the matrix first, then reversing each row.",
            "Ensure you are not using extra space beyond a few variables."
        ],
        "tags": [
            "matrix",
            "in-place"
        ],
        "sortOrder": 1067
    },
    {
        "slug": "spiral-matrix",
        "title": "Spiral Matrix",
        "category": "math-and-geometry",
        "difficulty": "MEDIUM",
        "description": "Given an m x n matrix, return all elements of the matrix in spiral order starting from the top-left corner.\n\n### Example 1\n- **Input:** matrix = [[1,2,3],[4,5,6],[7,8,9]]\n- **Output:** [1,2,3,6,9,8,7,4,5]\n- **Explanation:** The matrix is traversed in a spiral order starting from the top-left corner.\n\n### Example 2\n- **Input:** matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]\n- **Output:** [1,2,3,4,8,12,11,10,9,5,6,7]\n- **Explanation:** The matrix is traversed in a spiral order starting from the top-left corner.\n\n### Constraints\n- m, n <= 100\n- -100 <= matrix[i][j] <= 100\n- The matrix contains at least one element.",
        "requirements": [
            "Traverse the matrix in spiral order.",
            "Return the elements as a list.",
            "Aim for O(m * n) time."
        ],
        "hints": [
            "Consider the boundaries of the matrix and how they change as you traverse.",
            "Keep track of the current direction and update it when you hit a boundary.",
            "Use a loop to iterate until all elements are visited."
        ],
        "tags": [
            "matrix",
            "traversal"
        ],
        "sortOrder": 1068
    },
    {
        "slug": "set-matrix-zeroes",
        "title": "Set Matrix Zeroes",
        "category": "math-and-geometry",
        "difficulty": "MEDIUM",
        "description": "You are given an m x n integer matrix. Your task is to modify the matrix such that if an element is 0, its entire row and column are set to 0. Do this in-place without using extra space for another matrix.\n\n### Example 1\n- **Input:** matrix = [[1,1,1],[1,0,1],[1,1,1]]\n- **Output:** [[1,0,1],[0,0,0],[1,0,1]]\n- **Explanation:** The element at position (1,1) is 0, so its row and column are set to 0.\n\n### Example 2\n- **Input:** matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]\n- **Output:** [[0,0,0,0],[0,4,5,0],[0,3,1,0]]\n- **Explanation:** The elements at positions (0,0) and (0,3) are 0, so their rows and columns are set to 0.\n\n### Constraints\n- 1 <= m, n <= 100\n- -10^9 <= matrix[i][j] <= 10^9",
        "requirements": [
            "Modify the matrix in-place.",
            "Use constant extra space.",
            "Aim for O(m * n) time."
        ],
        "hints": [
            "Consider using the first row and column as markers.",
            "First pass: mark the rows and columns that need to be zeroed.",
            "Second pass: zero out the marked rows and columns."
        ],
        "tags": [
            "matrix",
            "in-place"
        ],
        "sortOrder": 1069
    },
    {
        "slug": "count-primes",
        "title": "Count Primes",
        "category": "math-and-geometry",
        "difficulty": "MEDIUM",
        "description": "Given an integer `n`, return the number of prime numbers that are strictly less than `n`. A prime number is a natural number greater than 1 that is not a product of two smaller natural numbers.\n\n### Example 1\n- **Input:** n = 10\n- **Output:** 4\n- **Explanation:** The prime numbers less than 10 are 2, 3, 5, and 7.\n\n### Example 2\n- **Input:** n = 0\n- **Output:** 0\n- **Explanation:** There are no prime numbers less than 0.\n\n### Example 3\n- **Input:** n = 1\n- **Output:** 0\n- **Explanation:** There are no prime numbers less than 1.\n\n### Constraints\n- 0 <= n <= 5 * 10^6",
        "requirements": [
            "Identify prime numbers less than n.",
            "Count the total number of primes found.",
            "Aim for O(n log log n) time."
        ],
        "hints": [
            "Consider using a sieve method to efficiently find primes.",
            "The Sieve of Eratosthenes is a classic algorithm for this task.",
            "Mark non-prime numbers in a boolean array."
        ],
        "tags": [
            "math-and-geometry",
            "sieve-of-eratosthenes"
        ],
        "sortOrder": 1070
    },
    {
        "slug": "single-number",
        "title": "Single Number",
        "category": "bit-manipulation",
        "difficulty": "EASY",
        "description": "Given a non-empty array of integers, every element appears twice except for one. Find that single one.\n\n### Example 1\n- **Input:** [2, 2, 1]\n- **Output:** 1\n- **Explanation:** The number 1 appears only once.\n\n### Example 2\n- **Input:** [4, 1, 2, 1, 2]\n- **Output:** 4\n- **Explanation:** The number 4 appears only once.\n\n### Constraints\n- The array will have at least 1 and at most 10,000 elements.\n- Each element in the array will be an integer.\n- Exactly one element appears only once, and all others appear exactly twice.",
        "requirements": [
            "Identify the unique element.",
            "Use constant extra space.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider using a bitwise operation to cancel out pairs.",
            "XOR operation has properties that might be useful here.",
            "Remember that x XOR x = 0 and x XOR 0 = x."
        ],
        "tags": [
            "bit-manipulation",
            "array"
        ],
        "sortOrder": 1071
    },
    {
        "slug": "count-1-bits",
        "title": "Number of 1 Bits",
        "category": "bit-manipulation",
        "difficulty": "EASY",
        "description": "Given a non-negative integer, determine the number of '1' bits it has in its binary representation.\n\n### Example 1\n- **Input:** 11\n- **Output:** 3\n- **Explanation:** The binary representation of 11 is `1011`, which has three '1' bits.\n\n### Example 2\n- **Input:** 128\n- **Output:** 1\n- **Explanation:** The binary representation of 128 is `10000000`, which has one '1' bit.\n\n### Constraints\n- The input is a non-negative integer.\n- The integer is less than or equal to 2^31 - 1.\n- Aim for O(log n) time, where n is the input integer.",
        "requirements": [
            "Read a non-negative integer.",
            "Count the '1' bits in its binary representation.",
            "Aim for O(log n) time."
        ],
        "hints": [
            "Consider using bitwise operations to isolate bits.",
            "Shift the number right to process each bit.",
            "Use a counter to track the number of '1' bits."
        ],
        "tags": [
            "bit-manipulation",
            "binary-representation"
        ],
        "sortOrder": 1072
    },
    {
        "slug": "counting-bits",
        "title": "Counting Bits",
        "category": "bit-manipulation",
        "difficulty": "EASY",
        "description": "Given a non-negative integer `n`, return an array `ans` of length `n + 1` such that for each `i` (0 <= i <= n), `ans[i]` is the number of 1's in the binary representation of `i`.\n\n### Example 1\n- **Input:** n = 2\n- **Output:** [0, 1, 1]\n- **Explanation:**\n  - 0 in binary is 0, which has 0 ones.\n  - 1 in binary is 1, which has 1 one.\n  - 2 in binary is 10, which has 1 one.\n\n### Example 2\n- **Input:** n = 5\n- **Output:** [0, 1, 1, 2, 1, 2]\n- **Explanation:**\n  - 0 in binary is 0, which has 0 ones.\n  - 1 in binary is 1, which has 1 one.\n  - 2 in binary is 10, which has 1 one.\n  - 3 in binary is 11, which has 2 ones.\n  - 4 in binary is 100, which has 1 one.\n  - 5 in binary is 101, which has 2 ones.\n\n### Constraints\n- 0 <= n <= 10^4",
        "requirements": [
            "Implement a function that returns an array.",
            "Each element in the array represents the count of 1's in binary.",
            "Aim for O(n) time."
        ],
        "hints": [
            "Consider how the number of 1's changes from i to i+1.",
            "Use previously computed results to build the answer for larger numbers.",
            "Think about the relationship between a number and its half."
        ],
        "tags": [
            "bit-manipulation",
            "dynamic-programming"
        ],
        "sortOrder": 1073
    },
    {
        "slug": "reverse-bits",
        "title": "Reverse Bits",
        "category": "bit-manipulation",
        "difficulty": "EASY",
        "description": "Given a 32-bit unsigned integer, reverse its bits and return the resulting integer. \n\n### Example 1\n- **Input:** 43261596\n- **Output:** 964176192\n- **Explanation:** The binary representation of 43261596 is `00000010100101000001111010011100`, which becomes `00111001011110000010100101000000` when reversed, resulting in the integer 964176192.\n\n### Example 2\n- **Input:** 4294967293\n- **Output:** 3221225471\n- **Explanation:** The binary representation of 4294967293 is `11111111111111111111111111111101`, which becomes `10111111111111111111111111111111` when reversed, resulting in the integer 3221225471.\n\n### Constraints\n- The input is a 32-bit unsigned integer.\n- The output should also be a 32-bit unsigned integer.",
        "requirements": [
            "Reverse the bits of a 32-bit unsigned integer.",
            "Return the resulting integer after reversal.",
            "Aim for O(1) time complexity."
        ],
        "hints": [
            "Consider processing the bits one by one.",
            "Use bitwise operations to extract and set bits.",
            "Think about shifting bits to their new positions."
        ],
        "tags": [
            "bit-manipulation",
            "binary",
            "reversal"
        ],
        "sortOrder": 1074
    }
];
