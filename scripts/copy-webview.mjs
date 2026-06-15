import { cp, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "src", "webview");
const targetDir = path.join(rootDir, "out", "webview");

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
