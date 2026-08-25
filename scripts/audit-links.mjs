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
  const relativeFile = path.relative(dist, file);
  if (!/<html\b[^>]*\blang="ko"/i.test(html)) failures.push(`${relativeFile} -> missing lang=ko`);
  if (!/<meta\b[^>]*\bcharset="utf-8"/i.test(html)) failures.push(`${relativeFile} -> missing UTF-8 charset`);
  if (!/<meta\b[^>]*\bname="viewport"/i.test(html)) failures.push(`${relativeFile} -> missing viewport meta`);
  if (!/<meta\b[^>]*\bname="description"[^>]*\bcontent="[^"]+"/i.test(html)) failures.push(`${relativeFile} -> missing meta description`);
  if (!/<link\b[^>]*\brel="canonical"[^>]*\bhref="https:\/\/[^"]+"/i.test(html) && relativeFile !== "404.html") {
    failures.push(`${relativeFile} -> missing HTTPS canonical URL`);
  }
  if (!/<main\b[^>]*\bid="main"/i.test(html)) failures.push(`${relativeFile} -> missing main landmark`);
  if (!/<a\b[^>]*\bclass="skip-link"[^>]*\bhref="[^"]*#main"/i.test(html)) failures.push(`${relativeFile} -> missing skip link`);
  if ((html.match(/<title\b/gi) || []).length !== 1) failures.push(`${relativeFile} -> expected one title element`);
  if (/href="javascript:/i.test(html)) failures.push(`${relativeFile} -> javascript URL is not allowed`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) failures.push(`${path.relative(dist, file)} -> duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) failures.push(`${path.relative(dist, file)} -> expected one h1, found ${h1Count}`);
  for (const reference of html.matchAll(/\baria-(?:labelledby|controls|describedby)="([^"]+)"/g)) {
    for (const id of reference[1].trim().split(/\s+/)) {
      if (!ids.includes(id)) failures.push(`${relativeFile} -> missing ARIA target #${id}`);
    }
  }
  for (const button of html.matchAll(/<button\b[^>]*>/g)) {
    if (!/\btype="(?:button|submit|reset)"/i.test(button[0])) failures.push(`${relativeFile} -> button missing explicit type`);
  }
  for (const anchor of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
    if (!/\brel="[^"]*noopener[^"]*"/i.test(anchor[0])) failures.push(`${relativeFile} -> target=_blank link missing noopener`);
    if (!/\brel="[^"]*noreferrer[^"]*"/i.test(anchor[0])) failures.push(`${relativeFile} -> target=_blank link missing noreferrer`);
  }
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
      failures.push(relativeFile + " -> " + reference);
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
  if (!/:focus-visible\b/.test(css)) failures.push(`${path.relative(dist, file)} -> missing focus-visible style`);
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) failures.push(`${path.relative(dist, file)} -> missing reduced-motion mode`);
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
