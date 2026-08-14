const fs = require("fs");
const path = require("path");

const baseBatch = [
  { title: "Pair Sum Count", slug: "pair-sum-count", difficulty: "Easy", tags: ["Array", "Hashing"], companies: ["Amazon", "Google"], sheet: ["Blind75"], description: "Given an array of integers nums and an integer target, return the number of distinct pairs (i, j) such that i < j and nums[i] + nums[j] == target.", examples: [{ input: "nums = [1,2,3,4], target = 5", output: "2", explanation: "Pairs are (1,4) and (2,3)." }, { input: "nums = [1,1,1], target = 2", output: "3" }], constraints: ["1 <= nums.length <= 2 * 10^5", "-10^9 <= nums[i], target <= 10^9"], testCases: [{ input: "[1,2,3,4]\\n5", expectedOutput: "2", isHidden: false, weight: 1 }, { input: "[1,1,1]\\n2", expectedOutput: "3", isHidden: true, weight: 1 }], hints: ["Use a frequency map."], starterCode: { cpp: "class Solution {\\npublic:\\n    int pairSumCount(vector<int>& nums, int target) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int pairSumCount(int[] nums, int target) {\\n        \\n    }\\n}", python: "class Solution:\\n    def pairSumCount(self, nums: List[int], target: int) -> int:\\n        ", javascript: "var pairSumCount = function(nums, target) {\\n    \\n};" } },
  { title: "Longest Balanced Prefix", slug: "longest-balanced-prefix", difficulty: "Easy", tags: ["String", "Stack"], companies: ["Microsoft", "Adobe"], sheet: ["Blind75"], description: "Given a string of only '(' and ')', return the length of the longest prefix that is a valid parentheses string.", examples: [{ input: 's = "(()())"', output: "6" }, { input: 's = "())(()"', output: "2" }], constraints: ["1 <= s.length <= 10^5"], testCases: [{ input: "(()())", expectedOutput: "6", isHidden: false, weight: 1 }, { input: "())(()", expectedOutput: "2", isHidden: true, weight: 1 }], hints: ["Track balance and stop if it becomes negative."], starterCode: { cpp: "class Solution {\\npublic:\\n    int longestBalancedPrefix(string s) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int longestBalancedPrefix(String s) {\\n        \\n    }\\n}", python: "class Solution:\\n    def longestBalancedPrefix(self, s: str) -> int:\\n        ", javascript: "var longestBalancedPrefix = function(s) {\\n    \\n};" } },
  { title: "Window Distinct Count", slug: "window-distinct-count", difficulty: "Easy", tags: ["Array", "Sliding Window"], companies: ["Amazon", "Uber"], sheet: ["Blind75"], description: "Given an array nums and a window size k, return an array of the number of distinct values in each contiguous subarray of length k.", examples: [{ input: "nums = [1,2,1,3,4,2,3], k = 4", output: "[3,4,4,3]" }], constraints: ["1 <= k <= nums.length <= 10^5"], testCases: [{ input: "[1,2,1,3,4,2,3]\\n4", expectedOutput: "[3,4,4,3]", isHidden: false, weight: 1 }], hints: ["Maintain counts for the sliding window."], starterCode: { cpp: "class Solution {\\npublic:\\n    vector<int> windowDistinctCount(vector<int>& nums, int k) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int[] windowDistinctCount(int[] nums, int k) {\\n        \\n    }\\n}", python: "class Solution:\\n    def windowDistinctCount(self, nums: List[int], k: int) -> List[int]:\\n        ", javascript: "var windowDistinctCount = function(nums, k) {\\n    \\n};" } },
  { title: "Minimum Adjacent Swap Distance", slug: "minimum-adjacent-swap-distance", difficulty: "Medium", tags: ["Array", "Fenwick Tree", "Sorting"], companies: ["Google", "Meta"], sheet: ["Blind75"], description: "Given two arrays containing the same multiset of values, return the minimum number of adjacent swaps needed to transform the first array into the second.", examples: [{ input: "a = [1,2,3], b = [1,3,2]", output: "1" }, { input: "a = [4,1,3,2], b = [1,2,3,4]", output: "4" }], constraints: ["1 <= nums.length <= 2000"], testCases: [{ input: "[1,2,3]\\n[1,3,2]", expectedOutput: "1", isHidden: false, weight: 1 }, { input: "[4,1,3,2]\\n[1,2,3,4]", expectedOutput: "4", isHidden: true, weight: 1 }], hints: ["Reduce to counting inversions."], starterCode: { cpp: "class Solution {\\npublic:\\n    long long minimumAdjacentSwapDistance(vector<int>& a, vector<int>& b) {\\n        \\n    }\\n};", java: "class Solution {\\n    public long minimumAdjacentSwapDistance(int[] a, int[] b) {\\n        \\n    }\\n}", python: "class Solution:\\n    def minimumAdjacentSwapDistance(self, a: List[int], b: List[int]) -> int:\\n        ", javascript: "var minimumAdjacentSwapDistance = function(a, b) {\\n    \\n};" } },
  { title: "Merging Session Logs", slug: "merging-session-logs", difficulty: "Easy", tags: ["Heap", "Sorting"], companies: ["Amazon", "Microsoft"], sheet: ["Blind75"], description: "You are given sorted login timestamps from multiple servers. Merge them into one sorted list without duplicates.", examples: [{ input: "logs = [[1,4,7],[2,4,8],[3,9]]", output: "[1,2,3,4,7,8,9]" }], constraints: ["1 <= total events <= 2 * 10^5"], testCases: [{ input: "[[1,4,7],[2,4,8],[3,9]]", expectedOutput: "[1,2,3,4,7,8,9]", isHidden: false, weight: 1 }], hints: ["Use a heap or k-way merge."], starterCode: { cpp: "class Solution {\\npublic:\\n    vector<int> mergingSessionLogs(vector<vector<int>>& logs) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int[] mergingSessionLogs(List<List<Integer>> logs) {\\n        \\n    }\\n}", python: "class Solution:\\n    def mergingSessionLogs(self, logs: List[List[int]]) -> List[int]:\\n        ", javascript: "var mergingSessionLogs = function(logs) {\\n    \\n};" } },
  { title: "Reachable Cells in Grid", slug: "reachable-cells-in-grid", difficulty: "Easy", tags: ["Grid", "BFS"], companies: ["Google", "Amazon"], sheet: ["Blind75"], description: "Given an n x m grid of 0s and 1s, count how many cells are reachable from the top-left cell moving only through 0s in four directions.", examples: [{ input: "grid = [[0,0,1],[0,1,0],[0,0,0]]", output: "3", explanation: "Starting at the top-left 0, we can reach only (0,0), (0,1), and (1,0). The other open cells are separated by blocked cells." }], constraints: ["1 <= n, m <= 1000"], testCases: [{ input: "[[0,0,1],[0,1,0],[0,0,0]]", expectedOutput: "3", isHidden: false, weight: 1 }], hints: ["BFS from the start cell."], starterCode: { cpp: "class Solution {\\npublic:\\n    int reachableCellsInGrid(vector<vector<int>>& grid) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int reachableCellsInGrid(int[][] grid) {\\n        \\n    }\\n}", python: "class Solution:\\n    def reachableCellsInGrid(self, grid: List[List[int]]) -> int:\\n        ", javascript: "var reachableCellsInGrid = function(grid) {\\n    \\n};" } },
  { title: "Two Color Partition", slug: "two-color-partition", difficulty: "Easy", tags: ["Prefix Sum", "Array"], companies: ["Adobe", "Apple"], sheet: ["Blind75"], description: "Given an array of 0s and 1s, determine if it can be partitioned into two contiguous parts with equal sum.", examples: [{ input: "nums = [1,0,1,0]", output: "true" }, { input: "nums = [1,1,1]", output: "false" }], constraints: ["1 <= nums.length <= 10^5"], testCases: [{ input: "[1,0,1,0]", expectedOutput: "true", isHidden: false, weight: 1 }, { input: "[1,1,1]", expectedOutput: "false", isHidden: true, weight: 1 }], hints: ["Check prefix sums."], starterCode: { cpp: "class Solution {\\npublic:\\n    bool twoColorPartition(vector<int>& nums) {\\n        \\n    }\\n};", java: "class Solution {\\n    public boolean twoColorPartition(int[] nums) {\\n        \\n    }\\n}", python: "class Solution:\\n    def twoColorPartition(self, nums: List[int]) -> bool:\\n        ", javascript: "var twoColorPartition = function(nums) {\\n    \\n};" } },
  { title: "Sorted Merge Unique", slug: "sorted-merge-unique", difficulty: "Easy", tags: ["Array", "Two Pointers"], companies: ["Microsoft", "Amazon"], sheet: ["Blind75"], description: "Merge two sorted arrays into one sorted array with all duplicates removed.", examples: [{ input: "a = [1,2,2,4], b = [2,3,4,5]", output: "[1,2,3,4,5]" }], constraints: ["1 <= n, m <= 10^5"], testCases: [{ input: "[1,2,2,4]\\n[2,3,4,5]", expectedOutput: "[1,2,3,4,5]", isHidden: false, weight: 1 }], hints: ["Use two pointers."], starterCode: { cpp: "class Solution {\\npublic:\\n    vector<int> sortedMergeUnique(vector<int>& a, vector<int>& b) {\\n        \\n    }\\n};", java: "class Solution {\\n    public int[] sortedMergeUnique(int[] a, int[] b) {\\n        \\n    }\\n}", python: "class Solution:\\n    def sortedMergeUnique(self, a: List[int], b: List[int]) -> List[int]:\\n        ", javascript: "var sortedMergeUnique = function(a, b) {\\n    \\n};" } }
];

