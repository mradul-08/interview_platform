# CodeVerse maintenance

CodeVerse is currently a solo-maintained project. The repository owner is responsible for product decisions, implementation, reviews, and releases. This document records the project’s working standards and provides guidance for future feedback or outside contributions.

Please keep changes focused, explain the user or engineering problem they solve, and avoid committing secrets, local `.env` files, logs, generated binaries, or database dumps.

## Development flow

1. Create a branch from `main`.
2. Install dependencies in both `backend` and `frontend`.
3. Copy the environment examples and configure only the services needed for your change.
4. Make the smallest complete change that addresses the issue.
5. Run `npm run lint` and `npm run build` in `frontend`.
6. Run the relevant backend tests in `backend`.
7. Open a pull request with a summary, testing performed, configuration changes, and screenshots for UI changes.

## Feedback and pull requests

Issues and pull requests are welcome for clearly described bugs, security concerns, or useful improvements, but acceptance is not guaranteed because this is a solo-maintained project. Pull requests should describe behavior changes clearly and call out migrations, new environment variables, Docker requirements, or third-party integrations. Do not include credentials or real user data in screenshots, fixtures, or logs.
