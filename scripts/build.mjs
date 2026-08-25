import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./validate.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const output = path.join(root, "dist");
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));
const assetRevision = encodeURIComponent(String(data.meta.version ?? data.meta.updatedAt ?? "1"));

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const safeHttpUrl = (value = "") => {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const safeImage = (value = "") => {
  if (!value) return "";
  if (/^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes("..")) return value;
  return safeHttpUrl(value);
};

const normalizedSiteUrl = (() => {
  const candidate = process.env.SITE_URL || "https://sosirusok.github.io/WAG/";
  try {
    const url = new URL(candidate);
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch {
    return "https://sosirusok.github.io/WAG/";
  }
})();

const pageUrl = (relative = "") => new URL(relative, normalizedSiteUrl).href;
const kakaoUrl = safeHttpUrl(data.contact.kakao);
const phoneDigits = data.contact.phone.replace(/\D/g, "");
const ogUrl = pageUrl("assets/swag-og.png");

const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";
const navItems = [
  ["services", "제작 분야", "services/"],
  ["work", "프로젝트", "work/"],
  ["process", "진행 방식", "process/"],
  ["about", "스튜디오", "about/"],
  ["contact", "견적 문의", "contact/"]
];

const renderNavLinks = (active, className = "") => navItems.map(([key, label, href]) =>
  `<a class="${className}" href="${href}"${activeAttr(active, key)}>${label}</a>`
).join("");

const renderBrand = (footer = false) => `<a class="brand${footer ? " brand-footer" : ""}" href="./" aria-label="SWAG 홈">
  <img src="assets/swag-wordmark-v3.png" alt="SWAG" width="2103" height="748">
</a>`;

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <div class="scroll-progress" aria-hidden="true"></div>
    <div class="header-inner">
      ${renderBrand()}
      <nav class="desktop-nav" aria-label="주요 메뉴">${renderNavLinks(active)}</nav>
      <details class="mobile-menu">
        <summary aria-label="메뉴 열기"><span></span>메뉴</summary>
        <nav aria-label="모바일 메뉴">${renderNavLinks(active)}</nav>
      </details>
    </div>
  </header>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer">
    <div class="footer-top shell">
      <div class="footer-brand">${renderBrand(true)}<p>웹사이트 · 앱 · 브라우저 게임 · 운영 시스템</p></div>
      <nav class="footer-links" aria-label="하단 메뉴">${renderNavLinks("")}</nav>
      <div class="footer-contact"><span>문의</span><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a href="tel:${phoneDigits}">김의현 ${escapeHtml(data.contact.phone)}</a></div>
    </div>
    <div class="footer-bottom shell"><span>© <b data-year>2026</b> SWAG</span><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로 ↑</a></div>
  </footer>`;

const renderImage = (entry, options = {}) => {
  const image = safeImage(entry.image);
  if (!image) return '<div class="image-unavailable">이미지를 불러올 수 없습니다.</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${escapeHtml(image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" decoding="async"${priority}>`;
};

const renderWorkList = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `
  <article class="case-study" data-reveal>
    <a class="case-browser" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기">
      <span class="browser-top"><b>LIVE SITE</b><span>${escapeHtml(project.year)}</span></span>
      <figure>${renderImage(project, { priority: index === 0 })}</figure>
    </a>
    <div class="case-copy">
      <p class="case-type">${escapeHtml(project.category)}</p>
      <h2>${escapeHtml(project.title)}</h2>
      <p class="case-description">${escapeHtml(project.summary)}</p>
      <dl><div><dt>제작 범위</dt><dd>${escapeHtml(project.problem)}</dd></div><div><dt>구현 내용</dt><dd>${escapeHtml(project.solution)}</dd></div></dl>
      <ul>${project.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      ${external ? `<a class="case-link" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트에서 확인하기 <i aria-hidden="true">↗</i></a>` : ""}
    </div>
  </article>`;
}).join("");

