import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

function freePort(port) {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } catch {
        /* process may already be gone */
      }
    }
  } catch {
    /* port already free */
  }
}

freePort(3000);
rmSync(".next", { recursive: true, force: true });
execSync("next dev --hostname 0.0.0.0", { stdio: "inherit" });
