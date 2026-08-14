// One-time fix for double-encoded UTF-8 text (â€", Â·, etc.) across the codebase.
// Run once: node scripts/fix-mojibake.cjs
const fs = require("fs");
const path = require("path");

const ROOTS = ["frontend/src", "backend"];
const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".css"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);

const REPLACEMENTS = {
  "Â·": "·",
  "â€¦": "…",
  "â€”": "—",
  "â€“": "–",
  "â€™": "’",
  "â€œ": "“",
  "â€\u009d": "”",
};

let filesFixed = 0;
let totalReplacements = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!EXTENSIONS.includes(path.extname(entry.name))) continue;

    let text = fs.readFileSync(full, "utf8");
    let count = 0;
    for (const [bad, good] of Object.entries(REPLACEMENTS)) {
      const parts = text.split(bad);
      count += parts.length - 1;
      text = parts.join(good);
    }
    if (count > 0) {
      fs.writeFileSync(full, text, "utf8");
      filesFixed += 1;
      totalReplacements += count;
      console.log(`Fixed ${count} in ${full}`);
    }
  }
}

for (const root of ROOTS) {
  if (fs.existsSync(root)) walk(root);
}

console.log(`\nDone. ${totalReplacements} replacements across ${filesFixed} files.`);