const renderServiceChapters = () => data.services.map((service) => `
  <article id="${escapeHtml(service.id)}" data-reveal>
    <header><p>${escapeHtml(service.short)}</p><h2>${escapeHtml(service.title)}</h2><span>${escapeHtml(service.description)}</span></header>
    <div class="service-body">
      <div><h3>기본 범위</h3><ul>${service.items.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><h3>추가 기능</h3><ul class="option-list">${service.items.slice(2).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <p class="operation-note">관리 방식, 외부 계정, 배포 후 수정 범위는 견적 단계에서 확인합니다.</p>
      <a class="service-link" href="contact/?type=${escapeHtml(service.id)}">견적 문의 <i aria-hidden="true">↗</i></a>
    </div>
  </article>`).join("");

const renderCapabilityGrid = () => data.capabilityGroups.map((item) => `
  <article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-key="${escapeHtml(service.id)}" data-brief-group="제작 종류" data-brief-value="${escapeHtml(service.title)}">${escapeHtml(service.title)}<small>${escapeHtml(service.short)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-group="필요 기능" data-brief-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");

const renderProcess = () => data.process.map((item) => `
  <article data-reveal>
    <div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
    <aside><b>확인 항목</b><p>${escapeHtml(item.result)}</p></aside>
  </article>`).join("");

const renderProcessFlow = () => data.process.map((item) => `<span>${escapeHtml(item.title)}</span>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details data-reveal><summary>${escapeHtml(item.question)}<span aria-hidden="true">+</span></summary><p>${escapeHtml(item.answer)}</p></details>`).join("");

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: data.brand.name,
  description: data.meta.description,
  url: normalizedSiteUrl,
  telephone: data.contact.phone,
  areaServed: { "@type": "Country", name: "대한민국" },
  makesOffer: ["웹사이트 제작", "모바일 앱 개발", "게임 개발", "디지털 서비스 개발"].map((name) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name, serviceType: name }
  }))
}).replaceAll("<", "\\u003c");

const commonTokens = {
  SITE_URL: normalizedSiteUrl,
  META_TITLE: data.meta.title,
  META_DESCRIPTION: data.meta.description,
  OG_URL: ogUrl,
  STRUCTURED_DATA: structuredData,
  KAKAO_URL: kakaoUrl,
  PHONE: data.contact.phone,
  PHONE_DIGITS: phoneDigits,
  OWNER: data.contact.owner,
  RESPONSE_NOTE: data.contact.responseNote
};

const fillTemplate = (template, tokens, rawKeys = new Set()) => Object.entries(tokens).reduce((html, [key, value]) => {
  const replacement = rawKeys.has(key) ? String(value) : escapeHtml(value);
  return html.replaceAll(`{{${key}}}`, replacement);
}, template);

const templates = {};
const getTemplate = async (name) => {
  if (!templates[name]) templates[name] = await readFile(path.join(source, name), "utf8");
  return templates[name];
};

const writePage = async (templateName, outputPath, tokens, rawKeys = []) => {
  const template = await getTemplate(templateName);
  const target = path.join(output, outputPath);
  const html = fillTemplate(template, { ...commonTokens, ...tokens }, new Set(rawKeys))
    .replaceAll('href="styles.css"', `href="styles.css?v=${assetRevision}"`)
    .replaceAll('src="app.js"', `src="app.js?v=${assetRevision}"`);
  const unresolved = html.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) throw new Error(`${outputPath} has unresolved template tokens: ${[...new Set(unresolved)].join(", ")}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
};

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "assets"), { recursive: true });

