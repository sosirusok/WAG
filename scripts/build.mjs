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
  if (/^(assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes("..")) return value;
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
const ogUrl = pageUrl("assets/case-catharsis.jpg");

const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <i class="scroll-progress" data-site-progress aria-hidden="true"></i>
    <div class="header-inner">
      <a class="logo" href="./" aria-label="SWAG 홈">
        <strong>SWAG</strong><span>웹, 앱, 게임 제작</span>
      </a>
      <nav class="desktop-nav top-nav" aria-label="주요 메뉴">
        <a href="work/"${activeAttr(active, "work")}>작업</a>
        <a href="about/"${activeAttr(active, "about")}>소개</a>
        <a href="services/"${activeAttr(active, "services")}>제작 범위</a>
        <a href="process/"${activeAttr(active, "process")}>진행 방식</a>
        <a href="contact/"${activeAttr(active, "contact")}>문의</a>
      </nav>
    </div>
  </header>
  <div class="header-sentinel" data-header-sentinel aria-hidden="true"></div>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer">
    <div class="footer-top shell">
      <div class="footer-brand"><strong>SWAG</strong></div>
      <nav class="footer-links" aria-label="하단 메뉴"><a href="work/">작업</a><a href="about/">소개</a><a href="services/">제작 범위</a><a href="process/">진행 방식</a><a href="contact/">문의</a></nav>
      <div class="footer-contact"><span>프로젝트 문의</span><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a href="tel:${phoneDigits}">전화 ${escapeHtml(data.contact.phone)}</a></div>
    </div>
    <div class="footer-bottom shell"><span>© <b data-year>2026</b> SWAG</span><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로 ↑</a></div>
  </footer>`;

const renderImage = (project, options = {}) => {
  const image = safeImage(project.image);
  if (!image) return '<div class="image-unavailable">등록된 작업 화면이 없습니다</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.imageAlt || project.title)}" decoding="async"${priority}>`;
};

const renderHomeServiceCards = () => data.services.map((service) => `<a class="home-offering reveal" href="services/#${escapeHtml(service.id)}"><span>${escapeHtml(service.number)}</span><div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.subtitle)}</p></div><em aria-hidden="true">→</em></a>`).join("");

const renderHomeFeaturedWork = () => publicProjects.filter((project) => project.featured).slice(0, 2).map((project, index) => `<article class="home-project reveal"><a href="work/${escapeHtml(project.id)}.html"><figure data-project-visual><span data-project-tilt>${renderImage(project, { priority: index === 0 })}</span><i aria-hidden="true"></i></figure><div><p>${escapeHtml(project.category)} <b>${escapeHtml(project.year)}</b></p><h3>${escapeHtml(project.title)}</h3><span>${escapeHtml(project.summary)}</span><em>자세히 보기 <i aria-hidden="true">→</i></em></div></a></article>`).join("");

const renderHomeContactBackdrop = () => {
  return '<i></i><i></i><i></i><span>SWAG</span>';
};

const renderWorkList = () => publicProjects.map((project, index) => `<article class="work-entry reveal"><figure class="browser-frame work-browser" data-project-visual><span class="browser-surface" data-project-tilt><span class="browser-bar"><i></i><i></i><i></i><b>${escapeHtml(project.title)}</b></span>${renderImage(project, { priority: index === 0 })}</span><figcaption>공개 사이트 화면</figcaption></figure><div class="work-entry-copy"><span>${escapeHtml(project.category)}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.summary)}</p><ul>${project.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul><div class="work-entry-links"><a href="work/${escapeHtml(project.id)}.html">자세히 보기 <i aria-hidden="true">→</i></a>${safeHttpUrl(project.url) ? `<a href="${escapeHtml(safeHttpUrl(project.url))}" target="_blank" rel="noopener noreferrer">운영 사이트 <i aria-hidden="true">↗</i></a>` : ""}</div></div></article>`).join("");

const renderServiceGroup = (title, items, defaultOpen = false) => `<details open data-service-group data-mobile-open="${defaultOpen ? "true" : "false"}"><summary><h3>${escapeHtml(title)}</h3><i aria-hidden="true"></i></summary><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>`;

const renderServiceChapters = () => data.services.map((service) => `
  <article class="reveal" id="${escapeHtml(service.id)}">
    <header><span>${escapeHtml(service.number)}</span><div><h2>${escapeHtml(service.title)}</h2><p>${escapeHtml(service.subtitle)}</p><p class="service-chapter-description">${escapeHtml(service.description)}</p></div></header>
    <div class="service-columns">${renderServiceGroup("핵심 구축", service.items, true)}${renderServiceGroup("추가 기능", service.advanced || [])}${renderServiceGroup("운영과 배포", service.operations || [])}<a href="contact/?type=${escapeHtml(service.id)}">이 범위로 문의하기 <i aria-hidden="true">→</i></a></div>
  </article>`).join("");

