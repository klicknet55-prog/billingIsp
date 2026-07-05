import "server-only";
import { spawn } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { compareWithRemote, runGit } from "@/features/platform-deploy/git-update";
import {
  isDeployWorkerEnabled,
  resolveDeployPm2WorkerApp,
} from "@/features/platform-deploy/pm2-targets";
import type { DeployInfo, DeployUpdateCheck } from "@/features/platform-deploy/types";

const DEPLOY_DIR = path.join(process.cwd(), "data", "deploy");
const STATUS_FILE = path.join(DEPLOY_DIR, "status.json");
const LOG_FILE = path.join(DEPLOY_DIR, "deploy.log");
const LOCK_FILE = path.join(DEPLOY_DIR, "deploy.lock");
const UPDATE_CHECK_FILE = path.join(DEPLOY_DIR, "update-check.json");
const STALE_DEPLOY_MS = 90_000;

type DeployStateBody = Omit<DeployInfo, "logTail" | "enabled" | "git" | "updateCheck" | "queue">;

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLockPid(): Promise<number | null> {
  try {
    const raw = await readFile(LOCK_FILE, "utf8");
    const pid = parseInt(raw.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

async function removeDeployLock(): Promise<void> {
  await unlink(LOCK_FILE).catch(() => {});
}

async function writeDeployState(state: DeployStateBody): Promise<void> {
  await mkdir(DEPLOY_DIR, { recursive: true });
  await writeFile(STATUS_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Deploy sering stuck di "Restart PM2 / running" karena proses deploy ter-kill
 * saat PM2 me-recycle app padahal git pull + build sudah sukses.
 */
async function recoverStuckDeploy(state: DeployStateBody): Promise<DeployStateBody> {
  if (state.status !== "running") return state;

  const lockPid = await readLockPid();
  const lockAlive = lockPid !== null && isProcessAlive(lockPid);
  const ageMs = state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : Infinity;

  const buildOk = state.steps.find((s) => s.name === "npm_build")?.status === "ok";
  const pm2Steps = state.steps.filter(
    (s) => s.name === "pm2_restart" || s.name === "pm2_worker_restart"
  );
  const pm2Incomplete = pm2Steps.some(
    (s) => s.status === "running" || s.status === "pending"
  );

  const likelySuccessAfterPm2 = buildOk && pm2Incomplete;

  if (lockAlive && ageMs < STALE_DEPLOY_MS) return state;

  if (!lockAlive && likelySuccessAfterPm2) {
    await removeDeployLock();
    for (const step of pm2Steps) {
      step.status = "ok";
      step.at = new Date().toISOString();
      step.detail = "recovered-after-pm2-restart";
    }
    const recovered: DeployStateBody = {
      ...state,
      status: "success",
      finishedAt: state.finishedAt ?? new Date().toISOString(),
      error: null,
    };
    await writeDeployState(recovered);
    return recovered;
  }

  if (!lockAlive && ageMs > 30_000) {
    await removeDeployLock();
    const runningStep = state.steps.find((s) => s.status === "running");
    if (runningStep) {
      runningStep.status = "failed";
      runningStep.detail = "Proses deploy terputus.";
    }
    const recovered: DeployStateBody = {
      ...state,
      status: "failed",
      finishedAt: state.finishedAt ?? new Date().toISOString(),
      error:
        state.error ??
        "Deploy terputus. Jika aplikasi sudah ter-update, hapus log deploy dari dashboard.",
    };
    await writeDeployState(recovered);
    return recovered;
  }

  return state;
}

function emptyDeployInfo(): Omit<DeployInfo, "logTail" | "enabled" | "git" | "updateCheck" | "queue"> {
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

async function readDeployState(): Promise<
  Omit<DeployInfo, "logTail" | "enabled" | "git" | "updateCheck" | "queue">
> {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    return JSON.parse(raw) as Omit<
      DeployInfo,
      "logTail" | "enabled" | "git" | "updateCheck" | "queue"
    >;
  } catch {
    return emptyDeployInfo();
  }
}

async function readUpdateCheckCache(): Promise<DeployUpdateCheck | null> {
  try {
    const raw = await readFile(UPDATE_CHECK_FILE, "utf8");
    return JSON.parse(raw) as DeployUpdateCheck;
  } catch {
    return null;
  }
}

async function writeUpdateCheckCache(check: DeployUpdateCheck) {
  await mkdir(DEPLOY_DIR, { recursive: true });
  await writeFile(UPDATE_CHECK_FILE, JSON.stringify(check, null, 2), "utf8");
}

function toUpdateCheck(result: ReturnType<typeof compareWithRemote>): DeployUpdateCheck {
  return {
    checkedAt: new Date().toISOString(),
    branch: result.branch,
    localCommit: result.localShort,
    remoteCommit: result.remoteShort,
    remoteMessage: result.remoteMessage,
    available: result.available,
  };
}

function readGitInfo(): DeployInfo["git"] {
  const cwd = process.cwd();
  try {
    const branch = runGit("branch --show-current", cwd);
    const commit = runGit("rev-parse --short HEAD", cwd);
    const message = runGit("log -1 --format=%s", cwd);
    return { branch: branch || null, commit: commit || null, message: message || null };
  } catch {
    return { branch: null, commit: null, message: null };
  }
}

export function isDeployEnabled(): boolean {
  return process.env.DEPLOY_ENABLED?.trim() === "true";
}

export async function getDeployInfo(): Promise<DeployInfo> {
  const rawState = await readDeployState();
  const state = await recoverStuckDeploy(rawState);
  const [logTail, updateCheck] = await Promise.all([
    readLogTail(),
    readUpdateCheckCache(),
  ]);
  return {
    ...state,
    logTail,
    enabled: isDeployEnabled(),
    queue: {
      enabled: isDeployWorkerEnabled(),
      workerApp: resolveDeployPm2WorkerApp(),
    },
    git: readGitInfo(),
    updateCheck,
  };
}

/** Fetch GitHub dan bandingkan commit lokal vs remote. */
export async function checkRemoteUpdate(refresh = true): Promise<DeployUpdateCheck> {
  if (!refresh) {
    const cached = await readUpdateCheckCache();
    if (cached) return cached;
  }
  try {
    const result = compareWithRemote(process.cwd());
    const check = toUpdateCheck(result);
    await writeUpdateCheckCache(check);
    return check;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Gagal cek update: ${message}`);
  }
}

export async function isDeployRunning(): Promise<boolean> {
  const rawState = await readDeployState();
  if (rawState.status !== "running") return false;

  const lockPid = await readLockPid();
  if (lockPid === null || !isProcessAlive(lockPid)) {
    const recovered = await recoverStuckDeploy(rawState);
    return recovered.status === "running";
  }
  return true;
}

export async function startDeployProcess(triggeredBy: string): Promise<void> {
  const script = path.join(process.cwd(), "scripts", "deploy-app.ts");
  const child = spawn(process.execPath, ["--env-file=.env", "--import", "tsx", script], {
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
  await unlink(UPDATE_CHECK_FILE).catch(() => {});
}
