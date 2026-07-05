import { isQueueEnabled } from "@/lib/queue/config";

export function resolveDeployPm2WebApp(): string {
  return process.env.DEPLOY_PM2_APP?.trim() || "billingisp";
}

/** Nama proses PM2 worker queue — null jika Redis/queue tidak aktif di .env. */
export function resolveDeployPm2WorkerApp(): string | null {
  const explicit = process.env.DEPLOY_PM2_WORKER_APP?.trim();
  if (explicit) return explicit;
  if (isQueueEnabled()) return "billingisp-worker";
  return null;
}

export function isDeployWorkerEnabled(): boolean {
  return resolveDeployPm2WorkerApp() !== null;
}

export function buildDeployStepNames(): string[] {
  const steps = [
    "backup_database",
    "git_pull",
    "npm_ci",
    "db_ensure_schema",
    "npm_build",
    "pm2_restart",
  ];
  if (isDeployWorkerEnabled()) {
    steps.push("pm2_worker_restart");
  }
  return steps;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Perintah bash: restart web, lalu restart atau start worker jika Redis aktif. */
export function buildPm2DeployRestartCommand(): string {
  const webApp = shellQuote(resolveDeployPm2WebApp());
  const workerApp = resolveDeployPm2WorkerApp();
  const parts = [`sleep 2`, `pm2 restart ${webApp} --update-env`];
  if (workerApp) {
    const worker = shellQuote(workerApp);
    parts.push(
      `(pm2 describe ${worker} >/dev/null 2>&1 && pm2 restart ${worker} --update-env || pm2 start ecosystem.config.cjs --only ${worker} --update-env)`
    );
  }
  return parts.join(" && ");
}
