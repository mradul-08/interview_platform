// backend/seed/seedProblems.js
// Run once: node seed/seedProblems.js
require("dotenv").config();
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const { SHEET_CATALOG } = require("../config/sheets");

const SHEETS = Object.fromEntries(SHEET_CATALOG.map((sheet) => [sheet.name.replace(/\s+/g, "").toUpperCase(), sheet.name]));

const problems = [
    {
        title: "Two Sum",
        slug: "two-sum",
        source: "leetcode",
        sourceId: "1",
        difficulty: "Easy",
        topic: ["Array", "Hashing"],
        companies: ["Amazon", "Google", "Microsoft"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        acceptanceRate: 49,
        points: 10,
        isImported: true,
        isPublished: true,
        description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
        examples: [
            { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
            { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
        ],
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
        starterCode: {
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
    }
};`,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        
    }
}`,
            python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
            javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    
};`,
        },
        testCases: [
            { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false },
            { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isHidden: false },
            { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true },
        ],
    },
    {
        title: "Valid Parentheses",
        slug: "valid-parentheses",
        source: "leetcode",
        sourceId: "2",
        difficulty: "Easy",
        topic: ["Stack", "String"],
        companies: ["Microsoft", "Amazon", "Bloomberg"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/valid-parentheses/",
        acceptanceRate: 41,
        points: 10,
        isImported: true,
        isPublished: true,
        description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
        examples: [
            { input: 's = "()"', output: "true" },
            { input: 's = "()[]{}"', output: "true" },
            { input: 's = "(]"', output: "false" },
        ],
        constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
        starterCode: {
            cpp: `class Solution {
public:
    bool isValid(string s) {
        
    }
};`,
            java: `class Solution {
    public boolean isValid(String s) {
        
    }
}`,
            python: `class Solution:
    def isValid(self, s: str) -> bool:
        `,
            javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    
};`,
        },
        testCases: [
            { input: "()", expectedOutput: "true", isHidden: false },
            { input: "()[]{}", expectedOutput: "true", isHidden: false },
            { input: "(]", expectedOutput: "false", isHidden: true },
        ],
    },
    {
        title: "Merge Two Sorted Lists",
        slug: "merge-two-sorted-lists",
        source: "leetcode",
        sourceId: "3",
        difficulty: "Easy",
        topic: ["Linked List", "Recursion"],
        companies: ["Amazon", "Apple", "Microsoft"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/merge-two-sorted-lists/",
        acceptanceRate: 62,
        points: 10,
        isImported: true,
        isPublished: true,
        description: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.`,
        examples: [
            { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
            { input: "list1 = [], list2 = []", output: "[]" },
        ],
        constraints: ["The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100", "Both list1 and list2 are sorted in non-decreasing order."],
        starterCode: {
            cpp: `class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        
    }
};`,
            java: `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        
    }
}`,
            python: `class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        `,
            javascript: `var mergeTwoLists = function(list1, list2) {
    
};`,
        },
        testCases: [
            { input: "[1,2,4]\n[1,3,4]", expectedOutput: "[1,1,2,3,4,4]", isHidden: false },
            { input: "[]\n[]", expectedOutput: "[]", isHidden: true },
        ],
    },
    {
        title: "Best Time to Buy and Sell Stock",
        slug: "best-time-to-buy-and-sell-stock",
        difficulty: "Easy",
        topic: ["Array", "Two Pointers", "Sliding Window"],
        companies: ["Amazon", "Goldman Sachs", "Facebook"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
        acceptanceRate: 54,
        points: 10,
        description: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
        examples: [
            { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5." },
            { input: "prices = [7,6,4,3,1]", output: "0", explanation: "In this case, no transactions are done and the max profit = 0." },
        ],
        constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
        starterCode: {
            cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        
    }
};`,
            java: `class Solution {
    public int maxProfit(int[] prices) {
        
    }
}`,
            python: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        `,
            javascript: `var maxProfit = function(prices) {
    
};`,
        },
        testCases: [
            { input: "[7,1,5,3,6,4]", expectedOutput: "5", isHidden: false },
            { input: "[7,6,4,3,1]", expectedOutput: "0", isHidden: true },
        ],
    },
    {
        title: "Contains Duplicate",
        slug: "contains-duplicate",
        difficulty: "Easy",
        topic: ["Array", "Hashing", "Sorting"],
        companies: ["Amazon", "Adobe", "Palantir"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/contains-duplicate/",
        acceptanceRate: 61,
        points: 10,
        description: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.`,
        examples: [
            { input: "nums = [1,2,3,1]", output: "true" },
            { input: "nums = [1,2,3,4]", output: "false" },
        ],
        constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
        starterCode: {
            cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        
    }
};`,
            java: `class Solution {
    public boolean containsDuplicate(int[] nums) {
        
    }
}`,
            python: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        `,
            javascript: `var containsDuplicate = function(nums) {
    
};`,
        },
        testCases: [
            { input: "[1,2,3,1]", expectedOutput: "true", isHidden: false },
            { input: "[1,2,3,4]", expectedOutput: "false", isHidden: true },
        ],
    },
    {
        title: "Longest Substring Without Repeating Characters",
        slug: "longest-substring-without-repeating-characters",
        difficulty: "Medium",
        topic: ["Sliding Window", "String", "Hashing"],
        companies: ["Adobe", "Uber", "Amazon", "Google"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
        acceptanceRate: 33,
        points: 20,
        description: `Given a string s, find the length of the longest substring without repeating characters.`,
        examples: [
            { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3.' },
            { input: 's = "bbbbb"', output: "1", explanation: 'The answer is "b", with the length of 1.' },
            { input: 's = "pwwkew"', output: "3", explanation: 'The answer is "wke", with the length of 3.' },
        ],
        constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
        starterCode: {
            cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        
    }
};`,
            java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        
    }
}`,
            python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        `,
            javascript: `var lengthOfLongestSubstring = function(s) {
    
};`,
        },
        testCases: [
            { input: "abcabcbb", expectedOutput: "3", isHidden: false },
            { input: "bbbbb", expectedOutput: "1", isHidden: true },
        ],
    },
    {
        title: "3Sum",
        slug: "3sum",
        difficulty: "Medium",
        topic: ["Array", "Two Pointers", "Sorting"],
        companies: ["Flipkart", "Meta", "Amazon", "Microsoft"],
        sheet: [SHEETS.BLIND75, SHEETS.STRIVER],
        sourceUrl: "https://leetcode.com/problems/3sum/",
        acceptanceRate: 32,
        points: 20,
        description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.`,
        examples: [
            { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
            { input: "nums = [0,1,1]", output: "[]" },
            { input: "nums = [0,0,0]", output: "[[0,0,0]]" },
        ],
        constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
        starterCode: {
            cpp: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        
    }
};`,
            java: `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        
    }
}`,
            python: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        `,
            javascript: `var threeSum = function(nums) {
    
};`,
        },
        testCases: [
            { input: "[-1,0,1,2,-1,-4]", expectedOutput: "[[-1,-1,2],[-1,0,1]]", isHidden: false },
        ],
    },
    {
        title: "Binary Tree Level Order Traversal",
        slug: "binary-tree-level-order-traversal",
        difficulty: "Medium",
        topic: ["Tree", "BFS", "Queue"],
        companies: ["Google", "Amazon", "Microsoft", "Bloomberg"],
        sheet: [SHEETS.STRIVER],
        sourceUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
        acceptanceRate: 64,
        points: 20,
        description: `Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).`,
        examples: [
            { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
            { input: "root = [1]", output: "[[1]]" },
            { input: "root = []", output: "[]" },
        ],
        constraints: ["The number of nodes in the tree is in the range [0, 2000].", "-1000 <= Node.val <= 1000"],
        starterCode: {
            cpp: `class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        
    }
};`,
            java: `class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        
    }
}`,
            python: `class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        `,
            javascript: `var levelOrder = function(root) {
    
};`,
        },
        testCases: [
            { input: "[3,9,20,null,null,15,7]", expectedOutput: "[[3],[9,20],[15,7]]", isHidden: false },
        ],
    },
    {
        title: "Course Schedule",
        slug: "course-schedule",
        difficulty: "Medium",
        topic: ["Graph", "Topological Sort", "BFS", "DFS"],
        companies: ["Google", "Amazon", "Uber", "Facebook"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/course-schedule/",
        acceptanceRate: 46,
        points: 20,
        description: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.

Return true if you can finish all courses. Otherwise, return false.`,
        examples: [
            { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true", explanation: "There are 2 courses. Take course 0 first, then course 1." },
            { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false", explanation: "There are 2 courses. To take course 0 you must take course 1, and to take course 1 you must take course 0. This is impossible." },
        ],
        constraints: ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000"],
        starterCode: {
            cpp: `class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        
    }
};`,
            java: `class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        
    }
}`,
            python: `class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        `,
            javascript: `var canFinish = function(numCourses, prerequisites) {
    
};`,
        },
        testCases: [
            { input: "2\n[[1,0]]", expectedOutput: "true", isHidden: false },
            { input: "2\n[[1,0],[0,1]]", expectedOutput: "false", isHidden: true },
        ],
    },
    {
        title: "Merge K Sorted Lists",
        slug: "merge-k-sorted-lists",
        difficulty: "Hard",
        topic: ["Heap", "Linked List", "Divide and Conquer"],
        companies: ["Google", "Microsoft", "Amazon", "Uber"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/merge-k-sorted-lists/",
        acceptanceRate: 49,
        points: 30,
        description: `You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.`,
        examples: [
            { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
            { input: "lists = []", output: "[]" },
        ],
        constraints: ["k == lists.length", "0 <= k <= 10^4", "0 <= lists[i].length <= 500"],
        starterCode: {
            cpp: `class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        
    }
};`,
            java: `class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        
    }
}`,
            python: `class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        `,
            javascript: `var mergeKLists = function(lists) {
    
};`,
        },
        testCases: [
            { input: "[[1,4,5],[1,3,4],[2,6]]", expectedOutput: "[1,1,2,3,4,4,5,6]", isHidden: false },
        ],
    },
    {
        title: "Trapping Rain Water",
        slug: "trapping-rain-water",
        difficulty: "Hard",
        topic: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
        companies: ["Amazon", "Google", "Microsoft", "Snapchat"],
        sheet: [SHEETS.BLIND75, SHEETS.STRIVER],
        sourceUrl: "https://leetcode.com/problems/trapping-rain-water/",
        acceptanceRate: 58,
        points: 30,
        description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
        examples: [
            { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped." },
            { input: "height = [4,2,0,3,2,5]", output: "9" },
        ],
        constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
        starterCode: {
            cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        
    }
};`,
            java: `class Solution {
    public int trap(int[] height) {
        
    }
}`,
            python: `class Solution:
    def trap(self, height: List[int]) -> int:
        `,
            javascript: `var trap = function(height) {
    
};`,
        },
        testCases: [
            { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6", isHidden: false },
            { input: "[4,2,0,3,2,5]", expectedOutput: "9", isHidden: true },
        ],
    },
    {
        title: "Maximum Subarray",
        slug: "maximum-subarray",
        difficulty: "Medium",
        topic: ["Array", "Dynamic Programming", "Divide and Conquer"],
        companies: ["Amazon", "Microsoft", "LinkedIn", "Apple"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/maximum-subarray/",
        acceptanceRate: 50,
        points: 20,
        description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.`,
        examples: [
            { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
            { input: "nums = [1]", output: "1" },
            { input: "nums = [5,4,-1,7,8]", output: "23" },
        ],
        constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        starterCode: {
            cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        
    }
};`,
            java: `class Solution {
    public int maxSubArray(int[] nums) {
        
    }
}`,
            python: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        `,
            javascript: `var maxSubArray = function(nums) {
    
};`,
        },
        testCases: [
            { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false },
        ],
    },
    {
        title: "Climbing Stairs",
        slug: "climbing-stairs",
        difficulty: "Easy",
        topic: ["Dynamic Programming", "Math", "Memoization"],
        companies: ["Amazon", "Adobe", "Apple", "Google"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/climbing-stairs/",
        acceptanceRate: 52,
        points: 10,
        description: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
        examples: [
            { input: "n = 2", output: "2", explanation: "There are two ways to climb to the top. 1. 1 step + 1 step  2. 2 steps" },
            { input: "n = 3", output: "3", explanation: "There are three ways. 1. 1+1+1  2. 1+2  3. 2+1" },
        ],
        constraints: ["1 <= n <= 45"],
        starterCode: {
            cpp: `class Solution {
public:
    int climbStairs(int n) {
        
    }
};`,
            java: `class Solution {
    public int climbStairs(int n) {
        
    }
}`,
            python: `class Solution:
    def climbStairs(self, n: int) -> int:
        `,
            javascript: `var climbStairs = function(n) {
    
};`,
        },
        testCases: [
            { input: "2", expectedOutput: "2", isHidden: false },
            { input: "3", expectedOutput: "3", isHidden: false },
            { input: "10", expectedOutput: "89", isHidden: true },
        ],
    },
    {
        title: "Product of Array Except Self",
        slug: "product-of-array-except-self",
        difficulty: "Medium",
        topic: ["Array", "Prefix Sum"],
        companies: ["Facebook", "Amazon", "Microsoft", "LeetCode"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/product-of-array-except-self/",
        acceptanceRate: 65,
        points: 20,
        description: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.`,
        examples: [
            { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
            { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
        ],
        constraints: ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer."],
        starterCode: {
            cpp: `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        
    }
};`,
            java: `class Solution {
    public int[] productExceptSelf(int[] nums) {
        
    }
}`,
            python: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        `,
            javascript: `var productExceptSelf = function(nums) {
    
};`,
        },
        testCases: [
            { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]", isHidden: false },
        ],
    },
    {
        title: "Find Minimum in Rotated Sorted Array",
        slug: "find-minimum-in-rotated-sorted-array",
        difficulty: "Medium",
        topic: ["Array", "Binary Search"],
        companies: ["Microsoft", "Facebook", "Amazon"],
        sheet: [SHEETS.BLIND75],
        sourceUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
        acceptanceRate: 49,
        points: 20,
        description: `Suppose an array of length n sorted in ascending order is rotated between 1 and n times.

Given the sorted rotated array nums of unique elements, return the minimum element of this array.

You must write an algorithm that runs in O(log n) time.`,
        examples: [
            { input: "nums = [3,4,5,1,2]", output: "1", explanation: "The original array was [1,2,3,4,5] rotated 3 times." },
            { input: "nums = [4,5,6,7,0,1,2]", output: "0" },
            { input: "nums = [11,13,15,17]", output: "11" },
        ],
        constraints: ["n == nums.length", "1 <= n <= 5000", "-5000 <= nums[i] <= 5000", "All the integers of nums are unique."],
        starterCode: {
            cpp: `class Solution {
public:
    int findMin(vector<int>& nums) {
        
    }
};`,
            java: `class Solution {
    public int findMin(int[] nums) {
        
    }
}`,
            python: `class Solution:
    def findMin(self, nums: List[int]) -> int:
        `,
            javascript: `var findMin = function(nums) {
    
};`,
        },
        testCases: [
            { input: "[3,4,5,1,2]", expectedOutput: "1", isHidden: false },
            { input: "[4,5,6,7,0,1,2]", expectedOutput: "0", isHidden: true },
        ],
    },
];

if (require.main === module) {
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected ✅");

        let inserted = 0, updated = 0;

        for (const p of problems) {
            const result = await Problem.findOneAndUpdate(
                { slug: p.slug },
                { $set: p },
                { upsert: true, new: true, rawResult: true }
            );
            if (result.lastErrorObject?.updatedExisting) updated++;
            else inserted++;
        }

        console.log(`Done ✅ — Inserted: ${inserted}, Updated: ${updated}, Total: ${problems.length}`);
        process.exit(0);
    } catch (err) {
        console.error("Seed Error ❌", err.message);
        process.exit(1);
    }
})();
}

module.exports = { problems };
