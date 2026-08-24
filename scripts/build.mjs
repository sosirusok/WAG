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
const ogUrl = pageUrl("assets/accent-red-rip.webp");

const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const serviceAccents = [
  "accent-red-rip.webp",
  "accent-white-tape.webp",
  "accent-black-burst.webp",
  "accent-red-stamp.webp"
];

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";
const navItems = [
  ["work", "작업", "work/"],
  ["services", "서비스", "services/"],
  ["about", "소개", "about/"],
  ["process", "진행", "process/"],
  ["contact", "문의", "contact/"]
];

const renderNavLinks = (active, className = "") => navItems.map(([key, label, href]) =>
  `<a class="${className}" href="${href}"${activeAttr(active, key)}>${label}</a>`
).join("");

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <div class="header-inner shell">
      <a class="logo magnetic" href="./" aria-label="SWAG 메인">
        <strong>SWAG</strong><i aria-hidden="true"></i>
      </a>
      <nav class="desktop-nav" aria-label="주요 메뉴">${renderNavLinks(active)}</nav>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="mobile-menu"><span>메뉴</span><i aria-hidden="true"></i></button>
    </div>
    <nav class="mobile-menu" id="mobile-menu" data-mobile-menu aria-label="모바일 메뉴" hidden>
      <div class="shell">${renderNavLinks(active, "mobile-menu-link")}<a class="mobile-menu-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오로 문의 <i aria-hidden="true">↗</i></a></div>
    </nav>
  </header>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer">
    <div class="footer-main shell">
      <a class="footer-wordmark" href="./">SWAG</a>
      <div class="footer-right">
        <nav aria-label="하단 메뉴">${renderNavLinks("")}</nav>
        <div class="footer-contact">
          <a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 <i aria-hidden="true">↗</i></a>
          <a href="tel:${phoneDigits}">${escapeHtml(data.contact.phone)}</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom shell"><span>© <b data-year>2026</b> SWAG</span><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로 <i aria-hidden="true">↑</i></a></div>
  </footer>`;

const renderImage = (entry, options = {}) => {
  const image = safeImage(entry.image);
  if (!image) return '<div class="image-unavailable">이미지를 불러올 수 없습니다.</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${escapeHtml(image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" decoding="async"${priority}>`;
};

const renderHomeServicePanels = () => data.services.map((service, index) => `
  <a class="home-service-panel reveal" href="services/#${escapeHtml(service.id)}">
    <figure class="service-symbol" aria-hidden="true"><img src="assets/${serviceAccents[index % serviceAccents.length]}" alt="" loading="lazy" decoding="async"></figure>
    <div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.short)}</p><span aria-hidden="true">↗</span></div>
  </a>`).join("");

const renderWorkList = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `
  <article class="work-entry reveal ${index % 2 ? "work-entry-reverse" : ""}" data-auto-motion>
    <a class="work-entry-media" href="work/${escapeHtml(project.id)}.html" aria-label="${escapeHtml(project.title)} 자세히 보기" data-project-visual data-tilt>
      <figure>${renderImage(project, { priority: index === 0 })}<i class="work-scan" aria-hidden="true"></i></figure>
    </a>
    <div class="work-entry-copy">
      <p><span>${escapeHtml(project.category)}</span><b>${escapeHtml(project.year)}</b></p>
      <h2>${escapeHtml(project.title)}</h2>
      <p class="work-summary">${escapeHtml(project.summary)}</p>
      <ul>${project.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      <div class="work-entry-links">
        <a href="work/${escapeHtml(project.id)}.html">작업 자세히 보기 <i aria-hidden="true">→</i></a>
        ${external ? `<a href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트 <i aria-hidden="true">↗</i></a>` : ""}
      </div>
    </div>
  </article>`;
}).join("");

const renderServiceChapters = () => data.services.map((service, index) => `
  <article class="service-showcase" id="${escapeHtml(service.id)}" data-service-showcase data-auto-motion>
    <figure class="service-showcase-media reveal" aria-hidden="true">
      <img src="assets/${serviceAccents[index % serviceAccents.length]}" alt="" loading="lazy" decoding="async">
    </figure>
    <div class="service-showcase-copy reveal">
      <p>${escapeHtml(service.short)}</p>
      <h2>${escapeHtml(service.title)}</h2>
      <p class="service-description">${escapeHtml(service.description)}</p>
      <ul>${service.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <a class="text-link" href="contact/?type=${escapeHtml(service.id)}">${escapeHtml(service.title)} 문의 <i aria-hidden="true">→</i></a>
    </div>
  </article>`).join("");