const extraSeeds = [
  ["Maximum Pair Product", "Medium", ["Array", "Sorting"], ["Amazon", "Netflix"], "Find the maximum product of two different numbers in the array."],
  ["Rotating Banner Index", "Easy", ["Array", "Math"], ["Google", "Meta"], "Return the index of the item shown after k cyclic rotations."],
  ["Stable Leaderboard Rank", "Easy", ["Sorting", "Simulation"], ["Microsoft"], "Assign dense ranks to players after each score update."],
  ["Monotonic Temperature Sweep", "Easy", ["Stack", "Array"], ["Apple", "Adobe"], "For each day, return the next warmer day distance."],
  ["Zero Gap Compression", "Easy", ["Two Pointers", "Array"], ["Amazon"], "Remove all zero values while preserving order and return the compacted array."],
  ["Balanced Task Load", "Medium", ["Prefix Sum", "Binary Search"], ["Google", "Uber"], "Split tasks into k contiguous groups minimizing the maximum group load."],
  ["Event Overlap Counter", "Medium", ["Interval", "Sorting"], ["Meta", "Microsoft"], "Return the maximum number of overlapping events."],
  ["Minimal Page Turn", "Easy", ["Math"], ["Adobe"], "Return the minimum page turns from either end of a book."],
  ["Unique Path Count", "Medium", ["Grid", "DP"], ["Amazon", "Google"], "Count paths from top-left to bottom-right avoiding blocked cells."],
  ["Weighted Prefix Query", "Medium", ["Prefix Sum", "Fenwick Tree"], ["Microsoft"], "Support point updates and prefix sum queries on an array."],
  ["Duplicate Window Alarm", "Easy", ["Hashing", "Sliding Window"], ["Meta"], "Detect whether any value repeats within distance k."],
  ["Signal Peak Finder", "Medium", ["Binary Search"], ["Google", "Apple"], "Find any index of a peak element in an array."],
  ["Team Formation Cost", "Hard", ["Greedy", "Heap"], ["Amazon", "Microsoft"], "Form teams of size three minimizing total imbalance cost."],
  ["Island Bridge Length", "Medium", ["Grid", "BFS"], ["Google"], "Find the shortest bridge between two islands in a binary grid."],
  ["Subarray Median Check", "Medium", ["Array", "Binary Search"], ["Meta"], "Determine if a subarray median is at least x."],
  ["Course Group Order", "Medium", ["Graph", "Topological Sort"], ["Amazon", "Google"], "Return a valid ordering of courses with prerequisites."],
  ["Palindrome Merge Length", "Easy", ["String", "Two Pointers"], ["Adobe"], "Return the longest palindrome that can be formed by merging two strings."],
  ["Warehouse Slotting", "Medium", ["Greedy", "Sorting"], ["Microsoft"], "Assign packages to slots to minimize travel distance."],
  ["Streaming Top K", "Medium", ["Heap", "Design"], ["Google", "Meta"], "Maintain the top-k frequent items in a stream."],
  ["Minimum Cut Words", "Hard", ["String", "DP"], ["Amazon"], "Split a string into valid words with minimum cuts."],
  ["Matrix Snake Sum", "Easy", ["Matrix", "Simulation"], ["Apple"], "Traverse a matrix in snake order and sum its values."],
  ["Sparse Range Update", "Medium", ["Difference Array", "Prefix Sum"], ["Microsoft"], "Apply range updates and return the final array."],
  ["Max Non Adjacent Gain", "Medium", ["DP"], ["Amazon", "Google"], "Choose non-adjacent numbers to maximize sum."],
  ["Compressed Log Decode", "Easy", ["String"], ["Adobe"], "Decode run-length encoded text."],
  ["Cycle Start Detector", "Medium", ["Linked List", "Fast Slow Pointers"], ["Meta"], "Detect the node where a linked list cycle begins."],
  ["Merge Appointment Blocks", "Medium", ["Interval", "Sorting"], ["Uber"], "Merge overlapping appointments and report total busy time."],
  ["String Rotation Distance", "Easy", ["String"], ["Apple", "Google"], "Return whether one string can be rotated to form the other."],
  ["Permutation Score", "Hard", ["Backtracking", "Bitmask"], ["Microsoft"], "Count permutations that satisfy adjacency constraints."],
  ["Kth Zero Position", "Easy", ["Binary Search", "Prefix Sum"], ["Amazon"], "Find the position of the kth zero in a binary array."],
  ["Nearest Warm Shop", "Medium", ["Graph", "BFS"], ["Meta", "Google"], "From each house, find the nearest shop in an unweighted graph."],
  ["Histogram Split Area", "Medium", ["Stack"], ["Adobe", "Apple"], "Find the largest rectangle under a histogram."],
  ["Meeting Room Scheduler", "Easy", ["Interval", "Greedy"], ["Microsoft"], "Determine if a person can attend all meetings."],
  ["Distinct Subsequence Count", "Hard", ["DP", "String"], ["Google"], "Count how many distinct subsequences equal a target string."],
  ["Circular Array Jump", "Medium", ["Array", "Two Pointers"], ["Amazon"], "Simulate jumps in a circular array until a cycle is found."],
  ["Budgeted Shopping", "Medium", ["DP", "Knapsack"], ["Meta"], "Maximize value while staying within budget."],
  ["Task Reorder Feasibility", "Easy", ["Graph"], ["Microsoft"], "Check whether tasks can be reordered given dependency rules."],
  ["Median of Stream", "Medium", ["Heap", "Design"], ["Google", "Apple"], "Support adding numbers and querying the running median."],
  ["Word Ladder Steps", "Medium", ["Graph", "BFS"], ["Amazon"], "Return the length of the shortest transformation sequence."],
  ["Sliding Product Cap", "Medium", ["Sliding Window"], ["Uber"], "Count subarrays with product less than k."],
  ["Binary Tree Width", "Medium", ["Tree", "BFS"], ["Google"], "Find the maximum width of a binary tree."],
  ["Resource Booking Conflict", "Easy", ["Interval"], ["Adobe"], "Check whether any resource bookings overlap."],
  ["Longest XOR Segment", "Hard", ["Trie", "Bit Manipulation"], ["Meta"], "Find the maximum XOR of any subarray."],
  ["Character Frequency Sort", "Easy", ["String", "Sorting"], ["Apple"], "Sort characters by descending frequency."],
];

function buildGeneratedSpec(title, difficulty, tags, companies, description, index) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const isHard = difficulty === "Hard";
  const isMedium = difficulty === "Medium";
  return {
    title,
    slug,
    difficulty,
    tags,
    companies,
    sheet: ["Blind75"],
    description,
    examples: [
      { input: "Example input", output: "Example output", explanation: "Illustrative example for the problem statement." },
      { input: "Another input", output: "Another output" },
    ],
    constraints: isHard
      ? ["1 <= n <= 2 * 10^5", "Use an efficient algorithm.", "Memory should remain near linear."]
      : isMedium
        ? ["1 <= n <= 10^5", "An O(n log n) or better approach is expected."]
        : ["1 <= n <= 10^5"],
    testCases: [
      { input: "sample input", expectedOutput: "sample output", isHidden: false, weight: 1 },
      { input: "hidden input", expectedOutput: "hidden output", isHidden: true, weight: 1 },
    ],
    hints: ["Think about the invariant that changes each step."],
    starterCode: {
      cpp: `class Solution {\npublic:\n    auto solve(vector<int>& nums) {\n        \n    }\n};`,
      java: `class Solution {\n    public Object solve(int[] nums) {\n        \n    }\n}`,
      python: `class Solution:\n    def solve(self, nums: List[int]):\n        `,
      javascript: `var solve = function(nums) {\n    \n};`,
    },
  };
}

