require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Problem = require("../models/Problem");

const EXAMPLE_MARKER = "\n\nTask details:\n";

const FRIENDLY_STATEMENTS = {
  "pair-sum-count": "You are given a list of numbers and a target sum. Count how many different pairs of positions add up to the target. A pair uses two different positions, and the same two positions must not be counted twice.",
  "longest-balanced-prefix": "You are given a string containing only opening and closing parentheses. Find the longest prefix that is completely balanced: every opening parenthesis must be closed in the correct order, and no prefix may contain more closing than opening parentheses.",
  "window-distinct-count": "For every consecutive window of k numbers, count how many different values it contains. Move the window one position at a time and return the counts in the same order as the windows.",
  "minimum-adjacent-swap-distance": "Two arrays contain the same values, possibly in a different order. Find the smallest number of swaps of neighboring elements needed to turn the first array into the second array.",
  "merging-session-logs": "Several servers provide logs that are already sorted. Combine all timestamps into one sorted list and keep only one copy when the same timestamp appears on multiple servers.",
  "reachable-cells-in-grid": "A grid contains open cells (0) and blocked cells (1). Starting at the top-left cell, move up, down, left, or right through open cells and count how many cells can actually be visited.",
  "two-color-partition": "Split the binary array at one position into two non-empty contiguous parts. Return true when both parts contain the same number of 1s; otherwise return false.",
  "sorted-merge-unique": "You receive two arrays that are already sorted. Merge them into one sorted array and remove repeated values, including duplicates that occur in both input arrays.",
  "maximum-pair-product": "Choose two different values from the array and multiply them. Return the largest product possible, including the possibility that two negative values create the maximum product.",
  "rotating-banner-index": "The values on a banner are rotated to the right k times. Return the value that ends up in the first position after all rotations. Large k values should be handled using the array length.",
  "stable-leaderboard-rank": "Assign a dense rank to every score: the highest score gets rank 1, equal scores get the same rank, and the next different score gets the next rank. Return ranks in the original player order.",
  "monotonic-temperature-sweep": "For each day, find how many days ahead the first strictly warmer temperature occurs. If no warmer day exists, put 0 for that day.",
  "zero-gap-compression": "Remove all zero values from the array while keeping every non-zero value in its original order. Return the compacted array, which may be empty.",
  "balanced-task-load": "Split the tasks into exactly k non-empty consecutive groups. Choose the split points so that the largest group load is as small as possible, and return that smallest possible largest load.",
  "event-overlap-counter": "Each event occupies the half-open interval [start, end): it is active at start but not at end. Return the maximum number of events active at the same time.",
  "minimal-page-turn": "A book has pages 1 through n and can be opened from either the front or the back. Return the fewest page turns needed to reach page p.",
  "unique-path-count": "In a grid, 0 means open and 1 means blocked. Starting at the top-left cell, count paths to the bottom-right cell when each move is only right or down. A blocked start or finish gives zero paths.",
  "weighted-prefix-query": "For each inclusive range [l, r], calculate the sum of values from index l through index r. Return one answer for every query in the order given.",
  "duplicate-window-alarm": "Check whether the array contains two equal values whose positions are at most k apart. Return true as soon as such a pair exists; otherwise return false.",
  "signal-peak-finder": "A peak is a value larger than its immediate neighbors; at an endpoint it only needs to be larger than its one neighbor. Return the smallest index of any valid peak.",
  "team-formation-cost": "Keep the players in their given order and split them into consecutive teams of three. A team's cost is its largest skill minus its smallest skill; return the sum of all team costs.",
  "island-bridge-length": "The grid has exactly two islands, where 1-cells connected by sides belong to the same island. Flip the fewest 0-cells to create a bridge connecting the islands.",
  "subarray-median-check": "Look at every contiguous subarray of length k. Sort each one and inspect its lower median (the left middle value when k is even); return true if any lower median is at least x.",
  "course-group-order": "Courses are numbered 0 through n-1. A pair [a,b] says course b must be completed before course a. Return the lexicographically smallest valid order, or [] when the dependencies contain a cycle.",
  "palindrome-merge-length": "Choose a subsequence of the string whose characters read the same from both directions. Characters do not need to be next to each other; return the maximum possible length.",
  "warehouse-slotting": "Packages and slots are positions on a line. Match every package to one slot so the total travel distance is minimum, and return that minimum sum of absolute differences.",
  "streaming-top-k": "Count how often each value appears and select k values. Sort the answer by decreasing frequency; when frequencies tie, place the smaller value first.",
  "minimum-cut-words": "Split the whole string into words from the supplied dictionary. Return the minimum number of cuts between words, or -1 if the string cannot be split completely.",
  "matrix-snake-sum": "Visit a matrix row by row: read the first row left-to-right, the next row right-to-left, and continue alternating. Return the sum of all visited values.",
  "sparse-range-update": "Begin with n zeroes. Each update adds a value to every index in an inclusive range [l, r]. Apply all updates and return the final array.",
  "max-non-adjacent-gain": "Select values so that no two selected positions are adjacent. Return the greatest possible sum; selecting nothing is allowed, so the answer is never negative.",
  "compressed-log-decode": "The log is encoded as groups such as a3 or z10: a letter followed by the number of times it should be repeated. Expand every group and return the decoded text.",
  "cycle-start-detector": "A linked list is represented by next indices. Starting from head, follow next until null or until a position repeats. Return the first position belonging to the cycle, or -1 when there is no cycle.",
  "merge-appointment-blocks": "Appointments use half-open intervals [start, end). Merge overlapping appointments and return the total amount of time covered by at least one appointment.",
  "string-rotation-distance": "Return true if one string can be obtained from the other by moving a prefix to the end, or equivalently by rotating the string any number of positions.",
  "permutation-score": "Arrange all distinct values in every possible order. Count the arrangements where the absolute difference between every neighboring pair is at most k.",
  "kth-zero-position": "Scan a binary array from left to right and find the zero-based index of the k-th zero. Return -1 when the array contains fewer than k zeroes.",
  "nearest-warm-shop": "In the grid, 0 is a house, 1 is a shop, and 2 is blocked. For every non-blocked cell, find its shortest four-direction distance to any shop; blocked cells must be -1.",
  "histogram-split-area": "Each histogram bar has width 1. Find the largest rectangle that can be made from consecutive bars and return its area.",
  "meeting-room-scheduler": "Each meeting occupies a half-open interval [start, end). Return true when no two meetings overlap, including the case where one meeting starts exactly when another ends.",
  "distinct-subsequence-count": "Count the different ways to delete characters from source while preserving order so that the remaining characters spell target. Return the count.",
  "circular-array-jump": "Start at the given index and repeatedly jump by the value stored at the current position, wrapping around the array. Return the number of positions in the cycle when a position repeats.",
  "budgeted-shopping": "Each item can be bought at most once. Choose items whose total cost does not exceed the budget and maximize their total value.",
  "task-reorder-feasibility": "Dependencies describe which task must come first. Return true if every task can be placed in one valid order, or false if the dependencies form a cycle.",
  "median-of-stream": "Numbers arrive one at a time. After each insertion, return the median of all numbers seen so far; for an even count, use the average of the two middle values.",
  "word-ladder-steps": "Transform the begin word into the end word by changing one character per step. Every intermediate word must be in the dictionary; return the shortest sequence length or 0 if impossible.",
  "sliding-product-cap": "All values are positive. Count contiguous subarrays whose product is strictly smaller than k. A subarray ending at each position may have several valid starting positions.",
  "binary-tree-width": "The tree is given in level order, with -1 for a missing node. At each level include the gaps between the outermost non-null nodes, and return the largest such width.",
  "resource-booking-conflict": "Bookings for different resources never conflict. For each resource separately, check whether any half-open booking intervals overlap and return whether all bookings are valid.",
  "longest-xor-segment": "Choose any non-empty contiguous segment and calculate the bitwise XOR of its values. Return the largest XOR obtainable from all such segments.",
};

