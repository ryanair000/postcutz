import { access } from "node:fs/promises";
import { x } from "tar";

async function extract(file) {
  try {
    await access(file);
    await x({ file, cwd: process.cwd() });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await extract("bundles/code-overlay.tar.gz");
await extract("bundles/latest-delta.tar.gz");
await extract("bundles/live-fixes.tar.gz");
console.log("PostCutz production overlays applied.");