const generatedBatch = extraSeeds.map((seed, index) => buildGeneratedSpec(...seed, index));

const batch = [...baseBatch, ...generatedBatch].slice(0, 50);

const curatedContracts = {
  "pair-sum-count": {
    input: "Line 1: n followed by n integers. Line 2: target.",
    output: "Print the number of index pairs whose values sum to target.",
  },
  "longest-balanced-prefix": {
    input: "Read one string containing only '(' and ')'.",
    output: "Print the length of the longest valid balanced prefix.",
  },
  "window-distinct-count": {
    input: "Line 1: n followed by n integers. Line 2: window size k.",
    output: "Print the distinct-value count for every window, space-separated.",
  },
  "minimum-adjacent-swap-distance": {
    input: "Line 1: n followed by array a. Line 2: array b of n values.",
    output: "Print the minimum adjacent swaps required to transform a into b.",
  },
  "merging-session-logs": {
    input: "Line 1: k. For each of the next k lines, print length followed by a sorted log.",
    output: "Print the merged sorted values without duplicates.",
  },
  "reachable-cells-in-grid": {
    input: "Line 1: rows and columns. Then print the binary grid row by row.",
    output: "Print the number of zero-valued cells reachable from the top-left cell.",
  },
  "two-color-partition": {
    input: "Line 1: n followed by n binary values.",
    output: "Print true if the array can be split into two contiguous parts with equal sum; otherwise false.",
  },
  "sorted-merge-unique": {
    input: "Line 1: n followed by sorted array a. Line 2: m followed by sorted array b.",
    output: "Print the sorted union without duplicate values.",
  },
};

const curatedHiddenCases = {
  "window-distinct-count": [{ input: "4 1 2 1 2\n2", expectedOutput: "2 2", isHidden: true, weight: 1 }],
  "merging-session-logs": [{ input: "2\n3 1 2 2\n2 2 4", expectedOutput: "1 2 4", isHidden: true, weight: 1 }],
  "reachable-cells-in-grid": [{ input: "2 2\n0 1\n0 0", expectedOutput: "3", isHidden: true, weight: 1 }],
  "sorted-merge-unique": [{ input: "2 1 1\n2 1 2", expectedOutput: "1 2", isHidden: true, weight: 1 }],
};

