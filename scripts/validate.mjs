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
required(data?.contact?.owner, "contact.owner");

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
  if (project.image?.startsWith("assets/")) {
    // images live in src/assets, or in <repo>/assets/uploads when published from the admin tool
    const inSource = await fileExists(`src/${project.image}`);
    const inUploads = await fileExists(project.image);
    if (!inSource && !inUploads) errors.push(`missing project image: ${project.image}`);
  }
  try {
    if (new URL(project.url).protocol !== "https:") throw new Error();
  } catch {
    errors.push(`projects[${index}].url must use HTTPS`);
  }
}

if (services.length < 4 || services.length > 6) errors.push(`four to six service groups are required, found ${services.length}`);
for (const [index, service] of services.entries()) {
  for (const field of ["id", "title", "short", "description"]) required(service[field], `services[${index}].${field}`);
  if (!Array.isArray(service.items) || service.items.length < 4) errors.push(`services[${index}].items needs at least four entries`);
}

if (capabilityGroups.length < 4) errors.push("four capability groups are required");
if (processSteps.length < 4) errors.push("at least four process stages are required");
if (faqItems.length < 4) errors.push("at least four FAQ items are required");

const routeCount = 8;

const requiredAssets = [
  "SUIT-core.woff2",
  "SUIT-full.woff2",
  "apple-touch-icon.png",
  "case-catharsis.jpg",
  "case-crimescene.jpg",
  "favicon-192.png",
  "favicon-512.png",
  "favicon.svg",
  "swag-logo-white.svg",
  "swag-logo.svg",
  "swag-og.png"
];

for (const asset of requiredAssets) {
  if (!await fileExists(`src/assets/${asset}`)) errors.push(`missing required asset: src/assets/${asset}`);
}

const assetEntries = await readdir(new URL("src/assets/", root), { withFileTypes: true });
const allowedDirs = new Set(["stack", "uploads"]);
const unexpectedAssets = assetEntries
  .filter((entry) => entry.isDirectory() ? !allowedDirs.has(entry.name) : !requiredAssets.includes(entry.name))
  .map((entry) => entry.name);
if (unexpectedAssets.length) errors.push(`unexpected legacy assets found: ${unexpectedAssets.join(", ")}`);

const stackIcons = (await readdir(new URL("src/assets/stack/", root))).filter((name) => name.endsWith(".svg"));
if (stackIcons.length < 40) errors.push(`tech stack needs at least 40 icons, found ${stackIcons.length}`);
required(data?.stack?.note, "stack.note");
required(data?.people?.lead, "people.lead");
if (!Number.isInteger(data?.people?.count) || data.people.count < 1) errors.push("people.count must be a positive integer");

const activeSources = [
  "data/site.json",
  "src/index.template.html",
  "src/work.template.html",
  "src/services.template.html",
  "src/process.template.html",
  "src/about.template.html",
  "src/contact.template.html",
  "src/privacy.template.html",
  "src/404.template.html",
  "src/app.js",
  "src/styles.css",
  "scripts/build.mjs"
];

const sourceText = (await Promise.all(activeSources.map((name) => readFile(new URL(name, root), "utf8")))).join("\n");
const bannedPatterns = [
  [/studio-hero-v46|studio-about-v42|service-(?:web|app|game|system)-v42|swag-(?:mark|signature|og)-v42|swag-(?:wordmark|monogram)-v3|Paperlogy/gi, "retired asset reference"],
  [/MAKE\s*\/\s*BREAK|DESIGN IN MOTION|눈에 남고 제대로 작동|다양한 플랫폼[,.]?\s*맞춤형 제작/gi, "generic slogan copy"],
  [/필요한 만큼 정확하게|실제로 운영 중인 화면을 직접 확인|중요한 화면을 먼저 확인하고|만들고 싶은 서비스가 있나요|필요한 페이지로 바로 이동하세요/gi, "rejected AI-style copy"],
  [/(?:맑은\s*고딕|Malgun Gothic|Dotum|돋움|Gulim|굴림)/gi, "legacy system font"],
  [/#(?:cf4714|11110f)\b/gi, "retired burnt-orange palette"]
];

for (const [pattern, label] of bannedPatterns) {
  if (pattern.test(sourceText)) errors.push(`banned ${label} found`);
}

const css = await readFile(new URL("src/styles.css", root), "utf8");
if (!/@font-face[\s\S]*SUIT Core[\s\S]*@font-face[\s\S]*SUIT Full/.test(css)) errors.push("two-tier SUIT webfont is not configured");
if (!/--t-body:\s*17px/.test(css)) errors.push("body copy must be at least 17px");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) errors.push("reduced-motion mode is required");
if (!/:focus-visible\b/.test(css)) errors.push("visible keyboard focus styles are required");

/* ---------- SLIPSTREAM 구조 계약 ----------
   이 검사들이 v50 디자인이 다시 무너지지 않게 붙잡아 준다. 지우지 말 것. */

