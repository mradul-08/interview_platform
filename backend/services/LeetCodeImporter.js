const axios = require("axios");
const { normalizeLeetCode } = require("./ProblemNormalizer");

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      hasMore
      total
      questions {
        title
        titleSlug
        difficulty
        acRate
        topicTags {
          name
          slug
        }
        companyTagStats
        questionId
        questionFrontendId
      }
    }
  }
`;

async function fetchLeetCodeProblems(limit = 5000) {
    const { data } = await axios.post(
        LEETCODE_GRAPHQL,
        {
            query: QUERY,
            variables: {
                categorySlug: "",
                skip: 0,
                limit,
                filters: {},
            },
        },
        {
            timeout: 20000,
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "codeverse-importer",
                Referer: "https://leetcode.com/problems/",
            },
        }
    );

    if (data.errors?.length) {
        throw new Error(data.errors[0].message || "LeetCode GraphQL error");
    }

    const items = data?.data?.questionList?.questions || [];
    return items.map((item) =>
        normalizeLeetCode({
            title: item.title,
            slug: item.titleSlug,
            difficulty: item.difficulty,
            acceptanceRate: item.acRate,
            topicTags: (item.topicTags || []).map((tag) => tag.name),
            companies: [],
            questionId: item.questionId,
            questionFrontendId: item.questionFrontendId,
            url: `https://leetcode.com/problems/${item.titleSlug}/`,
        })
    );
}

async function fetchLeetCodeProblemsWithRetry(attempts = 3) {
    let lastError;
    for (let i = 1; i <= attempts; i += 1) {
        try {
            return await fetchLeetCodeProblems();
        } catch (error) {
            lastError = error;
            if (i < attempts) {
                await new Promise((resolve) => setTimeout(resolve, 500 * i));
            }
        }
    }
    throw lastError;
}

module.exports = { fetchLeetCodeProblems, fetchLeetCodeProblemsWithRetry };