const curatedAdditionalProblems = {
  "maximum-pair-product": {
    description: "Given an integer array, return the maximum product obtainable by multiplying two different elements.",
    inputFormat: "Line 1: n followed by n integers.",
    outputFormat: "Print the maximum product as an integer.",
    constraints: ["2 <= n <= 100000", "-10^9 <= nums[i] <= 10^9"],
    examples: [{ input: "[-10,-3,5,6]", output: "30", explanation: "The best product is 5 * 6 = 30, which ties -10 * -3 = 30." }],
    testCases: [
      { input: "4 -10 -3 5 6", expectedOutput: "30", isHidden: false, weight: 1 },
      { input: "4 -10 -20 1 2", expectedOutput: "200", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long maximumPairProduct(vector<int>& nums) { } };",
      java: "class Solution { public long maximumPairProduct(int[] nums) { } }",
      python: "class Solution:\n    def maximumPairProduct(self, nums: List[int]) -> int:\n        pass",
      javascript: "var maximumPairProduct = function(nums) { };",
    },
  },
  "rotating-banner-index": {
    description: "A banner is rotated to the right k times. Return the value shown at the first position after all rotations.",
    inputFormat: "Line 1: n followed by n integers. Line 2: k.",
    outputFormat: "Print the value at index 0 after k right rotations.",
    constraints: ["1 <= n <= 100000", "0 <= k <= 10^18"],
    examples: [{ input: "[1,2,3,4], k = 1", output: "4", explanation: "One right rotation changes the array to [4,1,2,3]." }],
    testCases: [
      { input: "4 1 2 3 4\n1", expectedOutput: "4", isHidden: false, weight: 1 },
      { input: "3 5 6 7\n4", expectedOutput: "7", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int rotatingBannerIndex(vector<int>& nums, long long k) { } };",
      java: "class Solution { public int rotatingBannerIndex(int[] nums, long k) { } }",
      python: "class Solution:\n    def rotatingBannerIndex(self, nums: List[int], k: int) -> int:\n        pass",
      javascript: "var rotatingBannerIndex = function(nums, k) { };",
    },
  },
  "stable-leaderboard-rank": {
    description: "For every player score, return its dense rank when scores are ordered from highest to lowest. Equal scores receive the same rank.",
    inputFormat: "Line 1: n followed by n scores.",
    outputFormat: "Print the dense rank of each score in original order, separated by spaces.",
    constraints: ["1 <= n <= 100000", "0 <= score <= 10^9"],
    examples: [{ input: "[100,80,100,70]", output: "[1,2,1,3]", explanation: "There are three distinct score levels." }],
    testCases: [
      { input: "4 100 80 100 70", expectedOutput: "[1,2,1,3]", isHidden: false, weight: 1 },
      { input: "3 50 50 40", expectedOutput: "[1,1,2]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<int> stableLeaderboardRank(vector<int>& scores) { } };",
      java: "class Solution { public int[] stableLeaderboardRank(int[] scores) { } }",
      python: "class Solution:\n    def stableLeaderboardRank(self, scores: List[int]) -> List[int]:\n        pass",
      javascript: "var stableLeaderboardRank = function(scores) { };",
    },
  },
  "monotonic-temperature-sweep": {
    description: "For each day, return how many days must pass before a strictly warmer temperature occurs. Return 0 when no warmer day exists.",
    inputFormat: "Line 1: n followed by n temperatures.",
    outputFormat: "Print one distance for each temperature, using spaces inside brackets.",
    constraints: ["1 <= n <= 100000", "-100 <= temperature[i] <= 100"],
    examples: [{ input: "[73,74,75,71,69,72,76,73]", output: "[1,1,4,2,1,1,0,0]", explanation: "Use the next strictly warmer day for every position." }],
    testCases: [
      { input: "8 73 74 75 71 69 72 76 73", expectedOutput: "[1,1,4,2,1,1,0,0]", isHidden: false, weight: 1 },
      { input: "3 30 30 30", expectedOutput: "[0,0,0]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<int> monotonicTemperatureSweep(vector<int>& temperatures) { } };",
      java: "class Solution { public int[] monotonicTemperatureSweep(int[] temperatures) { } }",
      python: "class Solution:\n    def monotonicTemperatureSweep(self, temperatures: List[int]) -> List[int]:\n        pass",
      javascript: "var monotonicTemperatureSweep = function(temperatures) { };",
    },
  },
  "zero-gap-compression": {
    description: "Remove every zero from an integer array while preserving the relative order of all non-zero values.",
    inputFormat: "Line 1: n followed by n integers.",
    outputFormat: "Print the resulting array in bracket format.",
    constraints: ["1 <= n <= 100000", "-10^9 <= nums[i] <= 10^9"],
    examples: [{ input: "[0,1,0,3,12]", output: "[1,3,12]", explanation: "Only zero values are removed." }],
    testCases: [
      { input: "5 0 1 0 3 12", expectedOutput: "[1,3,12]", isHidden: false, weight: 1 },
      { input: "2 0 0", expectedOutput: "[]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<int> zeroGapCompression(vector<int>& nums) { } };",
      java: "class Solution { public int[] zeroGapCompression(int[] nums) { } }",
      python: "class Solution:\n    def zeroGapCompression(self, nums: List[int]) -> List[int]:\n        pass",
      javascript: "var zeroGapCompression = function(nums) { };",
    },
  },
  "balanced-task-load": {
    description: "Split tasks into exactly k non-empty contiguous groups so that the maximum group sum is as small as possible.",
    inputFormat: "Line 1: n followed by n non-negative task loads. Line 2: k.",
    outputFormat: "Print the minimum possible maximum group sum.",
    constraints: ["1 <= k <= n <= 100000", "0 <= load[i] <= 10^9"],
    examples: [{ input: "[7,2,5,10,8], k = 2", output: "18", explanation: "Split as [7,2,5] and [10,8]." }],
    testCases: [
      { input: "5 7 2 5 10 8\n2", expectedOutput: "18", isHidden: false, weight: 1 },
      { input: "4 1 2 3 4\n3", expectedOutput: "4", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long balancedTaskLoad(vector<int>& loads, int k) { } };",
      java: "class Solution { public long balancedTaskLoad(int[] loads, int k) { } }",
      python: "class Solution:\n    def balancedTaskLoad(self, loads: List[int], k: int) -> int:\n        pass",
      javascript: "var balancedTaskLoad = function(loads, k) { };",
    },
  },
  "event-overlap-counter": {
    description: "Given half-open event intervals [start,end), return the maximum number of events active at the same time.",
    inputFormat: "Line 1: m. Each of the next m lines contains start and end.",
    outputFormat: "Print the maximum simultaneous event count.",
    constraints: ["1 <= m <= 100000", "0 <= start < end <= 10^9"],
    examples: [{ input: "[[1,3],[2,4],[4,6]]", output: "2", explanation: "The first two intervals overlap; [2,4] and [4,6] do not overlap at 4 because intervals are half-open." }],
    testCases: [
      { input: "3\n1 3\n2 4\n4 6", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "4\n1 10\n2 3\n5 8\n6 7", expectedOutput: "3", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int eventOverlapCounter(vector<vector<int>>& events) { } };",
      java: "class Solution { public int eventOverlapCounter(int[][] events) { } }",
      python: "class Solution:\n    def eventOverlapCounter(self, events: List[List[int]]) -> int:\n        pass",
      javascript: "var eventOverlapCounter = function(events) { };",
    },
  },
  "minimal-page-turn": {
    description: "A book has pages numbered from 1 to n. Starting at the front, determine the minimum page turns needed to reach page p.",
    inputFormat: "Read n and p on one line.",
    outputFormat: "Print the minimum number of page turns.",
    constraints: ["1 <= p <= n <= 10^9"],
    examples: [{ input: "n = 6, p = 2", output: "1", explanation: "Turn once from the front." }],
    testCases: [
      { input: "6 2", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "5 4", expectedOutput: "1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long minimalPageTurn(long long n, long long p) { } };",
      java: "class Solution { public long minimalPageTurn(long n, long p) { } }",
      python: "class Solution:\n    def minimalPageTurn(self, n: int, p: int) -> int:\n        pass",
      javascript: "var minimalPageTurn = function(n, p) { };",
    },
  },
  "unique-path-count": {
    description: "In a grid, 0 represents an open cell and 1 represents a blocked cell. Count paths from the top-left to bottom-right using only right and down moves.",
    inputFormat: "Line 1: rows and columns. Then provide the binary grid rows.",
    outputFormat: "Print the number of valid paths.",
    constraints: ["1 <= rows, cols <= 100", "grid[0][0] and grid[rows-1][cols-1] may be blocked"],
    examples: [{ input: "[[0,0,0],[0,1,0],[0,0,0]]", output: "2", explanation: "The centre obstacle leaves two valid paths." }],
    testCases: [
      { input: "3\n3 0 0 0\n3 0 1 0\n3 0 0 0", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "2\n2 0 1\n2 0 0", expectedOutput: "1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long uniquePathCount(vector<vector<int>>& grid) { } };",
      java: "class Solution { public long uniquePathCount(int[][] grid) { } }",
      python: "class Solution:\n    def uniquePathCount(self, grid: List[List[int]]) -> int:\n        pass",
      javascript: "var uniquePathCount = function(grid) { };",
    },
  },
  "weighted-prefix-query": {
    description: "Given an array and inclusive range queries, return the sum of the array values inside every query range.",
    inputFormat: "Line 1: n followed by n integers. Line 2: q. Next q lines contain l and r, both inclusive and zero-based.",
    outputFormat: "Print one range sum per query in bracket format.",
    constraints: ["1 <= n,q <= 100000", "-10^9 <= nums[i] <= 10^9", "0 <= l <= r < n"],
    examples: [{ input: "nums = [1,2,3,4], queries = [[0,2],[1,3]]", output: "[6,9]", explanation: "The queried sums are 1+2+3 and 2+3+4." }],
    testCases: [
      { input: "4 1 2 3 4\n2\n0 2\n1 3", expectedOutput: "[6,9]", isHidden: false, weight: 1 },
      { input: "3 5 -1 2\n2\n0 0\n0 2", expectedOutput: "[5,6]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<long long> weightedPrefixQuery(vector<int>& nums, vector<vector<int>>& queries) { } };",
      java: "class Solution { public long[] weightedPrefixQuery(int[] nums, int[][] queries) { } }",
      python: "class Solution:\n    def weightedPrefixQuery(self, nums: List[int], queries: List[List[int]]) -> List[int]:\n        pass",
      javascript: "var weightedPrefixQuery = function(nums, queries) { };",
    },
  },
  "duplicate-window-alarm": {
    description: "Return true if two equal values occur at indices whose absolute difference is at most k; otherwise return false.",
    inputFormat: "Line 1: n followed by n integers. Line 2: k.",
    outputFormat: "Print true or false.",
    constraints: ["1 <= n <= 100000", "0 <= k <= n", "-10^9 <= nums[i] <= 10^9"],
    examples: [{ input: "nums = [1,2,3,1], k = 3", output: "true", explanation: "The two 1 values are three positions apart." }],
    testCases: [
      { input: "4 1 2 3 1\n3", expectedOutput: "true", isHidden: false, weight: 1 },
      { input: "4 1 0 1 1\n1", expectedOutput: "true", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool duplicateWindowAlarm(vector<int>& nums, int k) { } };",
      java: "class Solution { public boolean duplicateWindowAlarm(int[] nums, int k) { } }",
      python: "class Solution:\n    def duplicateWindowAlarm(self, nums: List[int], k: int) -> bool:\n        pass",
      javascript: "var duplicateWindowAlarm = function(nums, k) { };",
    },
  },
  "signal-peak-finder": {
    description: "Return the index of a peak element. A peak is strictly greater than its immediate neighbours; an endpoint has only one neighbour. Return the smallest valid peak index.",
    inputFormat: "Line 1: n followed by n integers.",
    outputFormat: "Print the zero-based index of the smallest peak.",
    constraints: ["1 <= n <= 100000", "-10^9 <= nums[i] <= 10^9"],
    examples: [{ input: "[1,2,3,1]", output: "2", explanation: "3 is greater than both neighbours." }],
    testCases: [
      { input: "4 1 2 3 1", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "3 1 2 1", expectedOutput: "1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int signalPeakFinder(vector<int>& nums) { } };",
      java: "class Solution { public int signalPeakFinder(int[] nums) { } }",
      python: "class Solution:\n    def signalPeakFinder(self, nums: List[int]) -> int:\n        pass",
      javascript: "var signalPeakFinder = function(nums) { };",
    },
  },
  "team-formation-cost": {
    description: "There are 3m players in their given order. Form consecutive teams of three. The cost of a team is maxSkill minus minSkill; return the sum of all team costs.",
    inputFormat: "Line 1: n followed by n skill values, where n is divisible by 3.",
    outputFormat: "Print the total team formation cost.",
    constraints: ["3 <= n <= 99999", "n is divisible by 3", "0 <= skill[i] <= 10^9"],
    examples: [{ input: "[1,2,3,10,11,12]", output: "4", explanation: "Team costs are 3-1 and 12-10, for a total of 4." }],
    testCases: [
      { input: "6 1 2 3 10 11 12", expectedOutput: "4", isHidden: false, weight: 1 },
      { input: "6 1 5 6 10 12 13", expectedOutput: "8", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long teamFormationCost(vector<int>& skills) { } };",
      java: "class Solution { public long teamFormationCost(int[] skills) { } }",
      python: "class Solution:\n    def teamFormationCost(self, skills: List[int]) -> int:\n        pass",
      javascript: "var teamFormationCost = function(skills) { };",
    },
  },
  "island-bridge-length": {
    description: "A binary grid contains exactly two islands, where an island is a group of 1-cells connected by four directions. Return the minimum number of 0-cells that must be flipped to connect them.",
    inputFormat: "Line 1: rows. Each following line contains the row length followed by the binary row values.",
    outputFormat: "Print the minimum number of zero cells to flip.",
    constraints: ["2 <= rows, cols <= 100", "The grid contains exactly two islands"],
    examples: [{ input: "[[0,1],[1,0]]", output: "1", explanation: "Flip either zero cell to connect the diagonal islands." }],
    testCases: [
      { input: "2\n2 0 1\n2 1 0", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "3\n3 0 1 0\n3 0 0 0\n3 0 0 1", expectedOutput: "2", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int islandBridgeLength(vector<vector<int>>& grid) { } };",
      java: "class Solution { public int islandBridgeLength(int[][] grid) { } }",
      python: "class Solution:\n    def islandBridgeLength(self, grid: List[List[int]]) -> int:\n        pass",
      javascript: "var islandBridgeLength = function(grid) { };",
    },
  },
  "subarray-median-check": {
    description: "Return true if at least one contiguous subarray of length k has a lower median greater than or equal to x. For even length, the lower median is the element at index k/2 - 1 after sorting.",
    inputFormat: "Line 1: n followed by n integers. Line 2: k and x.",
    outputFormat: "Print true or false.",
    constraints: ["1 <= k <= n <= 100000", "-10^9 <= nums[i], x <= 10^9"],
    examples: [{ input: "nums = [1,4,5,2], k = 2, x = 4", output: "true", explanation: "The subarray [4,5] has lower median 4." }],
    testCases: [
      { input: "4 1 3 2 5\n2 3", expectedOutput: "false", isHidden: false, weight: 1 },
      { input: "4 1 4 5 2\n2 4", expectedOutput: "true", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool subarrayMedianCheck(vector<int>& nums, int k, int x) { } };",
      java: "class Solution { public boolean subarrayMedianCheck(int[] nums, int k, int x) { } }",
      python: "class Solution:\n    def subarrayMedianCheck(self, nums: List[int], k: int, x: int) -> bool:\n        pass",
      javascript: "var subarrayMedianCheck = function(nums, k, x) { };",
    },
  },
  "course-group-order": {
    description: "There are n courses numbered 0 through n-1. Each prerequisite pair [a,b] means b must be completed before a. Return the lexicographically smallest valid order, or [] if a cycle exists.",
    inputFormat: "Line 1: n. Line 2: m, the number of prerequisite pairs. Each following line contains a and b.",
    outputFormat: "Print the course order in bracket format, or [] when no valid order exists.",
    constraints: ["1 <= n <= 100000", "0 <= m <= 200000"],
    examples: [{ input: "n = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]", output: "[0,1,2,3]", explanation: "Course 0 must come first; then 1 and 2, then 3." }],
    testCases: [
      { input: "4\n4\n1 0\n2 0\n3 1\n3 2", expectedOutput: "[0,1,2,3]", isHidden: false, weight: 1 },
      { input: "2\n2\n1 0\n0 1", expectedOutput: "[]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<int> courseGroupOrder(int n, vector<vector<int>>& prerequisites) { } };",
      java: "class Solution { public int[] courseGroupOrder(int n, int[][] prerequisites) { } }",
      python: "class Solution:\n    def courseGroupOrder(self, n: int, prerequisites: List[List[int]]) -> List[int]:\n        pass",
      javascript: "var courseGroupOrder = function(n, prerequisites) { };",
    },
  },
  "palindrome-merge-length": {
    description: "Return the length of the longest palindromic subsequence of a string. Characters do not need to be adjacent, but their order must be preserved.",
    inputFormat: "Read one non-empty lowercase string.",
    outputFormat: "Print the length of the longest palindromic subsequence.",
    constraints: ["1 <= s.length <= 2000", "s contains lowercase English letters"],
    examples: [{ input: "bbbab", output: "4", explanation: "The longest palindromic subsequence is bbbb." }],
    testCases: [
      { input: "bbbab", expectedOutput: "4", isHidden: false, weight: 1 },
      { input: "cbbd", expectedOutput: "2", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int palindromeMergeLength(string s) { } };",
      java: "class Solution { public int palindromeMergeLength(String s) { } }",
      python: "class Solution:\n    def palindromeMergeLength(self, s: str) -> int:\n        pass",
      javascript: "var palindromeMergeLength = function(s) { };",
    },
  },
  "warehouse-slotting": {
    description: "Assign each package to one slot. After sorting both lists, assign them in order. The cost is the sum of absolute package-slot differences; return that cost.",
    inputFormat: "Line 1: n followed by n package positions. Line 2: n slot positions.",
    outputFormat: "Print the minimum assignment cost.",
    constraints: ["1 <= n <= 100000", "0 <= packages[i], slots[i] <= 10^9"],
    examples: [{ input: "packages = [4,2,8], slots = [3,5,9]", output: "3", explanation: "Sorted pair differences are 1, 1 and 1." }],
    testCases: [
      { input: "3 4 2 8\n3 5 9", expectedOutput: "3", isHidden: false, weight: 1 },
      { input: "3 1 10 20\n2 8 25", expectedOutput: "8", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long warehouseSlotting(vector<int>& packages, vector<int>& slots) { } };",
      java: "class Solution { public long warehouseSlotting(int[] packages, int[] slots) { } }",
      python: "class Solution:\n    def warehouseSlotting(self, packages: List[int], slots: List[int]) -> int:\n        pass",
      javascript: "var warehouseSlotting = function(packages, slots) { };",
    },
  },
  "streaming-top-k": {
    description: "Return the k most frequent values. Sort the answer by decreasing frequency; break ties by smaller value first.",
    inputFormat: "Line 1: n followed by n integers. Line 2: k.",
    outputFormat: "Print the selected values in bracket format.",
    constraints: ["1 <= k <= number of distinct values <= n <= 100000", "-10^9 <= value[i] <= 10^9"],
    examples: [{ input: "values = [1,1,1,2,2,3], k = 2", output: "[1,2]", explanation: "1 occurs three times and 2 occurs twice." }],
    testCases: [
      { input: "6 1 1 1 2 2 3\n2", expectedOutput: "[1,2]", isHidden: false, weight: 1 },
      { input: "5 4 4 5 5 3\n2", expectedOutput: "[4,5]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<int> streamingTopK(vector<int>& values, int k) { } };",
      java: "class Solution { public int[] streamingTopK(int[] values, int k) { } }",
      python: "class Solution:\n    def streamingTopK(self, values: List[int], k: int) -> List[int]:\n        pass",
      javascript: "var streamingTopK = function(values, k) { };",
    },
  },
  "minimum-cut-words": {
    description: "Given a string and a dictionary, split the entire string into dictionary words using the minimum number of cuts between words. Return -1 if impossible.",
    inputFormat: "Line 1: the string. Line 2: m followed by m dictionary words.",
    outputFormat: "Print the minimum number of cuts, or -1 if the string cannot be segmented.",
    constraints: ["1 <= s.length <= 1000", "1 <= m <= 10000", "dictionary words contain lowercase letters"],
    examples: [{ input: "s = catsanddog, dictionary = [cat,cats,and,sand,dog]", output: "2", explanation: "The minimum split is cat | sand | dog (or cats | and | dog), so there are two cuts." }],
    testCases: [
      { input: "catsanddog\n5 cat cats and sand dog", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "leetcode\n2 leet code", expectedOutput: "1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int minimumCutWords(string s, vector<string>& dictionary) { } };",
      java: "class Solution { public int minimumCutWords(String s, String[] dictionary) { } }",
      python: "class Solution:\n    def minimumCutWords(self, s: str, dictionary: List[str]) -> int:\n        pass",
      javascript: "var minimumCutWords = function(s, dictionary) { };",
    },
  },
  "matrix-snake-sum": {
    description: "Traverse a matrix row by row, reversing the direction on every other row, and return the sum of all visited values.",
    inputFormat: "Line 1: rows and columns. Each following line contains the row length followed by the row values.",
    outputFormat: "Print the sum of the matrix values.",
    constraints: ["1 <= rows, cols <= 500", "-10^6 <= grid[i][j] <= 10^6"],
    examples: [{ input: "[[1,2,3],[4,5,6]]", output: "21", explanation: "The snake order is 1,2,3,6,5,4; its sum is 21." }],
    testCases: [
      { input: "2\n3 1 2 3\n3 4 5 6", expectedOutput: "21", isHidden: false, weight: 1 },
      { input: "3\n2 -1 2\n2 3 4\n2 5 -6", expectedOutput: "7", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long matrixSnakeSum(vector<vector<int>>& grid) { } };",
      java: "class Solution { public long matrixSnakeSum(int[][] grid) { } }",
      python: "class Solution:\n    def matrixSnakeSum(self, grid: List[List[int]]) -> int:\n        pass",
      javascript: "var matrixSnakeSum = function(grid) { };",
    },
  },
  "sparse-range-update": {
    description: "Start with an array of zeroes and apply inclusive range additions. Return the final array after all updates.",
    inputFormat: "Line 1: n and q. Each of the next q lines contains l, r, and delta, with zero-based inclusive endpoints.",
    outputFormat: "Print the final array in bracket format.",
    constraints: ["1 <= n,q <= 100000", "0 <= l <= r < n", "-10^9 <= delta <= 10^9"],
    examples: [{ input: "n = 5, updates = [[1,3,2],[2,4,3]]", output: "[0,2,5,5,3]", explanation: "Use a difference array so every range is applied in constant time." }],
    testCases: [
      { input: "5 2\n1 3 2\n2 4 3", expectedOutput: "[0,2,5,5,3]", isHidden: false, weight: 1 },
      { input: "4 3\n0 3 5\n1 1 -2\n2 3 1", expectedOutput: "[5,3,6,6]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<long long> sparseRangeUpdate(int n, vector<vector<int>>& updates) { } };",
      java: "class Solution { public long[] sparseRangeUpdate(int n, int[][] updates) { } }",
      python: "class Solution:\n    def sparseRangeUpdate(self, n: int, updates: List[List[int]]) -> List[int]:\n        pass",
      javascript: "var sparseRangeUpdate = function(n, updates) { };",
    },
  },
  "max-non-adjacent-gain": {
    description: "Choose any set of non-adjacent values from an array and return the maximum possible sum. Choosing no value is allowed.",
    inputFormat: "Line 1: n followed by n integer values.",
    outputFormat: "Print the maximum non-adjacent sum.",
    constraints: ["1 <= n <= 100000", "-10^9 <= values[i] <= 10^9"],
    examples: [{ input: "[2,7,9,3,1]", output: "12", explanation: "Choose 2, 9, and 1 for a maximum sum of 12." }],
    testCases: [
      { input: "5 2 7 9 3 1", expectedOutput: "12", isHidden: false, weight: 1 },
      { input: "4 5 1 1 5", expectedOutput: "10", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long maxNonAdjacentGain(vector<int>& values) { } };",
      java: "class Solution { public long maxNonAdjacentGain(int[] values) { } }",
      python: "class Solution:\n    def maxNonAdjacentGain(self, values: List[int]) -> int:\n        pass",
      javascript: "var maxNonAdjacentGain = function(values) { };",
    },
  },
  "compressed-log-decode": {
    description: "Decode a run-length encoded lowercase log. Each letter is followed by a positive decimal count, and adjacent encoded groups are independent.",
    inputFormat: "Read one encoded string such as a3b2c1.",
    outputFormat: "Print the decoded string.",
    constraints: ["1 <= encoded.length <= 100000", "Counts are positive integers and the decoded length is at most 10^6"],
    examples: [{ input: "a3b2c1", output: "aaabbc", explanation: "Expand each character by its following count." }],
    testCases: [
      { input: "a3b2c1", expectedOutput: "aaabbc", isHidden: false, weight: 1 },
      { input: "z10x1", expectedOutput: "zzzzzzzzzzx", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: string compressedLogDecode(string encoded) { } };",
      java: "class Solution { public String compressedLogDecode(String encoded) { } }",
      python: "class Solution:\n    def compressedLogDecode(self, encoded: str) -> str:\n        pass",
      javascript: "var compressedLogDecode = function(encoded) { };",
    },
  },
  "cycle-start-detector": {
    description: "A linked list is represented by a next-index array and a head index. Return the index where the cycle begins, or -1 if the list has no cycle.",
    inputFormat: "Line 1: n, followed by n next indices (-1 means null). Line 2: head index.",
    outputFormat: "Print the cycle-entry index, or -1.",
    constraints: ["0 <= n <= 100000", "-1 <= next[i] < n", "-1 <= head < n"],
    examples: [{ input: "next = [1,2,3,1], head = 0", output: "1", explanation: "Following indices gives 0 -> 1 -> 2 -> 3 -> 1." }],
    testCases: [
      { input: "4 1 2 3 1\n0", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "3 1 2 -1\n0", expectedOutput: "-1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int cycleStartDetector(vector<int>& next, int head) { } };",
      java: "class Solution { public int cycleStartDetector(int[] next, int head) { } }",
      python: "class Solution:\n    def cycleStartDetector(self, next: List[int], head: int) -> int:\n        pass",
      javascript: "var cycleStartDetector = function(next, head) { };",
    },
  },
  "merge-appointment-blocks": {
    description: "Merge all overlapping half-open appointment intervals [start,end) and return the total busy duration after merging.",
    inputFormat: "Line 1: m. Each of the next m lines contains start and end.",
    outputFormat: "Print the total duration covered by at least one appointment.",
    constraints: ["1 <= m <= 100000", "0 <= start < end <= 10^9"],
    examples: [{ input: "[[1,3],[2,5],[7,9]]", output: "6", explanation: "The merged blocks are [1,5) and [7,9), with lengths 4 and 2." }],
    testCases: [
      { input: "3\n1 3\n2 5\n7 9", expectedOutput: "6", isHidden: false, weight: 1 },
      { input: "4\n0 10\n2 4\n10 12\n11 15", expectedOutput: "15", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long mergeAppointmentBlocks(vector<vector<int>>& appointments) { } };",
      java: "class Solution { public long mergeAppointmentBlocks(int[][] appointments) { } }",
      python: "class Solution:\n    def mergeAppointmentBlocks(self, appointments: List[List[int]]) -> int:\n        pass",
      javascript: "var mergeAppointmentBlocks = function(appointments) { };",
    },
  },
  "string-rotation-distance": {
    description: "Return true when target can be obtained by rotating source left or right any number of positions.",
    inputFormat: "Read source on line 1 and target on line 2.",
    outputFormat: "Print true or false.",
    constraints: ["1 <= source.length,target.length <= 100000", "Strings contain lowercase English letters"],
    examples: [{ input: "source = abcde, target = cdeab", output: "true", explanation: "Rotating abcde left by two positions produces cdeab." }],
    testCases: [
      { input: "abcde\ncdeab", expectedOutput: "true", isHidden: false, weight: 1 },
      { input: "abc\nacb", expectedOutput: "false", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool stringRotationDistance(string source, string target) { } };",
      java: "class Solution { public boolean stringRotationDistance(String source, String target) { } }",
      python: "class Solution:\n    def stringRotationDistance(self, source: str, target: str) -> bool:\n        pass",
      javascript: "var stringRotationDistance = function(source, target) { };",
    },
  },
  "permutation-score": {
    description: "Count permutations of the values in which every pair of adjacent values differs by at most k.",
    inputFormat: "Line 1: n and k. Line 2: n distinct integer values.",
    outputFormat: "Print the number of valid permutations.",
    constraints: ["1 <= n <= 10", "0 <= k <= 10^9", "values are distinct"],
    examples: [{ input: "values = [1,2,3], k = 1", output: "2", explanation: "The valid orders are [1,2,3] and [3,2,1]." }],
    testCases: [
      { input: "3 1\n1 2 3", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "3 1\n1 3 5", expectedOutput: "0", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long permutationScore(vector<int>& values, int k) { } };",
      java: "class Solution { public long permutationScore(int[] values, int k) { } }",
      python: "class Solution:\n    def permutationScore(self, values: List[int], k: int) -> int:\n        pass",
      javascript: "var permutationScore = function(values, k) { };",
    },
  },
  "kth-zero-position": {
    description: "Given a binary array, return the zero-based position of the k-th zero from the left, or -1 if fewer than k zeros exist.",
    inputFormat: "Line 1: n and k. Line 2: n binary values.",
    outputFormat: "Print the zero-based position of the k-th zero, or -1.",
    constraints: ["1 <= n <= 100000", "1 <= k <= n", "values contain only 0 and 1"],
    examples: [{ input: "nums = [1,0,0,1,0], k = 2", output: "2", explanation: "The second zero is at index 2." }],
    testCases: [
      { input: "5 2\n1 0 0 1 0", expectedOutput: "2", isHidden: false, weight: 1 },
      { input: "4 3\n1 0 1 1", expectedOutput: "-1", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int kthZeroPosition(vector<int>& nums, int k) { } };",
      java: "class Solution { public int kthZeroPosition(int[] nums, int k) { } }",
      python: "class Solution:\n    def kthZeroPosition(self, nums: List[int], k: int) -> int:\n        pass",
      javascript: "var kthZeroPosition = function(nums, k) { };",
    },
  },
  "nearest-warm-shop": {
    description: "In a grid, 0 is a house, 1 is a shop, and 2 is blocked. Return the distance from every non-blocked cell to its nearest shop using four-direction moves; blocked cells remain -1.",
    inputFormat: "Line 1: rows and columns. Each following line contains the row length followed by row values 0, 1, or 2.",
    outputFormat: "Print the distance matrix in bracket format.",
    constraints: ["1 <= rows, cols <= 200", "The grid contains at least one shop"],
    examples: [{ input: "[[0,0,1],[0,2,0]]", output: "[[2,1,0],[3,-1,1]]", explanation: "Distances are computed simultaneously from all shops." }],
    testCases: [
      { input: "2\n3 0 0 1\n3 0 2 0", expectedOutput: "[[2,1,0],[3,-1,1]]", isHidden: false, weight: 1 },
      { input: "3\n3 1 0 0\n3 0 2 0\n3 0 0 0", expectedOutput: "[[0,1,2],[1,-1,3],[2,3,4]]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<vector<int>> nearestWarmShop(vector<vector<int>>& grid) { } };",
      java: "class Solution { public: int[][] nearestWarmShop(int[][] grid) { } }",
      python: "class Solution:\n    def nearestWarmShop(self, grid: List[List[int]]) -> List[List[int]]:\n        pass",
      javascript: "var nearestWarmShop = function(grid) { };",
    },
  },
  "histogram-split-area": {
    description: "Given bar heights in a histogram with unit widths, return the largest rectangular area that can be formed from consecutive bars.",
    inputFormat: "Line 1: n followed by n non-negative bar heights.",
    outputFormat: "Print the largest rectangle area.",
    constraints: ["1 <= n <= 100000", "0 <= heights[i] <= 10^9"],
    examples: [{ input: "[2,1,5,6,2,3]", output: "10", explanation: "Bars 5 and 6 form a rectangle of width 2 and height 5." }],
    testCases: [
      { input: "6 2 1 5 6 2 3", expectedOutput: "10", isHidden: false, weight: 1 },
      { input: "3 2 4 2", expectedOutput: "6", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long histogramSplitArea(vector<int>& heights) { } };",
      java: "class Solution { public long histogramSplitArea(int[] heights) { } }",
      python: "class Solution:\n    def histogramSplitArea(self, heights: List[int]) -> int:\n        pass",
      javascript: "var histogramSplitArea = function(heights) { };",
    },
  },
  "meeting-room-scheduler": {
    description: "Return true if all half-open meeting intervals can be attended without any overlap.",
    inputFormat: "Line 1: m. Each of the next m lines contains start and end.",
    outputFormat: "Print true if no intervals overlap, otherwise false.",
    constraints: ["0 <= m <= 100000", "0 <= start < end <= 10^9"],
    examples: [{ input: "[[0,30],[5,10],[15,20]]", output: "false", explanation: "The first meeting overlaps both other meetings." }],
    testCases: [
      { input: "3\n0 30\n5 10\n15 20", expectedOutput: "false", isHidden: false, weight: 1 },
      { input: "3\n0 5\n5 8\n9 12", expectedOutput: "true", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool meetingRoomScheduler(vector<vector<int>>& meetings) { } };",
      java: "class Solution { public boolean meetingRoomScheduler(int[][] meetings) { } }",
      python: "class Solution:\n    def meetingRoomScheduler(self, meetings: List[List[int]]) -> bool:\n        pass",
      javascript: "var meetingRoomScheduler = function(meetings) { };",
    },
  },
  "distinct-subsequence-count": {
    description: "Return the number of distinct ways to delete characters from source so that the remaining sequence equals target.",
    inputFormat: "Read source on line 1 and target on line 2.",
    outputFormat: "Print the number of distinct subsequences.",
    constraints: ["1 <= source.length <= 1000", "1 <= target.length <= source.length", "Return the exact integer for the supplied tests"],
    examples: [{ input: "source = rabbbit, target = rabbit", output: "3", explanation: "There are three choices for which b is removed." }],
    testCases: [
      { input: "rabbbit\nrabbit", expectedOutput: "3", isHidden: false, weight: 1 },
      { input: "babgbag\nbag", expectedOutput: "5", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long distinctSubsequenceCount(string source, string target) { } };",
      java: "class Solution { public long distinctSubsequenceCount(String source, String target) { } }",
      python: "class Solution:\n    def distinctSubsequenceCount(self, source: str, target: str) -> int:\n        pass",
      javascript: "var distinctSubsequenceCount = function(source, target) { };",
    },
  },
  "circular-array-jump": {
    description: "Starting at a given index, repeatedly add the value at the current index modulo n. Return the number of distinct positions in the cycle when the first position repeats.",
    inputFormat: "Line 1: n and start. Line 2: n integer jump values.",
    outputFormat: "Print the cycle length, or -1 if a jump leaves the array.",
    constraints: ["1 <= n <= 100000", "-10^9 <= jump[i] <= 10^9", "0 <= start < n"],
    examples: [{ input: "values = [2,-1,1,2,2], start = 0", output: "3", explanation: "The positions are 0 -> 2 -> 3 -> 0, so the cycle length is 3." }],
    testCases: [
      { input: "5 0\n2 -1 1 2 2", expectedOutput: "3", isHidden: false, weight: 1 },
      { input: "4 0\n1 1 1 1", expectedOutput: "4", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int circularArrayJump(vector<int>& values, int start) { } };",
      java: "class Solution { public int circularArrayJump(int[] values, int start) { } }",
      python: "class Solution:\n    def circularArrayJump(self, values: List[int], start: int) -> int:\n        pass",
      javascript: "var circularArrayJump = function(values, start) { };",
    },
  },
  "budgeted-shopping": {
    description: "Choose each item at most once to maximize total value without exceeding a fixed budget.",
    inputFormat: "Line 1: n and budget. Line 2: n costs. Line 3: n values.",
    outputFormat: "Print the maximum achievable value.",
    constraints: ["1 <= n <= 1000", "0 <= budget <= 100000", "1 <= cost[i] <= 100000", "0 <= value[i] <= 10^9"],
    examples: [{ input: "costs = [2,3,4], values = [4,5,7], budget = 5", output: "9", explanation: "Choose the first two items for value 4 + 5." }],
    testCases: [
      { input: "3 5\n2 3 4\n4 5 7", expectedOutput: "9", isHidden: false, weight: 1 },
      { input: "4 7\n3 4 5 6\n4 5 8 9", expectedOutput: "9", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long budgetedShopping(vector<int>& costs, vector<int>& values, int budget) { } };",
      java: "class Solution { public long budgetedShopping(int[] costs, int[] values, int budget) { } }",
      python: "class Solution:\n    def budgetedShopping(self, costs: List[int], values: List[int], budget: int) -> int:\n        pass",
      javascript: "var budgetedShopping = function(costs, values, budget) { };",
    },
  },
  "task-reorder-feasibility": {
    description: "Each dependency [a,b] means task b must be completed before task a. Return true when all tasks can be ordered, or false when a cycle exists.",
    inputFormat: "Line 1: n and m. Each of the next m lines contains a and b.",
    outputFormat: "Print true if a valid ordering exists, otherwise false.",
    constraints: ["1 <= n <= 100000", "0 <= m <= 200000", "0 <= a,b < n"],
    examples: [{ input: "n = 3, dependencies = [[1,0],[2,1]]", output: "true", explanation: "The order 0,1,2 satisfies every dependency." }],
    testCases: [
      { input: "3 2\n1 0\n2 1", expectedOutput: "true", isHidden: false, weight: 1 },
      { input: "2 2\n1 0\n0 1", expectedOutput: "false", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool taskReorderFeasibility(int n, vector<vector<int>>& dependencies) { } };",
      java: "class Solution { public boolean taskReorderFeasibility(int n, int[][] dependencies) { } }",
      python: "class Solution:\n    def taskReorderFeasibility(self, n: int, dependencies: List[List[int]]) -> bool:\n        pass",
      javascript: "var taskReorderFeasibility = function(n, dependencies) { };",
    },
  },
  "median-of-stream": {
    description: "Insert each number into a stream and return the median after every insertion. For an even count, use the arithmetic mean of the two middle values.",
    inputFormat: "Line 1: n followed by n stream values.",
    outputFormat: "Print the running medians in bracket format; use .5 when needed.",
    constraints: ["1 <= n <= 100000", "-10^9 <= values[i] <= 10^9"],
    examples: [{ input: "[1,2,3]", output: "[1,1.5,2]", explanation: "The medians after each insertion are 1, 1.5, and 2." }],
    testCases: [
      { input: "3 1 2 3", expectedOutput: "[1,1.5,2]", isHidden: false, weight: 1 },
      { input: "2 5 4", expectedOutput: "[5,4.5]", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: vector<double> medianOfStream(vector<int>& values) { } };",
      java: "class Solution { public double[] medianOfStream(int[] values) { } }",
      python: "class Solution:\n    def medianOfStream(self, values: List[int]) -> List[float]:\n        pass",
      javascript: "var medianOfStream = function(values) { };",
    },
  },
  "word-ladder-steps": {
    description: "Each move changes exactly one character and the intermediate word must be in the dictionary. Return the shortest sequence length from begin to end, or 0 if unreachable.",
    inputFormat: "Line 1: begin word and end word. Line 2: m followed by m dictionary words.",
    outputFormat: "Print the shortest transformation sequence length, or 0.",
    constraints: ["1 <= word length <= 10", "1 <= m <= 10000", "All words have equal length"],
    examples: [{ input: "hit -> cog, [hot,dot,dog,lot,log,cog]", output: "5", explanation: "One shortest sequence is hit-hot-dot-dog-cog." }],
    testCases: [
      { input: "hit cog\n6 hot dot dog lot log cog", expectedOutput: "5", isHidden: false, weight: 1 },
      { input: "a c\n3 a b c", expectedOutput: "2", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int wordLadderSteps(string begin, string end, vector<string>& dictionary) { } };",
      java: "class Solution { public int wordLadderSteps(String begin, String end, String[] dictionary) { } }",
      python: "class Solution:\n    def wordLadderSteps(self, begin: str, end: str, dictionary: List[str]) -> int:\n        pass",
      javascript: "var wordLadderSteps = function(begin, end, dictionary) { };",
    },
  },
  "sliding-product-cap": {
    description: "Given positive integers, count contiguous subarrays whose product is strictly less than k.",
    inputFormat: "Line 1: n and k. Line 2: n positive integers.",
    outputFormat: "Print the number of qualifying subarrays.",
    constraints: ["1 <= n <= 100000", "1 <= values[i] <= 1000", "0 <= k <= 10^15"],
    examples: [{ input: "values = [10,5,2,6], k = 100", output: "8", explanation: "There are eight contiguous subarrays with product below 100." }],
    testCases: [
      { input: "4 100\n10 5 2 6", expectedOutput: "8", isHidden: false, weight: 1 },
      { input: "3 0\n1 2 3", expectedOutput: "0", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long slidingProductCap(vector<int>& values, long long k) { } };",
      java: "class Solution { public long slidingProductCap(int[] values, long k) { } }",
      python: "class Solution:\n    def slidingProductCap(self, values: List[int], k: int) -> int:\n        pass",
      javascript: "var slidingProductCap = function(values, k) { };",
    },
  },
  "binary-tree-width": {
    description: "Given a binary tree in level-order form where -1 represents a missing node, return the maximum width between the leftmost and rightmost non-null nodes at any level, including gaps.",
    inputFormat: "Line 1: n followed by n level-order values; -1 denotes null.",
    outputFormat: "Print the maximum tree width.",
    constraints: ["1 <= n <= 100000", "-1 <= values[i] <= 10^9", "The first value is not -1"],
    examples: [{ input: "[1,3,2,5,3,-1,9]", output: "4", explanation: "The third level spans positions 4 through 7, giving width 4." }],
    testCases: [
      { input: "7 1 3 2 5 3 -1 9", expectedOutput: "4", isHidden: false, weight: 1 },
      { input: "4 1 3 2 5", expectedOutput: "2", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: long long binaryTreeWidth(vector<int>& levelOrder) { } };",
      java: "class Solution { public long binaryTreeWidth(int[] levelOrder) { } }",
      python: "class Solution:\n    def binaryTreeWidth(self, levelOrder: List[int]) -> int:\n        pass",
      javascript: "var binaryTreeWidth = function(levelOrder) { };",
    },
  },
  "resource-booking-conflict": {
    description: "Bookings belong to named resources. Return true when no two bookings for the same resource overlap; bookings on different resources do not conflict.",
    inputFormat: "Line 1: m. Each of the next m lines contains resourceId, start, and end.",
    outputFormat: "Print true if all resource bookings are compatible, otherwise false.",
    constraints: ["0 <= m <= 100000", "resourceId is a lowercase word", "0 <= start < end <= 10^9"],
    examples: [{ input: "[(A,1,3),(A,3,5),(B,2,4)]", output: "true", explanation: "The A bookings touch at 3 but do not overlap because intervals are half-open." }],
    testCases: [
      { input: "3\nA 1 3\nA 3 5\nB 2 4", expectedOutput: "true", isHidden: false, weight: 1 },
      { input: "3\nA 1 4\nA 3 5\nB 1 2", expectedOutput: "false", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: bool resourceBookingConflict(vector<vector<string>>& bookings) { } };",
      java: "class Solution { public boolean resourceBookingConflict(String[][] bookings) { } }",
      python: "class Solution:\n    def resourceBookingConflict(self, bookings: List[List[str]]) -> bool:\n        pass",
      javascript: "var resourceBookingConflict = function(bookings) { };",
    },
  },
  "longest-xor-segment": {
    description: "Return the maximum bitwise XOR obtainable from any non-empty contiguous subarray.",
    inputFormat: "Line 1: n followed by n non-negative integers.",
    outputFormat: "Print the maximum subarray XOR.",
    constraints: ["1 <= n <= 100000", "0 <= values[i] < 2^20"],
    examples: [{ input: "[1,2,3]", output: "3", explanation: "The subarrays [1,2] and [3] both have XOR 3." }],
    testCases: [
      { input: "3 1 2 3", expectedOutput: "3", isHidden: false, weight: 1 },
      { input: "3 8 1 2", expectedOutput: "11", isHidden: true, weight: 1 },
    ],
    starterCode: {
      cpp: "class Solution { public: int longestXorSegment(vector<int>& values) { } };",
      java: "class Solution { public int longestXorSegment(int[] values) { } }",
      python: "class Solution:\n    def longestXorSegment(self, values: List[int]) -> int:\n        pass",
      javascript: "var longestXorSegment = function(values) { };",
    },
  },
};

function makeProblem(spec, index) {
  const completeSpec = curatedAdditionalProblems[spec.slug]
    ? { ...spec, ...curatedAdditionalProblems[spec.slug] }
    : spec;
  const contract = curatedContracts[completeSpec.slug] || {};
  return {
    title: completeSpec.title,
    slug: completeSpec.slug,
    description: completeSpec.description,
    difficulty: completeSpec.difficulty,
    inputFormat: completeSpec.inputFormat || contract.input || "",
    outputFormat: completeSpec.outputFormat || contract.output || "",
    constraints: completeSpec.constraints,
    examples: completeSpec.examples,
    starterCodes: [
      { language: "cpp", starterCode: completeSpec.starterCode?.cpp, functionSignature: "" },
      { language: "java", starterCode: completeSpec.starterCode?.java, functionSignature: "" },
      { language: "python", starterCode: completeSpec.starterCode?.python, functionSignature: "" },
      { language: "javascript", starterCode: completeSpec.starterCode?.javascript, functionSignature: "" },
    ],
    testCases: [...(completeSpec.testCases || []), ...(curatedHiddenCases[completeSpec.slug] || [])],
    hints: completeSpec.hints || [],
    editorial: "",
    tags: completeSpec.tags,
    companies: completeSpec.companies,
    sheets: completeSpec.sheet,
    source: "batch-01",
    sourceId: completeSpec.slug,
    timeLimit: completeSpec.difficulty === "Hard" ? 3000 : 2000,
    memoryLimit: 256,
    isPublished: true,
    createdBy: "system",
  };
}

const output = batch.map((spec, i) => JSON.stringify(makeProblem(spec, i))).join("\n") + "\n";
const outPath = path.join(__dirname, "..", "datasets", "batches", "batch-01.jsonl");
fs.writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${batch.length} problems to ${outPath}`);
