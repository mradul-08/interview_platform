# CodeVerse

[![CI](https://github.com/mradul-08/interview_platform/actions/workflows/ci.yml/badge.svg)](https://github.com/mradul-08/interview_platform/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

CodeVerse is a full-stack interview-preparation platform for developers and students. It combines coding practice, aptitude preparation, mock interviews, study groups, messaging, progress tracking, and gamification in one application.

## Features

- DSA problems with starter code, test cases, submissions, verdicts, discussions, solutions, bookmarks, and sheets
- Sandboxed C++, Java, Python, and JavaScript execution through Docker
- Aptitude practice, timed mock tests, review, analytics, streaks, and badges
- Mock interview scheduling and optional LiveKit interview rooms
- Study groups with discussions, tasks, resources, sessions, leaderboards, and competitive tests
- Direct messaging, notifications, profiles, company questions, and role-based admin/company areas
- Optional Ollama AI generation and Redis/BullMQ background processing

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

## Current limitations and roadmap

- No hosted demo is configured in this repository; local MongoDB and required optional services must be supplied by the developer.
- Code execution requires Docker and the language images above.
- OAuth, email, uploads, video rooms, background imports, and AI generation are configuration-dependent.
- Planned improvements include a hosted demo, end-to-end browser coverage, and a public walkthrough with screenshots.

## Contributing and security

See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and the GitHub issue/PR templates.

## License

CodeVerse is provided under the [ISC License](LICENSE).
