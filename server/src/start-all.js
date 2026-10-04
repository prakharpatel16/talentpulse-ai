const { spawn } = require("node:child_process");
const path = require("node:path");

const children = new Set();
let stopping = false;
let exitCode = 0;
let shutdownTimer;

const finishIfStopped = () => {
  if (stopping && children.size === 0) {
    clearTimeout(shutdownTimer);
    process.exit(exitCode);
  }
};

const stop = (code) => {
  if (stopping) return;
  stopping = true;
  exitCode = code;

  for (const child of children) child.kill("SIGTERM");

  shutdownTimer = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(exitCode || 1);
  }, 10_000);
  shutdownTimer.unref();
  finishIfStopped();
};

const start = (name, script) => {
  const child = spawn(process.execPath, [path.join(__dirname, script)], {
    cwd: path.resolve(__dirname, ".."),
    env: process.env,
    stdio: "inherit",
  });
  children.add(child);

  child.on("error", (error) => {
    console.error(`${name} failed to start (${error.name}).`);
    stop(1);
  });

  child.on("close", (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(
        `${name} stopped unexpectedly (${signal || `exit ${code ?? "unknown"}`}).`,
      );
      stop(code === 0 ? 1 : (code ?? 1));
    }
    finishIfStopped();
  });
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

start("TalentPulse API", "server.js");
start("TalentPulse worker", "worker.js");
