import { ensureUploadDirs } from "../src/lib/uploads";

await ensureUploadDirs();
console.log("Upload directories OK: public/uploads/{tenant-logos,platform-logo,tickets}");
