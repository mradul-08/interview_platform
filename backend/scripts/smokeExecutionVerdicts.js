const { executeInDocker } = require("../services/codeExecutionService");

const cases = [
  {
    name: "Accepted",
    language: "python",
    source: "print('accepted')",
    timeLimit: 2000,
    memoryLimit: 256,
  },
  {
    name: "Compilation Error",
    language: "cpp",
    source: "int main( {",
    timeLimit: 2000,
    memoryLimit: 256,
  },
  {
    name: "Runtime Error",
    language: "python",
    source: "raise RuntimeError('boom')",
    timeLimit: 2000,
    memoryLimit: 256,
  },
  {
    name: "Time Limit Exceeded",
    language: "python",
    source: "while True: pass",
    timeLimit: 1000,
    memoryLimit: 256,
  },
  {
    name: "Output Limit Exceeded",
    language: "python",
    source: "print('x' * (2 * 1024 * 1024))",
    timeLimit: 2000,
    memoryLimit: 256,
  },
  {
    name: "Memory Limit Exceeded",
    language: "python",
    source: "data = bytearray(256 * 1024 * 1024)\nprint('unreachable')",
    timeLimit: 5000,
    memoryLimit: 32,
  },
];

async function main() {
  for (const item of cases) {
    try {
      const result = await executeInDocker({
        sourceCode: item.source,
        language: item.language,
        stdin: "",
        timeLimit: item.timeLimit,
        memoryLimit: item.memoryLimit,
      });
      console.log(JSON.stringify({
        expected: item.name,
        actual: result.response.status.description,
        runtime: result.response.time,
        exitCode: result.response.status.id,
        pass: result.response.status.description === item.name,
      }));
    } catch (error) {
      console.log(JSON.stringify({ expected: item.name, actual: "Harness Error", error: error.message, pass: false }));
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
