# CodeVerse frontend

This directory contains the React/Vite client for CodeVerse, including the public landing and authentication experience plus the student, company, and admin dashboards.

For complete product documentation, setup instructions, environment variables, backend requirements, and verification commands, see the [root README](../README.md).

## Local commands

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Start the backend before opening the client. Set `VITE_API_URL` when the API is not running at `http://localhost:5001`.

```powershell
npm run lint
npm run build
npm run preview
```
