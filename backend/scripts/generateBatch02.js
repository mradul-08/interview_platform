const fs = require("fs");
const path = require("path");

// Batch 2 uses the same stdin/stdout dataset contract as batch-01. Each
// testcase contains one JavaScript-literal value per parameter line; the
// importer converts those values into the canonical raw stdin contract.
const problems = [
  {
    title: "Ticket Counter Wait Time", slug: "ticket-counter-wait-time", difficulty: "Easy", tags: ["Queue", "Array", "Prefix Sum"], companies: ["Amazon", "Zomato"],
    description: "A single-window ticket counter serves customers in arrival order. Given each customer's service time, return how long every customer waits before their own service begins. The first customer waits 0 minutes.",
    inputFormat: "Line 1: n. Line 2: n service times in arrival order.", outputFormat: "Print the waiting time for every customer in bracket format.",
    constraints: ["1 <= n <= 100000", "1 <= serviceTimes[i] <= 10000"],
    examples: [{ input: "serviceTimes = [4,2,5,1]", output: "[0,4,6,11]", explanation: "The waits are the running totals before each customer: 0, 4, 4+2=6, and 4+2+5=11." }, { input: "serviceTimes = [3]", output: "[0]", explanation: "The only customer starts immediately, so the waiting time is 0." }],
    hints: ["Keep a running total of earlier service times.", "Record the total before adding the current service time.", "This is a prefix-sum problem."],
    starterCode: { cpp: "class Solution { public: vector<int> waitTimes(vector<int>& serviceTimes) { } };", java: "class Solution { public int[] waitTimes(int[] serviceTimes) { } }", python: "class Solution:\n    def waitTimes(self, serviceTimes: List[int]) -> List[int]:\n        pass", javascript: "var waitTimes = function(serviceTimes) { };" },
    testCases: [{ input: "[4,2,5,1]", expectedOutput: "[0,4,6,11]", isHidden: false }, { input: "[3]", expectedOutput: "[0]", isHidden: false }, { input: "[1,1,1,1]", expectedOutput: "[0,1,2,3]", isHidden: true }, { input: "[5,5,5,5,5]", expectedOutput: "[0,5,10,15,20]", isHidden: true }],
  },
  {
    title: "First Unique Character Index", slug: "first-unique-character-index", difficulty: "Easy", tags: ["Hashing", "String"], companies: ["Microsoft", "Adobe"],
    description: "Given a lowercase string, find the zero-based index of its first character that appears exactly once. Return -1 when every character appears more than once.",
    inputFormat: "Line 1: a lowercase string s.", outputFormat: "Print the first non-repeating character index, or -1.",
    constraints: ["1 <= s.length <= 100000", "s contains only lowercase English letters"],
    examples: [{ input: 's = "swiss"', output: "1", explanation: "w occurs once and appears before i, so its index 1 is the answer." }, { input: 's = "aabb"', output: "-1", explanation: "Both a and b occur twice, so no character is unique." }],
    hints: ["Count every character first.", "Scan the string again and return the first character with count 1.", "Two linear passes are enough."],
    starterCode: { cpp: "class Solution { public: int firstUniqueCharacterIndex(string s) { } };", java: "class Solution { public int firstUniqueCharacterIndex(String s) { } }", python: "class Solution:\n    def firstUniqueCharacterIndex(self, s: str) -> int:\n        pass", javascript: "var firstUniqueCharacterIndex = function(s) { };" },
    testCases: [{ input: '"swiss"', expectedOutput: "1", isHidden: false }, { input: '"aabb"', expectedOutput: "-1", isHidden: false }, { input: '"z"', expectedOutput: "0", isHidden: true }, { input: '"abcabcx"', expectedOutput: "6", isHidden: true }],
  },
  {
    title: "Rotate Playlist Left By K", slug: "rotate-array-left-by-k", difficulty: "Easy", tags: ["Array", "Two Pointer"], companies: ["Spotify", "Amazon"],
    description: "Rotate a playlist left by k positions. Every left rotation moves the first value to the end. Since k may be larger than the playlist, rotations wrap around.",
    inputFormat: "Line 1: n. Line 2: n song IDs. Line 3: k.", outputFormat: "Print the rotated playlist in bracket format.",
    constraints: ["1 <= n <= 100000", "0 <= k <= 10^9", "1 <= songId <= 10^9"],
    examples: [{ input: "nums = [1,2,3,4,5], k = 2", output: "[3,4,5,1,2]", explanation: "Move 1 and then 2 to the end; 3 becomes the first value." }, { input: "nums = [1,2,3], k = 5", output: "[3,1,2]", explanation: "5 mod 3 is 2, so this is the same as two left rotations." }],
    hints: ["Only k % n rotations change the result.", "Split the array at the effective rotation index.", "Handle k = 0 and n = 1."],
    starterCode: { cpp: "class Solution { public: vector<int> rotateLeft(vector<int>& nums, int k) { } };", java: "class Solution { public int[] rotateLeft(int[] nums, int k) { } }", python: "class Solution:\n    def rotateLeft(self, nums: List[int], k: int) -> List[int]:\n        pass", javascript: "var rotateLeft = function(nums, k) { };" },
    testCases: [{ input: "[1,2,3,4,5]\n2", expectedOutput: "[3,4,5,1,2]", isHidden: false }, { input: "[1,2,3]\n5", expectedOutput: "[3,1,2]", isHidden: false }, { input: "[1,2,3,4]\n4", expectedOutput: "[1,2,3,4]", isHidden: true }, { input: "[1]\n100", expectedOutput: "[1]", isHidden: true }],
  },
  {
    title: "Search Insert Position", slug: "search-insert-position", difficulty: "Easy", tags: ["Binary Search", "Array"], companies: ["Google", "Flipkart"],
    description: "A sorted array contains distinct values. Return the index of target if it exists; otherwise return the index where target must be inserted to keep the array sorted.",
    inputFormat: "Line 1: n. Line 2: n strictly increasing values. Line 3: target.", outputFormat: "Print the zero-based search or insertion index.",
    constraints: ["1 <= n <= 100000", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "nums is strictly increasing"],
    examples: [{ input: "nums = [1,3,5,6], target = 5", output: "2", explanation: "5 already exists at index 2." }, { input: "nums = [1,3,5,6], target = 2", output: "1", explanation: "Inserting 2 before 3, at index 1, keeps the array sorted." }],
    hints: ["The array is sorted, so binary search is appropriate.", "Search for the first value greater than or equal to target.", "Check targets below the first and above the last value."],
    starterCode: { cpp: "class Solution { public: int searchInsertPosition(vector<int>& nums, int target) { } };", java: "class Solution { public int searchInsertPosition(int[] nums, int target) { } }", python: "class Solution:\n    def searchInsertPosition(self, nums: List[int], target: int) -> int:\n        pass", javascript: "var searchInsertPosition = function(nums, target) { };" },
    testCases: [{ input: "[1,3,5,6]\n5", expectedOutput: "2", isHidden: false }, { input: "[1,3,5,6]\n2", expectedOutput: "1", isHidden: false }, { input: "[1,3,5,6]\n7", expectedOutput: "4", isHidden: true }, { input: "[1,3,5,6]\n0", expectedOutput: "0", isHidden: true }],
  },
  {
    title: "Sort Support Ticket Priority Levels", slug: "sort-priority-levels", difficulty: "Medium", tags: ["Sorting", "Array", "Two Pointer"], companies: ["Freshworks", "Microsoft"],
    description: "Each ticket has priority 0, 1, or 2. Rearrange the array so all 0 values come first, followed by 1 values, then 2 values.",
    inputFormat: "Line 1: n. Line 2: n values, each 0, 1, or 2.", outputFormat: "Print the grouped priority array in bracket format.",
    constraints: ["1 <= n <= 100000", "levels[i] is 0, 1, or 2"],
    examples: [{ input: "levels = [2,0,2,1,1,0]", output: "[0,0,1,1,2,2]", explanation: "There are two tickets of each priority, so grouping them gives two 0s, two 1s, and two 2s." }, { input: "levels = [1,1]", output: "[1,1]", explanation: "The array already contains only priority 1 values, so it remains unchanged." }],
    hints: ["Counting the three values is a valid O(n) approach.", "For an in-place one-pass solution, use three regions and three pointers.", "Only the final grouped order matters."],
    starterCode: { cpp: "class Solution { public: vector<int> sortPriorityLevels(vector<int>& levels) { } };", java: "class Solution { public: int[] sortPriorityLevels(int[] levels) { } }", python: "class Solution:\n    def sortPriorityLevels(self, levels: List[int]) -> List[int]:\n        pass", javascript: "var sortPriorityLevels = function(levels) { };" },
    testCases: [{ input: "[2,0,2,1,1,0]", expectedOutput: "[0,0,1,1,2,2]", isHidden: false }, { input: "[1,1]", expectedOutput: "[1,1]", isHidden: false }, { input: "[2,1,0,2,1,0]", expectedOutput: "[0,0,1,1,2,2]", isHidden: true }, { input: "[0]", expectedOutput: "[0]", isHidden: true }],
  },
  {
    title: "Maximum Water Between Poles", slug: "max-water-between-poles", difficulty: "Medium", tags: ["Two Pointer", "Array", "Greedy"], companies: ["Amazon", "Adobe"],
    description: "Vertical poles stand at equal spacing. Water between two poles is limited by the shorter pole and the distance between them. Find the maximum water area possible.",
    inputFormat: "Line 1: n. Line 2: n pole heights.", outputFormat: "Print the maximum water area.",
    constraints: ["2 <= n <= 100000", "0 <= heights[i] <= 10000"],
    examples: [{ input: "heights = [1,8,6,2,5,4,8,3,7]", output: "49", explanation: "Heights 8 and 7 are 7 positions apart, so the area is min(8,7)*7 = 49." }, { input: "heights = [1,1]", output: "1", explanation: "The two poles are one unit apart and the limiting height is 1." }],
    hints: ["Checking every pair is too slow.", "Start with pointers at both ends.", "Move the pointer at the shorter pole because moving the taller one cannot improve the limiting height."],
    starterCode: { cpp: "class Solution { public: long long maxWaterBetweenPoles(vector<int>& heights) { } };", java: "class Solution { public: long maxWaterBetweenPoles(int[] heights) { } }", python: "class Solution:\n    def maxWaterBetweenPoles(self, heights: List[int]) -> int:\n        pass", javascript: "var maxWaterBetweenPoles = function(heights) { };" },
    testCases: [{ input: "[1,8,6,2,5,4,8,3,7]", expectedOutput: "49", isHidden: false }, { input: "[1,1]", expectedOutput: "1", isHidden: false }, { input: "[4,3,2,1,4]", expectedOutput: "16", isHidden: true }, { input: "[0,0]", expectedOutput: "0", isHidden: true }],
  },
  {
    title: "Longest Window With K Distinct Characters", slug: "longest-window-k-distinct", difficulty: "Medium", tags: ["Sliding Window", "Hashing", "String"], companies: ["Meta", "Uber"],
    description: "Find the length of the longest contiguous substring that contains at most k different lowercase letters. Return 0 when k is 0.",
    inputFormat: "Line 1: lowercase string s. Line 2: k.", outputFormat: "Print the maximum valid substring length.",
    constraints: ["1 <= s.length <= 100000", "0 <= k <= 26", "s contains lowercase English letters"],
    examples: [{ input: 's = "eceba", k = 2', output: "3", explanation: "The substring ece uses exactly two distinct letters and has length 3." }, { input: 's = "aa", k = 1', output: "2", explanation: "The complete string uses only a, so its length 2 is valid." }],
    hints: ["Maintain a frequency map for the current window.", "Expand from the right and shrink from the left when distinct count exceeds k.", "Track the largest valid window."],
    starterCode: { cpp: "class Solution { public: int longestWindowWithKDistinct(string s, int k) { } };", java: "class Solution { public int longestWindowWithKDistinct(String s, int k) { } }", python: "class Solution:\n    def longestWindowWithKDistinct(self, s: str, k: int) -> int:\n        pass", javascript: "var longestWindowWithKDistinct = function(s, k) { };" },
    testCases: [{ input: '"eceba"\n2', expectedOutput: "3", isHidden: false }, { input: '"aa"\n1', expectedOutput: "2", isHidden: false }, { input: '"a"\n0', expectedOutput: "0", isHidden: true }, { input: '"abcabcbb"\n3', expectedOutput: "8", isHidden: true }],
  },
  {
    title: "Daily Stock Span", slug: "daily-stock-span", difficulty: "Medium", tags: ["Stack", "Array", "Monotonic Stack"], companies: ["Morgan Stanley", "Goldman Sachs"],
    description: "For each stock price, return the number of consecutive days ending today whose prices were less than or equal to today's price. The current day is always included in its own span.",
    inputFormat: "Line 1: n. Line 2: n closing prices.", outputFormat: "Print every daily span in bracket format.",
    constraints: ["1 <= n <= 100000", "1 <= prices[i] <= 10^9"],
    examples: [{ input: "prices = [100,80,60,70,60,75,85]", output: "[1,1,1,2,1,4,6]", explanation: "For price 75, the consecutive values 60, 70, 60, and 75 are all at most 75, so its span is 4." }, { input: "prices = [10,20,30]", output: "[1,2,3]", explanation: "Prices increase every day, so each new span includes all earlier days." }],
    hints: ["A brute-force look-back can be quadratic.", "Keep indices in a monotonic decreasing stack.", "Pop prices less than or equal to today's price before calculating the span."],
    starterCode: { cpp: "class Solution { public: vector<int> dailyStockSpan(vector<int>& prices) { } };", java: "class Solution { public: int[] dailyStockSpan(int[] prices) { } }", python: "class Solution:\n    def dailyStockSpan(self, prices: List[int]) -> List[int]:\n        pass", javascript: "var dailyStockSpan = function(prices) { };" },
    testCases: [{ input: "[100,80,60,70,60,75,85]", expectedOutput: "[1,1,1,2,1,4,6]", isHidden: false }, { input: "[10,20,30]", expectedOutput: "[1,2,3]", isHidden: false }, { input: "[30,20,10]", expectedOutput: "[1,1,1]", isHidden: true }, { input: "[1,1,1,1]", expectedOutput: "[1,2,3,4]", isHidden: true }],
  },
  {
    title: "Digital Root Sum", slug: "digital-root-sum", difficulty: "Easy", tags: ["Recursion", "Math"], companies: ["Paytm", "Amazon"],
    description: "Repeatedly add the digits of a non-negative number until one digit remains. Return that final digit, called the digital root.",
    inputFormat: "Line 1: one non-negative integer n.", outputFormat: "Print the single-digit digital root.",
    constraints: ["0 <= n <= 10^18"],
    examples: [{ input: "n = 493193", output: "2", explanation: "4+9+3+1+9+3 = 29, then 2+9 = 11, then 1+1 = 2." }, { input: "n = 0", output: "0", explanation: "Zero is already a single digit." }],
    hints: ["Write a helper that adds the digits once.", "Repeat until the value is below 10.", "The modulo-9 formula is an optional optimization."],
    starterCode: { cpp: "class Solution { public: int digitalRootSum(long long n) { } };", java: "class Solution { public: int digitalRootSum(long n) { } }", python: "class Solution:\n    def digitalRootSum(self, n: int) -> int:\n        pass", javascript: "var digitalRootSum = function(n) { };" },
    testCases: [{ input: "493193", expectedOutput: "2", isHidden: false }, { input: "0", expectedOutput: "0", isHidden: false }, { input: "9", expectedOutput: "9", isHidden: true }, { input: "999999999999", expectedOutput: "9", isHidden: true }],
  },
  {
    title: "Greatest Common Divisor of Crate Sizes", slug: "array-gcd-value", difficulty: "Easy", tags: ["Math", "Array"], companies: ["Flipkart", "Amazon"],
    description: "Given positive crate sizes, find the largest positive integer that divides every size without a remainder. This value is the greatest common divisor of the array.",
    inputFormat: "Line 1: n. Line 2: n positive integers.", outputFormat: "Print the GCD of all values.",
    constraints: ["1 <= n <= 100000", "1 <= nums[i] <= 10^9"],
    examples: [{ input: "nums = [12,18,24]", output: "6", explanation: "6 divides 12, 18, and 24, and no larger common divisor exists." }, { input: "nums = [7]", output: "7", explanation: "For one value, the GCD is the value itself." }],
    hints: ["Use the Euclidean algorithm for two values.", "Fold the running GCD across the array.", "If the running GCD becomes 1, it cannot decrease further."],
    starterCode: { cpp: "class Solution { public: long long arrayGcd(vector<int>& nums) { } };", java: "class Solution { public: long arrayGcd(int[] nums) { } }", python: "class Solution:\n    def arrayGcd(self, nums: List[int]) -> int:\n        pass", javascript: "var arrayGcd = function(nums) { };" },
    testCases: [{ input: "[12,18,24]", expectedOutput: "6", isHidden: false }, { input: "[7]", expectedOutput: "7", isHidden: false }, { input: "[1,5,9]", expectedOutput: "1", isHidden: true }, { input: "[100,100,100]", expectedOutput: "100", isHidden: true }],
  },
];

