import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./validate.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const output = path.join(root, "dist");
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));

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
const ogUrl = pageUrl("assets/swag-og.png");

const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
const featuredProjects = publicProjects.filter((project) => project.featured);

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <i class="site-progress" data-site-progress aria-hidden="true"></i>
    <div class="header-inner">
      <a class="wordmark" href="./" aria-label="SWAG 홈">
        <strong>SWAG</strong><span>System Web App Game</span>
      </a>
      <nav class="main-nav" aria-label="주요 메뉴">
        <a href="services/"${activeAttr(active, "services")}>제작 범위</a>
        <a href="work/"${activeAttr(active, "work")}>작업 사례</a>
        <a href="process/"${activeAttr(active, "process")}>진행 과정</a>
        <a href="contact/"${activeAttr(active, "contact")}>문의</a>
      </nav>
      <a class="header-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">
        상담 문의 <i aria-hidden="true">↗</i>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
        <span class="menu-label">메뉴</span><i aria-hidden="true"></i>
      </button>
    </div>
    <nav class="mobile-nav" id="mobile-menu" aria-label="모바일 메뉴" data-mobile-menu hidden>
      <a href="./">홈</a>
      <a href="services/"${activeAttr(active, "services")}>제작 범위</a>
      <a href="work/"${activeAttr(active, "work")}>작업 사례</a>
      <a href="process/"${activeAttr(active, "process")}>진행 과정</a>
      <a href="contact/"${activeAttr(active, "contact")}>문의</a>
      <a class="mobile-nav-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">상담 문의</a>
    </nav>
  </header>
  <div class="header-sentinel" data-header-sentinel aria-hidden="true"></div>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <a class="mobile-contact-bar" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">
    <span>제작 문의</span><b>카카오로 상담하기</b>
  </a>
  <footer class="site-footer">
    <div class="footer-main">
      <div class="footer-wordmark"><strong>SWAG</strong></div>
      <p><b>System Web App Game</b></p>
      <a class="footer-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a>
    </div>
    <div class="footer-meta">
      <dl><dt>운영</dt><dd>${escapeHtml(data.contact.owner)}</dd></dl>
      <dl><dt>전화</dt><dd><a href="tel:${phoneDigits}">${escapeHtml(data.contact.phone)}</a></dd></dl>
      <nav aria-label="하단 메뉴">
        <a href="services/">제작 범위</a><a href="work/">작업 사례</a><a href="process/">진행 과정</a><a href="contact/">문의</a><a href="privacy.html">개인정보처리 안내</a>
      </nav>
    </div>
    <div class="footer-bottom"><span>© <b data-year>2026</b> SWAG</span><a href="${escapeHtml(currentUrl)}#top">위로 ↑</a></div>
  </footer>`;

const renderImage = (project, options = {}) => {
  const image = safeImage(project.image);
  if (!image) return '<div class="image-unavailable">등록된 작업 화면이 없습니다</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.imageAlt || project.title)}" decoding="async"${priority}>`;
};

const renderHeroStage = () => {
  const projects = (featuredProjects.length ? featuredProjects : publicProjects).slice(0, 2);
  if (!projects.length) return "";
  const primary = projects[0];
  const secondary = projects[1] || projects[0];
  return `
    <div class="project-stage reveal" data-hero-stage aria-label="실제 작업 화면 미리보기">
      <figure class="stage-visual">${renderImage(primary, { priority: true })}</figure>
      <div class="stage-caption">
        <div><span>대표 작업 / 01</span><h2>${escapeHtml(primary.title)}</h2><p>${escapeHtml(primary.category)}</p></div>
        <a href="work/${escapeHtml(primary.id)}.html" aria-label="${escapeHtml(primary.title)} 작업 상세 보기">자세히 보기 <i aria-hidden="true">↗</i></a>
      </div>
      <a class="stage-next" href="work/${escapeHtml(secondary.id)}.html" aria-label="${escapeHtml(secondary.title)} 작업 상세 보기">
        <span>02 / 다음 작업</span><b>${escapeHtml(secondary.title)}</b><i aria-hidden="true">↗</i>
      </a>
    </div>`;
};

const renderHomeServices = () => data.services.map((service) => `
  <a href="services/#${escapeHtml(service.id)}"><span>${escapeHtml(service.number)}</span><div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.subtitle)}</p></div><p>${escapeHtml(service.description)}</p><i aria-hidden="true">↗</i></a>`).join("");

const renderWorkCards = () => publicProjects.map((project, index) => `
  <a class="work-card reveal" href="work/${escapeHtml(project.id)}.html">
    <figure>${renderImage(project, { priority: index === 0 })}<span>운영 중 ${String(index + 1).padStart(2, "0")}</span></figure>
    <div class="work-card-copy">
      <p>${escapeHtml(project.category)}</p>
      <h2>${escapeHtml(project.title)}</h2>
      <div><span>${escapeHtml(project.summary)}</span><ul>${project.features.slice(0, 3).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul><i aria-hidden="true">운영 내용 보기 ↗</i></div>
    </div>
  </a>`).join("");

