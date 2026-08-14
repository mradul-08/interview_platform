function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripPrefix(value) {
  return String(value || "").trim().replace(/^(?:[a-zA-Z_]\w*\s*=\s*)/, "").trim();
}

function parseValue(raw) {
  const text = stripPrefix(raw);
  if (text === "") return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return Number(text);
  try {
    return JSON.parse(text.replace(/'/g, '"'));
  } catch {
    return text.replace(/^"|"$/g, "");
  }
}

function parseCppSignature(source) {
  const text = String(source || "");
  const classStart = text.search(/\bclass\s+Solution\b/);
  if (classStart < 0) return null;
  const open = text.indexOf("{", classStart);
  if (open < 0) return null;
  let depth = 0;
  let close = text.length;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) { close = i; break; }
    }
  }
  let body = text.slice(open + 1, close);
  const publicAt = body.indexOf("public:");
  if (publicAt >= 0) body = body.slice(publicAt + 7);
  const match = body.match(/(?:static\s+|inline\s+|virtual\s+)*(?:const\s+)?([a-zA-Z_]\w*(?:\s*<[^;{}()]+>)?[\s\*&\[\]]*)\s+([a-zA-Z_]\w*)\s*\(([^{};]*)\)\s*(?:const\s*)?\{/m);
  if (!match) return null;
  return {
    params: match[3].split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
      const pieces = part.split(/\s+/);
      const name = pieces.pop();
      return { name, type: compact(pieces.join(" ")) };
    }),
  };
}

function isArrayType(type) {
  return /vector\s*<|\[\]|ListNode|int\s*\*/i.test(type);
}

function isNestedArrayType(type) {
  return /vector\s*<\s*vector\s*</i.test(type) || /int\s*\[\]\s*\[\]/.test(type);
}

function formatValue(type, value) {
  if (isNestedArrayType(type)) {
    if (!Array.isArray(value)) return null;
    return [String(value.length), ...value.map((row) => {
      if (!Array.isArray(row)) return null;
      return `${row.length} ${row.join(" ")}`;
    })].join("\n");
  }
  if (isArrayType(type)) {
    if (!Array.isArray(value)) return null;
    return `${value.length}${value.length ? ` ${value.join(" ")}` : ""}`;
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value === null || value === undefined) return "0";
  return String(value);
}

function convertInput(input, signature) {
  if (!signature?.params?.length) return { ok: false, reason: "C++ function signature not found" };
  const lines = String(input || "").replace(/\\n/g, "\n").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== signature.params.length) {
    return { ok: false, reason: `Expected ${signature.params.length} input line(s), found ${lines.length}` };
  }
  const converted = [];
  for (let i = 0; i < signature.params.length; i += 1) {
    const value = parseValue(lines[i]);
    const formatted = formatValue(signature.params[i].type, value);
    if (formatted == null) return { ok: false, reason: `Unsupported value for ${signature.params[i].name}` };
    converted.push(formatted);
  }
  return { ok: true, input: converted.join("\n") };
}

function describeContract(signature) {
  if (!signature?.params?.length) return "Read the raw testcase from stdin and print only the answer to stdout.";
  return signature.params.map((param, index) => {
    const type = param.type;
    if (isNestedArrayType(type)) return `Line ${index + 1}: row count, then each row as: length followed by values`;
    if (isArrayType(type)) return `Line ${index + 1}: length followed by ${param.name} values`;
    return `Line ${index + 1}: ${param.name} (${type})`;
  }).join("\n");
}

function normalizeTestcaseContract({ starterCode = {}, testCases = [], inputFormat = "" } = {}) {
  const cases = Array.isArray(testCases) ? testCases : [];
  if (cases.length === 0) {
    return {
      testCases: cases,
      contractVersion: 0,
      inputFormat: String(inputFormat || ""),
      rawFallback: false,
    };
  }

  const signature = parseCppSignature(starterCode?.cpp || "");
  const convertedCases = [];
  let failure = null;

  for (const testCase of cases) {
    const result = convertInput(testCase.input, signature);
    if (!result.ok) {
      failure = result.reason;
      break;
    }
    convertedCases.push({ ...testCase, input: result.input });
  }

  if (failure) {
    return {
      testCases: cases.map((testCase) => ({ ...testCase, input: String(testCase.input || "") })),
      contractVersion: 2,
      inputFormat: String(inputFormat || "Raw stdin contract: each testcase is passed exactly as stored. Read stdin until EOF and print only the answer to stdout."),
      rawFallback: true,
      reason: failure,
    };
  }

  return {
    testCases: convertedCases,
    contractVersion: 2,
    inputFormat: describeContract(signature),
    rawFallback: false,
  };
}

module.exports = { parseCppSignature, convertInput, describeContract, normalizeTestcaseContract };
