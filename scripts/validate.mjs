import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const raw = await readFile(new URL("data/site.json", root), "utf8");
const data = JSON.parse(raw);
const errors = [];
const projects = Array.isArray(data.projects) ? data.projects : [];
const services = Array.isArray(data.services) ? data.services : [];
const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
const capabilityGroups = Array.isArray(data.capabilityGroups) ? data.capabilityGroups : [];
const processSteps = Array.isArray(data.process) ? data.process : [];
const faqItems = Array.isArray(data.faq) ? data.faq : [];
const requiredAccentAssets = [
  "accent-red-rip.webp",
  "accent-black-burst.webp",
  "accent-white-tape.webp",
  "accent-red-stamp.webp"
];

const required = (value, path) => {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`);
};

const fileExists = async (url) => {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
};

required(data?.meta?.title, "meta.title");
required(data?.meta?.description, "meta.description");
required(data?.brand?.name, "brand.name");
required(data?.brand?.expansion, "brand.expansion");
required(data?.brand?.headline, "brand.headline");
required(data?.brand?.description, "brand.description");
required(data?.brand?.primaryCta, "brand.primaryCta");
required(data?.brand?.secondaryCta, "brand.secondaryCta");
required(data?.contact?.owner, "contact.owner");
required(data?.contact?.phone, "contact.phone");
required(data?.contact?.responseNote, "contact.responseNote");

try {
  const kakao = new URL(data?.contact?.kakao);
  if (kakao.protocol !== "https:") errors.push("contact.kakao must use https");
} catch {
  errors.push("contact.kakao must be a valid URL");
}

if (!Array.isArray(data.projects)) errors.push("projects must be an array");
if (!Array.isArray(data.services)) errors.push("services must be an array");
if (!Array.isArray(data.capabilities)) errors.push("capabilities must be an array");
if (!Array.isArray(data.capabilityGroups)) errors.push("capabilityGroups must be an array");
if (!Array.isArray(data.process)) errors.push("process must be an array");
if (!Array.isArray(data.faq)) errors.push("faq must be an array");

const ids = new Set();
for (const [index, project] of projects.entries()) {
  required(project.id, `projects[${index}].id`);
  required(project.title, `projects[${index}].title`);
  if (project.published) {
    for (const field of ["summary", "category", "year", "problem", "solution", "result", "image", "imageAlt"]) {
      required(project[field], `projects[${index}].${field}`);
    }
  }
  if (project.id && !/^[a-z0-9][a-z0-9-]*$/.test(project.id)) errors.push(`projects[${index}].id must use lowercase letters, numbers, and hyphens only`);
  if (ids.has(project.id)) errors.push(`duplicate project id: ${project.id}`);
  ids.add(project.id);
  if (!Number.isFinite(Number(project.order))) errors.push(`projects[${index}].order must be a number`);
  if (project.published && (!Array.isArray(project.features) || project.features.length < 3 || project.features.some((feature) => typeof feature !== "string" || !feature.trim()))) {
    errors.push(`projects[${index}].features must contain at least three strings`);
  }
  if (project.image) {
    if (project.image.startsWith("assets/")) {
      const safeLocalPath = /^assets\/[a-zA-Z0-9_./-]+$/.test(project.image) && !project.image.includes("..");
      if (!safeLocalPath) errors.push(`projects[${index}].image must be a safe assets path`);
      else if (!await fileExists(new URL(`src/${project.image}`, root))) errors.push(`missing project image: ${project.image}`);
    } else {
      try {
        const imageUrl = new URL(project.image);
        if (imageUrl.protocol !== "https:") throw new Error();
      } catch {
        errors.push(`projects[${index}].image must be a safe assets path or HTTPS URL`);
      }
    }
  }
  if (project.url) {
    try {
      const url = new URL(project.url);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      errors.push(`projects[${index}].url must use HTTPS`);
    }
  }
}

if (projects.filter((project) => project.published).length < 2) errors.push("at least two published projects are required");

const serviceIds = new Set();
for (const [index, service] of services.entries()) {
  for (const field of ["id", "title", "short", "description", "image", "imageAlt"]) {
    required(service[field], `services[${index}].${field}`);
  }
  if (service.id && !/^[a-z0-9][a-z0-9-]*$/.test(service.id)) errors.push(`services[${index}].id must use lowercase letters, numbers, and hyphens only`);
  if (serviceIds.has(service.id)) errors.push(`duplicate service id: ${service.id}`);
  serviceIds.add(service.id);
  if (!Array.isArray(service.items) || service.items.length < 4 || service.items.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`services[${index}].items must contain at least four strings`);
  }
  if (service.image && !await fileExists(new URL(`src/${service.image}`, root))) errors.push(`missing service image: ${service.image}`);
}

if (services.length !== 4) errors.push("services must contain web, app, game, and platform");
if (capabilities.length < 8 || capabilities.some((item) => typeof item !== "string" || !item.trim())) errors.push("capabilities must contain at least eight strings");
if (capabilityGroups.length !== 4) errors.push("capabilityGroups must contain four groups");
capabilityGroups.forEach((item, index) => {
  required(item.title, `capabilityGroups[${index}].title`);
  required(item.description, `capabilityGroups[${index}].description`);
});
if (processSteps.length < 4) errors.push("process must contain at least four stages");
processSteps.forEach((step, index) => {
  required(step.title, `process[${index}].title`);
  required(step.description, `process[${index}].description`);
  required(step.result, `process[${index}].result`);
});
if (faqItems.length < 4) errors.push("faq must contain at least four items");
faqItems.forEach((item, index) => {
  required(item.question, `faq[${index}].question`);
  required(item.answer, `faq[${index}].answer`);
});

for (const asset of requiredAccentAssets) {
  if (!await fileExists(new URL(`src/assets/${asset}`, root))) errors.push(`missing kinetic accent asset: ${asset}`);
}

const sourceFiles = [
  "data/site.json",
  "src/index.template.html",
  "src/about.template.html",
  "src/work.template.html",
  "src/project.template.html",
  "src/services.template.html",
  "src/process.template.html",
  "src/contact.template.html",
  "src/privacy.template.html",
  "src/404.template.html",
  "src/app.js",
  "src/styles.css",
  "scripts/build.mjs"
];

const sourceText = (await Promise.all(sourceFiles.map(async (name) => {
  const text = await readFile(new URL(name, root), "utf8");
  return [name, text];
}))).map(([name, text]) => `\n/* ${name} */\n${text}`).join("");

const bannedPatterns = [
  [/·/g, "middle-dot character"],
  [/<br\s*\/?\s*>/gi, "forced line break"],
  [/두 사람이 기획부터/g, "rejected team phrasing"],
  [/고객용 화면과 관리자 화면/g, "rejected admin phrasing"],
  [/직접 수정하고 관리할 수 있게 인계/g, "rejected handoff phrasing"],
  [/기획부터 출시까지/g, "rejected production phrasing"],
  [/SUIT|MonaSans|Pretendard|Wanted Sans/gi, "rejected font reference"],
  [/Plex KR|IBMPlexSansKR/gi, "removed bundled font reference"],
  [/hero-kinetic|studio-grid|game-impact|system-field/gi, "removed full-background asset reference"],
  [/<canvas\b/gi, "decorative canvas markup"],
  [/var\(--blue|var\(--orange/gi, "rejected blue/orange palette token"],
  [/>\s*0[1-9]\s*</g, "visible arbitrary index"],
  [/01\s*[—~-]\s*0[2-9]/g, "visible numbered range"]
];

for (const [pattern, label] of bannedPatterns) {
  if (pattern.test(sourceText)) errors.push(`banned ${label} found`);
}

const autoMotionCount = (sourceText.match(/data-auto-motion/g) || []).length;
if (autoMotionCount < 8) errors.push(`automatic motion coverage is too low: ${autoMotionCount}`);

const dataKeys = [];
const collectKeys = (value) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach(collectKeys);
  for (const [key, child] of Object.entries(value)) {
    dataKeys.push(key);
    collectKeys(child);
  }
};
collectKeys(data);
if (dataKeys.includes("number") || dataKeys.includes("code")) errors.push("arbitrary number/code keys are not allowed");

const roomEscapeMentions = (sourceText.match(/방탈출/g) || []).length;
if (roomEscapeMentions > 1) errors.push(`room-escape copy appears ${roomEscapeMentions} times; it must remain inside one work case`);

const css = await readFile(new URL("src/styles.css", root), "utf8");
const tinyFontMatches = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)]
  .filter((match) => Number(match[1]) < 16);
if (tinyFontMatches.length) errors.push(`CSS contains ${tinyFontMatches.length} font sizes below 16px`);

const readableCopy = [
  data.brand.headline,
  data.brand.description,
  data.contact.responseNote,
  ...services.flatMap((service) => [service.short, service.description, ...service.items]),
  ...capabilityGroups.flatMap((item) => [item.title, item.description]),
  ...processSteps.flatMap((item) => [item.title, item.description, item.result]),
  ...faqItems.flatMap((item) => [item.question, item.answer])
];
const duplicates = readableCopy.filter((value, index) => readableCopy.indexOf(value) !== index);
if (duplicates.length) errors.push(`duplicate copy found: ${[...new Set(duplicates)].join(" | ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content and quality validation passed");
