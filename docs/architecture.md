# CodeVerse architecture

CodeVerse is split into a Vite React client and an Express API backed by MongoDB.

```text
Browser (React/Vite)
        |
        | REST + cookies/JWT + Socket.IO
        v
Express API (backend/server-entry.js)
        |
        +--> MongoDB / Mongoose models
        +--> Docker execution containers
        +--> Optional Redis/BullMQ import worker
        +--> Optional OAuth, SMTP, Cloudinary, LiveKit, Judge0, Ollama
```

## Frontend

`frontend/src` contains routing, layouts, shared API/realtime clients, dashboard pages, aptitude features, study-group features, profile views, and authentication screens. `VITE_API_URL` selects the backend origin.

## Backend

`backend/server-entry.js` configures security middleware, sessions, authentication, routes, health checks, Socket.IO, import processing, and competitive-test lifecycle handling. Controllers coordinate requests, services contain business logic, and Mongoose models define persistence.

## Code execution

Execution requests are validated by the API and run through short-lived Docker containers. Supported languages are C++, Java, Python, and JavaScript. Containers are created per testcase with network access disabled, a read-only root filesystem, resource limits, and cleanup.

## Data and optional services

MongoDB is required for the application. Redis/BullMQ, OAuth, SMTP, Cloudinary, LiveKit, Judge0, and Ollama are optional and enable specific features. See `backend/.env.example` and the root README before enabling them.