const FRIENDLY_EXPLANATIONS = {
  "two-sum": [
    null,
    "The values 2 and 4 are at indices 1 and 2, and 2 + 4 = 6. Therefore the answer is [1,2].",
  ],
  "valid-parentheses": [
    "The opening parenthesis is closed by the matching closing parenthesis, so the string is valid.",
    "Each opening bracket is closed by the correct type in the correct order, so the string is valid.",
    "The closing bracket ] does not match the most recent opening bracket (, so the string is invalid.",
  ],
  "merge-two-sorted-lists": [
    "Always take the smaller current node from the two lists. Choosing 1, 1, 2, 3, 4, and 4 produces the merged sorted list.",
    "Both input lists are empty, so there are no nodes to merge and the result is [].",
  ],
  "window-distinct-count": [
    "The four windows contain 3, 4, 4, and 3 different values respectively, giving [3,4,4,3].",
  ],
  "merging-session-logs": [
    "Merge the sorted streams in order and ignore repeated 4s. The unique timestamps are 1, 2, 3, 4, 7, 8, and 9.",
  ],
  "sorted-merge-unique": [
    "After merging the two sorted arrays, repeated 2 and 4 values are kept only once. The sorted union is [1,2,3,4,5].",
  ],
  "pair-sum-count": [
    null,
    "There are three index pairs: (0,1), (0,2), and (1,2). Each pair contains two 1s, so the count is 3.",
  ],
  "longest-balanced-prefix": [
    "The complete string has three opening and three closing parentheses, and the balance never becomes negative. Its length is 6.",
    "The balance becomes negative at the third character, so only the prefix () is valid. Its length is 2.",
  ],
  "minimum-adjacent-swap-distance": [
    "Swapping the neighboring values 2 and 3 once changes [1,2,3] into [1,3,2], so the minimum is 1.",
    "Moving 1 to the front and 4 to the end requires four neighboring swaps in total; fewer swaps cannot produce the target order.",
  ],
  "two-color-partition": [
    "Splitting after the second value gives [1,0] and [1,0]. Each part has one 1, so the answer is true.",
    "The array contains three 1s, which cannot be divided into two parts with equal sums. The answer is false.",
  ],
};