const renderServiceChapters = () => data.services.map((service) => `
  <article class="service-chapter reveal" id="${escapeHtml(service.id)}">
    <div class="service-chapter-title"><span>${escapeHtml(service.number)}</span><h2>${escapeHtml(service.title)}</h2><p>${escapeHtml(service.subtitle)}</p></div>
    <div class="service-chapter-body"><p>${escapeHtml(service.description)}</p><div class="service-scope-columns"><section><h3>핵심 구축</h3><ul>${service.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section><h3>고급 기능</h3><ul>${(service.advanced || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section><h3>운영과 인프라</h3><ul>${(service.operations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section></div><a href="contact/?type=${escapeHtml(service.id)}">이 범위로 문의하기 ↗</a></div>
  </article>`).join("");

const renderCapabilityGrid = () => data.capabilityGroups.map((item) => `
  <article><span>${escapeHtml(item.code)}</span><p>${escapeHtml(item.tech)}</p><h3>${escapeHtml(item.title)}</h3><b>${escapeHtml(item.description)}</b></article>`).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-scope-choice data-scope-key="${escapeHtml(service.id)}" data-scope-group="제작 종류" data-scope-value="${escapeHtml(service.title)}">${escapeHtml(service.title)}<small>${escapeHtml(service.subtitle)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-scope-choice data-scope-group="필요 기능" data-scope-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");

const renderProcess = () => data.process.map((item) => `
  <li class="process-item reveal"><span>${escapeHtml(item.number)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></li>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details class="faq-item reveal"><summary><span>${escapeHtml(item.question)}</span><i aria-hidden="true"></i></summary><p>${escapeHtml(item.answer)}</p></details>`).join("");

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: data.brand.name,
  description: data.meta.description,
  url: normalizedSiteUrl,
  telephone: data.contact.phone,
  founder: { "@type": "Person", name: data.contact.owner },
  areaServed: { "@type": "Country", name: "대한민국" },
  serviceType: ["웹사이트 제작", "앱 개발", "웹 게임 개발", "예약, 결제, 관리자 시스템 구축"]
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
  const html = fillTemplate(template, { ...commonTokens, ...tokens }, new Set(rawKeys));
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
  HEADLINE_TOP: data.brand.headlineTop,
  HEADLINE_FOCUS: data.brand.headlineFocus,
  HERO_DESCRIPTION: data.brand.description,
  PRIMARY_CTA: data.brand.primaryCta,
  SECONDARY_CTA: data.brand.secondaryCta,
  HOME_SERVICES: renderHomeServices(),
  HOME_WORK: renderWorkCards(),
  HERO_STAGE: renderHeroStage(),
  RESPONSE_NOTE: data.contact.responseNote
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HOME_SERVICES", "HOME_WORK", "HERO_STAGE"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `작업 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG가 구축한 웹사이트와 운영 시스템의 실제 화면과 제작 범위",
  CANONICAL_URL: pageUrl("work/"),
  HEADER: renderHeader("work"),
  FOOTER: renderFooter(pageUrl("work/")),
  WORK_CARDS: renderWorkCards()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "WORK_CARDS"]);

for (const [index, project] of publicProjects.entries()) {
  const next = publicProjects[(index + 1) % publicProjects.length];
  const externalUrl = safeHttpUrl(project.url);
  await writePage("project.template.html", `work/${project.id}.html`, {
    PAGE_TITLE: `${project.title} | SWAG 작업`,
    PAGE_DESCRIPTION: project.summary,
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
    NEXT_PROJECT: next ? `<a class="next-project" href="work/${escapeHtml(next.id)}.html"><span>다음 작업</span><b>${escapeHtml(next.title)}</b><i aria-hidden="true">↗</i></a>` : ""
  }, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROJECT_IMAGE", "PROJECT_FEATURES", "PROJECT_EXTERNAL", "NEXT_PROJECT"]);
}

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 범위 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 앱, 웹게임, 예약, 결제, 데이터베이스와 관리자 도구까지 SWAG의 제작 범위",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_GRID: renderCapabilityGrid()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_GRID"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 방식 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "상담부터 화면 확인, 기능 연결, 검수와 배포까지 SWAG의 제작 과정",
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
  PAGE_TITLE: "개인정보처리 안내 | SWAG",
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

const sitemapEntries = ["", "services/", "process/", "work/", ...publicProjects.map((project) => `work/${project.id}.html`), "contact/", "privacy.html"];
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `<url><loc>${escapeHtml(pageUrl(entry))}</loc></url>`).join("")}</urlset>\n`);

console.log(`Built SWAG to ${output}`);
