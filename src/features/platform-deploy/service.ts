import "server-only";
import { execSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DeployInfo } from "@/features/platform-deploy/types";

const DEPLOY_DIR = path.join(process.cwd(), "data", "deploy");
const STATUS_FILE = path.join(DEPLOY_DIR, "status.json");
const LOG_FILE = path.join(DEPLOY_DIR, "deploy.log");
const LOCK_FILE = path.join(DEPLOY_DIR, "deploy.lock");

function emptyDeployInfo(): Omit<DeployInfo, "logTail" | "enabled" | "git"> {
  return {
    status: "idle",
    startedAt: null,
    finishedAt: null,
    startedBy: null,
    commitBefore: null,
    commitAfter: null,
    branch: null,
    steps: [],
    error: null,
  };
}

async function readLogTail(maxLines = 80): Promise<string> {
  try {
    const raw = await readFile(LOG_FILE, "utf8");
    return raw.trim().split("\n").slice(-maxLines).join("\n");
  } catch {
    return "";
  }
}

async function readDeployState(): Promise<Omit<DeployInfo, "logTail" | "enabled" | "git">> {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    return JSON.parse(raw) as Omit<DeployInfo, "logTail" | "enabled" | "git">;
  } catch {
    return emptyDeployInfo();
  }
}

function readGitInfo(): DeployInfo["git"] {
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    const message = execSync("git log -1 --format=%s", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    return { branch: branch || null, commit: commit || null, message: message || null };
  } catch {
    return { branch: null, commit: null, message: null };
  }
}

export function isDeployEnabled(): boolean {
  return process.env.DEPLOY_ENABLED?.trim() === "true";
}

export async function getDeployInfo(): Promise<DeployInfo> {
  const [state, logTail] = await Promise.all([readDeployState(), readLogTail()]);
  return {
    ...state,
    logTail,
    enabled: isDeployEnabled(),
    git: readGitInfo(),
  };
}

export async function isDeployRunning(): Promise<boolean> {
  try {
    await readFile(LOCK_FILE, "utf8");
    const state = await readDeployState();
    return state.status === "running";
  } catch {
    return false;
  }
}

export async function startDeployProcess(triggeredBy: string): Promise<void> {
  const script = path.join(process.cwd(), "scripts", "deploy-app.ts");
  const child = spawn(process.execPath, ["--import", "tsx", script], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      DEPLOY_TRIGGERED_BY: triggeredBy,
    },
  });
  child.unref();
}

/** Hapus deploy.log dan reset status.json (hanya jika deploy tidak berjalan). */
export async function clearDeployLogs(): Promise<void> {
  if (await isDeployRunning()) {
    throw new Error("Tidak bisa hapus log saat deploy masih berjalan.");
  }
  await mkdir(DEPLOY_DIR, { recursive: true });
  await writeFile(LOG_FILE, "", "utf8");
  await writeFile(STATUS_FILE, JSON.stringify(emptyDeployInfo(), null, 2), "utf8");
}
