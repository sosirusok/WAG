import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
};

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (!reference || reference.startsWith("#") || /^(?:https?:|tel:|mailto:|data:)/.test(reference)) continue;
    const clean = reference.split(/[?#]/, 1)[0];
    if (!clean) continue;
    let target = path.join(dist, clean.replace(/^\.\//, ""));
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    try {
      await access(target);
    } catch {
      failures.push(path.relative(dist, file) + " -> " + reference);
    }
  }
}

if (failures.length) {
  console.error("Broken local references:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Audited " + htmlFiles.length + " pages with no broken local references");
