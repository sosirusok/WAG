import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
const ogUrl = pageUrl("assets/swag-og.png");
const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

/* --------------------------------------------------------- 사실 화이트리스트

   mono 서체(.mono)로 조판되는 모든 문자열은 반드시 이 표나 site.json 에서 나와야 한다.
   validate.mjs 가 빌드 결과의 .mono 텍스트를 이 표와 대조해서, 예전처럼
   "swag.studio" / "1.2s" / "8/8" 같은 지어낸 값이 다시 들어오면 빌드를 실패시킨다.
   이 검사를 지우지 말 것.                                                        */

const facts = {
  version: `v${data.meta.version}`,
  updated: String(data.meta.updatedAt).slice(0, 10).replaceAll("-", "."),
  origin: normalizedSiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  people: String(data.people?.count ?? 2),
  published: String(publicProjects.length),
  subcontract: "0"
};

const mono = (key) => {
  if (!(key in facts)) throw new Error(`mono(): "${key}" is not a whitelisted fact`);
  return `<span class="mono">${escapeHtml(facts[key])}</span>`;
};

export const monoFacts = facts;

/* ---------------------------------------------------------------- brand */

const inlineLogo = async (file, className) => {
  const svg = await readFile(path.join(source, "assets", file), "utf8");
  return svg
    .replace("<svg ", `<svg class="${className}" `)
    .replace(/\n\s*/g, "");
};

const logoSvg = await inlineLogo("swag-logo.svg", "brand-svg");
const logoWhiteSvg = await inlineLogo("swag-logo-white.svg", "brand-svg brand-svg-white");

/* ------------------------------------------------------------ navigation */

const navItems = [
  ["services", "제작 분야", "services/"],
  ["work", "프로젝트", "work/"],
  ["process", "진행 방식", "process/"],
  ["about", "소개", "about/"],
  ["contact", "견적 문의", "contact/"]
];

const activeAttr = (active, key) => active === key ? ' aria-current="page"' : "";
const renderNavLinks = (active, className = "") => navItems.map(([key, label, href]) => {
  const cta = key === "contact" ? `${className ? `${className} ` : ""}nav-cta` : className;
  return `<a${cta ? ` class="${cta}"` : ""} href="${href}"${activeAttr(active, key)}><span>${label}</span></a>`;
}).join("");

const renderBrand = (modifier = "", light = false) => `<a class="brand${modifier ? ` ${modifier}` : ""}" href="./" aria-label="SWAG 홈">
  ${light ? logoWhiteSvg : logoSvg}
</a>`;

