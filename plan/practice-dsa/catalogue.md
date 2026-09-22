# Practice DSA - seeded catalogue

The 75 problems the seed inserts (PD-11), by category. Classic interview
problems, four to five per category, with the decision recorded in
`overview.md`. Niraj edits this list before the seed is written: remove,
swap or add, keep the count near 75.

Review ticks (`[x] YYYY-MM-DD`) are added per problem once its judge assets
are `ready` and its sample tests have been read against the description.

## arrays-and-hashing (5)
- [ ] Two Sum (EASY)
- [ ] Contains Duplicate (EASY)
- [ ] Valid Anagram (EASY)
- [ ] Group Anagrams (MEDIUM)
- [ ] Product of Array Except Self (MEDIUM)

## two-pointers (5)
- [ ] Valid Palindrome (EASY)
- [ ] Two Sum II - Input Array Is Sorted (MEDIUM)
- [ ] 3Sum (MEDIUM)
- [ ] Container With Most Water (MEDIUM)
- [ ] Trapping Rain Water (HARD)

## sliding-window (5)
- [ ] Best Time to Buy and Sell Stock (EASY)
- [ ] Longest Substring Without Repeating Characters (MEDIUM)
- [ ] Longest Repeating Character Replacement (MEDIUM)
- [ ] Permutation in String (MEDIUM)
- [ ] Minimum Window Substring (HARD)

## stack (5)
- [ ] Valid Parentheses (EASY)
- [ ] Min Stack (MEDIUM)
- [ ] Evaluate Reverse Polish Notation (MEDIUM)
- [ ] Daily Temperatures (MEDIUM)
- [ ] Largest Rectangle in Histogram (HARD)

## binary-search (5)
- [ ] Binary Search (EASY)
- [ ] Search a 2D Matrix (MEDIUM)
- [ ] Koko Eating Bananas (MEDIUM)
- [ ] Find Minimum in Rotated Sorted Array (MEDIUM)
- [ ] Search in Rotated Sorted Array (MEDIUM)

## linked-list (5)
- [ ] Reverse Linked List (EASY)
- [ ] Merge Two Sorted Lists (EASY)
- [ ] Linked List Cycle (EASY)
- [ ] Reorder List (MEDIUM)
- [ ] Remove Nth Node From End of List (MEDIUM)

## trees (5)
- [ ] Invert Binary Tree (EASY)
- [ ] Maximum Depth of Binary Tree (EASY)
- [ ] Diameter of Binary Tree (EASY)
- [ ] Binary Tree Level Order Traversal (MEDIUM)
- [ ] Validate Binary Search Tree (MEDIUM)

## tries (4)
- [ ] Implement Trie (Prefix Tree) (MEDIUM)
- [ ] Design Add and Search Words Data Structure (MEDIUM)
- [ ] Longest Common Prefix (EASY)
- [ ] Word Search II (HARD)

## heap-priority-queue (5)
- [ ] Kth Largest Element in a Stream (EASY)
- [ ] Last Stone Weight (EASY)
- [ ] K Closest Points to Origin (MEDIUM)
- [ ] Kth Largest Element in an Array (MEDIUM)
- [ ] Task Scheduler (MEDIUM)

## backtracking (5)
- [ ] Subsets (MEDIUM)
- [ ] Combination Sum (MEDIUM)
- [ ] Permutations (MEDIUM)
- [ ] Word Search (MEDIUM)
- [ ] N-Queens (HARD)

## graphs (5)
- [ ] Number of Islands (MEDIUM)
- [ ] Clone Graph (MEDIUM)
- [ ] Course Schedule (MEDIUM)
- [ ] Rotting Oranges (MEDIUM)
- [ ] Pacific Atlantic Water Flow (MEDIUM)

## dynamic-programming (5)
- [ ] Climbing Stairs (EASY)
- [ ] House Robber (MEDIUM)
- [ ] Coin Change (MEDIUM)
- [ ] Longest Increasing Subsequence (MEDIUM)
- [ ] Longest Common Subsequence (MEDIUM)

## greedy (4)
- [ ] Maximum Subarray (MEDIUM)
- [ ] Jump Game (MEDIUM)
- [ ] Gas Station (MEDIUM)
- [ ] Partition Labels (MEDIUM)

## intervals (4)
- [ ] Insert Interval (MEDIUM)
- [ ] Merge Intervals (MEDIUM)
- [ ] Non-overlapping Intervals (MEDIUM)
- [ ] Meeting Rooms II (MEDIUM)

## math-and-geometry (4)
- [ ] Rotate Image (MEDIUM)
- [ ] Spiral Matrix (MEDIUM)
- [ ] Set Matrix Zeroes (MEDIUM)
- [ ] Count Primes (MEDIUM)

## bit-manipulation (4)
- [ ] Single Number (EASY)
- [ ] Number of 1 Bits (EASY)
- [ ] Counting Bits (EASY)
- [ ] Reverse Bits (EASY)

Total: 75.

## Harness conventions the generator must follow for these

- **Arrays**: first line is the length, second line the elements space
  separated. Output arrays space separated on one line. Where the problem
  accepts any order, the harness sorts before printing.
- **Strings**: one per line, may contain spaces; read with `getline`.
- **Linked lists**: given as an array (length then elements); the harness
  builds the list and prints the result list back as space separated values,
  empty line for an empty list. Cycle problems pass the cycle position as an
  extra integer (-1 for none) and print `true` or `false`.
- **Binary trees**: level-order with `null` for missing children, as
  LeetCode prints them, one line: `3 9 20 null null 15 7`. The harness builds
  the tree and prints the result in the same format.
- **Matrices**: rows and columns on the first line, then one row per line.
- **Booleans**: `true` / `false`. **Design problems** (Min Stack, Trie, Kth
  Largest in a Stream): first line the number of operations, then one
  operation per line (`push 3`, `pop`, `top`, `insert apple`, `search app`);
  the harness prints one result per line, `null` for void operations.
