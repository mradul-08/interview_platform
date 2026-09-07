# CodeVerse

[![CI](https://github.com/mradul-08/interview_platform/actions/workflows/ci.yml/badge.svg)](https://github.com/mradul-08/interview_platform/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/live-demo-CodeVerse-orange)](https://interviewlattice.duckdns.org)

CodeVerse is live at **[interviewlattice.duckdns.org](https://interviewlattice.duckdns.org)**.
The production API health endpoint is **[`/api/health`](https://interviewlattice.duckdns.org/api/health)**.

**Author:** **[Mradul Garg](https://github.com/mradul-08)**

**Email:** **[mradulgarg2005@gmail.com](mailto:mradulgarg2005@gmail.com)**

CodeVerse is a full-stack interview-preparation platform for developers and students. It combines coding practice, aptitude preparation, mock interviews, study groups, messaging, progress tracking, and gamification in one application.

## About the project

CodeVerse was built as a practical, end-to-end learning platform rather than a collection of disconnected demo pages. The goal was to bring the daily interview-preparation journey into one place: solve problems, practise aptitude, track progress, join study groups, communicate with other learners, and prepare for real interviews.

Building the application involved designing the user experience, creating the React frontend, developing the Express and MongoDB backend, connecting authentication and external services, and making the system work reliably in production. The platform also includes Docker-based code execution, real-time messaging, OAuth login, email flows, profile uploads, gamification, mock interviews, and operational safeguards for backups and health monitoring.

The production work required more than making features appear on screen. It included handling authentication redirects, persistent sessions, database connectivity, service restarts, HTTPS routing, environment configuration, isolated code execution, error states, and deployment testing on an Ubuntu EC2 server. The project continues to evolve through testing, debugging, and improvements based on real usage.

## Features

- DSA problems with starter code, test cases, submissions, verdicts, discussions, solutions, bookmarks, and sheets
- Sandboxed C++, Java, Python, and JavaScript execution through Docker
- Aptitude practice, timed mock tests, review, analytics, streaks, and badges
- Mock interview scheduling and optional LiveKit interview rooms
- Study groups with discussions, tasks, resources, sessions, leaderboards, and competitive tests
- Direct messaging, notifications, profiles, company questions, and role-based admin/company areas
- Optional Ollama AI generation and Redis/BullMQ background processing

## Live production deployment

- Frontend: [https://interviewlattice.duckdns.org](https://interviewlattice.duckdns.org)
- API health: [https://interviewlattice.duckdns.org/api/health](https://interviewlattice.duckdns.org/api/health)
- HTTPS termination and reverse proxy: Nginx on Ubuntu EC2
- Application process: `systemd` with automatic restart and boot enablement
- Sessions: MongoDB-backed `connect-mongo` store
- Code execution: isolated Docker containers with language-specific images
- Backups: daily compressed MongoDB archive with 14-day local retention
- Health checks: systemd timer running every five minutes

The production installation procedure and operational checks are documented in
[`docs/production-deployment.md`](docs/production-deployment.md). Secrets and
host-specific configuration remain outside GitHub in environment files.

## Tech stack

- Frontend: React 19, Vite, React Router, Tailwind/PostCSS, Recharts, Monaco Editor, Socket.IO, and LiveKit
- Backend: Node.js, Express 5, MongoDB/Mongoose, Socket.IO, Passport, BullMQ, Nodemailer, and Cloudinary
- Execution: short-lived Docker containers with no network access and read-only root filesystems

## Repository layout

```text
frontend/   React/Vite client
backend/    Express API, models, services, jobs, seed data, and tests
docs/       Architecture and feature audit notes
scripts/    Repository maintenance scripts
```

See [`docs/architecture.md`](docs/architecture.md) for the service boundaries and request flow.

## Prerequisites

- Node.js 22.12 or newer
- MongoDB local or MongoDB Atlas
- Docker Desktop or another Docker Engine for code execution
- Git

Redis, OAuth, SMTP, Cloudinary, LiveKit, Judge0, Stream, and Ollama are optional integrations. Their related features require the corresponding configuration.

## Local setup

Install dependencies and create local environment files:

```powershell
cd backend
npm install
Copy-Item .env.example .env
cd ..\frontend
npm install
Copy-Item .env.example .env
```

Set at least `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `CLIENT_URL` in `backend/.env`. The frontend uses `VITE_API_URL` and defaults to `http://localhost:5001`.

Start the API and client in separate terminals:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Code execution setup

Pull the language images before submitting code:

```powershell
docker pull gcc:13
docker pull eclipse-temurin:21-jdk
docker pull python:3.12-slim
docker pull node:22-slim
```

The backend reports an infrastructure error when Docker or an image is unavailable instead of mislabeling the condition as a user time-limit failure. See [`backend/docker/README.md`](backend/docker/README.md).

## Verification commands

```powershell
cd frontend
npm run lint
npm run build

cd ..\backend
npm run test:streak
npm run test:gamification
npm run test:aptitude
npm run test:verdict
```

Database seed, import, and migration commands are listed in `backend/package.json` and should only be run against the intended database.

## Configuration and API health

The non-secret templates are [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example). Do not commit `.env` files, credentials, private keys, production database URLs, or real user data. Check the complete backend template before enabling OAuth, SMTP, Redis/BullMQ, Cloudinary, LiveKit, Judge0, Stream, or Ollama.

Once the backend is running, check `GET http://localhost:5001/api/health`. The response reports API status, MongoDB state, uptime, and a timestamp.

For the deployed environment, check `GET https://interviewlattice.duckdns.org/api/health`.
The expected response includes `"success":true` and `"database":"connected"`.

## Continuous integration

Every push and pull request targeting `main` runs GitHub Actions for:

- Frontend dependency installation, ESLint, and production build
- Backend dependency installation and the complete Node test suite

Keep pull requests focused, do not commit secrets or generated artifacts, and
wait for the CI check to pass before merging.

## Current limitations and roadmap

- Code execution requires Docker and the language images above.
- OAuth, email, uploads, video rooms, background imports, and AI generation are configuration-dependent.
- The current backup is local to the EC2 host; copy archives to S3 or another host for disaster recovery.
- External uptime alerting is optional and should monitor the production health endpoint.
- Planned improvements include end-to-end browser coverage, centralized log aggregation, and a public walkthrough with screenshots.

## Contributing and security

See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and the GitHub issue/PR templates.

## License

CodeVerse is provided under the [ISC License](LICENSE).
