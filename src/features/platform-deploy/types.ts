export type DeployStepStatus = "pending" | "running" | "ok" | "failed";
export type DeployRunStatus = "idle" | "running" | "success" | "failed";

export interface DeployStep {
  name: string;
  status: DeployStepStatus;
  at: string | null;
  detail?: string;
}

export interface DeployInfo {
  status: DeployRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  startedBy: string | null;
  commitBefore: string | null;
  commitAfter: string | null;
  branch: string | null;
  steps: DeployStep[];
  error: string | null;
  logTail: string;
  enabled: boolean;
  git: {
    branch: string | null;
    commit: string | null;
    message: string | null;
  };
  updateCheck: DeployUpdateCheck | null;
}

/** Hasil cek update dari GitHub (di-cache setelah tombol Cek update). */
export interface DeployUpdateCheck {
  checkedAt: string;
  branch: string;
  localCommit: string;
  remoteCommit: string;
  remoteMessage: string | null;
  available: boolean;
}

const STEP_LABELS: Record<string, string> = {
  backup_database: "Backup database",
  git_pull: "Git pull",
  npm_ci: "npm ci",
  db_ensure_schema: "Patch / migrasi schema DB",
  npm_build: "Build production",
  pm2_restart: "Restart PM2",
};

export function deployStepLabel(name: string): string {
  return STEP_LABELS[name] ?? name;
}
