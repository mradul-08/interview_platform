// Canonical sheet catalog used by the sheets backend and seeded content.

const SHEET_CATALOG = [
  { name: "Blind75", label: "Blind 75" },
  { name: "TOP 150", label: "TOP 150" },
  { name: "PLACEMENT 100", label: "PLACEMENT 100" },
  { name: "Striver", label: "Striver" },
];

const SHEET_NAME_SET = new Set(SHEET_CATALOG.map((sheet) => sheet.name));

const normalizeSheetName = (name) => {
  if (!name) return "";
  const trimmed = String(name).trim();
  const canonical = SHEET_CATALOG.find((sheet) => sheet.name.toLowerCase() === trimmed.toLowerCase());
  return canonical ? canonical.name : trimmed;
};

const isKnownSheet = (name) => SHEET_NAME_SET.has(normalizeSheetName(name));

module.exports = {
  SHEET_CATALOG,
  normalizeSheetName,
  isKnownSheet,
};
