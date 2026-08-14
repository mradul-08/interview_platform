const axios = require("axios");
const { slugify } = require("./ProblemNormalizer");

function buildPrompt(spec = {}) {
    const topic = spec.topic || "Array";
    const difficulty = spec.difficulty || "Medium";
    const company = spec.company || "";
    const style = spec.style || "interview-prep";

    return `You are generating a fully original coding interview problem for CodeVerse.
Return ONLY valid JSON with keys:
title, slug, difficulty, source, sourceId, tags, topic, companies, acceptanceRate, statement, constraints, examples, hints, starterCode, testCases, editorial, isOriginal, isImported, isPublished.

Rules:
- Do not copy any known LeetCode/Codeforces problem statement.
- Create a fresh, original problem.
- Difficulty must be one of Easy, Medium, Hard.
- Keep statement clear and practical.
- Provide 2 examples and 2-4 constraints.
- starterCode must contain cpp, java, python, javascript.
- testCases must contain 3 cases, with one hidden.
- Make it suitable for ${style}.

Context:
Title idea: ${spec.title || "auto-generate"}
Topic: ${topic}
Difficulty: ${difficulty}
Company inspiration: ${company}
`;
}

function extractJson(text) {
    const cleaned = String(text || "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1) {
        throw new Error("AI did not return JSON");
    }
    return JSON.parse(cleaned.slice(first, last + 1));
}

async function generateWithOllama(spec = {}) {
    const baseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const model = process.env.OLLAMA_MODEL || "llama3.1";
    const payload = {
        model,
        prompt: buildPrompt(spec),
        stream: false,
        options: {
            temperature: 0.7,
        },
    };

    const { data } = await axios.post(`${baseUrl}/api/generate`, payload, {
        timeout: 120000,
    });

    const raw = data?.response || "";
    const parsed = extractJson(raw);
    const title = parsed.title || spec.title || "Untitled Problem";
    const slug = parsed.slug || slugify(title);

    return {
        ...parsed,
        title,
        slug,
        source: "ai",
        sourceId: parsed.sourceId || slug,
        isOriginal: true,
        isImported: false,
        isPublished: false,
    };
}

async function generateProblem(spec = {}) {
    if (process.env.AI_PROVIDER === "ollama" || !process.env.AI_PROVIDER) {
        return generateWithOllama(spec);
    }
    throw new Error("Unsupported AI provider. Use AI_PROVIDER=ollama for free local generation.");
}

module.exports = { generateProblem };
