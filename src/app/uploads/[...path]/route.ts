import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_SUBDIRS } from "@/lib/uploads";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  apk: "application/vnd.android.package-archive",
};

type UploadSubdir = (typeof UPLOAD_SUBDIRS)[number];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const segments = (await ctx.params).path;
  if (!segments?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const subdir = segments[0];
  if (!UPLOAD_SUBDIRS.includes(subdir as UploadSubdir)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rest = segments.slice(1);
  if (!rest.length || rest.some((s) => s === ".." || s.includes("\0"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const baseDir = path.join(process.cwd(), "public", "uploads", subdir);
  const filePath = path.join(baseDir, ...rest);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep) && resolved !== path.resolve(baseDir)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const data = await readFile(resolved);
    const ext = path.extname(resolved).slice(1).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": mime,
      "Content-Length": String(info.size),
      "Cache-Control": "public, max-age=3600",
    };
    if (ext === "apk") {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(resolved)}"`;
    }

    return new NextResponse(data, { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