const renderHeader = (active = "") => `
  <header class="site-header" data-header>
    <div class="scroll-progress" aria-hidden="true"></div>
    <div class="header-inner">
      ${renderBrand()}
      <nav class="desktop-nav" aria-label="주요 메뉴">${renderNavLinks(active)}</nav>
      <details class="mobile-menu">
        <summary aria-label="메뉴 열기"><span class="menu-glyph" aria-hidden="true"><i></i><i></i></span><b>MENU</b></summary>
        <div class="mobile-menu-panel">
          <nav aria-label="모바일 메뉴">${renderNavLinks(active)}</nav>
          <a class="mobile-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.contact.kakaoLabel)} ↗</a>
        </div>
      </details>
    </div>
  </header>`;

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer" data-motion-scope>
    <i class="footer-blade" aria-hidden="true"></i>
    <div class="footer-main shell">
      <div class="footer-brand">${renderBrand("brand-footer", true)}<p>웹 · 앱 · 게임 · AI · 운영 시스템 외주 제작<br>${escapeHtml(data.brand.description)}</p></div>
      <nav aria-label="하단 메뉴">${renderNavLinks("")}</nav>
      <div class="footer-direct">
        <a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.contact.kakaoLabel)} ↗</a>
        <a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.people.lead)} (${escapeHtml(data.brand.name)})</a>
      </div>
      <p class="footer-legal"><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로 ↑</a></p>
    </div>
    <p class="footer-colophon shell">
      <span>${escapeHtml(data.brand.name)} · ${escapeHtml(data.brand.description)}</span>
      <span>© <b data-year>2026</b> ${escapeHtml(data.brand.name)}</span>
      <span class="mono">${escapeHtml(facts.version)} · ${escapeHtml(facts.updated)}</span>
    </p>
  </footer>`;

/* ------------------------------------------------------------------ 히어로

   히어로는 로고에서 잰 16.7도 기울기(칼날 각도)를 그대로 쓴다.
   문장이 기울어진 채로 올라와 똑바로 서면서 멈추고, 초록 잔상 세 겹이
   한 박자 늦게 따라온다. 로고의 스피드라인을 시간으로 옮긴 것.            */

const heroLines = [
  { text: "상담한 사람이", brk: null },
  { text: "그대로 만들고", brk: null },
  { text: "그대로", brk: "배포합니다" }
];

const renderHeroLine = ({ text, brk }, index) => {
  const inner = brk
    ? `${escapeHtml(text)} <br class="brk-sm">${escapeHtml(brk)}`
    : escapeHtml(text);
  return `<span class="ln" style="--b:${120 + index * 100}ms"><span class="t">${inner}</span><span class="gh" aria-hidden="true">${inner}</span></span>`;
};

const renderHeroIndex = () => data.process.map((step, index) => `
  <li style="--b:${960 + index * 60}ms">
    <b class="mono">${String(index + 1).padStart(2, "0")}</b>
    <span class="stage">${escapeHtml(step.title)}</span>
    <em>${escapeHtml(step.result)}</em>
  </li>`).join("");

const renderHero = () => `
  <section class="hero" data-hero data-motion-scope>
    <div class="hero-field" aria-hidden="true"><i></i></div>

    <div class="hero-say shell">
      <h1 class="display">${heroLines.map(renderHeroLine).join("")}</h1>
      <p class="sig" aria-hidden="true"><b class="wm">SWAG</b><i class="bars"><i></i><i></i><i></i></i></p>
    </div>

    <ol class="hero-index" aria-label="진행 순서">${renderHeroIndex()}</ol>

    <p class="hero-foot">
      <span class="expansion"><b>S</b>YSTEM · <b>W</b>EBSITE · <b>A</b>PP · <b>G</b>AME</span>
      <a class="mono" href="${escapeHtml(normalizedSiteUrl)}">${escapeHtml(facts.origin)}</a>
    </p>
  </section>`;

/* --------------------------------------------------------- 01 제작 분야

   카드 다섯 장 대신 화면 끝에서 끝까지 걸친 가로 줄 다섯 개.
   비어 있던 회색 자리표시자 그림 자리에는 site.json 의 실제 항목이 들어간다. */

const renderScopeRows = () => data.services.map((service, index) => `
  <li>
    <a class="row" href="services/#${escapeHtml(service.id)}">
      <b class="mono">S${String(index + 1).padStart(2, "0")}</b>
      <span class="row-title">${escapeHtml(service.title)}</span>
      <span class="row-short">${escapeHtml(service.short)}</span>
      <span class="row-items">${service.items.map((item) => `<i>${escapeHtml(item)}</i>`).join("")}</span>
      <i class="blade" aria-hidden="true"></i>
    </a>
  </li>`).join("");

/* ------------------------------------------------------------ tech stack */

const stackRows = [
  [
    ["HTML", "HTML"], ["CSS", "CSS"], ["JavaScript", "JavaScript"], ["TypeScript", "TypeScript"],
    ["React-Dark", "React"], ["NextJS-Dark", "Next.js"], ["Vite-Dark", "Vite"], ["TailwindCSS-Dark", "Tailwind CSS"],
    ["Sass", "Sass"], ["Bootstrap", "Bootstrap"], ["Flutter-Dark", "Flutter"], ["Swift", "Swift"],
    ["Kotlin-Dark", "Kotlin"], ["Electron", "Electron"], ["Figma-Dark", "Figma"]
  ],
  [
    ["NodeJS-Dark", "Node.js"], ["NestJS-Dark", "NestJS"], ["ExpressJS-Dark", "Express"], ["Django", "Django"],
    ["Spring-Dark", "Spring"], ["PHP-Dark", "PHP"], ["Python-Dark", "Python"], ["GraphQL-Dark", "GraphQL"],
    ["MySQL-Dark", "MySQL"], ["PostgreSQL-Dark", "PostgreSQL"], ["MongoDB", "MongoDB"], ["Redis-Dark", "Redis"],
    ["SQLite", "SQLite"], ["Firebase-Dark", "Firebase"], ["Supabase-Dark", "Supabase"]
  ],
  [
    ["Docker", "Docker"], ["Nginx", "Nginx"], ["Ubuntu-Dark", "Ubuntu"], ["Debian-Dark", "Debian"],
    ["Cloudflare-Dark", "Cloudflare"], ["Vercel-Dark", "Vercel"], ["AWS-Dark", "AWS"], ["GCP-Dark", "Google Cloud"],
    ["Git", "Git"], ["Github-Dark", "GitHub"], ["GithubActions-Dark", "GitHub Actions"], ["Unity-Dark", "Unity"],
    ["Godot-Dark", "Godot"], ["ThreeJS-Dark", "Three.js"], ["RaspberryPi-Dark", "Raspberry Pi"], ["Notion-Dark", "Notion"]
  ]
];

const renderMotionRows = () => stackRows.map((icons, index) => {
  const tiles = icons.map(([file, label]) => `<span class="stack-tile" title="${escapeHtml(label)}"><img src="assets/stack/${escapeHtml(file)}.svg" alt="${escapeHtml(label)}" width="58" height="58" loading="lazy" decoding="async"></span>`).join("");
  const speed = [27, -21, 24][index];
  return `<div class="motion-row motion-row-${index + 1}" data-motion-row data-speed="${speed}"><div class="motion-track"><div class="motion-set" data-motion-set>${tiles}</div><div class="motion-set" aria-hidden="true">${tiles}</div></div></div>`;
}).join("");

/* -------------------------------------------------------------- services */

const renderServiceChapters = () => data.services.map((service, index) => `
  <article class="service-chapter" id="${escapeHtml(service.id)}" data-reveal>
    <p class="chapter-no mono">S${String(index + 1).padStart(2, "0")}</p>
    <div class="service-copy">
      <h2>${escapeHtml(service.title)}</h2>
      <p class="service-short">${escapeHtml(service.short)}</p>
      <p class="service-description">${escapeHtml(service.description)}</p>
    </div>
    <ul class="service-items">${service.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <p class="service-go"><a href="contact/?type=${escapeHtml(service.id)}">이 분야로 문의</a></p>
  </article>`).join("");

const renderCapabilityFlow = () => data.capabilityGroups.map((item) => `
  <span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(item.description)}</em></span>`).join("");

/* ------------------------------------------------------------------ work */

const renderImage = (entry, options = {}) => {
  const image = safeImage(entry.image);
  if (!image) return '<div class="image-unavailable">이미지를 불러올 수 없습니다.</div>';
  const priority = options.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  const className = options.className ? ` class="${escapeHtml(options.className)}"` : "";
  return `<img${className} src="${escapeHtml(image)}" alt="${escapeHtml(entry.imageAlt || entry.title)}" width="${escapeHtml(options.width || 1536)}" height="${escapeHtml(options.height || 1024)}" decoding="async"${priority}>`;
};

const renderWorkList = () => publicProjects.map((project, index) => {
  const external = safeHttpUrl(project.url);
  return `
  <article class="case-study" data-reveal>
    <a class="case-visual" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기">
      <span class="browser-chrome" aria-hidden="true"><i></i><i></i><i></i><b>${escapeHtml((external || "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</b></span>
      <figure>${renderImage(project, { priority: index === 0, width: 1600, height: 1000 })}<span class="image-scan" aria-hidden="true"></span></figure>
    </a>
    <div class="case-copy">
      <p class="eyebrow">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</p>
      <h2 data-split>${escapeHtml(project.title)}</h2>
      <p class="case-summary">${escapeHtml(project.summary)}</p>
      <dl><div><dt>제작 범위</dt><dd>${escapeHtml(project.problem)}</dd></div><div><dt>구현 내용</dt><dd>${escapeHtml(project.solution)}</dd></div></dl>
      <p class="case-features">${project.features.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</p>
      ${external ? `<a class="ulink" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트 열기 <span aria-hidden="true">↗</span></a>` : ""}
    </div>
  </article>`;
}).join("");

/* --------------------------------------------------------------- contact */

const renderPlannerTypes = () => data.services.map((service) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-key="${escapeHtml(service.id)}" data-brief-group="제작 종류" data-brief-value="${escapeHtml(service.title)}"><span>${escapeHtml(service.title)}</span><small>${escapeHtml(service.short)}</small></button>`).join("");

const renderPlannerFeatures = () => data.capabilities.map((item) => `
  <button type="button" aria-pressed="false" data-brief-choice data-brief-group="필요 기능" data-brief-value="${escapeHtml(item)}"><span>${escapeHtml(item)}</span></button>`).join("");

/* --------------------------------------------------------------- process */

const renderProcess = () => data.process.map((item, index) => `
  <article data-reveal>
    <span class="process-index" aria-hidden="true"><i></i></span>
    <div class="process-body"><h2 data-split>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
    <p class="process-output"><span>확인 항목</span>${escapeHtml(item.result)}</p>
  </article>`).join("");

const renderProcessPreview = () => data.process.map((item, index) => `
  <li class="pstep" data-pstep>
    <b class="mono">${String(index + 1).padStart(2, "0")}</b>
    <div class="pstep-body">
      <h3>${escapeHtml(item.title)}</h3>
      <p class="pstep-desc">${escapeHtml(item.description)}</p>
      <p class="pstep-result"><i aria-hidden="true"></i>${escapeHtml(item.result)}</p>
    </div>
  </li>`).join("");

const renderProcessMarks = () => data.process.map((item, index) => `
  <b class="pmark" data-pmark="${index}" aria-hidden="true">${String(index + 1).padStart(2, "0")}</b>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details data-reveal><summary><span>${escapeHtml(item.question)}</span><i aria-hidden="true"></i></summary><div class="faq-body"><p>${escapeHtml(item.answer)}</p></div></details>`).join("");

const renderSendList = () => String(data.contact.responseNote).split("·").map((label, index) => `
  <li><b class="mono">${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(label.trim())}</span></li>`).join("");

const renderSeedChoices = () => data.services.map((service) => `
  <button type="button" class="seed-choice" data-seed-key="${escapeHtml(service.id)}" data-seed-label="${escapeHtml(service.title)}" aria-pressed="false">${escapeHtml(service.title)}</button>`).join("");

const renderContactStrip = () => `
  <section class="s-contact" id="contact" data-seed data-advances="brief" aria-labelledby="s-contact-h">
    <div class="spine"><b class="mono">05</b><h2 id="s-contact-h">문의</h2></div>
    <div class="shell">
      <p class="say" data-reveal>${escapeHtml(data.faq[0].question.replace(/\?$/, "").replace(/되나요$/, "됩니다"))}</p>
      <p class="say-lead" data-reveal>${escapeHtml(data.faq[0].answer)}</p>

      <ol class="send-list" data-reveal>${renderSendList()}</ol>

      <div class="seed-pick" role="group" aria-label="제작 종류 선택">${renderSeedChoices()}</div>

      <div class="contact-actions">
        <a class="cta-block" href="contact/" data-seed-link>${escapeHtml(data.brand.primaryCta)}</a>
        <a class="cta-kakao" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">
          <svg class="orbit" viewBox="0 0 120 60" aria-hidden="true" focusable="false"><rect class="orbit-path" x="1.5" y="1.5" width="117" height="57" rx="28.5" pathLength="100"/></svg>
          <span>${escapeHtml(data.contact.kakaoLabel)} ↗</span>
        </a>
        <button type="button" class="cta-copy" data-seed-copy><i class="flash" aria-hidden="true"></i><span>메시지 복사</span></button>
      </div>
      <p class="seed-status mono" role="status" aria-live="polite"></p>
    </div>
  </section>`;

/* ------------------------------------------------------------- structured */

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: data.brand.name,
  description: data.meta.description,
  url: normalizedSiteUrl,
  areaServed: { "@type": "Country", name: "대한민국" },
  sameAs: [kakaoUrl],
  makesOffer: data.services.map((service) => service.title).map((name) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: `${name} 제작`, serviceType: name }
  }))
}).replaceAll("<", "\\u003c");

