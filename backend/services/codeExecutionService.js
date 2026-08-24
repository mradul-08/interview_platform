const crypto = require("crypto");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DOCKER_CONFIG_DIR = process.env.DOCKER_CONFIG || path.join(__dirname, "..", ".docker-task");
const dockerEnvironment = { ...process.env, DOCKER_CONFIG: DOCKER_CONFIG_DIR };

const LANGUAGE_CONFIG = {
  cpp: { image: "gcc:13", file: "solution.cpp", command: "g++ -std=c++17 -O2 -pipe solution.cpp -o solution || exit 200; start=$(date +%s%3N); timeout RUN_SECONDSs ./solution; code=$?; end=$(date +%s%3N); printf '\\n__CODEVERSE_RUNTIME_MS__=%s\\n' $((end-start)) >&2; exit $code" },
  java: { image: "eclipse-temurin:21-jdk", file: "Main.java", command: "javac Main.java || exit 200; start=$(date +%s%3N); timeout RUN_SECONDSs java Main; code=$?; end=$(date +%s%3N); printf '\\n__CODEVERSE_RUNTIME_MS__=%s\\n' $((end-start)) >&2; exit $code" },
  python: { image: "python:3.12-slim", file: "solution.py", command: "python3 -m py_compile solution.py || exit 200; start=$(date +%s%3N); timeout RUN_SECONDSs python3 solution.py; code=$?; end=$(date +%s%3N); printf '\\n__CODEVERSE_RUNTIME_MS__=%s\\n' $((end-start)) >&2; exit $code" },
  javascript: { image: "node:22-slim", file: "solution.js", command: "node --check solution.js || exit 200; start=$(date +%s%3N); timeout RUN_SECONDSs node solution.js; code=$?; end=$(date +%s%3N); printf '\\n__CODEVERSE_RUNTIME_MS__=%s\\n' $((end-start)) >&2; exit $code" },
};

function normalizeLanguage(language) {
  const key = String(language || "").toLowerCase().trim();
  if (["js", "node", "nodejs"].includes(key)) return "javascript";
  if (["c++", "g++", "cpp"].includes(key)) return "cpp";
  return key;
}

function getDockerImage(language) {
  const override = process.env.CODE_EXECUTION_IMAGE;
  return override || LANGUAGE_CONFIG[normalizeLanguage(language)]?.image;
}

function getTimeoutMs(timeLimit) {
  const limit = Number(timeLimit || 2000);
  // Compilation and Docker startup are not user-program runtime. Give those
  // phases a grace window; the actual code limit is enforced by `timeout`
  // inside the container below.
  // Docker Desktop on Windows can spend several seconds starting a cold
  // container. The code's real limit is enforced by `timeout` inside the
  // container, so the host watchdog needs a separate, larger startup grace.
  return Math.max(15000, Math.min(limit + 15000, 60000));
}

function runDocker({ workDir, input, command, language, timeLimit, memoryLimit }) {
  return new Promise((resolve, reject) => {
    const containerName = `codeverse-${crypto.randomUUID()}`;
    const seconds = Math.max(1, Math.ceil(Number(timeLimit || 2000) / 1000));
    const renderedCommand = command.replaceAll("RUN_SECONDS", String(seconds));
    const memory = `${Math.max(16, Number(memoryLimit || 256))}m`;
    const args = [
      "run", "--rm", "--name", containerName, "-i",
      // Images are provisioned explicitly. Do not spend the user's code
      // timeout trying to pull an image from Docker Hub.
      "--pull", "never",
      "--network", "none", "--cpus", "1", "--memory", memory,
      "--pids-limit", "64", "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges", "--read-only",
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
      "--mount", `type=bind,source=${workDir},target=/workspace,readonly=false`,
      "-w", "/workspace", getDockerImage(language), "sh", "-c", renderedCommand,
    ];

    const child = spawn(process.env.DOCKER_BIN || "docker", args, { windowsHide: true, env: dockerEnvironment });
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    let outputLimitExceeded = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const appendOutput = (target, chunk, currentBytes, limitReached) => {
      if (limitReached) return { bytes: currentBytes, reached: true };
      const remaining = MAX_OUTPUT_BYTES - currentBytes;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      if (buffer.length > remaining) {
        if (remaining > 0) target.push(buffer.subarray(0, remaining));
        return { bytes: MAX_OUTPUT_BYTES, reached: true };
      }
      target.push(buffer);
      return { bytes: currentBytes + buffer.length, reached: false };
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, getTimeoutMs(timeLimit));

    child.stdout.on("data", (chunk) => {
      const result = appendOutput(stdout, chunk, stdoutBytes, stdoutBytes >= MAX_OUTPUT_BYTES);
      stdoutBytes = result.bytes;
      if (result.reached) {
        outputLimitExceeded = true;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk) => {
      const result = appendOutput(stderr, chunk, stderrBytes, stderrBytes >= MAX_OUTPUT_BYTES);
      stderrBytes = result.bytes;
      if (result.reached) {
        outputLimitExceeded = true;
        child.kill("SIGKILL");
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", async (exitCode, signal) => {
      clearTimeout(timer);
      // A killed docker CLI can leave the named container around. Cleanup is
      // best-effort and never replaces the actual execution result.
      if (timedOut || outputLimitExceeded) {
        await removeContainer(containerName);
      }
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        exitCode: timedOut ? 124 : exitCode,
        signal,
        timedOut,
        outputLimitExceeded,
      });
    });

    child.stdin.end(String(input || ""));
  });
}

