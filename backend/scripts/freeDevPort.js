const net = require("node:net");
const { execFileSync } = require("node:child_process");

const port = Number(process.argv[2] || 5001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid development port: ${process.argv[2]}`);
  process.exit(1);
}

function findWindowsListeners() {
  const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[0] === "TCP" && parts[1]?.endsWith(`:${port}`) && parts[3] === "LISTENING")
    .map((parts) => Number(parts[4]))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function findUnixListeners() {
  try {
    const output = execFileSync("lsof", ["-ti", `TCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    return output.split(/\s+/).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

const pids = process.platform === "win32" ? findWindowsListeners() : findUnixListeners();
for (const pid of [...new Set(pids)]) {
  if (process.platform === "win32") {
    let task;
    try {
      task = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8" });
    } catch {
      console.error(`Could not identify the process using port ${port} (PID ${pid}); refusing to terminate it.`);
      process.exit(1);
    }
    if (!/^"node(?:\.exe)?"/im.test(task.trim())) {
      console.error(`Port ${port} is occupied by a non-Node process (PID ${pid}); refusing to terminate it.`);
      process.exit(1);
    }
  }

  try {
    process.kill(pid);
    console.log(`Stopped stale Node process ${pid} using development port ${port}.`);
  } catch (error) {
    console.error(`Could not stop process ${pid} on port ${port}: ${error.message}`);
    process.exit(1);
  }
}

if (!pids.length) console.log(`Development port ${port} is available.`);

// Give Windows a moment to release the socket before nodemon starts.
if (pids.length) {
  const server = net.createServer();
  server.once("error", () => process.exit(1));
  server.listen(port, "127.0.0.1", () => server.close());
}
