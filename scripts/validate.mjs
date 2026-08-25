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
  "Paperlogy-8ExtraBold.woff2",
  "SUIT-Variable.woff2",
  "case-catharsis.jpg",
  "case-crimescene.jpg",
  "swag-og.png",
  "swag-monogram-v3.png",
  "swag-wordmark-v3.png"
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
  [/accent-(?:red|black)|kinetic-|cursor-orb|page-wipe/gi, "legacy dark/red decorative assets"],
  [/MAKE\s*\/\s*BREAK|DESIGN IN MOTION|눈에 남고 제대로 작동|다양한 플랫폼[,.]?\s*맞춤형 제작/gi, "generic slogan copy"],
  [/필요한 만큼 정확하게|실제로 운영 중인 화면을 직접 확인|중요한 화면을 먼저 확인하고|만들고 싶은 서비스가 있나요|필요한 페이지로 바로 이동하세요/gi, "rejected AI-style copy"],
  [/>\s*0[1-9]\s*</g, "visible arbitrary numbering"],
  [/(?:맑은\s*고딕|Malgun Gothic|Dotum|돋움|Gulim|굴림)/gi, "legacy system font"],
  [/#(?:4254ff|2436d9|00c7f2|9d7cff|e9edff|e5faff|f0ebff|007eec|008fe9|16275b|142461|6576ff|7584ff)\b/gi, "legacy blue, cyan, or violet palette"],
  [/swag-symbol-v2|WantedSansVariable|swag-hero-brand/gi, "legacy brand asset"],
  [/\bkhaki\b/gi, "khaki palette"]
];

for (const [pattern, label] of bannedPatterns) {
  if (pattern.test(sourceText)) errors.push(`banned ${label} found`);
}

const css = await readFile(new URL("src/styles.css", root), "utf8");
if (!/@font-face[\s\S]*SUIT Variable/.test(css)) errors.push("SUIT Variable webfont is not configured");
if (!/@font-face[\s\S]*Paperlogy/.test(css)) errors.push("Paperlogy display font is not configured");
if (!/body\s*\{[\s\S]*?font-size:\s*(?:17|18)px/.test(css)) errors.push("body copy must be at least 17px");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) errors.push("reduced-motion mode is required");
if (!/:focus-visible\b/.test(css)) errors.push("visible keyboard focus styles are required");

const tinyFonts = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) < 14);
if (tinyFonts.length) errors.push(`CSS contains ${tinyFonts.length} font sizes below 14px`);
if (!/#c93400\b/i.test(css)) errors.push("accessible orange accent is missing");
if (!/#ff5a00\b/i.test(css)) errors.push("high-contrast orange for dark surfaces is missing");

const revealCount = (sourceText.match(/data-reveal/g) || []).length;
if (revealCount < 16) errors.push(`motion coverage is too low: ${revealCount}`);

const homeSource = await readFile(new URL("src/index.template.html", root), "utf8");
if (/HOME_WORK|HERO_PROJECT|case-catharsis|case-crimescene|공개 작업|작업 사례 보기/i.test(homeSource)) {
  errors.push("homepage must not contain project examples");
}
if (!/class="hero-wordmark"[\s\S]*swag-wordmark-v3\.png/.test(homeSource)) errors.push("homepage custom wordmark is missing");
if (!/rel="icon" href="assets\/swag-monogram-v3\.png"/.test(homeSource)) errors.push("custom monogram favicon is missing");
if (!/2인 프리랜서 스튜디오/.test(homeSource)) errors.push("homepage team fact is missing");
if (!/제작 분야[\s\S]*프로젝트[\s\S]*진행 방식[\s\S]*스튜디오[\s\S]*견적 문의/.test(sourceText)) {
  errors.push("desktop navigation is missing required destinations");
}

const aboutSource = await readFile(new URL("src/about.template.html", root), "utf8");
for (const fact of ["2인 프리랜서", "합리적인 비용", "빠른 진행", "같은 담당자", "상담", "기획", "디자인", "개발", "검수", "배포"]) {
  if (!aboutSource.includes(fact)) errors.push(`about page is missing required fact: ${fact}`);
}

const appSource = await readFile(new URL("src/app.js", root), "utf8");
if (!/requestAnimationFrame\(drawCanvas\)/.test(appSource)) errors.push("continuous hero canvas motion is missing");
if (/createRadialGradient|\bdot(?:X|Y)?\b/.test(appSource)) errors.push("point-like canvas decoration remains");
if (!/@keyframes\s+(?:glitchA|wordmarkCut)[\s\S]*@keyframes\s+ticker/.test(css)) errors.push("continuous wordmark and ticker motion is missing");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content and design validation passed");
