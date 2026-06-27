import { execSync } from "node:child_process";
import path from "node:path";

export interface UpdateCompareResult {
  branch: string;
  localFull: string;
  remoteFull: string;
  localShort: string;
  remoteShort: string;
  remoteMessage: string | null;
  available: boolean;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Jalankan git dengan safe.directory agar root/PM2 bisa akses repo milik user lain. */
export function runGit(subcommand: string, cwd: string): string {
  const repo = path.resolve(cwd);
  const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
  return execSync(`git -c safe.directory=${shellQuote(repo)} ${subcommand}`, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell,
  }).trim();
}

export function resolveDeployBranch(cwd: string): string {
  const fromEnv = process.env.DEPLOY_GIT_BRANCH?.trim();
  if (fromEnv) return fromEnv;
  return runGit("branch --show-current", cwd);
}

/** Fetch origin lalu bandingkan HEAD dengan origin/branch. */
export function compareWithRemote(cwd: string, branch?: string): UpdateCompareResult {
  const b = branch ?? resolveDeployBranch(cwd);
  runGit("fetch origin", cwd);
  const localFull = runGit("rev-parse HEAD", cwd);
  const remoteFull = runGit(`rev-parse origin/${b}`, cwd);
  const localShort = runGit("rev-parse --short HEAD", cwd);
  const remoteShort = runGit(`rev-parse --short origin/${b}`, cwd);
  let remoteMessage: string | null = null;
  try {
    remoteMessage = runGit(`log -1 --format=%s origin/${b}`, cwd);
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
