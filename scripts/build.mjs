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
const ogUrl = pageUrl("assets/swag-og-v42.png");
const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const navItems = [
  ["services", "제작 분야", "services/"],
  ["work", "프로젝트", "work/"],
  ["process", "진행 방식", "process/"],
  ["about", "소개", "about/"],
  ["contact", "견적 문의", "contact/"]
];

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";
const renderNavLinks = (active, className = "") => navItems.map(([key, label, href]) =>
  `<a${className ? ` class="${className}"` : ""} href="${href}"${activeAttr(active, key)}><span>${label}</span></a>`
).join("");

const renderBrand = (modifier = "") => `<a class="brand${modifier ? ` ${modifier}` : ""}" href="./" aria-label="SWAG 홈">
  <img src="assets/swag-signature-v42.png" alt="SWAG" width="1100" height="256">
</a>`;

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <div class="scroll-progress" aria-hidden="true"></div>
    <div class="header-inner">
      ${renderBrand()}
      <nav class="desktop-nav" aria-label="주요 메뉴">${renderNavLinks(active)}</nav>
      <details class="mobile-menu">
        <summary aria-label="메뉴 열기"><span class="menu-glyph" aria-hidden="true"></span><b>MENU</b></summary>
        <div class="mobile-menu-panel">
          <p>WEB · APP · GAME · SYSTEM</p>
          <nav aria-label="모바일 메뉴">${renderNavLinks(active)}</nav>
          <a class="mobile-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a>
        </div>
      </details>
    </div>
  </header>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer">
    <div class="footer-film" aria-hidden="true"><span>WEB · APP · GAME · SYSTEM ·</span><span>WEB · APP · GAME · SYSTEM ·</span></div>
    <div class="footer-main shell">
      <div>${renderBrand("brand-footer")}<p>2인 프리랜서 스튜디오</p></div>
      <nav aria-label="하단 메뉴">${renderNavLinks("")}</nav>
      <div class="footer-direct"><p>DIRECT</p><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a href="tel:${phoneDigits}">김의현 ${escapeHtml(data.contact.phone)}</a></div>
    </div>
    <div class="footer-bottom shell"><span>© <b data-year>2026</b> SWAG</span><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로</a></div>
  </footer>`;

const renderImage = (entry, options = {}) => {
  const image = safeImage(entry.image);
  if (!image) return '<div class="image-unavailable">이미지를 불러올 수 없습니다.</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  const className = options.className ? ` class="${escapeHtml(options.className)}"` : "";
  return `<img${className} src="${escapeHtml(image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" width="${escapeHtml(options.width || 1536)}" height="${escapeHtml(options.height || 1024)}" decoding="async"${priority}>`;
};

const renderHomeFilm = () => {
  const items = data.services.map((service, index) => `
    <a class="film-shot film-shot-${index + 1}" href="services/#${escapeHtml(service.id)}" data-route-expand>
      <figure>${renderImage(service, { width: service.id === "app" ? 1024 : 1536, height: service.id === "app" ? 1536 : 1024 })}<span class="film-burn" aria-hidden="true"></span></figure>
      <p><b>${escapeHtml(service.title)}</b><span>${escapeHtml(service.short)}</span></p>
    </a>`).join("");
  return `<div class="film-track">${items}</div>`;
};

const renderServiceChapters = () => data.services.map((service, index) => `
  <article class="service-chapter service-chapter-${index + 1}" id="${escapeHtml(service.id)}" data-reveal>
    <figure class="service-visual" data-parallax>${renderImage(service, { width: service.id === "app" ? 1024 : 1536, height: service.id === "app" ? 1536 : 1024, priority: index === 0 })}<span class="image-scan" aria-hidden="true"></span></figure>
    <div class="service-copy">
      <p class="eyebrow">${escapeHtml(service.short)}</p>
      <h2>${escapeHtml(service.title)}</h2>
      <p class="service-description">${escapeHtml(service.description)}</p>
      <ul>${service.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <a class="text-link magnetic" href="contact/?type=${escapeHtml(service.id)}">이 분야로 문의 <span aria-hidden="true">↗</span></a>
    </div>
  </article>`).join("");

const renderCapabilityFlow = () => data.capabilityGroups.map((item) => `
  <span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(item.description)}</em></span>`).join("");

const renderWorkList = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `
  <article class="case-study case-study-${index + 1}" data-reveal>
    <a class="case-visual" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기" data-parallax>
      <figure>${renderImage(project, { priority: index === 0, width: 1600, height: 1000 })}<span class="image-scan" aria-hidden="true"></span></figure>
    </a>
    <div class="case-copy">
      <p class="eyebrow">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</p>
      <h2>${escapeHtml(project.title)}</h2>
      <p class="case-summary">${escapeHtml(project.summary)}</p>
      <dl><div><dt>제작 범위</dt><dd>${escapeHtml(project.problem)}</dd></div><div><dt>구현 내용</dt><dd>${escapeHtml(project.solution)}</dd></div></dl>
      <p class="case-features">${project.features.map(escapeHtml).join(" · ")}</p>
      ${external ? `<a class="text-link magnetic" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트 <span aria-hidden="true">↗</span></a>` : ""}
    </div>
  </article>`;
}).join("");

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-key="${escapeHtml(service.id)}" data-brief-group="제작 종류" data-brief-value="${escapeHtml(service.title)}"><span>${escapeHtml(service.title)}</span><small>${escapeHtml(service.short)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-group="필요 기능" data-brief-value="${escapeHtml(item)}"><span>${escapeHtml(item)}</span></button>`).join("");

