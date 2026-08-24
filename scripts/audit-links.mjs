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
const cssFiles = files.filter((file) => file.endsWith(".css"));
const failures = [];

const resolveLocalTarget = (reference) => {
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean) return null;
  let target = path.join(dist, clean.replace(/^\.\//, ""));
  if (clean.endsWith("/")) target = path.join(target, "index.html");
  return target;
};

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) failures.push(`${path.relative(dist, file)} -> duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) failures.push(`${path.relative(dist, file)} -> expected one h1, found ${h1Count}`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(image[0])) failures.push(`${path.relative(dist, file)} -> image missing alt: ${image[0].slice(0, 100)}`);
  }
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (!reference || /^(?:https?:|tel:|mailto:|data:)/.test(reference)) continue;
    const target = reference.startsWith("#") ? file : resolveLocalTarget(reference);
    if (!target) continue;
    try {
      await access(target);
    } catch {
      failures.push(path.relative(dist, file) + " -> " + reference);
      continue;
    }
    const fragment = reference.includes("#") ? reference.split("#")[1] : "";
    if (fragment && target.endsWith(".html")) {
      const targetHtml = target === file ? html : await readFile(target, "utf8");
      if (!new RegExp(`\\bid=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(targetHtml)) {
        failures.push(`${path.relative(dist, file)} -> missing fragment ${reference}`);
      }
    }
  }
}

for (const file of cssFiles) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/url\((?:["']?)([^"')]+)(?:["']?)\)/g)) {
    const reference = match[1].trim();
    if (!reference || /^(?:data:|https?:|#|%23)/.test(reference)) continue;
    const target = path.resolve(path.dirname(file), reference.split(/[?#]/, 1)[0]);
    try {
      await access(target);
    } catch {
      failures.push(`${path.relative(dist, file)} -> ${reference}`);
    }
  }
}

if (failures.length) {
  console.error("Broken local references:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Audited " + htmlFiles.length + " pages with no broken local references");
