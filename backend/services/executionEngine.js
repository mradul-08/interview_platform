const axios = require("axios");

let cachedLanguages = null;
let cachedAt = 0;

function getBaseUrl() {
  return (process.env.JUDGE0_API_URL || "").replace(/\/+$/, "");
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStandardOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();
}

function stripProblemPrefix(line) {
  return String(line || "")
    .trim()
    .replace(/^(?:[a-zA-Z_]\w*\s*=\s*)/, "")
    .trim();
}

function splitTopLevelValues(input) {
  const lines = String(input || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines;
}

function parseMaybeJson(value) {
  const text = stripProblemPrefix(value);
  if (text === "") return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  if (/^-?\d+$/.test(text)) return Number(text);
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try {
      return JSON.parse(text.replace(/'/g, '"'));
    } catch {
      return text;
    }
  }
  const quoted = text.match(/^"(.*)"$/s) || text.match(/^'(.*)'$/s);
  if (quoted) return quoted[1];
  return text;
}

function cppEscapeString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function cppLiteral(value) {
  if (value === null) return "nullptr";
  if (Array.isArray(value)) {
    return `{${value.map((item) => cppLiteral(item)).join(", ")}}`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0";
  }
  return `"${cppEscapeString(value)}"`;
}

function collapseSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isTreeLikeType(type) {
  const compactType = collapseSpaces(type);
  return /\bTreeNode\b/.test(compactType);
}

function isListLikeType(type) {
  const compactType = collapseSpaces(type);
  return /\bListNode\b/.test(compactType);
}

function extractCppSignature(sourceCode) {
  const text = String(sourceCode || "");
  const classStart = text.search(/\bclass\s+Solution\b/);
  let searchSpace = text;
  if (classStart >= 0) {
    const classOpen = text.indexOf("{", classStart);
    if (classOpen >= 0) {
      let depth = 0;
      let classClose = text.length;
      for (let i = classOpen; i < text.length; i += 1) {
        if (text[i] === "{") depth += 1;
        else if (text[i] === "}") {
          depth -= 1;
          if (depth === 0) {
            classClose = i;
            break;
          }
        }
      }
      searchSpace = text.slice(classOpen + 1, classClose);
    }
  }
  const publicIndex = searchSpace.indexOf("public:");
  if (publicIndex >= 0) searchSpace = searchSpace.slice(publicIndex + "public:".length);
  const match = searchSpace.match(/(?:static\s+|inline\s+|virtual\s+)*(?:const\s+)?([a-zA-Z_][\w:<>,\s\*&\[\]]*?)\s+([a-zA-Z_]\w*)\s*\(([^{};]*)\)\s*(?:const\s*)?\{/m);
  if (!match) return null;
  return {
    returnType: match[1].trim(),
    methodName: match[2].trim(),
    params: match[3]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((param) => {
        const pieces = param.split(/\s+/);
        const name = pieces.pop();
        const type = pieces.join(" ").trim();
        return { type, name };
      }),
  };
}

function inferCppValue(type, rawValue) {
  const text = stripProblemPrefix(rawValue);
  const value = parseMaybeJson(text);
  const compactType = String(type || "").replace(/\s+/g, " ").trim();

  if (/vector\s*<\s*vector\s*</.test(compactType)) return Array.isArray(value) ? value : [];
  if (/vector\s*<\s*int\s*>/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/vector\s*<\s*string\s*>/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/string\b/.test(compactType)) return String(value ?? "");
  if (/\bbool\b/.test(compactType)) return Boolean(value);
  if (/\bdouble\b|\bfloat\b/.test(compactType)) return Number(value);
  if (/\bint\b|\blong\b|\bshort\b/.test(compactType)) return Number(value);
  return value;
}

function parseJavaMethod(sourceCode) {
  const text = String(sourceCode || "");
  const classMatch = text.match(/class\s+Solution\b[\s\S]*?\{\s*([\s\S]*?)\n\}/m);
  const body = classMatch ? classMatch[1] : text;
  const match = body.match(/(?:public\s+)?([a-zA-Z_][\w<>\[\],\s?&.*]+)\s+([a-zA-Z_]\w*)\s*\(([^{};]*)\)\s*(?:throws\s+[^{]+)?\{/m);
  if (!match) return null;
  return {
    returnType: collapseSpaces(match[1]),
    methodName: match[2].trim(),
    params: match[3]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((param) => {
        const pieces = param.split(/\s+/);
        const name = pieces.pop();
        const type = pieces.join(" ").trim();
        return { type, name };
      }),
  };
}

function parsePythonMethod(sourceCode) {
  const text = String(sourceCode || "");
  const match = text.match(/def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:\s*/m);
  if (!match) return null;
  const params = match[2]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((name) => name !== "self")
    .map((chunk) => {
      const withoutDefault = chunk.split("=").shift().trim();
      const name = withoutDefault.split(":").shift().trim();
      return { type: "", name };
    });
  return { methodName: match[1].trim(), params, returnType: "" };
}

function parseJsMethod(sourceCode) {
  const text = String(sourceCode || "");
  const patterns = [
    /var\s+([a-zA-Z_]\w*)\s*=\s*function\s*\(([^)]*)\)\s*\{/m,
    /function\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/m,
    /class\s+Solution[\s\S]*?([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/m,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const params = match[2]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((name) => ({ type: "", name }));
      return { methodName: match[1].trim(), params, returnType: "" };
    }
  }
  return null;
}

function inferJavaValue(type, rawValue) {
  const compactType = collapseSpaces(type);
  const value = parseMaybeJson(rawValue);
  if (/ListNode/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/TreeNode/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/List<\s*List<\s*Integer\s*>\s*>/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/List<\s*Integer\s*>|int\[\]/.test(compactType)) return Array.isArray(value) ? value : [];
  if (/String/.test(compactType)) return String(value ?? "");
  if (/boolean/.test(compactType)) return Boolean(value);
  if (/double|float/.test(compactType)) return Number(value);
  return value;
}

function inferPythonValue(rawValue) {
  return parseMaybeJson(rawValue);
}

function inferJsValue(rawValue) {
  return parseMaybeJson(rawValue);
}

function generateCppWrapper(sourceCode, stdin) {
  if (/\bint\s+main\s*\(/.test(String(sourceCode || ""))) {
    return String(sourceCode || "");
  }

  const signature = extractCppSignature(sourceCode);
  if (!signature) return String(sourceCode || "");

  const inputs = splitTopLevelValues(stdin);
  const declaredArgs = signature.params.map((param, index) => {
    const rawValue = inputs[index] ?? "";
    const value = inferCppValue(param.type, rawValue);
    if (isListLikeType(param.type)) {
      return `    ListNode* arg${index} = buildList(${cppLiteral(value)});`;
    }
    if (isTreeLikeType(param.type)) {
      return `    TreeNode* arg${index} = buildTree(${cppLiteral(value)});`;
    }
    const type = String(param.type || "").replace(/\bconst\b/g, "").replace(/[&*]+/g, "").replace(/\s+/g, " ").trim();
    if (/vector\s*</.test(type)) {
      return `    ${type} arg${index} = ${cppLiteral(value)};`;
    }
    if (/\bstring\b/.test(type)) {
      return `    ${type} arg${index} = ${cppLiteral(String(value ?? ""))};`;
    }
    if (/\bbool\b/.test(type)) {
      return `    ${type} arg${index} = ${value ? "true" : "false"};`;
    }
    if (/\bdouble\b|\bfloat\b/.test(type)) {
      return `    ${type} arg${index} = ${Number(value)};`;
    }
    return `    ${type || "auto"} arg${index} = ${cppLiteral(value)};`;
  });

  const buildReturnPrinter = (returnType, expr) => {
    const type = String(returnType || "").replace(/\s+/g, " ").trim();
    if (/\bvoid\b/.test(type)) return `    ${expr};\n`;
    if (isListLikeType(type)) {
      return `    ListNode* __out = ${expr};
    cout << "[";
    int __guard = 0;
    while (__out && __guard++ < 10000) {
        if (__guard > 1) cout << ",";
        cout << __out->val;
        __out = __out->next;
    }
    cout << "]";
`;
    }
    if (isTreeLikeType(type)) {
      return `    TreeNode* __out = ${expr};
    cout << "[]"; // tree serialization is intentionally conservative for now
`;
    }
    if (/\bbool\b/.test(type)) return `    cout << (${expr} ? "true" : "false");\n`;
    if (/vector\s*<\s*vector\s*</.test(type)) {
      return `    auto __out = ${expr};\n    cout << "[";\n    for (size_t i = 0; i < __out.size(); ++i) {\n        if (i) cout << ",";\n        cout << "[";\n        for (size_t j = 0; j < __out[i].size(); ++j) {\n            if (j) cout << ",";\n            cout << __out[i][j];\n        }\n        cout << "]";\n    }\n    cout << "]";\n`;
    }
    if (/vector\s*</.test(type)) {
      return `    auto __out = ${expr};\n    cout << "[";\n    for (size_t i = 0; i < __out.size(); ++i) {\n        if (i) cout << ",";\n        cout << __out[i];\n    }\n    cout << "]";\n`;
    }
    return `    cout << ${expr};\n`;
  };

  const invocation = `s.${signature.methodName}(${signature.params.map((_, index) => `arg${index}`).join(", ")})`;
  const printer = buildReturnPrinter(signature.returnType, invocation);

  const supportTypes = /\bListNode\b/.test(sourceCode) && !/\b(?:struct|class)\s+ListNode\b/.test(sourceCode)
    ? `struct ListNode { int val; ListNode* next; ListNode(int x) : val(x), next(nullptr) {} };\n\n`
    : "";
  const treeSupport = /\bTreeNode\b/.test(sourceCode) && !/\b(?:struct|class)\s+TreeNode\b/.test(sourceCode)
    ? `struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} };\n\n`
    : "";
  const helpers = `\nListNode* buildList(std::initializer_list<int> values) {\n    ListNode* head = nullptr;\n    ListNode* tail = nullptr;\n    for (int value : values) {\n        ListNode* node = new ListNode(value);\n        if (!head) head = node; else tail->next = node;\n        tail = node;\n    }\n    return head;\n}\n\n`;
  const usesListNodes = /\bListNode\b/.test(sourceCode);
  return `#include <bits/stdc++.h>\nusing namespace std;\n\n${supportTypes}${treeSupport}${sourceCode}\n${usesListNodes ? helpers : ""}\nint main() {\n${declaredArgs.join("\n")}\n    Solution s;\n${printer}    return 0;\n}\n`;
}

function generateJavaWrapper(sourceCode, stdin) {
  if (/\bstatic\s+void\s+main\s*\(/.test(String(sourceCode || ""))) return String(sourceCode || "");
  const signature = parseJavaMethod(sourceCode);
  if (!signature) return String(sourceCode || "");
  const inputs = splitTopLevelValues(stdin);
  const build = (type, rawValue, index) => {
    const value = inferJavaValue(type, rawValue);
    const compactType = collapseSpaces(type).replace(/\bfinal\b/g, "").trim();
    if (/int\[\]/.test(compactType)) return `        int[] arg${index} = ${javaArrayLiteral(value)};`;
    if (/List<\s*Integer\s*>/.test(compactType) || /\bArrayList\b/.test(compactType)) return `        List<Integer> arg${index} = ${javaListLiteral(value)};`;
    if (/List<\s*List<\s*Integer\s*>\s*>/.test(compactType)) return `        List<List<Integer>> arg${index} = ${javaNestedListLiteral(value)};`;
    if (/String/.test(compactType)) return `        String arg${index} = ${JSON.stringify(String(value ?? ""))};`;
    if (/boolean/.test(compactType)) return `        boolean arg${index} = ${value ? "true" : "false"};`;
    if (/double|float/.test(compactType)) return `        ${compactType || "double"} arg${index} = ${Number(value)};`;
    if (/ListNode/.test(compactType)) return `        ListNode arg${index} = buildList(${javaArrayLiteral(value)});`;
    if (/TreeNode/.test(compactType)) return `        TreeNode arg${index} = buildTree(${javaArrayLiteral(value)});`;
    return `        ${compactType || "int"} arg${index} = ${javaScalarLiteral(value)};`;
  };

  const paramDecl = signature.params.map((param, index) => build(param.type, inputs[index] ?? "", index)).join("\n");
  const callArgs = signature.params.map((_, index) => `arg${index}`).join(", ");
  const printer = javaPrinter(signature.returnType || "", `out`);

  return `import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int val) { this.val = val; }
}

${sourceCode}

class Main {
    private static ListNode buildList(int[] values) {
        ListNode dummy = new ListNode(0), cur = dummy;
        for (int value : values) {
            cur.next = new ListNode(value);
            cur = cur.next;
        }
        return dummy.next;
    }

    private static TreeNode buildTree(int[] values) {
        if (values.length == 0) return null;
        TreeNode root = new TreeNode(values[0]);
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.offer(root);
        int index = 1;
        while (!queue.isEmpty() && index < values.length) {
            TreeNode node = queue.poll();
            if (index < values.length) {
                node.left = new TreeNode(values[index++]);
                queue.offer(node.left);
            }
            if (index < values.length) {
                node.right = new TreeNode(values[index++]);
                queue.offer(node.right);
            }
        }
        return root;
    }

    public static void main(String[] args) {
${paramDecl}
        Solution s = new Solution();
        Object out = s.${signature.methodName}(${callArgs});
${printer}
    }
}
`;
}

function javaScalarLiteral(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  return JSON.stringify(String(value ?? ""));
}

function javaArrayLiteral(value) {
  const arr = Array.isArray(value) ? value : [];
  return `new int[]{${arr.map((item) => Number(item)).join(", ")}}`;
}

function javaListLiteral(value) {
  const arr = Array.isArray(value) ? value : [];
  return `new ArrayList<>(Arrays.asList(${arr.map((item) => Number(item)).join(", ")}))`;
}

function javaNestedListLiteral(value) {
  const arr = Array.isArray(value) ? value : [];
  return `new ArrayList<>(Arrays.asList(${arr
    .map((row) => `new ArrayList<>(Arrays.asList(${(Array.isArray(row) ? row : []).map((item) => Number(item)).join(", ")}))`)
    .join(", ")}))`;
}

function javaPrinter(returnType, expr) {
  const type = collapseSpaces(returnType);
  if (/void/.test(type)) return "";
  if (/boolean/.test(type)) return `        System.out.println((Boolean) ${expr} ? "true" : "false");`;
  if (/int\[\]/.test(type)) return `        System.out.println(Arrays.toString((int[]) ${expr}));`;
  if (/List<\s*List<\s*Integer\s*>\s*>/.test(type)) return `        System.out.println(${expr}.toString().replace(" ", ""));`;
  if (/List<\s*Integer\s*>/.test(type)) return `        System.out.println(${expr}.toString().replace(" ", ""));`;
  return `        System.out.println(String.valueOf(${expr}));`;
}

function generatePythonWrapper(sourceCode, stdin) {
  if (/if\s+__name__\s*==\s*["']__main__["']/.test(String(sourceCode || ""))) return String(sourceCode || "");
  const signature = parsePythonMethod(sourceCode);
  if (!signature) return String(sourceCode || "");
  const inputs = splitTopLevelValues(stdin);
  const assigns = signature.params.map((param, index) => {
    const value = inferPythonValue(inputs[index] ?? "");
    return `    ${param.name} = ${pythonLiteral(value)}`;
  }).join("\n");
  const callArgs = signature.params.map((param) => param.name).join(", ");
  const printer = pythonPrinter(sourceCode, `out`);
  return `from collections import deque
from typing import List, Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_list(values):
    dummy = ListNode(0)
    cur = dummy
    for value in values:
        cur.next = ListNode(value)
        cur = cur.next
    return dummy.next

def build_tree(values):
    values = list(values)
    if not values:
        return None
    nodes = [None if v is None else TreeNode(v) for v in values]
    kids = nodes[::-1]
    root = kids.pop()
    for node in nodes:
        if node is not None:
            if kids: node.left = kids.pop()
            if kids: node.right = kids.pop()
    return root

${sourceCode}

${assigns}
s = Solution()
out = s.${signature.methodName}(${callArgs})
${printer}
`;
}

function pythonLiteral(value) {
  if (value === null) return "None";
  if (Array.isArray(value)) return `[${value.map((item) => pythonLiteral(item)).join(", ")}]`;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  return JSON.stringify(String(value));
}

function pythonPrinter(sourceCode, expr) {
  const text = String(sourceCode || "");
  if (/->\s*bool/.test(text)) return `print("true" if ${expr} else "false")`;
  return `print(${expr})`;
}

function generateJsWrapper(sourceCode, stdin) {
  if (/\bfunction\s+main\s*\(/.test(String(sourceCode || ""))) return String(sourceCode || "");
  const signature = parseJsMethod(sourceCode);
  if (!signature) return String(sourceCode || "");
  const inputs = splitTopLevelValues(stdin);
  const assigns = signature.params.map((param, index) => `const ${param.name} = ${jsLiteral(inferJsValue(inputs[index] ?? ""))};`).join("\n");
  const callArgs = signature.params.map((param) => param.name).join(", ");
  return `function buildList(values) {
  const dummy = { val: 0, next: null };
  let cur = dummy;
  for (const value of values) {
    cur.next = { val: value, next: null };
    cur = cur.next;
  }
  return dummy.next;
}

function buildTree(values) {
  if (!values.length) return null;
  const nodes = values.map((v) => (v === null ? null : { val: v, left: null, right: null }));
  let child = 1;
  for (let i = 0; i < nodes.length && child < nodes.length; i++) {
    if (nodes[i] !== null) {
      if (child < nodes.length) nodes[i].left = nodes[child++];
      if (child < nodes.length) nodes[i].right = nodes[child++];
    }
  }
  return nodes[0];
}

${sourceCode}

${assigns}
const out = ${signature.methodName}(${callArgs});
console.log(Array.isArray(out) ? JSON.stringify(out) : String(out));
`;
}

function jsLiteral(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => jsLiteral(item)).join(", ")}]`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  return JSON.stringify(String(value));
}

function prepareSubmissionCode({ sourceCode, language, stdin }) {
  const key = String(language || "").toLowerCase();
  if (key === "cpp") return generateCppWrapper(sourceCode, stdin);
  if (key === "java") return generateJavaWrapper(sourceCode, stdin);
  if (key === "python") return generatePythonWrapper(sourceCode, stdin);
  if (key === "javascript") return generateJsWrapper(sourceCode, stdin);
  return String(sourceCode || "");
}

async function listLanguages() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error("JUDGE0_API_URL is missing");

  const now = Date.now();
  if (cachedLanguages && now - cachedAt < 10 * 60 * 1000) {
    return cachedLanguages;
  }

  const { data } = await axios.get(`${baseUrl}/languages`, { timeout: 15000 });
  cachedLanguages = Array.isArray(data) ? data : [];
  cachedAt = now;
  return cachedLanguages;
}

async function resolveLanguageId(language) {
  const key = String(language || "").toLowerCase();
  const languages = await listLanguages();

  const patterns = {
    cpp: [/c\+\+/, /\bclang\+\+?\b/, /\bg\+\+\b/, /\bc\+\+\s*\(g\+\+\)/],
    java: [/\bjava\b/],
    python: [/\bpython\b/, /\bpy\b/],
    javascript: [/\bjavascript\b/, /\bnode\.js\b/, /\bnodejs\b/],
  };

  const candidates = patterns[key] || [];
  for (const lang of languages) {
    const name = `${lang.name || ""} ${lang.slug || ""}`.toLowerCase();
    if (candidates.some((re) => re.test(name))) {
      return lang.id;
    }
  }

  const fallbackBySlug = {
    cpp: ["cpp", "cxx", "g++"],
    java: ["java"],
    python: ["python"],
    javascript: ["javascript", "node"],
  };
  const slugs = fallbackBySlug[key] || [];
  for (const lang of languages) {
    const name = `${lang.name || ""} ${lang.slug || ""}`.toLowerCase();
    if (slugs.some((slug) => name.includes(slug))) {
      return lang.id;
    }
  }

  throw new Error(`Judge0 language not found for ${language}`);
}

async function judge0Submit({ sourceCode, language, stdin = "", expectedOutput = null, cpuTimeLimit = 2, memoryLimit = 128000 }) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error("JUDGE0_API_URL is missing");

  const languageId = await resolveLanguageId(language);
  const requestPayload = {
    source_code: prepareSubmissionCode({ sourceCode, language, stdin }),
    language_id: languageId,
    stdin,
    cpu_time_limit: cpuTimeLimit,
    memory_limit: memoryLimit,
  };
  const expected = String(expectedOutput ?? "").trim();
  if (expected !== "") {
    requestPayload.expected_output = String(expectedOutput);
  }

  const { data } = await axios.post(
    `${baseUrl}/submissions`,
    requestPayload,
    {
      timeout: 30000,
      params: { base64_encoded: false, wait: true },
      headers: {
        "Content-Type": "application/json",
        ...(process.env.JUDGE0_API_KEY ? { "X-Auth-Token": process.env.JUDGE0_API_KEY } : {}),
      },
    }
  );

  return { response: data, request: requestPayload };
}

function compareOutput(expectedOutput, stdout, validator = "standard") {
  if (validator === "ignoreWhitespace") {
    return normalizeWhitespace(stdout) === normalizeWhitespace(expectedOutput);
  }
  if (validator === "strict") {
    return String(stdout || "") === String(expectedOutput || "");
  }
  return normalizeStandardOutput(stdout) === normalizeStandardOutput(expectedOutput);
}

function toVerdict(status, expectedOutput, stdout, stderr, compileOutput, validator = "standard") {
  const statusId = Number(status?.id || 0);
  const statusDesc = String(status?.description || "");
  if (statusId === 3) {
    if (expectedOutput == null || String(expectedOutput).trim() === "") {
      return "Accepted";
    }
    return compareOutput(expectedOutput, stdout, validator) ? "Accepted" : "Wrong Answer";
  }
  if (statusDesc.toLowerCase().includes("compile")) return "Compilation Error";
  if (statusDesc.toLowerCase().includes("time limit")) return "Time Limit Exceeded";
  if (statusDesc.toLowerCase().includes("accepted")) return "Accepted";
  if (stderr || compileOutput) return "Runtime Error";
  if (statusId === 6) return "Compilation Error";
  if (statusId === 5) return "Time Limit Exceeded";
  return "Runtime Error";
}

function formatRuntime(time) {
  if (time == null || time === "") return "";
  const ms = Number(time);
  if (!Number.isFinite(ms)) return String(time);
  return `${ms} ms`;
}

function formatMemory(memory) {
  if (memory == null || memory === "") return "";
  const kb = Number(memory);
  if (!Number.isFinite(kb)) return String(memory);
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

async function runAgainstTestcases({ sourceCode, language, testCases = [], validator = "standard", cpuTimeLimit = 2, memoryLimit = 128000 }) {
  const results = [];
  const trace = [];
  for (const testCase of testCases) {
    const expected = String(testCase.expectedOutput ?? testCase.output ?? "");
    const normalizedInput = String(testCase.input ?? "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");
    const { response, request } = await judge0Submit({
      sourceCode,
      language,
      stdin: normalizedInput,
      expectedOutput: expected,
      cpuTimeLimit,
      memoryLimit,
    });

    const verdict = toVerdict(response.status, expected, response.stdout, response.stderr, response.compile_output, validator);
    const result = {
      input: String(testCase.input ?? ""),
      expectedOutput: expected,
      output: String(response.stdout ?? ""),
      verdict,
      status: response.status || null,
      runtime: formatRuntime(response.time),
      memory: formatMemory(response.memory),
      compileOutput: String(response.compile_output ?? ""),
      stderr: String(response.stderr ?? ""),
      isHidden: Boolean(testCase.hidden ?? testCase.isHidden ?? false),
      weight: Number(testCase.weight || 1),
    };
    results.push(result);
    trace.push({
      testCase: {
        input: normalizedInput,
        expectedOutput: expected,
        isHidden: Boolean(testCase.hidden ?? testCase.isHidden ?? false),
        weight: Number(testCase.weight || 1),
      },
      request,
      response,
      result,
    });
    if (verdict !== "Accepted") break;
  }

  const finalVerdict = results.every((r) => r.verdict === "Accepted") ? "Accepted" : results[results.length - 1]?.verdict || "Runtime Error";
  const last = results[results.length - 1] || {};
  return {
    verdict: finalVerdict,
    runtime: last.runtime || "",
    memory: last.memory || "",
    output: last.output || "",
    testcaseResults: results,
    trace,
  };
}

module.exports = {
  runAgainstTestcases,
  judge0Submit,
  resolveLanguageId,
  formatRuntime,
  formatMemory,
  toVerdict,
  normalizeText,
  normalizeWhitespace,
  normalizeStandardOutput,
  compareOutput,
  prepareSubmissionCode,
  generateCppWrapper,
};
