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
  for (const field of ["id", "title", "short", "description", "image", "imageAlt"]) required(service[field], `services[${index}].${field}`);
  if (!Array.isArray(service.items) || service.items.length < 4) errors.push(`services[${index}].items needs at least four entries`);
  if (service.image?.startsWith("assets/") && !await fileExists(`src/${service.image}`)) errors.push(`missing service image: ${service.image}`);
}

if (capabilityGroups.length < 4) errors.push("four capability groups are required");
if (processSteps.length < 4) errors.push("at least four process stages are required");
if (faqItems.length < 4) errors.push("at least four FAQ items are required");

const requiredAssets = [
  "SUIT-Variable.woff2",
  "case-catharsis.jpg",
  "case-crimescene.jpg",
  "service-app-v42.webp",
  "service-game-v42.webp",
  "service-system-v42.webp",
  "service-web-v42.webp",
  "studio-about-v42.webp",
  "studio-hero-v46.webp",
  "swag-mark-v42.png",
  "swag-og-v42.png",
  "swag-signature-v42.png"
];

for (const asset of requiredAssets) {
  if (!await fileExists(`src/assets/${asset}`)) errors.push(`missing required asset: src/assets/${asset}`);
}

const actualAssets = (await readdir(new URL("src/assets/", root))).sort();
const unexpectedAssets = actualAssets.filter((asset) => !requiredAssets.includes(asset));
if (unexpectedAssets.length) errors.push(`unexpected legacy assets found: ${unexpectedAssets.join(", ")}`);

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
  [/swag-(?:wordmark|monogram)-v3|Paperlogy|swag-og\.png/gi, "retired brand or display-font asset"],
  [/MAKE\s*\/\s*BREAK|DESIGN IN MOTION|눈에 남고 제대로 작동|다양한 플랫폼[,.]?\s*맞춤형 제작/gi, "generic slogan copy"],
  [/필요한 만큼 정확하게|실제로 운영 중인 화면을 직접 확인|중요한 화면을 먼저 확인하고|만들고 싶은 서비스가 있나요|필요한 페이지로 바로 이동하세요/gi, "rejected AI-style copy"],
  [/>\s*0[1-9]\s*</g, "visible arbitrary numbering"],
  [/(?:맑은\s*고딕|Malgun Gothic|Dotum|돋움|Gulim|굴림)/gi, "legacy system font"],
  [/#(?:4254ff|2436d9|00c7f2|9d7cff|e9edff|e5faff|f0ebff|007eec|008fe9|16275b|142461|6576ff|7584ff)\b/gi, "blue, cyan, or violet palette"],
  [/\b(?:khaki|olive)\b/gi, "forbidden green-brown palette"],
  [/(?:linear|radial)-gradient\s*\(/gi, "flat decorative color field"],
  [/class="[^"]*(?:card-grid|browser-card|number-grid)[^"]*"/gi, "PPT-style card layout"]
];

for (const [pattern, label] of bannedPatterns) {
  if (pattern.test(sourceText)) errors.push(`banned ${label} found`);
}

const css = await readFile(new URL("src/styles.css", root), "utf8");
if (!/@font-face[\s\S]*SUIT Variable/.test(css)) errors.push("SUIT Variable webfont is not configured");
if (!/body\s*\{[\s\S]*?font-size:\s*(?:17|18)px/.test(css)) errors.push("body copy must be at least 17px");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) errors.push("reduced-motion mode is required");
if (!/:focus-visible\b/.test(css)) errors.push("visible keyboard focus styles are required");

const tinyFonts = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) < 14);
if (tinyFonts.length) errors.push(`CSS contains ${tinyFonts.length} font sizes below 14px`);
if (!/#cf4714\b/i.test(css)) errors.push("burnt-orange signal color is missing");
if (!/#11110f\b/i.test(css)) errors.push("near-black ink color is missing");

const revealCount = (sourceText.match(/data-reveal/g) || []).length;
if (revealCount < 18) errors.push(`motion coverage is too low: ${revealCount}`);
if ((sourceText.match(/data-parallax/g) || []).length < 8) errors.push("image parallax coverage is too low");

const homeSource = await readFile(new URL("src/index.template.html", root), "utf8");
if (/case-catharsis|case-crimescene|카타르시스|크라임씬|SELECTED WORK|운영 사이트/i.test(homeSource)) {
  errors.push("homepage must not contain project examples");
}
if (!/studio-hero-v46\.webp/.test(homeSource)) errors.push("homepage face-free studio image is missing");
if (!/swag-mark-v42\.png/.test(homeSource)) errors.push("custom symbol favicon is missing");
if (!/HERO_DESCRIPTION/.test(homeSource) || !/2인 프리랜서/.test(data.brand.description)) errors.push("homepage two-person team fact is missing");
if (!/data-motion-stage/.test(homeSource)) errors.push("homepage three-row motion stage is missing");
if (!/data-motion-toggle/.test(homeSource)) errors.push("three-row motion pause control is missing");
if (!/제작 분야[\s\S]*프로젝트[\s\S]*진행 방식[\s\S]*소개[\s\S]*견적 문의/.test(sourceText)) {
  errors.push("navigation is missing required destinations");
}

const aboutSource = await readFile(new URL("src/about.template.html", root), "utf8");
for (const fact of ["2인 프리랜서", "합리적인 비용", "빠른 진행", "같은 담당자", "두 사람 전담", "상담", "기획", "디자인", "개발", "검수", "배포"]) {
  if (!aboutSource.includes(fact)) errors.push(`about page is missing required fact: ${fact}`);
}

const appSource = await readFile(new URL("src/app.js", root), "utf8");
const buildSource = await readFile(new URL("scripts/build.mjs", root), "utf8");
if (!/requestAnimationFrame\(drawFilm\)/.test(appSource)) errors.push("continuous cinematic film motion is missing");
if (!/requestAnimationFrame\(autoMove\)/.test(appSource)) errors.push("continuous service-film motion is missing");
if (!/requestAnimationFrame\(moveMotionRows\)/.test(appSource)) errors.push("continuous three-row motion is missing");
if (!/\[27,\s*-21,\s*24\]/.test(buildSource)) errors.push("three-row opposing motion speeds are missing");
if (!/@keyframes\s+cinematicDrift[\s\S]*@keyframes\s+spliceSweep[\s\S]*@keyframes\s+capabilityRun/.test(css)) {
  errors.push("continuous image, splice, and capability motion is missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content and design validation passed");
