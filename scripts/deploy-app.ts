/**
 * Deploy aplikasi dari dashboard superadmin (background).
 * Usage: npm run deploy:app
 *
 * Env production:
 *   DEPLOY_ENABLED=true
 *   DEPLOY_GIT_BRANCH=netmanage-implementation
 *   DEPLOY_PM2_APP=billingisp
 */
import { execSync } from "node:child_process";
import { copyFile, mkdir, readFile, unlink, writeFile, appendFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DEPLOY_DIR = path.join(ROOT, "data", "deploy");
const STATUS_FILE = path.join(DEPLOY_DIR, "status.json");
const LOG_FILE = path.join(DEPLOY_DIR, "deploy.log");
const LOCK_FILE = path.join(DEPLOY_DIR, "deploy.lock");

type StepStatus = "pending" | "running" | "ok" | "failed";
type DeployStatus = "idle" | "running" | "success" | "failed";

interface DeployState {
  status: DeployStatus;
  startedAt: string | null;
  finishedAt: string | null;
  startedBy: string | null;
  commitBefore: string | null;
  commitAfter: string | null;
  branch: string | null;
  steps: { name: string; status: StepStatus; at: string | null; detail?: string }[];
  error: string | null;
}

const STEPS = [
  "backup_database",
  "git_pull",
  "npm_ci",
  "db_ensure_schema",
  "npm_build",
  "pm2_restart",
] as const;

function git(cmd: string): string {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function run(cmd: string, opts?: { allowFail?: boolean }): string {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash",
    }).trim();
  } catch (err) {
    if (opts?.allowFail) return "";
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg.slice(0, 2000));
  }
}

async function log(line: string) {
  const ts = new Date().toISOString();
  const row = `[${ts}] ${line}\n`;
  await appendFile(LOG_FILE, row, "utf8");
  process.stdout.write(row);
}

async function readState(): Promise<DeployState> {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    return JSON.parse(raw) as DeployState;
  } catch {
    return emptyState();
  }
}

function emptyState(): DeployState {
  return {
    status: "idle",
    startedAt: null,
    finishedAt: null,
    startedBy: null,
    commitBefore: null,
    commitAfter: null,
    branch: null,
    steps: STEPS.map((name) => ({ name, status: "pending", at: null })),
    error: null,
  };
}

async function writeState(state: DeployState) {
  await mkdir(DEPLOY_DIR, { recursive: true });
  await writeFile(STATUS_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function setStep(state: DeployState, name: (typeof STEPS)[number], status: StepStatus, detail?: string) {
  const step = state.steps.find((s) => s.name === name);
  if (step) {
    step.status = status;
    step.at = new Date().toISOString();
    if (detail) step.detail = detail.slice(0, 500);
  }
  await writeState(state);
}

async function fileExists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await fileExists(LOCK_FILE)) {
    console.error("Deploy lock aktif — proses lain mungkin masih berjalan.");
    process.exit(1);
  }

  await mkdir(DEPLOY_DIR, { recursive: true });
  await writeFile(LOCK_FILE, String(process.pid), "utf8");
  await writeFile(LOG_FILE, "", "utf8");

  const branch = process.env.DEPLOY_GIT_BRANCH?.trim() || git("git branch --show-current");
  const state = emptyState();
  state.status = "running";
  state.startedAt = new Date().toISOString();
  state.startedBy = process.env.DEPLOY_TRIGGERED_BY?.trim() || null;
  state.branch = branch;

  try {
    state.commitBefore = git("git rev-parse --short HEAD");
  } catch {
    state.commitBefore = null;
  }
  await writeState(state);
  await log(`Deploy dimulai oleh ${state.startedBy ?? "system"} (branch: ${branch})`);

  try {
    await setStep(state, "backup_database", "running");
    const dbPath = path.resolve(process.env.DATABASE_URL ?? "./netmanage.db");
    const backupDir = path.join(ROOT, "data", "backups", "platform");
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `pre-deploy-${stamp}.db`);
    if (await fileExists(dbPath)) {
      await copyFile(dbPath, backupPath);
      await log(`Backup DB → ${backupPath}`);
    } else {
      await log(`Lewati backup DB (file tidak ada: ${dbPath})`);
    }
    await setStep(state, "backup_database", "ok");

    await setStep(state, "git_pull", "running");
    run("git fetch origin");
    if (branch) {
      run(`git checkout ${branch}`);
      run(`git pull origin ${branch}`);
    } else {
      run("git pull");
    }
    const afterPull = git("git rev-parse --short HEAD");
    state.commitAfter = afterPull;
    await setStep(state, "git_pull", "ok", afterPull);
    await log(`Git pull selesai @ ${afterPull}`);

    await setStep(state, "npm_ci", "running");
    run("npm ci");
    await setStep(state, "npm_ci", "ok");
    await log("npm ci selesai");

    await setStep(state, "db_ensure_schema", "running");
    run("npm run db:ensure-schema");
    await setStep(state, "db_ensure_schema", "ok");
    await log("db:ensure-schema selesai");

    await setStep(state, "npm_build", "running");
    run("npm run build");
    await setStep(state, "npm_build", "ok");
    await log("npm run build selesai");

    await setStep(state, "pm2_restart", "running");
    const pm2App = process.env.DEPLOY_PM2_APP?.trim() || "billingisp";
    if (process.platform === "win32") {
      await log("Windows: lewati pm2 restart (restart dev server manual jika perlu)");
      await setStep(state, "pm2_restart", "ok", "skipped-windows");
    } else {
      run(`pm2 restart ${pm2App}`);
      await setStep(state, "pm2_restart", "ok", pm2App);
      await log(`pm2 restart ${pm2App} selesai`);
    }

    state.status = "success";
    state.finishedAt = new Date().toISOString();
    state.error = null;
    await writeState(state);
    await log("Deploy sukses");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state.status = "failed";
    state.finishedAt = new Date().toISOString();
    state.error = message;
    const runningStep = state.steps.find((s) => s.status === "running");
    if (runningStep) {
      runningStep.status = "failed";
      runningStep.detail = message.slice(0, 500);
    }
    await writeState(state);
    await log(`Deploy gagal: ${message}`);
    process.exitCode = 1;
  } finally {
    await unlink(LOCK_FILE).catch(() => {});
  }
}

main();