// 주석 안의 설명 문구가 자기 자신의 금지 규칙에 걸리지 않도록 주석을 걷어내고 검사한다
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");

const containerRadius = [...cssCode.matchAll(/border-radius:\s*([^;]+);/g)]
  .map((match) => match[1].trim())
  .filter((value) => !/^0(px)?$/.test(value) && !/999px|50%|--r-pill/.test(value) && !/^[0-3](\.\d+)?px$/.test(value));
if (containerRadius.length) errors.push(`container radius must be 0: ${containerRadius.join(", ")}`);

if (/--grad\b|background-clip:\s*text|-webkit-background-clip:\s*text/.test(cssCode)) errors.push("gradients and gradient text are banned");
if ((cssCode.match(/box-shadow:/g) || []).length > 4) errors.push("at most four box-shadow declarations are allowed");
if (/backdrop-filter/.test(cssCode)) errors.push("backdrop-filter is banned");
if (/filter:\s*blur\(/.test(cssCode)) errors.push("animated blur is banned");

const weights = new Set([...cssCode.matchAll(/font-weight:\s*(\d{3})/g)].map((match) => match[1]));
weights.delete("100");
weights.delete("900");
if (weights.size > 3) errors.push(`three font weights allowed, found ${[...weights].join(", ")}`);

const scale = new Set([14, 17, 21, 27, 34, 44, 58, 76]);
const offScale = [...cssCode.matchAll(/font-size:\s*(\d+)px/g)].map((match) => Number(match[1])).filter((size) => !scale.has(size));
if (offScale.length) errors.push(`font-size off the scale: ${[...new Set(offScale)].join(", ")}px`);

const tinyFonts = [...cssCode.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) < 14);
if (tinyFonts.length) errors.push(`CSS contains ${tinyFonts.length} font sizes below 14px`);
if (!/#2145e6\b/i.test(css)) errors.push("brand blue color is missing");
if (!/#5bdf9c\b/i.test(css)) errors.push("brand green color is missing");

const revealCount = (sourceText.match(/data-reveal/g) || []).length;
if (revealCount < 8) errors.push(`motion coverage is too low: ${revealCount}`);

const homeSource = await readFile(new URL("src/index.template.html", root), "utf8");
if (/case-catharsis|case-crimescene|카타르시스|크라임씬|SELECTED WORK|운영 사이트/i.test(homeSource)) {
  errors.push("homepage must not contain project examples");
}
if (!/HERO/.test(homeSource)) errors.push("homepage hero block is missing");
if (!/favicon\.svg/.test(homeSource)) errors.push("brand favicon is missing");
if (!/2인 프리랜서/.test(data.brand.description)) errors.push("two-person team fact is missing");
if (!/data-motion-stage/.test(homeSource)) errors.push("homepage three-row motion stage is missing");
if (/class="eyebrow/.test(homeSource)) errors.push("eyebrow labels are banned");
if (/section-head/.test(homeSource) || /section-head/.test(css)) errors.push(".section-head is deleted");
for (const tag of homeSource.match(/<section[^>]*>/g) || []) {
  if (!/data-advances="(brief|fact)"/.test(tag) && !/class="hero"/.test(tag)) {
    errors.push("every homepage section must declare data-advances");
    break;
  }
}
if (!/제작 분야[\s\S]*프로젝트[\s\S]*진행 방식[\s\S]*소개[\s\S]*견적 문의/.test(sourceText)) {
  errors.push("navigation is missing required destinations");
}

const buildSource = await readFile(new URL("scripts/build.mjs", root), "utf8");
if (!/assets\/stack\//.test(buildSource)) errors.push("tech stack icon tiles are missing");
if (!/const mono = \(key\)/.test(buildSource)) errors.push("the mono() fact whitelist is missing");
if (!/\[27,\s*-21,\s*24\]/.test(buildSource)) errors.push("three-row opposing motion speeds are missing");

const aboutSource = await readFile(new URL("src/about.template.html", root), "utf8");
for (const fact of ["2인 프리랜서", "합리적인 비용", "빠른 진행", "같은 담당자", "두 사람 전담", "상담", "기획", "디자인", "개발", "검수", "배포"]) {
  if (!aboutSource.includes(fact)) errors.push(`about page is missing required fact: ${fact}`);
}

const appSource = await readFile(new URL("src/app.js", root), "utf8");
if (!/requestAnimationFrame\(moveMotionRows\)/.test(appSource)) errors.push("continuous three-row motion is missing");
for (const keyframe of ["fieldDrift", "capabilityRun", "imageScan", "menuIn", "bladeRun", "flashOn"]) {
  if (!new RegExp(`@keyframes\\s+${keyframe}\\b`).test(css)) errors.push(`missing @keyframes ${keyframe}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content and design validation passed");
