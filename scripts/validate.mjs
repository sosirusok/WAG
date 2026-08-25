import { access, readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const data = JSON.parse(await readFile(new URL("data/site.json", root), "utf8"));
const errors = [];

const required = (value, path) => {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`);
};

const fileExists = async (relative) => {
  try {
    await access(new URL(relative, root));
    return true;
  } catch {
    return false;
  }
};

required(data?.meta?.title, "meta.title");
required(data?.meta?.description, "meta.description");
required(data?.brand?.name, "brand.name");
required(data?.brand?.description, "brand.description");
required(data?.contact?.phone, "contact.phone");

try {
  const kakao = new URL(data?.contact?.kakao);
  if (kakao.protocol !== "https:") errors.push("contact.kakao must use HTTPS");
} catch {
  errors.push("contact.kakao must be a valid URL");
}

const projects = Array.isArray(data.projects) ? data.projects : [];
const services = Array.isArray(data.services) ? data.services : [];
const capabilityGroups = Array.isArray(data.capabilityGroups) ? data.capabilityGroups : [];
const processSteps = Array.isArray(data.process) ? data.process : [];
const faqItems = Array.isArray(data.faq) ? data.faq : [];

if (projects.filter((project) => project.published).length < 2) errors.push("at least two public projects are required");
for (const [index, project] of projects.entries()) {
  for (const field of ["id", "title", "category", "summary", "problem", "solution", "image", "imageAlt", "url"]) {
    required(project[field], `projects[${index}].${field}`);
  }
  if (!Array.isArray(project.features) || project.features.length < 3) errors.push(`projects[${index}].features needs at least three entries`);
  if (project.image?.startsWith("assets/") && !await fileExists(`src/${project.image}`)) errors.push(`missing project image: ${project.image}`);
  try {
    if (new URL(project.url).protocol !== "https:") throw new Error();
  } catch {
    errors.push(`projects[${index}].url must use HTTPS`);
  }
}

if (services.length !== 4) errors.push("exactly four service groups are required");
for (const [index, service] of services.entries()) {
  for (const field of ["id", "title", "short", "description"]) required(service[field], `services[${index}].${field}`);
  if (!Array.isArray(service.items) || service.items.length < 4) errors.push(`services[${index}].items needs at least four entries`);
}

if (capabilityGroups.length < 3) errors.push("at least three capability groups are required");
if (processSteps.length < 4) errors.push("at least four process stages are required");
if (faqItems.length < 4) errors.push("at least four FAQ items are required");

const requiredAssets = [
  "WantedSansVariable.woff2",
  "case-catharsis.jpg",
  "case-crimescene.jpg",
  "favicon.svg",
  "swag-hero-brand.png",
  "swag-og.png"
];
for (const asset of requiredAssets) {
  if (!await fileExists(`src/assets/${asset}`)) errors.push(`missing required asset: src/assets/${asset}`);
}
const actualAssets = (await readdir(new URL("src/assets/", root))).sort();
const unexpectedAssets = actualAssets.filter((asset) => !requiredAssets.includes(asset));
if (unexpectedAssets.length) {
  errors.push(`unexpected legacy assets found: ${unexpectedAssets.join(", ")}`);
}

const activeSources = [
  "data/site.json",
  "src/index.template.html",
  "src/work.template.html",
  "src/services.template.html",
  "src/process.template.html",
  "src/contact.template.html",
  "src/privacy.template.html",
  "src/404.template.html",
  "src/app.js",
  "src/styles.css",
  "scripts/build.mjs"
];

const sourceText = (await Promise.all(activeSources.map((name) => readFile(new URL(name, root), "utf8")))).join("\n");
const bannedPatterns = [
  [/accent-(?:red|black)|kinetic-|cursor-orb|page-wipe/gi, "legacy dark/red decorative assets"],
  [/MAKE\s*\/\s*BREAK|DESIGN IN MOTION|눈에 남고 제대로 작동/gi, "generic slogan copy"],
  [/>\s*0[1-9]\s*</g, "visible arbitrary numbering"],
  [/(?:맑은\s*고딕|Malgun Gothic|Dotum|돋움|Gulim|굴림)/gi, "legacy system font"],
  [/#(?:050505|000000|ff0000)\b/gi, "black or red dominant palette"]
];

for (const [pattern, label] of bannedPatterns) {
  if (pattern.test(sourceText)) errors.push(`banned ${label} found`);
}

const css = await readFile(new URL("src/styles.css", root), "utf8");
if (!/@font-face[\s\S]*Wanted Sans/.test(css)) errors.push("Wanted Sans webfont is not configured");
if (!/body\s*\{[\s\S]*?font-size:\s*(?:17|18)px/.test(css)) errors.push("body copy must be at least 17px");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) errors.push("reduced-motion mode is required");
if (!/:focus-visible\b/.test(css)) errors.push("visible keyboard focus styles are required");

const tinyFonts = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) < 12);
if (tinyFonts.length) errors.push(`CSS contains ${tinyFonts.length} font sizes below 12px`);

const revealCount = (sourceText.match(/data-reveal/g) || []).length;
if (revealCount < 16) errors.push(`motion coverage is too low: ${revealCount}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content and design validation passed");