const renderProcess = () => data.process.map((item) => `
  <article data-reveal>
    <div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
    <p class="process-output"><span>확인 항목</span>${escapeHtml(item.result)}</p>
  </article>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details data-reveal><summary>${escapeHtml(item.question)}<span aria-hidden="true">+</span></summary><p>${escapeHtml(item.answer)}</p></details>`).join("");

const renderContactStrip = () => `
  <section class="contact-strip" data-reveal>
    <div class="shell">
      <p class="eyebrow">CONTACT</p>
      <h2>견적 문의</h2>
      <div><a class="text-link magnetic" href="contact/">내용 정리하기 <span aria-hidden="true">↗</span></a><a class="text-link magnetic" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 <span aria-hidden="true">↗</span></a><a href="tel:${phoneDigits}">${escapeHtml(data.contact.phone)}</a></div>
    </div>
  </section>`;

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: data.brand.name,
  description: data.meta.description,
  url: normalizedSiteUrl,
  telephone: data.contact.phone,
  areaServed: { "@type": "Country", name: "대한민국" },
  makesOffer: ["웹사이트 제작", "모바일 앱 개발", "브라우저 게임 개발", "운영 시스템 개발"].map((name) => ({
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
  RESPONSE_NOTE: data.contact.responseNote,
  CONTACT_STRIP: renderContactStrip()
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
    .replaceAll('src="app.js"', `src="app.js?v=${assetRevision}` + '"');
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
  HOME_FILM: renderHomeFilm()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HOME_FILM", "CONTACT_STRIP"]);

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 분야 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "웹사이트, 앱, 브라우저 게임, 운영 시스템 제작",
  CANONICAL_URL: pageUrl("services/"),
  HEADER: renderHeader("services"),
  FOOTER: renderFooter(pageUrl("services/")),
  SERVICE_CHAPTERS: renderServiceChapters(),
  CAPABILITY_FLOW: renderCapabilityFlow()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "SERVICE_CHAPTERS", "CAPABILITY_FLOW", "CONTACT_STRIP"]);

await writePage("work.template.html", "work/index.html", {
  PAGE_TITLE: `프로젝트 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG 공개 프로젝트와 담당 범위",
  CANONICAL_URL: pageUrl("work/"),
  HEADER: renderHeader("work"),
  FOOTER: renderFooter(pageUrl("work/")),
  WORK_CASES: renderWorkList()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "WORK_CASES", "CONTACT_STRIP"]);

await writePage("process.template.html", "process/index.html", {
  PAGE_TITLE: `진행 방식 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "상담부터 기획, 디자인, 개발, 검수, 배포까지",
  CANONICAL_URL: pageUrl("process/"),
  HEADER: renderHeader("process"),
  FOOTER: renderFooter(pageUrl("process/")),
  PROCESS: renderProcess()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PROCESS", "CONTACT_STRIP"]);

await writePage("about.template.html", "about/index.html", {
  PAGE_TITLE: `소개 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "상담부터 배포까지 직접 맡는 SWAG 2인 프리랜서 스튜디오",
  CANONICAL_URL: pageUrl("about/"),
  HEADER: renderHeader("about"),
  FOOTER: renderFooter(pageUrl("about/"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "CONTACT_STRIP"]);

await writePage("contact.template.html", "contact/index.html", {
  PAGE_TITLE: `견적 문의 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "SWAG 제작 견적 문의",
  CANONICAL_URL: pageUrl("contact/"),
  HEADER: renderHeader("contact"),
  FOOTER: renderFooter(pageUrl("contact/")),
  PLANNER_TYPES: renderPlannerTypes(),
  PLANNER_FEATURES: renderPlannerFeatures(),
  FAQ: renderFaq()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PLANNER_TYPES", "PLANNER_FEATURES", "FAQ", "CONTACT_STRIP"]);

await writePage("privacy.template.html", "privacy.html", {
  PAGE_TITLE: "개인정보 처리 안내 | SWAG",
  PAGE_DESCRIPTION: "SWAG 웹사이트 개인정보 처리 안내",
  CANONICAL_URL: pageUrl("privacy.html"),
  HEADER: renderHeader(""),
  FOOTER: renderFooter(pageUrl("privacy.html"))
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "CONTACT_STRIP"]);

await writePage("404.template.html", "404.html", {
  HEADER: renderHeader(""),
  FOOTER: renderFooter(normalizedSiteUrl)
}, ["HEADER", "FOOTER"]);

await cp(path.join(source, "styles.css"), path.join(output, "styles.css"));
await cp(path.join(source, "app.js"), path.join(output, "app.js"));
await cp(path.join(source, "assets"), path.join(output, "assets"), { recursive: true });
await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Built SWAG v${data.meta.version} for ${normalizedSiteUrl}`);
