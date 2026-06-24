export function isMikrotikEmptyReplyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { errno?: string; message?: string };
  return (
    e.errno === "UNKNOWNREPLY" ||
    String(e.message ?? err).includes("!empty") ||
    String(e.message ?? err).toLowerCase().includes("unknown reply")
  );
}

export function isMikrotikUnregisteredTagError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { errno?: string; message?: string };
  return (
    e.errno === "UNREGISTEREDTAG" ||
    String(e.message ?? err).toLowerCase().includes("unregistered tag")
  );
}

export function isMikrotikTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { errno?: string; message?: string };
  return (
    e.errno === "SOCKTMOUT" ||
    String(e.message ?? err).toLowerCase().includes("timed out")
  );
}

export function formatMikrotikLegacyError(err: unknown): string {
  if (isMikrotikTimeoutError(err)) {
    return "Koneksi timeout — periksa IP, port API (8728/8729), firewall, dan pastikan router online.";
  }
  if (isMikrotikEmptyReplyError(err)) {
    return "Router mengembalikan data kosong.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.trim() || "Koneksi ditolak atau timeout";
}
