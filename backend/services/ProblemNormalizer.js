const slugify = (value) =>
    String(value || "")
        .toLowerCase()
        .trim()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const { normalizeTestcaseContract } = require("./stdinContract");

const difficultyFromRating = (rating) => {
    if (rating == null) return "Medium";
    if (rating < 1400) return "Easy";
    if (rating < 1900) return "Medium";
    return "Hard";
};

const difficultyFromLeetCode = (difficulty) => {
    const normalized = String(difficulty || "").toLowerCase();
    if (normalized === "easy") return "Easy";
    if (normalized === "medium") return "Medium";
    if (normalized === "hard") return "Hard";
    return "Medium";
};

const hasMeaningfulContent = (value) => {
    if (Array.isArray(value)) return value.some(hasMeaningfulContent);
    return String(value || "").trim().length > 0;
};

const buildContentStatus = (problem) => {
    const statement = hasMeaningfulContent(problem.statement);
    const description = hasMeaningfulContent(problem.description);
    const examples = Array.isArray(problem.examples) && problem.examples.some((ex) =>
        hasMeaningfulContent(ex?.input) || hasMeaningfulContent(ex?.output) || hasMeaningfulContent(ex?.explanation)
    );
    const constraints = Array.isArray(problem.constraints) && problem.constraints.some(hasMeaningfulContent);
    const starterCode = problem.starterCode && Object.values(problem.starterCode).some(hasMeaningfulContent);
    const testCases = Array.isArray(problem.testCases) && problem.testCases.some((tc) => hasMeaningfulContent(tc?.input));

    const missing = [];
    if (!statement && !description) missing.push("statement");
    if (!examples) missing.push("examples");
    if (!constraints) missing.push("constraints");
    if (!starterCode) missing.push("starterCode");
    if (!testCases) missing.push("testCases");

    return {
        hasStatement: statement || description,
        hasExamples: examples,
        hasConstraints: constraints,
        hasStarterCode: starterCode,
        hasTestCases: testCases,
        isComplete: missing.length === 0,
        missing,
    };
};

const normalizeCodeforces = (problem, contestId) => {
    const sourceId = `${contestId}-${problem.index}`;
    const slug = slugify(`${contestId}-${problem.index}-${problem.name}`);
    const rating = problem.rating ?? null;

    const normalized = {
        title: problem.name,
        slug,
        source: "codeforces",
        sourceId,
        sourceUrl: `https://codeforces.com/contest/${contestId}/problem/${problem.index}`,
        difficulty: difficultyFromRating(rating),
        rating,
        topic: Array.isArray(problem.tags) ? problem.tags : [],
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        companies: [],
        acceptanceRate: 0,
        statement: "",
        description: "",
        inputFormat: "",
        outputFormat: "",
        constraints: [],
        examples: [],
        hints: [],
        editorial: "",
        starterCode: {},
        testCases: [],
        timeLimit: 2000,
        memoryLimit: 256,
        executionMode: "stdin",
        contractVersion: 0,
        testcaseValidator: "standard",
        articleLinks: [],
        videoLinks: [],
        createdBy: "system",
        isOriginal: false,
        isImported: true,
        isPublished: true,
    };
    return {
        ...normalized,
        contentStatus: buildContentStatus(normalized),
    };
};

const normalizeLeetCode = (item) => {
    const title = item.title || item.titleSlug || item.name || "";
    const slug = slugify(item.titleSlug || item.slug || title);
    const companies = Array.isArray(item.companies)
        ? item.companies
        : Array.isArray(item.companyTags)
            ? item.companyTags
            : [];
    const tags = Array.isArray(item.topics)
        ? item.topics
        : Array.isArray(item.topicTags)
            ? item.topicTags
            : [];
    const difficulty = difficultyFromLeetCode(item.difficulty);

    const normalized = {
        title,
        slug,
        source: "leetcode",
        sourceId: String(item.questionId || item.questionFrontendId || item.slug || slug),
        sourceUrl: item.url || `https://leetcode.com/problems/${slug}/`,
        difficulty,
        rating: item.rating ?? null,
        topic: tags,
        tags,
        companies,
        acceptanceRate: typeof item.acRate === "number" ? item.acRate : Number(item.acceptanceRate || 0),
        companyTags: Array.isArray(item.companyTags) ? item.companyTags : [],
        statement: "",
        description: "",
        inputFormat: "",
        outputFormat: "",
        constraints: [],
        examples: [],
        hints: [],
        editorial: "",
        starterCode: {},
        testCases: [],
        timeLimit: 2000,
        memoryLimit: 256,
        executionMode: "stdin",
        contractVersion: 0,
        testcaseValidator: "standard",
        articleLinks: [],
        videoLinks: [],
        createdBy: "system",
        isOriginal: false,
        isImported: true,
        isPublished: true,
    };
    return {
        ...normalized,
        contentStatus: buildContentStatus(normalized),
    };
};

