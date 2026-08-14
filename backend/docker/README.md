# Code execution containers

The backend uses maintained official images directly, so no apt-based image
build is required:

- C++: `gcc:13`
- Java: `eclipse-temurin:21-jdk`
- Python: `python:3.12-slim`
- JavaScript: `node:22-slim`

Docker pulls each image once, then reuses it. The backend starts one short-lived
container per testcase with no network, CPU/memory/PID limits, a read-only root
filesystem, and automatic cleanup.

Before running the backend, pull the four images once:

```powershell
docker pull gcc:13
docker pull eclipse-temurin:21-jdk
docker pull python:3.12-slim
docker pull node:22-slim
```

The executor intentionally does not auto-pull during a submission. A missing
image is reported as an infrastructure error instead of being misreported as
the user's Time Limit Exceeded verdict.

The old `Dockerfile` is retained as an optional all-in-one image, but it is not
used by the application anymore.

Supported language keys are `cpp`, `java`, `python`, and `javascript`.
