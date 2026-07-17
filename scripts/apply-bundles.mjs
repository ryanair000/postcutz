import { access, readFile, writeFile } from "node:fs/promises";
import { x } from "tar";

async function extract(file) {
  try {
    await access(file);
    await x({ file, cwd: process.cwd() });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function patchDownloadRoute() {
  const path = "app/api/posters/[id]/download/route.ts";
  try {
    const source = await readFile(path, "utf8");
    const patched = source.replace(
      'result.bytes.toString("base64")',
      'result.bytes!.toString("base64")'
    );
    if (patched !== source) await writeFile(path, patched);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await extract("bundles/code-overlay.tar.gz");
await extract("bundles/latest-delta.tar.gz");
await extract("bundles/live-fixes.tar.gz");
await patchDownloadRoute();
console.log("PostCutz production overlays applied.");