function toDatasetRecord(problem) {
  return {
    title: problem.title, slug: problem.slug, description: problem.description, difficulty: problem.difficulty,
    inputFormat: problem.inputFormat, outputFormat: problem.outputFormat, constraints: problem.constraints,
    examples: problem.examples, hints: problem.hints,
    starterCodes: ["cpp", "java", "python", "javascript"].map((language) => ({ language, starterCode: problem.starterCode[language], functionSignature: "" })),
    testCases: problem.testCases.map((testCase) => ({ ...testCase, weight: Number(testCase.weight || 1) })),
    editorial: "", tags: problem.tags, companies: problem.companies, sheets: ["CodeVerse-Pack-02"],
    source: "batch-02", sourceId: problem.slug, timeLimit: problem.difficulty === "Hard" ? 3000 : 2000, memoryLimit: 256,
    isPublished: true, createdBy: "system",
  };
}

const PLACEHOLDER = /^(sample|hidden|example|expected|another) (input|output)$/i;
const records = problems.map(toDatasetRecord);
const errors = [];
const slugs = new Set();
for (const problem of records) {
  if (slugs.has(problem.slug)) errors.push(`${problem.slug}: duplicate slug`);
  slugs.add(problem.slug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(problem.slug)) errors.push(`${problem.slug}: invalid slug`);
  if (!problem.description || !problem.inputFormat || !problem.outputFormat || !problem.constraints.length) errors.push(`${problem.slug}: missing core content`);
  if (problem.examples.length < 2 || problem.examples.some((example) => !example.input || !example.output || !example.explanation)) errors.push(`${problem.slug}: incomplete examples`);
  if (problem.hints.length < 2 || problem.hints.length > 4) errors.push(`${problem.slug}: hints must contain 2-4 items`);
  if (problem.starterCodes.length !== 4 || problem.starterCodes.some((code) => !code.starterCode.trim())) errors.push(`${problem.slug}: incomplete starter code`);
  const publicTests = problem.testCases.filter((testCase) => !testCase.isHidden);
  const hiddenTests = problem.testCases.filter((testCase) => testCase.isHidden);
  if (publicTests.length < 2 || hiddenTests.length < 2) errors.push(`${problem.slug}: needs at least 2 public and 2 hidden tests`);
  for (const testCase of problem.testCases) {
    if (!String(testCase.input || "").trim() || !String(testCase.expectedOutput || "").trim() || PLACEHOLDER.test(testCase.input) || PLACEHOLDER.test(testCase.expectedOutput)) errors.push(`${problem.slug}: invalid testcase`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const outputPath = path.join(__dirname, "..", "datasets", "batches", "batch-02.jsonl");
fs.writeFileSync(outputPath, records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
console.log(JSON.stringify({ status: "ok", totalProblems: records.length, outputFile: outputPath, publicTestcases: records.reduce((n, p) => n + p.testCases.filter((t) => !t.isHidden).length, 0), hiddenTestcases: records.reduce((n, p) => n + p.testCases.filter((t) => t.isHidden).length, 0) }, null, 2));
