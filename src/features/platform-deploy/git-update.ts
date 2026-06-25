import { execSync } from "node:child_process";

export interface UpdateCompareResult {
  branch: string;
  localFull: string;
  remoteFull: string;
  localShort: string;
  remoteShort: string;
  remoteMessage: string | null;
  available: boolean;
}

export function resolveDeployBranch(cwd: string): string {
  const fromEnv = process.env.DEPLOY_GIT_BRANCH?.trim();
  if (fromEnv) return fromEnv;
  return execSync("git branch --show-current", {
    encoding: "utf8",
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function git(cmd: string, cwd: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Fetch origin lalu bandingkan HEAD dengan origin/branch. */
export function compareWithRemote(cwd: string, branch?: string): UpdateCompareResult {
  const b = branch ?? resolveDeployBranch(cwd);
  git("git fetch origin", cwd);
  const localFull = git("git rev-parse HEAD", cwd);
  const remoteFull = git(`git rev-parse origin/${b}`, cwd);
  const localShort = git("git rev-parse --short HEAD", cwd);
  const remoteShort = git(`git rev-parse --short origin/${b}`, cwd);
  let remoteMessage: string | null = null;
  try {
    remoteMessage = git(`git log -1 --format=%s origin/${b}`, cwd);
  } catch {
    remoteMessage = null;
  }
  return {
    branch: b,
    localFull,
    remoteFull,
    localShort,
    remoteShort,
    remoteMessage,
    available: localFull !== remoteFull,
  };
}