const commonTokens = {
  SITE_URL: normalizedSiteUrl,
  META_TITLE: data.meta.title,
  META_DESCRIPTION: data.meta.description,
  OG_URL: ogUrl,
  STRUCTURED_DATA: structuredData,
  KAKAO_URL: kakaoUrl,
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
  HERO: renderHero(),
  SCOPE_ROWS: renderScopeRows(),
  MOTION_ROWS: renderMotionRows(),
  STACK_NOTE: data.stack.note,
  PROCESS_PREVIEW: renderProcessPreview(),
  PROCESS_MARKS: renderProcessMarks(),
  STUDIO_QUOTE: data.faq[3].answer,
  PEOPLE_COUNT: facts.people,
  PEOPLE_LEAD: data.people.lead,
  PUBLISHED_COUNT: facts.published,
  SUBCONTRACT: facts.subcontract
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "HERO", "SCOPE_ROWS", "MOTION_ROWS", "PROCESS_PREVIEW", "PROCESS_MARKS", "CONTACT_STRIP"]);

await writePage("services.template.html", "services/index.html", {
  PAGE_TITLE: `제작 분야 | ${data.brand.name}`,
  PAGE_DESCRIPTION: "시스템, 웹사이트, 앱, 브라우저 게임 외주 제작 범위",
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
  PAGE_DESCRIPTION: "SWAG 외주 제작 견적 문의",
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

// content images published from the admin tool land in <repo>/assets/uploads
const rootUploads = path.join(root, "assets/uploads");
try {
  await access(rootUploads);
  await cp(rootUploads, path.join(output, "assets/uploads"), { recursive: true });
} catch {}

await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Built SWAG v${data.meta.version} for ${normalizedSiteUrl}`);
