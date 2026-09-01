# CodeVerse

CodeVerse is a full-stack interview-preparation platform for developers and students. It combines coding practice, aptitude preparation, mock interviews, study groups, messaging, progress tracking, and gamification in one application.

## What is included

- DSA problem browsing, starter code, test cases, submissions, verdicts, discussions, solutions, bookmarks, and sheets
- Sandboxed code execution for C++, Java, Python, and JavaScript through Docker
- Aptitude practice, timed mock tests, review, progress analytics, streaks, and badges
- Mock interview scheduling and LiveKit-powered interview rooms when configured
- Study groups with announcements, discussions, tasks, resources, sessions, leaderboards, and competitive tests
- Direct messaging, notifications, profiles, company questions, and role-based admin/company areas
- Optional local AI generation through Ollama and optional Redis/BullMQ background processing

## Tech stack

- Frontend: React 19, Vite, React Router, Tailwind/PostCSS, Recharts, Monaco Editor, Socket.IO client, LiveKit
- Backend: Node.js, Express 5, MongoDB/Mongoose, Socket.IO, Passport, BullMQ, Nodemailer, Cloudinary
- Code execution: short-lived Docker containers with no network access and read-only root filesystems

## Repository layout

```text
frontend/   React/Vite client
backend/    Express API, models, services, jobs, seed data, and tests
docs/       Architecture and feature audit notes
scripts/    Repository maintenance scripts
```

## Prerequisites

- Node.js 20 or newer
- MongoDB (local or MongoDB Atlas)
- Docker Desktop or another Docker Engine for code execution
- Git

Redis, OAuth providers, SMTP, Cloudinary, LiveKit, Judge0, and Ollama are optional integrations. The related features require their corresponding configuration.

## Local setup

1. Install dependencies:

   ```powershell
   cd backend
   npm install
   cd ..\frontend
   npm install
   ```

2. Create environment files from the checked-in examples:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   Copy-Item frontend\.env.example frontend\.env
   ```

   Set at least `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `CLIENT_URL` in `backend/.env`. The frontend uses `VITE_API_URL` and defaults to `http://localhost:5001`.

3. Start the API and client in separate terminals:

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

The backend reports an infrastructure error when an image or Docker daemon is unavailable; it does not mislabel that condition as a user time-limit failure. See [`backend/docker/README.md`](backend/docker/README.md) for execution details.

## Useful commands

### Frontend

```powershell
cd frontend
npm run lint
npm run build
npm run preview
```

### Backend

```powershell
cd backend
npm run test:streak
npm run test:gamification
npm run test:aptitude
npm run test:verdict
npm run validate:aptitude
```

Database seed/import and migration commands are listed in `backend/package.json`. Run them only after configuring the intended MongoDB database.

## Environment variables

The complete, non-secret template is in [`backend/.env.example`](backend/.env.example). Do not commit `.env` files, credentials, private keys, OAuth secrets, or production database URLs. Frontend configuration belongs in `frontend/.env` and should contain only public `VITE_*` values.

## API health check

Once the backend is running, check:

```text
GET http://localhost:5001/api/health
```

The response includes API status, MongoDB connection state, uptime, and a timestamp.

## Contributing

Create a focused branch, make the smallest related change, run the frontend lint/build checks and relevant backend tests, then open a pull request with a clear description and verification notes.

## License

The backend currently declares the ISC license. Confirm the project’s intended licensing and add a root `LICENSE` file before distributing CodeVerse publicly.
