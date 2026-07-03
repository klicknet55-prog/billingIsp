import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export const UPLOAD_SUBDIRS = ["tenant-logos", "platform-logo", "tickets", "mobile-apk"] as const;

function extensionFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext || !EXT_TO_MIME[ext]) return null;
  return ext === "jpeg" ? "jpg" : ext;
}

function mimeFromFile(file: File, allowed: readonly string[]): string | null {
  if (file.type && allowed.includes(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const mime = EXT_TO_MIME[ext];
  return mime && allowed.includes(mime) ? mime : null;
}

function formatUploadError(err: unknown): Error {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as NodeJS.ErrnoException).code) : "";
  if (code === "EACCES" || code === "EPERM") {
    return new Error(
      "Server tidak bisa menulis folder uploads. Minta admin VPS: mkdir -p public/uploads && chown -R $(whoami) public/uploads"
    );
  }
  if (code === "ENOSPC") {
    return new Error("Penyimpanan server penuh. Tidak bisa menyimpan file upload.");
  }
  return err instanceof Error ? err : new Error("Gagal menyimpan file upload.");
}

/** Buat subfolder upload (idempotent). Dipanggil saat deploy & sebelum simpan file. */
export async function ensureUploadDirs(): Promise<void> {
  const root = path.join(process.cwd(), "public", "uploads");
  await mkdir(root, { recursive: true });
  await Promise.all(
    UPLOAD_SUBDIRS.map((subdir) => mkdir(path.join(root, subdir), { recursive: true }))
  );
}

export async function savePublicUpload(
  subdir: string,
  file: File,
  opts?: { maxBytes?: number; prefix?: string }
): Promise<string> {
  const maxBytes = opts?.maxBytes ?? 5 * 1024 * 1024;
  const mime = mimeFromFile(file, IMAGE_TYPES);
  if (!mime) {
    throw new Error("Format file tidak didukung. Gunakan PNG/JPG/WEBP/GIF.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Ukuran file maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : "jpg";

  await ensureUploadDirs();
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  const name = `${opts?.prefix ?? "file"}-${Date.now()}.${ext}`;
  try {
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    throw formatUploadError(err);
  }
  return `/uploads/${subdir}/${name}`;
}

/** Logo tenant / platform — PNG/JPG/WEBP/SVG, maks 2MB. */
export async function saveLogoUpload(
  subdir: (typeof UPLOAD_SUBDIRS)[number],
  file: File,
  prefix: string
): Promise<string> {
  const maxBytes = 2 * 1024 * 1024;
  const mime = mimeFromFile(file, LOGO_TYPES);
  if (!mime) {
    throw new Error("Format logo tidak didukung. Gunakan PNG/JPG/WEBP/SVG.");
  }
  if (file.size > maxBytes) {
    throw new Error("Ukuran logo maksimal 2MB.");
  }

  const ext =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/svg+xml"
        ? "svg"
        : extensionFromName(file.name) ?? mime.split("/")[1] ?? "png";

  await ensureUploadDirs();
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  const name = `${prefix}-${Date.now()}.${ext}`;
  try {
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    throw formatUploadError(err);
  }
  return `/uploads/${subdir}/${name}`;
}

const APK_MAX_BYTES = 80 * 1024 * 1024;

/** APK Android — simpan ke public/uploads/mobile-apk dengan nama file tetap (overwrite). */
export async function saveApkUpload(file: File, filename: string): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".apk")) {
    throw new Error("File harus berformat .apk");
  }
  if (file.size > APK_MAX_BYTES) {
    throw new Error("Ukuran APK maksimal 80 MB.");
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  await ensureUploadDirs();
  const dir = path.join(process.cwd(), "public", "uploads", "mobile-apk");
  try {
    await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    throw formatUploadError(err);
  }
  return `/uploads/mobile-apk/${safeName}`;
}
