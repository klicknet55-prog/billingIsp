/**
 * Logger terpusat. Semua log aplikasi sebaiknya lewat sini agar mudah
 * di-troubleshoot dan kelak diarahkan ke layanan log eksternal.
 */
type Level = "debug" | "info" | "warn" | "error";

const COLORS: Record<Level, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

function log(level: Level, scope: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `${COLORS[level]}[${level.toUpperCase()}]${RESET} ${ts} (${scope})`;
  const args: unknown[] = [`${prefix} ${message}`];
  if (meta !== undefined) args.push(meta);
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](...args);
}

/** Buat logger ber-scope, mis. `const log = createLogger("auth")`. */
export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: unknown) => log("debug", scope, msg, meta),
    info: (msg: string, meta?: unknown) => log("info", scope, msg, meta),
    warn: (msg: string, meta?: unknown) => log("warn", scope, msg, meta),
    error: (msg: string, meta?: unknown) => log("error", scope, msg, meta),
  };
}

export const logger = createLogger("app");
