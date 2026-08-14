function normalizeInputText(value) {
  return String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseExecutionInput(rawInput) {
  const text = normalizeInputText(rawInput);
  if (!text) {
    return { ok: true, value: "", parts: [] };
  }

  const parts = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    ok: true,
    value: text,
    parts,
  };
}

module.exports = {
  normalizeInputText,
  parseExecutionInput,
};
