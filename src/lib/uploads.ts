import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export async function savePublicUpload(
  subdir: string,
  file: File,
  opts?: { maxBytes?: number; prefix?: string }
): Promise<string> {
  const maxBytes = opts?.maxBytes ?? 5 * 1024 * 1024;
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    throw new Error("Format file tidak didukung. Gunakan PNG/JPG/WEBP/GIF.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Ukuran file maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const name = `${opts?.prefix ?? "file"}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${subdir}/${name}`;
}
