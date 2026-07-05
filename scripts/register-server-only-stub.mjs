import { register } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(dir, "server-only-stub-loader.mjs")).href);