function text(value) {
  return String(value || "").trim();
}

function explanationFor(example, problem) {
  const input = text(example.input);
  const output = text(example.output);
  const description = text(problem.description);
  return `For this input, apply the rule described in the statement${description ? ` ("${description.split(".")[0]}")` : ""}. The required result is ${output}, so that is the value printed for this example.`;
}

function hintFor(problem) {
  const tags = new Set((problem.tags || problem.topic || []).map((tag) => String(tag).toLowerCase()));
  if (["graph", "bfs"].some((tag) => tags.has(tag))) return "Model the valid states as a graph and use BFS when every move has equal cost.";
  if (["dp", "dynamic programming", "knapsack"].some((tag) => tags.has(tag))) return "Define the state for the prefix processed so far and reuse smaller states instead of recomputing them.";
  if (["stack", "monotonic stack"].some((tag) => tags.has(tag))) return "Maintain a stack of unresolved values and remove entries as soon as their next answer becomes known.";
  if (["heap", "priority queue"].some((tag) => tags.has(tag))) return "Use a priority queue to keep the most useful candidate available at each step.";
  if (["sorting", "greedy"].some((tag) => tags.has(tag))) return "Sort the relevant values first, then prove why the locally best choice remains globally valid.";
  if (["sliding window", "two pointers"].some((tag) => tags.has(tag))) return "Keep a moving window and update only the values entering and leaving it.";
  if (["binary search"].some((tag) => tags.has(tag))) return "Search over a monotonic answer condition instead of checking every possible answer.";
  if (["string", "hashing"].some((tag) => tags.has(tag))) return "Track the characters or values that matter and update their counts as the input is scanned.";
  return "Break the input into the smallest useful states, handle edge cases explicitly, and keep the required output format exact.";
}

function enrichDescription(problem) {
  const original = FRIENDLY_STATEMENTS[problem.slug] || text(problem.description || problem.statement);
  if (!original) return original;
  if (original.includes(EXAMPLE_MARKER.trim())) return original;
  const output = text(problem.outputFormat);
  return `${original}${EXAMPLE_MARKER}Read the input exactly as described below. Work with the complete input, including repeated values and boundary cases allowed by the constraints. Print only the requested answer in the required format.\n\nOutput requirement: ${output || "Print only the required answer, without labels or extra text."}`;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  const problems = await Problem.find({ source: { $in: ["batch-01", "batch-02", "leetcode"] }, isPublished: true });
  let updated = 0;
  let explanationsAdded = 0;
  let hintsAdded = 0;

  for (const problem of problems) {
    const examples = (Array.isArray(problem.examples) ? problem.examples : []).map((example, index) => {
      const plainExample = example.toObject?.() || example;
      const specificExplanation = FRIENDLY_EXPLANATIONS[problem.slug]?.[index];
      if (specificExplanation) return { ...plainExample, explanation: specificExplanation };
      if (text(example.explanation) && !text(example.explanation).includes("For this input")) return plainExample;
      explanationsAdded += 1;
      return { ...plainExample, explanation: explanationFor(example, problem) };
    });
    const update = {
      description: enrichDescription(problem),
      statement: enrichDescription(problem),
      examples,
    };
    if (!Array.isArray(problem.hints) || problem.hints.length === 0) {
      update.hints = [hintFor(problem)];
      hintsAdded += 1;
    }
    await Problem.updateOne({ _id: problem._id }, { $set: update });
    updated += 1;
  }

  console.log(JSON.stringify({ updated, explanationsAdded, hintsAdded }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