await writePage("index.template.html", "index.html", {
  PAGE_TITLE: data.meta.title,
  PAGE_DESCRIPTION: data.meta.description,
  CANONICAL_URL: normalizedSiteUrl,
  HEADER: renderHeader("home"),
  FOOTER: renderFooter(normalizedSiteUrl),
  BRAND_EXPANSION: data.brand.expansion,
  HERO_DESCRIPTION: data.brand.description,
  HERO_HEADLINE: data.brand.headline,
  HERO_PRIMARY_CTA: data.brand.primaryCta,
  HERO_SECONDARY_CTA: data.brand.secondaryCta
}, ["STRUCTURED_DATA", "HEADER", "FOOTER"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `프로젝트 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG의 공개 프로젝트와 담당 범위",
  CANONICAL_URL: pageUrl("work/"),
  HEADER: renderHeader("work"),
  FOOTER: renderFooter(pageUrl("work/")),
  WORK_CARDS: renderWorkList()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "WORK_CARDS"]);

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 분야 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 앱, 브라우저 게임과 운영 시스템 제작 분야",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_GRID: renderCapabilityGrid()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_GRID"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 방식 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "상담부터 기획, 디자인, 개발, 검수와 배포까지의 진행 방식",
  CANONICAL_URL: pageUrl("process/"),
  HEADER: renderHeader("process"),
  FOOTER: renderFooter(pageUrl("process/")),
  PROCESS_FLOW: renderProcessFlow(),
  PROCESS: renderProcess()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROCESS_FLOW", "PROCESS"]);

await writePage("about.template.html", "about/index.html", {
  PAGE_TITLE: `스튜디오 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "두 명의 프리랜서가 직접 맡는 SWAG의 제작 방식",
  CANONICAL_URL: pageUrl("about/"),
  HEADER: renderHeader("about"),
  FOOTER: renderFooter(pageUrl("about/"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER"]);

await writePage("contact.template.html", "contact/index.html", {
  PAGE_TITLE: `견적 문의 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG 제작 견적 문의와 상담 내용 정리",
  CANONICAL_URL: pageUrl("contact/"),
  HEADER: renderHeader("contact"),
  FOOTER: renderFooter(pageUrl("contact/")),
  PLANNER_TYPES: renderPlannerTypes(),
  PLANNER_FEATURES: renderPlannerFeatures(),
  FAQ: renderFaq()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PLANNER_TYPES", "PLANNER_FEATURES", "FAQ"]);

await writePage("privacy.template.html", "privacy.html", {
  PAGE_TITLE: "개인정보 처리 안내 | SWAG",
  PAGE_DESCRIPTION: "SWAG 웹사이트 개인정보 처리 안내",
  CANONICAL_URL: pageUrl("privacy.html"),
  HEADER: renderHeader(""),
  FOOTER: renderFooter(pageUrl("privacy.html"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER"]);

await writePage("404.template.html", "404.html", {
  HEADER: renderHeader(""),
  FOOTER: renderFooter(normalizedSiteUrl)
}, ["HEADER", "FOOTER"]);

await cp(path.join(source, "styles.css"), path.join(output, "styles.css"));
await cp(path.join(source, "app.js"), path.join(output, "app.js"));
for (const asset of [
  "SUIT-Variable.woff2",
  "Paperlogy-8ExtraBold.woff2",
  "swag-monogram-v3.png",
  "swag-wordmark-v3.png",
  "swag-og.png",
  "case-catharsis.jpg",
  "case-crimescene.jpg"
]) {
  await cp(path.join(source, "assets", asset), path.join(output, "assets", asset));
}

const version = {
  commitSha: process.env.GITHUB_SHA || "local",
  builtAt: new Date().toISOString(),
  contentUpdatedAt: data.meta.updatedAt
};
await writeFile(path.join(output, "version.json"), JSON.stringify(version, null, 2));
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${pageUrl("sitemap.xml")}\n`);

const sitemapEntries = ["", "services/", "work/", "process/", "about/", "contact/", "privacy.html"];
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `<url><loc>${escapeHtml(pageUrl(entry))}</loc></url>`).join("")}</urlset>\n`);

console.log(`Built SWAG to ${output}`);