const renderCapabilityGrid = () => data.capabilityGroups.map((item) => `
  <article class="capability-item"><span>${escapeHtml(item.code)}</span><h3>${escapeHtml(item.title)}</h3><b>${escapeHtml(item.description)}</b></article>`).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-scope-choice data-scope-key="${escapeHtml(service.id)}" data-scope-group="제작 종류" data-scope-value="${escapeHtml(service.title)}">${escapeHtml(service.title)}<small>${escapeHtml(service.subtitle)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-scope-choice data-scope-group="필요 기능" data-scope-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");

const processOutput = ["목표와 필수 기능", "화면 목록, 일정과 견적", "주요 화면 시안", "작동하는 사이트와 관리자 화면", "공개 주소와 관리 안내"];
const renderProcess = () => data.process.map((item, index) => `<article class="process-chapter reveal" id="process-step-${index + 1}" data-process-step data-process-number="${escapeHtml(item.number)}"><span class="process-chapter-number">${escapeHtml(item.number)}</span><div class="process-chapter-copy"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description.replace(/[.]$/, ""))}</p></div><dl><dt>완료 기준</dt><dd>${escapeHtml(processOutput[index] || "진행 범위와 결과물")}</dd></dl></article>`).join("");

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
  serviceType: ["웹사이트 제작", "앱과 모바일 서비스 개발", "게임 개발", "커머스, 플랫폼, 업무 시스템 구축"]
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
  HERO_DESCRIPTION: data.brand.description,
  HERO_EYEBROW: data.brand.eyebrow,
  HERO_HEADLINE: `${data.brand.headlineTop} ${data.brand.headlineFocus}`,
  HERO_PRIMARY_CTA: data.brand.primaryCta,
  HERO_SECONDARY_CTA: data.brand.secondaryCta,
  HOME_FEATURED_WORK: renderHomeFeaturedWork(),
  HOME_SERVICE_CARDS: renderHomeServiceCards(),
  HOME_CONTACT_IMAGE: renderHomeContactBackdrop(),
  RESPONSE_NOTE: data.contact.responseNote
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HOME_FEATURED_WORK", "HOME_SERVICE_CARDS", "HOME_CONTACT_IMAGE"]);

await writePage("about.template.html", "about/index.html", {
  PAGE_TITLE: `소개 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 모바일 앱, 게임과 운영 시스템을 기획, 디자인, 개발하는 SWAG 소개",
  CANONICAL_URL: pageUrl("about/"),
  HEADER: renderHeader("about"),
  FOOTER: renderFooter(pageUrl("about/"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `작업 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG가 구축한 웹사이트와 운영 시스템의 실제 화면과 제작 범위",
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
    PROJECT_EXTERNAL: externalUrl ? `<a class="external-project" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">운영 중인 사이트 보기 <span aria-hidden="true">↗</span></a>` : "",
    NEXT_PROJECT: next ? `<a class="next-project" href="work/${escapeHtml(next.id)}.html"><span>다음 작업</span><b>${escapeHtml(next.title)}</b><i aria-hidden="true">→</i></a>` : ""
  }, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROJECT_IMAGE", "PROJECT_FEATURES", "PROJECT_EXTERNAL", "NEXT_PROJECT"]);
}

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 범위 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 모바일 앱, 게임, 커머스, 데이터 연동과 업무 시스템까지 SWAG의 제작 범위",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_GRID: renderCapabilityGrid()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_GRID"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 방식 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "목표 정리부터 디자인, 개발, 검수와 출시까지 SWAG의 프로젝트 진행 과정",
  CANONICAL_URL: pageUrl("process/"),
  HEADER: renderHeader("process"),
  FOOTER: renderFooter(pageUrl("process/")),
  PROCESS: renderProcess()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROCESS"]);

await writePage("contact.template.html", "contact/index.html", {
  PAGE_TITLE: `문의 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "제작 종류와 필요한 기능을 골라 정리하는 SWAG 상담 문의",
  CANONICAL_URL: pageUrl("contact/"),
  HEADER: renderHeader("contact"),
  FOOTER: renderFooter(pageUrl("contact/")),
  RESPONSE_NOTE: data.contact.responseNote,
  PLANNER_TYPES: renderPlannerTypes(),
  PLANNER_FEATURES: renderPlannerFeatures(),
  PROCESS: renderProcess(),
  FAQ: renderFaq()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PLANNER_TYPES", "PLANNER_FEATURES", "PROCESS", "FAQ"]);

await writePage("privacy.template.html", "privacy.html", {
  PAGE_TITLE: "개인정보 처리 안내 | SWAG",
  PAGE_DESCRIPTION: "SWAG 웹사이트의 개인정보 처리 안내",
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
await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true }).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
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
