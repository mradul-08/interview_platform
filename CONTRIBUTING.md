# Contributing to CodeVerse

Thanks for helping improve CodeVerse. Keep changes focused, explain the user or engineering problem they solve, and avoid committing secrets, local `.env` files, logs, generated binaries, or database dumps.

## Development flow

1. Create a branch from `main`.
2. Install dependencies in both `backend` and `frontend`.
3. Copy the environment examples and configure only the services needed for your change.
4. Make the smallest complete change that addresses the issue.
5. Run `npm run lint` and `npm run build` in `frontend`.
6. Run the relevant backend tests in `backend`.
7. Open a pull request with a summary, testing performed, configuration changes, and screenshots for UI changes.

## Pull requests

Pull requests should describe behavior changes clearly and call out migrations, new environment variables, Docker requirements, or third-party integrations. Do not include credentials or real user data in screenshots, fixtures, or logs.