const normalizeOriginal = (payload, currentUserId) => {
    const title = payload.title;
    const slug = slugify(payload.slug || title);
    const testCases = Array.isArray(payload.testCases)
        ? payload.testCases.map((testCase) => ({
            input: String(testCase.input || ""),
            output: String(testCase.output || testCase.expectedOutput || ""),
            hidden: Boolean(testCase.hidden ?? testCase.isHidden ?? false),
            weight: Number(testCase.weight || 1),
        }))
        : [];
    const contract = normalizeTestcaseContract({
        starterCode: payload.starterCode || {},
        testCases,
        inputFormat: payload.inputFormat || "",
    });
    const normalized = {
        title,
        slug,
        source: payload.source || "original",
        sourceId: payload.sourceId || slug,
        sourceUrl: payload.sourceUrl || "",
        difficulty: difficultyFromLeetCode(payload.difficulty),
        rating: payload.rating ?? null,
        topic: Array.isArray(payload.topic) ? payload.topic : Array.isArray(payload.tags) ? payload.tags : [],
        tags: Array.isArray(payload.tags) ? payload.tags : Array.isArray(payload.topic) ? payload.topic : [],
        companies: Array.isArray(payload.companies) ? payload.companies : [],
        acceptanceRate: Number(payload.acceptanceRate || 0),
        statement: payload.statement || payload.description || "",
        description: payload.description || payload.statement || "",
        inputFormat: payload.inputFormat || "",
        outputFormat: payload.outputFormat || "",
        constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
        examples: Array.isArray(payload.examples) ? payload.examples : [],
        hints: Array.isArray(payload.hints) ? payload.hints : [],
        editorial: payload.editorial || "",
        starterCode: payload.starterCode || {},
        testCases: contract.testCases,
        timeLimit: Number(payload.timeLimit || 2000),
        memoryLimit: Number(payload.memoryLimit || 256),
        executionMode: "stdin",
        contractVersion: contract.contractVersion,
        testcaseValidator: String(payload.testcaseValidator || "standard"),
        articleLinks: Array.isArray(payload.articleLinks) ? payload.articleLinks : [],
        videoLinks: Array.isArray(payload.videoLinks) ? payload.videoLinks : [],
        createdBy: currentUserId ? String(currentUserId) : payload.createdBy || "admin",
        isOriginal: true,
        isImported: false,
        isPublished: payload.isPublished ?? true,
    };
    normalized.inputFormat = contract.inputFormat;
    return {
        ...normalized,
        contentStatus: buildContentStatus(normalized),
    };
};

const canonicalizeProblem = (doc, { includeHidden = false } = {}) => ({
    id: String(doc._id),
    _id: doc._id,
    title: doc.title,
    slug: doc.slug,
    source: doc.source,
    sourceId: doc.sourceId,
    sourceUrl: doc.sourceUrl,
    difficulty: doc.difficulty,
    rating: doc.rating,
    topic: doc.topic || [],
    tags: doc.tags || doc.topic || [],
    companies: doc.companies || [],
    acceptanceRate: doc.acceptanceRate || 0,
    statement: doc.statement || doc.description || "",
    description: doc.description || doc.statement || "",
    inputFormat: doc.inputFormat || "",
    outputFormat: doc.outputFormat || "",
    constraints: doc.constraints || [],
    examples: doc.examples || [],
    hints: doc.hints || [],
    editorial: doc.editorial || "",
    starterCode: doc.starterCode || {},
    testCases: (doc.testCases || []).map((tc) => {
        const output = tc.output || tc.expectedOutput || "";
        const hidden = Boolean(tc.hidden || tc.isHidden);
        return {
            input: tc.input,
            output,
            expectedOutput: output,
            hidden,
            isHidden: hidden,
            weight: Number(tc.weight || 1),
        };
    }).filter((tc) => includeHidden || !tc.hidden),
    timeLimit: doc.timeLimit || 2000,
    memoryLimit: doc.memoryLimit || 256,
    executionMode: "stdin",
    contractVersion: doc.contractVersion ?? 0,
    testcaseValidator: doc.testcaseValidator || "standard",
    articleLinks: doc.articleLinks || [],
    videoLinks: doc.videoLinks || [],
    sheet: doc.sheet || [],
    points: doc.points || 10,
    createdBy: doc.createdBy || "",
    isOriginal: !!doc.isOriginal,
    isImported: !!doc.isImported,
    isPublished: doc.isPublished !== false,
    contentStatus: buildContentStatus(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});

module.exports = {
    slugify,
    normalizeCodeforces,
    normalizeLeetCode,
  normalizeOriginal,
  canonicalizeProblem,
  buildContentStatus,
};
