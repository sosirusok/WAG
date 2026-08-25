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
  ["work", "작업 사례", "work/"],
  ["services", "제작 범위", "services/"],
  ["process", "진행 과정", "process/"],
  ["contact", "문의", "contact/"]
];

const renderNavLinks = (active, className = "") => navItems.map(([key, label, href]) =>
  `<a class="${className}" href="${href}"${activeAttr(active, key)}>${label}</a>`
).join("");

const renderBrand = (footer = false) => `<a class="brand${footer ? " brand-footer" : ""}" href="./" aria-label="SWAG 홈">
  <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 44 44"><path d="M9 13.5h20.5a5.5 5.5 0 0 1 0 11H14.5a5.5 5.5 0 0 0 0 11H35"/><path d="M9 8v9M35 27v9"/></svg><i></i></span>
  <span class="brand-name">SWAG</span>
</a>`;

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <div class="scroll-progress" aria-hidden="true"></div>
    <div class="header-inner">
      ${renderBrand()}
      <nav class="desktop-nav" aria-label="주요 메뉴">${renderNavLinks(active)}</nav>
      <a class="header-cta" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">프로젝트 문의 <i aria-hidden="true">↗</i></a>
      <details class="mobile-menu">
        <summary aria-label="메뉴 열기"><span></span>메뉴</summary>
        <nav aria-label="모바일 메뉴">${renderNavLinks(active)}</nav>
      </details>
    </div>
  </header>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer">
    <div class="footer-top shell">
      <div class="footer-brand">${renderBrand(true)}<p>웹사이트, 앱, 브라우저 게임과 운영 시스템을 만듭니다.</p></div>
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

const renderHomeServicePanels = () => data.services.map((service) => `
  <a data-reveal href="services/#${escapeHtml(service.id)}">
    <span>${escapeHtml(service.short)}</span>
    <h3>${escapeHtml(service.title)}</h3>
    <p>${escapeHtml(service.description)}</p>
    <i aria-hidden="true">↗</i>
  </a>`).join("");

const renderHomeWorkCards = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `<article class="work-card ${index ? "blue" : "mint"}" data-reveal>
    <a class="browser-frame" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기">
      <span class="browser-top"><i></i><i></i><i></i><b>${index ? "crimescene" : "catharsis"}</b></span>
      <figure>${renderImage(project, { priority: index === 0 })}</figure>
    </a>
    <div class="work-card-copy"><p>${escapeHtml(project.category)}</p><h3>${escapeHtml(project.title)}</h3><span>${escapeHtml(project.summary)}</span><a href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트 보기 <i aria-hidden="true">↗</i></a></div>
  </article>`;
}).join("");

const renderHeroProjectCard = () => {
  const project = publicProjects[0];
  const external = project ? safeHttpUrl(project.url) : "";
  if (!project || !external) return "";
  return `<a class="hero-project-card" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">
    <span class="project-browser-bar"><i></i><i></i><i></i></span>
    <figure>${renderImage(project, { priority: true })}</figure>
    <div><span>최근 작업</span><strong>${escapeHtml(project.title)}</strong><i aria-hidden="true">↗</i></div>
  </a>`;
};

const renderWorkList = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `
  <article class="case-study ${index ? "blue" : "mint"}" data-reveal>
    <a class="case-browser" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기">
      <span class="browser-top"><i></i><i></i><i></i><b>운영 중인 웹사이트</b></span>
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
      <div><h3>기본으로 확인하는 범위</h3><ul>${service.items.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><h3>필요할 때 추가하는 기능</h3><ul class="option-list">${service.items.slice(2).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <p class="operation-note">운영자가 직접 내용을 관리하는 방법과 공개 이후의 수정 범위까지 제작 전에 함께 확인합니다.</p>
      <a class="service-link" href="contact/?type=${escapeHtml(service.id)}">이 범위로 문의하기 <i aria-hidden="true">↗</i></a>
    </div>
  </article>`).join("");

const renderCapabilityGrid = () => data.capabilityGroups.map((item) => `
  <article><i aria-hidden="true"></i><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-key="${escapeHtml(service.id)}" data-brief-group="제작 종류" data-brief-value="${escapeHtml(service.title)}">${escapeHtml(service.title)}<small>${escapeHtml(service.short)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-group="필요 기능" data-brief-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");

const renderProcess = () => data.process.map((item) => `
  <article data-reveal>
    <i aria-hidden="true"></i>
    <div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
    <aside><b>함께 확인할 내용</b><p>${escapeHtml(item.result)}</p></aside>
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
  HERO_SECONDARY_CTA: data.brand.secondaryCta,
  HERO_PROJECT_CARD: renderHeroProjectCard(),
  HOME_WORK_CARDS: renderHomeWorkCards(),
  HOME_SERVICE_PANELS: renderHomeServicePanels()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HERO_PROJECT_CARD", "HOME_WORK_CARDS", "HOME_SERVICE_PANELS"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `작업 사례 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG가 공개한 웹사이트와 디지털 서비스 작업",
  CANONICAL_URL: pageUrl("work/"),
  HEADER: renderHeader("work"),
  FOOTER: renderFooter(pageUrl("work/")),
  WORK_CARDS: renderWorkList()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "WORK_CARDS"]);

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 범위 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 모바일 앱, 게임과 디지털 서비스 안내",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_GRID: renderCapabilityGrid()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_GRID"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 과정 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "요청 정리부터 핵심 화면, 개발, 검수와 배포까지 SWAG의 진행 방식",
  CANONICAL_URL: pageUrl("process/"),
  HEADER: renderHeader("process"),
  FOOTER: renderFooter(pageUrl("process/")),
  PROCESS_FLOW: renderProcessFlow(),
  PROCESS: renderProcess()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROCESS_FLOW", "PROCESS"]);

await writePage("contact.template.html", "contact/index.html", {
  PAGE_TITLE: `프로젝트 문의 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG 프로젝트 문의와 상담 내용 정리",
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
  "favicon.svg",
  "WantedSansVariable.woff2",
  "swag-hero-brand.png",
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

const sitemapEntries = ["", "services/", "process/", "work/", "contact/", "privacy.html"];
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `<url><loc>${escapeHtml(pageUrl(entry))}</loc></url>`).join("")}</urlset>\n`);

console.log(`Built SWAG to ${output}`);
