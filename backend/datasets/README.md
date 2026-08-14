# CodeVerse Dataset Format

Use this folder for source datasets before import.

Recommended structure:

- `datasets/dsa/*.json`
- `datasets/companies/*.json`
- `datasets/custom/*.json`
- `datasets/problems.jsonl`
- optional `datasets/master_problems.csv` as a spreadsheet source

Each file must follow the standard CodeVerse schema below.

## Standard Schema

```json
{
  "title": "",
  "slug": "",
  "description": "",
  "difficulty": "Easy",
  "inputFormat": "",
  "outputFormat": "",
  "constraints": [],
  "examples": [
    {
      "input": "",
      "output": "",
      "explanation": ""
    }
  ],
  "starterCodes": [
    {
      "language": "cpp",
      "starterCode": "",
      "functionSignature": ""
    }
  ],
  "testCases": [
    {
      "input": "",
      "expectedOutput": "",
      "isHidden": false,
      "weight": 1
    }
  ],
  "hints": [],
  "editorial": "",
  "tags": [],
  "companies": [],
  "sheets": [],
  "source": "dataset",
  "sourceId": "",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "isPublished": true,
  "createdBy": "system"
}
```

## Scaling Guidance

For 5000+ problems, do not store them as one giant JSON array if you can avoid it.

Best options:

1. One file per problem
2. One folder per source or sheet
3. Optional `manifest.json` for bulk metadata
4. A `problems.jsonl` master file where each line is one problem JSON object
5. Optional `master_problems.csv` that can be converted into JSONL with `npm run convert:problems`

Template files:

- `datasets/master_problems.csv`

This keeps imports resumable and avoids huge merge conflicts.