function removeContainer(name) {
  return new Promise((resolve) => {
    const cleanup = spawn(process.env.DOCKER_BIN || "docker", ["rm", "-f", name], { windowsHide: true, env: dockerEnvironment });
    cleanup.on("close", () => resolve());
    cleanup.on("error", () => resolve());
  });
}

function classifyExecutionResult({ result, cleanStderr = "" }) {
  const err = String(cleanStderr || "").toLowerCase();
  const dockerUnavailable = result.exitCode === 125 || /unable to find image|pull access denied|cannot connect to the docker daemon|failed to connect to the docker api|is the docker daemon running|no such image|dockerdesktoplinuxengine/i.test(result.stderr || "");

  if (dockerUnavailable) {
    return { id: 0, description: "System Error" };
  }
  if (result.timedOut || result.exitCode === 124) {
    return { id: 5, description: "Time Limit Exceeded" };
  }
  if (result.outputLimitExceeded) {
    return { id: 7, description: "Output Limit Exceeded" };
  }
  if (result.exitCode === 0) {
    return { id: 3, description: "Accepted" };
  }
  if (result.exitCode === 200) {
    return { id: 6, description: "Compilation Error" };
  }
  if (/(traceback|runtimeerror|segmentation fault)/i.test(cleanStderr)) {
    return { id: 11, description: "Runtime Error" };
  }
  if (
    result.exitCode === 137 ||
    err.includes("bad_alloc") ||
    err.includes("std::bad_alloc") ||
    err.includes("cannot allocate memory") ||
    err.includes("out of memory") ||
    err.includes("oom")
  ) {
    return { id: 4, description: "Memory Limit Exceeded" };
  }
  return { id: 11, description: "Runtime Error" };
}

async function executeInDocker({ sourceCode, language, stdin = "", timeLimit = 2000, memoryLimit = 256 }) {
  const normalizedLanguage = normalizeLanguage(language);
  const config = LANGUAGE_CONFIG[normalizedLanguage];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  // stdin/stdout contract: execute exactly what the user submitted. There is
  // deliberately no method-name, class-name, or parameter-type guessing.
  const generatedSource = String(sourceCode || "");
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "codeverse-exec-"));
  const sourcePath = path.join(workDir, config.file);
  const startedAt = Date.now();
  try {
    await fs.mkdir(DOCKER_CONFIG_DIR, { recursive: true });
    // The container runs as the unprivileged `runner` user. A writable bind
    // mount is needed for compiler artifacts (class files and executables).
    await fs.chmod(workDir, 0o777);
    await fs.writeFile(sourcePath, generatedSource, "utf8");
    const result = await runDocker({
      workDir,
      input: stdin,
      language: normalizedLanguage,
      command: config.command,
      timeLimit,
      memoryLimit,
    });
    const runtimeMatch = result.stderr.match(/__CODEVERSE_RUNTIME_MS__=(\d+)/);
    const runtime = runtimeMatch ? `${runtimeMatch[1]} ms` : `${Date.now() - startedAt} ms`;
    const cleanStderr = result.stderr.replace(/\s*__CODEVERSE_RUNTIME_MS__=\d+\s*/g, "\n").trim();
    const status = classifyExecutionResult({ result, cleanStderr });
    return {
      response: {
        status,
        stdout: result.stdout,
        stderr: cleanStderr,
        compile_output: status.id === 6 ? cleanStderr : "",
        time: runtime,
        memory: "",
      },
      request: { language: normalizedLanguage, source_code: generatedSource, stdin, timeLimit, memoryLimit },
      generatedSource,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

module.exports = { executeInDocker, normalizeLanguage, classifyExecutionResult, getTimeoutMs };
