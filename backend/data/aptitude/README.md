# Aptitude question bank

This directory is intentionally separate from DSA/coding data. It must contain exactly four JSON files:

- `quantitative-50.json`
- `logical-50.json`
- `verbal-50.json`
- `data-interpretation-50.json`

Each file must contain 50 original questions with a 15 Easy / 25 Medium / 10 Hard distribution. Run `npm run validate:aptitude` before importing. The import script writes only to the `AptitudeQuestion` collection and never modifies the DSA `Problem` collection.