const renderCapabilityGrid = () => data.capabilityGroups.map((item) => `
  <article class="capability-item reveal"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><i aria-hidden="true"></i></article>`).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-key="${escapeHtml(service.id)}" data-brief-group="제작 종류" data-brief-value="${escapeHtml(service.title)}">${escapeHtml(service.title)}<small>${escapeHtml(service.short)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-group="필요 기능" data-brief-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");

const renderProcess = () => data.process.map((item) => `
  <article class="process-scene reveal" data-process-scene data-process-label="${escapeHtml(item.title)}">
    <div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
    <p class="process-result"><span>이때 확인할 것</span><strong>${escapeHtml(item.result)}</strong></p>
    <i class="process-scene-line" aria-hidden="true"></i>
  </article>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details class="faq-item reveal"><summary><span>${escapeHtml(item.question)}</span><i aria-hidden="true"></i></summary><p>${escapeHtml(item.answer)}</p></details>`).join("");

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
  HOME_SERVICE_PANELS: renderHomeServicePanels()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HOME_SERVICE_PANELS"]);

await writePage("about.template.html", "about/index.html", {
  PAGE_TITLE: `소개 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹, 앱, 게임을 디자인하고 개발하는 SWAG 스튜디오 소개",
  CANONICAL_URL: pageUrl("about/"),
  HEADER: renderHeader("about"),
  FOOTER: renderFooter(pageUrl("about/"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `작업 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG가 공개한 웹사이트와 디지털 서비스 작업",
  CANONICAL_URL: pageUrl("work/"),
  HEADER: renderHeader("work"),
  FOOTER: renderFooter(pageUrl("work/")),
  WORK_CARDS: renderWorkList()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "WORK_CARDS"]);

for (const [index, project] of publicProjects.entries()) {
  const next = publicProjects[(index + 1) % publicProjects.length];
  const externalUrl = safeHttpUrl(project.url);
  await writePage("project.template.html", `work/${project.id}.html`, {
    PAGE_TITLE: `${project.title} | SWAG 작업`,
    PAGE_DESCRIPTION: project.summary,
    OG_URL: pageUrl(project.image),
    CANONICAL_URL: pageUrl(`work/${project.id}.html`),
    HEADER: renderHeader("work"),
    FOOTER: renderFooter(pageUrl(`work/${project.id}.html`)),
    PROJECT_CATEGORY: project.category,
    PROJECT_YEAR: project.year,
    PROJECT_TITLE: project.title,
    PROJECT_SUMMARY: project.summary,
    PROJECT_IMAGE: renderImage(project, { priority: true }),
    PROJECT_PROBLEM: project.problem,
    PROJECT_SOLUTION: project.solution,
    PROJECT_RESULT: project.result,
    PROJECT_FEATURES: project.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join(""),
    PROJECT_EXTERNAL: externalUrl ? `<a class="external-project" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">운영 사이트 보기 <span aria-hidden="true">↗</span></a>` : "",
    NEXT_PROJECT: next ? `<a class="next-project" href="work/${escapeHtml(next.id)}.html"><span>다른 작업</span><b>${escapeHtml(next.title)}</b><i aria-hidden="true">→</i></a>` : ""
  }, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROJECT_IMAGE", "PROJECT_FEATURES", "PROJECT_EXTERNAL", "NEXT_PROJECT"]);
}

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `서비스 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 모바일 앱, 게임과 디지털 서비스 안내",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_GRID: renderCapabilityGrid()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_GRID"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 방식 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "요청 정리부터 핵심 화면, 개발, 검수와 배포까지 SWAG의 진행 방식",
  CANONICAL_URL: pageUrl("process/"),
  HEADER: renderHeader("process"),
  FOOTER: renderFooter(pageUrl("process/")),
  PROCESS: renderProcess()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROCESS"]);

await writePage("contact.template.html", "contact/index.html", {
  PAGE_TITLE: `문의 | ${data.brand.name}`,
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
await cp(path.join(source, "assets"), path.join(output, "assets"), { recursive: true });

const version = {
  commitSha: process.env.GITHUB_SHA || "local",
  builtAt: new Date().toISOString(),
  contentUpdatedAt: data.meta.updatedAt
};
await writeFile(path.join(output, "version.json"), JSON.stringify(version, null, 2));
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${pageUrl("sitemap.xml")}\n`);

const sitemapEntries = ["", "about/", "services/", "process/", "work/", ...publicProjects.map((project) => `work/${project.id}.html`), "contact/", "privacy.html"];
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `<url><loc>${escapeHtml(pageUrl(entry))}</loc></url>`).join("")}</urlset>\n`);

console.log(`Built SWAG to ${output}`);
