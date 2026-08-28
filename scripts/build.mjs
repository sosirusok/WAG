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
const phoneDigits = data.contact.phone.replace(/\D/g, "");
const ogUrl = pageUrl("assets/swag-og.png");
const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

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
          <p>${escapeHtml(data.brand.expansion)}</p>
          <nav aria-label="모바일 메뉴">${renderNavLinks(active)}</nav>
          <a class="mobile-contact" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a>
        </div>
      </details>
    </div>
  </header>`;

const filmWords = "<span>SYSTEM · WEBSITE · APP · GAME ·&nbsp;</span><span>SYSTEM · WEBSITE · APP · GAME ·&nbsp;</span>";

const renderFooter = (currentUrl = normalizedSiteUrl) => `
  <footer class="site-footer" data-motion-scope data-spotlight>
    <div class="footer-film" aria-hidden="true">${filmWords}</div>
    <div class="footer-main shell">
      <div class="footer-brand">${renderBrand("brand-footer", true)}<p>웹 · 앱 · 게임 · AI · 운영 시스템 외주 제작<br>2인 프리랜서 스튜디오</p></div>
      <nav aria-label="하단 메뉴">${renderNavLinks("")}</nav>
      <div class="footer-direct"><p>DIRECT</p><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a href="tel:${phoneDigits}">김의현 ${escapeHtml(data.contact.phone)}</a></div>
    </div>
    <div class="footer-bottom shell"><span>© <b data-year>2026</b> SWAG</span><a href="privacy.html">개인정보 처리 안내</a><a href="${escapeHtml(currentUrl)}#top">위로 ↑</a></div>
  </footer>`;

/* -------------------------------------------------------- device mockups */

const mockups = {
  web: `<svg class="mock mock-web" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-frame" x="4" y="4" width="312" height="202" rx="14"/>
    <rect class="mk-bar" x="4" y="4" width="312" height="30" rx="14"/>
    <rect x="4" y="24" width="312" height="10" class="mk-bar-fix"/>
    <circle cx="22" cy="19" r="4" class="mk-dot mk-dot-r"/><circle cx="36" cy="19" r="4" class="mk-dot mk-dot-y"/><circle cx="50" cy="19" r="4" class="mk-dot mk-dot-g"/>
    <rect x="70" y="11" width="180" height="16" rx="8" class="mk-pill"/>
    <rect x="20" y="50" width="120" height="14" rx="7" class="mk-ink"/>
    <rect x="20" y="72" width="170" height="8" rx="4" class="mk-line"/>
    <rect x="20" y="86" width="140" height="8" rx="4" class="mk-line"/>
    <rect x="20" y="104" width="64" height="20" rx="10" class="mk-cta"/>
    <rect class="mk-card" x="212" y="50" width="88" height="74" rx="10"/>
    <rect x="222" y="60" width="40" height="8" rx="4" class="mk-line"/>
    <rect x="222" y="74" width="68" height="6" rx="3" class="mk-line"/>
    <rect x="222" y="86" width="56" height="6" rx="3" class="mk-line"/>
    <rect x="222" y="102" width="30" height="12" rx="6" class="mk-chip"/>
    <g class="mk-cols"><rect x="20" y="142" width="88" height="52" rx="10" class="mk-card"/><rect x="116" y="142" width="88" height="52" rx="10" class="mk-card"/><rect x="212" y="142" width="88" height="52" rx="10" class="mk-card"/></g>
  </svg>`,
  app: `<svg class="mock mock-app" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-phone" x="112" y="10" width="96" height="200" rx="18"/>
    <rect x="140" y="18" width="40" height="8" rx="4" class="mk-notch"/>
    <rect x="124" y="38" width="46" height="10" rx="5" class="mk-ink"/>
    <circle cx="188" cy="43" r="7" class="mk-chip"/>
    <rect x="124" y="58" width="72" height="34" rx="8" class="mk-hero"/>
    <g class="mk-rows"><rect x="124" y="100" width="72" height="20" rx="6" class="mk-card"/><rect x="124" y="126" width="72" height="20" rx="6" class="mk-card"/><rect x="124" y="152" width="72" height="20" rx="6" class="mk-card"/></g>
    <rect x="124" y="182" width="72" height="16" rx="8" class="mk-tabbar"/>
    <circle cx="138" cy="190" r="4" class="mk-dot-b"/><circle cx="160" cy="190" r="4" class="mk-dot-mute"/><circle cx="182" cy="190" r="4" class="mk-dot-mute"/>
    <g class="mk-float"><rect x="30" y="52" width="70" height="30" rx="10" class="mk-toast"/><circle cx="46" cy="67" r="7" class="mk-chip"/><rect x="58" y="60" width="34" height="5" rx="2.5" class="mk-line"/><rect x="58" y="70" width="26" height="5" rx="2.5" class="mk-line"/></g>
    <g class="mk-float mk-float-late"><rect x="224" y="120" width="66" height="30" rx="10" class="mk-toast"/><circle cx="240" cy="135" r="7" class="mk-dot-g"/><rect x="252" y="128" width="30" height="5" rx="2.5" class="mk-line"/><rect x="252" y="138" width="22" height="5" rx="2.5" class="mk-line"/></g>
  </svg>`,
  game: `<svg class="mock mock-game" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-frame mk-screen" x="4" y="14" width="312" height="182" rx="16"/>
    <rect x="20" y="30" width="66" height="16" rx="8" class="mk-score"/>
    <circle cx="286" cy="38" r="10" class="mk-chip"/>
    <g class="mk-terrain"><rect x="20" y="150" width="280" height="14" rx="7" class="mk-ground"/><rect x="56" y="126" width="30" height="24" rx="6" class="mk-block"/><rect x="150" y="112" width="30" height="38" rx="6" class="mk-block"/><rect x="238" y="130" width="30" height="20" rx="6" class="mk-block"/></g>
    <g class="mk-sprite"><circle cx="110" cy="100" r="14" class="mk-hero-dot"/><circle cx="105" cy="96" r="2.6" class="mk-eye"/><circle cx="115" cy="96" r="2.6" class="mk-eye"/></g>
    <g class="mk-coins"><circle cx="170" cy="80" r="6" class="mk-coin"/><circle cx="192" cy="70" r="6" class="mk-coin"/><circle cx="214" cy="80" r="6" class="mk-coin"/></g>
  </svg>`,
  ai: `<svg class="mock mock-ai" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-frame" x="4" y="4" width="312" height="202" rx="14"/>
    <rect x="20" y="20" width="60" height="12" rx="6" class="mk-ink"/>
    <g class="mk-chat">
      <rect x="20" y="46" width="150" height="34" rx="12" class="mk-bubble-user"/>
      <rect x="32" y="56" width="90" height="6" rx="3" class="mk-line"/>
      <rect x="32" y="68" width="118" height="6" rx="3" class="mk-line"/>
    </g>
    <g class="mk-chat mk-chat-late">
      <rect x="108" y="92" width="192" height="58" rx="12" class="mk-bubble-ai"/>
      <rect x="120" y="104" width="140" height="6" rx="3" class="mk-line-soft"/>
      <rect x="120" y="118" width="168" height="6" rx="3" class="mk-line-soft"/>
      <rect x="120" y="132" width="104" height="6" rx="3" class="mk-line-soft"/>
    </g>
    <g class="mk-spark">
      <path d="M78 104 L84 118 L98 124 L84 130 L78 144 L72 130 L58 124 L72 118 Z" class="mk-spark-a"/>
      <path d="M50 138 L53 146 L61 149 L53 152 L50 160 L47 152 L39 149 L47 146 Z" class="mk-spark-b"/>
    </g>
    <rect x="20" y="168" width="240" height="24" rx="12" class="mk-prompt"/>
    <rect x="32" y="177" width="96" height="6" rx="3" class="mk-line"/>
    <circle cx="284" cy="180" r="14" class="mk-send"/>
    <path d="M278 180 L290 180 M285 175 L290 180 L285 185" class="mk-send-arrow"/>
  </svg>`,
  platform: `<svg class="mock mock-platform" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-frame" x="4" y="4" width="312" height="202" rx="14"/>
    <rect x="4" y="4" width="72" height="202" rx="14" class="mk-side"/>
    <rect x="4" y="4" width="20" height="202" class="mk-side-fix"/>
    <rect x="18" y="22" width="44" height="10" rx="5" class="mk-ink-soft"/>
    <g class="mk-menu"><rect x="18" y="48" width="44" height="8" rx="4" class="mk-line-soft"/><rect x="18" y="64" width="36" height="8" rx="4" class="mk-line-soft"/><rect x="18" y="80" width="40" height="8" rx="4" class="mk-line-soft"/></g>
    <g class="mk-kpis"><rect x="92" y="22" width="64" height="40" rx="10" class="mk-card"/><rect x="164" y="22" width="64" height="40" rx="10" class="mk-card"/><rect x="236" y="22" width="64" height="40" rx="10" class="mk-card"/></g>
    <rect x="100" y="32" width="26" height="7" rx="3.5" class="mk-line"/><rect x="100" y="46" width="38" height="9" rx="4.5" class="mk-ink"/>
    <rect x="172" y="32" width="26" height="7" rx="3.5" class="mk-line"/><rect x="172" y="46" width="34" height="9" rx="4.5" class="mk-ink"/>
    <rect x="244" y="32" width="26" height="7" rx="3.5" class="mk-line"/><rect x="244" y="46" width="30" height="9" rx="4.5" class="mk-ink"/>
    <rect x="92" y="74" width="208" height="120" rx="12" class="mk-card"/>
    <g class="mk-chart"><rect x="112" y="150" width="18" height="28" rx="4" class="mk-col"/><rect x="142" y="134" width="18" height="44" rx="4" class="mk-col"/><rect x="172" y="142" width="18" height="36" rx="4" class="mk-col"/><rect x="202" y="118" width="18" height="60" rx="4" class="mk-col mk-col-hi"/><rect x="232" y="128" width="18" height="50" rx="4" class="mk-col"/><rect x="262" y="108" width="18" height="70" rx="4" class="mk-col mk-col-hi"/></g>
    <path class="mk-trend" d="M112 138 L142 122 L172 130 L202 104 L232 116 L262 92" pathLength="100"/>
  </svg>`
};

/* ------------------------------------------------------------- home hero */

const rotatorWords = data.services.map((service) => service.title);

const renderPreloader = () => `
  <div class="intro-curtain" data-preloader aria-hidden="true">
    <div class="intro-mark">${logoWhiteSvg}<span class="intro-bar"></span></div>
  </div>`;

const codeLines = [
  [["kw","export"],["sp"," "],["kw","async"],["sp"," "],["kw","function"],["sp"," "],["fn","ship"],["pn","(brief)"],["sp"," "],["pn","{"]],
  [["sp","  "],["kw","const"],["sp"," "],["vr","plan"],["sp"," = "],["kw","await"],["sp"," "],["fn","consult"],["pn","(brief)"],["pn",";"],["sp","   "],["cm","// 상담"]],
  [["sp","  "],["kw","const"],["sp"," "],["vr","ui"],["sp"," = "],["kw","await"],["sp"," "],["fn","design"],["pn","(plan)"],["pn",";"],["sp","     "],["cm","// 기획 · 디자인"]],
  [["sp","  "],["kw","const"],["sp"," "],["vr","app"],["sp"," = "],["kw","await"],["sp"," "],["fn","build"],["pn","(ui, {"]],
  [["sp","    "],["pr","web"],["pn",": "],["bl","true"],["pn",", "],["pr","app"],["pn",": "],["bl","true"],["pn",","]],
  [["sp","    "],["pr","game"],["pn",": "],["bl","true"],["pn",", "],["pr","ai"],["pn",": "],["bl","true"],["pn",","]],
  [["sp","  "],["pn","});"]],
  [["sp","  "],["kw","return"],["sp"," "],["fn","deploy"],["pn","(app)"],["pn",";"],["sp","      "],["cm","// 검수 · 배포"]],
  [["pn","}"]]
];

const renderCodeBody = () => codeLines.map((tokens, index) => {
  const inner = tokens.map(([kind, text]) => `<span class="t-${kind}">${escapeHtml(text)}</span>`).join("");
  return `<span class="code-line" style="--li:${index}"><b class="code-no">${index + 1}</b>${inner}</span>`;
}).join("");

const terminalLines = [
  ["cmd", "npm run deploy"],
  ["ok", "빌드 완료", "1.2s"],
  ["ok", "검수 통과", "8/8"],
  ["ok", "운영 주소 발급", "swag.studio"]
];

const renderTerminal = () => terminalLines.map((line, index) => {
  const [kind, label, meta] = line;
  const body = kind === "cmd"
    ? `<b class="term-prompt">$</b><span>${escapeHtml(label)}</span>`
    : `<b class="term-ok">✓</b><span>${escapeHtml(label)}</span>${meta ? `<em>${escapeHtml(meta)}</em>` : ""}`;
  return `<span class="term-line" style="--li:${index}">${body}</span>`;
}).join("");

const renderHero = () => `
  <section class="hero" data-impact-hero data-motion-scope>
    <div class="hero-backdrop" aria-hidden="true"><i class="hero-grid"></i><i class="hero-beam"></i></div>
    <canvas class="film-canvas" data-film-canvas aria-hidden="true"></canvas>
    <div class="hero-inner shell">
      <div class="hero-copy">
        <p class="hero-eyebrow" data-reveal><span class="pulse-dot" aria-hidden="true"></span>${escapeHtml(data.brand.expansion)}</p>
        <h1 data-reveal data-split>필요한 건 <span class="hero-rotator"><b class="rotator-word" data-rotator data-rotator-words="${escapeHtml(JSON.stringify(rotatorWords))}">${escapeHtml(rotatorWords[0])}</b></span><br>만드는 건 SWAG</h1>
        <p class="hero-lead" data-reveal>상담한 두 사람이 기획 · 디자인 · 개발 · 검수 · 배포를 끝까지 맡는 ${escapeHtml(data.brand.description)}입니다.</p>
        <div class="hero-actions" data-reveal>
          <a class="btn btn-primary magnetic" href="contact/">${escapeHtml(data.brand.primaryCta)} <span aria-hidden="true">→</span></a>
          <a class="btn btn-glass magnetic" href="work/">${escapeHtml(data.brand.secondaryCta)}</a>
        </div>
        <ul class="hero-trust" data-reveal>
          <li>같은 담당자가 끝까지</li>
          <li>재하청 없는 직접 개발</li>
          <li>카카오 · 전화 상담</li>
        </ul>
      </div>
      <div class="hero-visual" data-hero-photo data-reveal="zoom" aria-hidden="true">
        <div class="code-window">
          <div class="code-bar"><i class="cw-dot cw-r"></i><i class="cw-dot cw-y"></i><i class="cw-dot cw-g"></i><span class="code-tab is-on">ship.ts</span><span class="code-tab">deploy.yml</span></div>
          <pre class="code-body" data-typer>${renderCodeBody()}<span class="code-caret"></span></pre>
        </div>
        <div class="term-window">
          <div class="term-bar"><span>TERMINAL</span><i class="term-live"></i></div>
          <div class="term-body">${renderTerminal()}</div>
        </div>
        <div class="hero-chip hero-chip-1"><b>✓</b> 배포 완료</div>
        <div class="hero-chip hero-chip-2"><i class="chip-ring"></i> 검수 중</div>
      </div>
    </div>
    <a class="scroll-cue" href="./#stats"><span>SCROLL</span><i aria-hidden="true"></i></a>
  </section>`;

/* ------------------------------------------------------------ home stats */

const statTiles = [
  { value: data.services.length, unit: "개", label: "제작 분야", note: "시스템 · 웹 · 앱 · 게임" },
  { value: 6, unit: "단계", label: "담당 과정", note: "상담부터 배포까지 직접" },
  { value: 2, unit: "인", label: "전담 인원", note: "상담한 사람이 직접 제작" },
  { value: 0, unit: "건", label: "중간 하청", note: "재하청 없이 전 과정 직접" }
];

const renderStats = () => statTiles.map((stat, index) => `
  <article class="stat-tile stat-tile-${index + 1}" data-reveal="flip">
    <p class="stat-value"><b data-count="${stat.value}">0</b><span>${escapeHtml(stat.unit)}</span></p>
    <p class="stat-label">${escapeHtml(stat.label)}</p>
    <p class="stat-note">${escapeHtml(stat.note)}</p>
  </article>`).join("");

/* --------------------------------------------------------- service cards */

const renderHomeFilm = () => {
  const items = data.services.map((service, index) => `
    <a class="service-card film-shot film-shot-${index + 1}" href="services/#${escapeHtml(service.id)}" data-route-expand data-tilt>
      <figure class="service-card-visual" data-motion-scope>${mockups[service.id] || mockups.web}<span class="card-sheen" aria-hidden="true"></span></figure>
      <div class="service-card-copy">
        <p class="service-card-tag">${escapeHtml(service.short)}</p>
        <h3>${escapeHtml(service.title)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <span class="btn btn-small">자세히 보기</span>
      </div>
    </a>`).join("");
  return `<div class="film-track">${items}</div>`;
};

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
  <article class="service-chapter service-chapter-${index + 1}" id="${escapeHtml(service.id)}" data-reveal="flip">
    <figure class="service-visual" data-tilt data-motion-scope>${mockups[service.id] || mockups.web}<span class="card-sheen" aria-hidden="true"></span></figure>
    <div class="service-copy">
      <p class="eyebrow">${escapeHtml(service.short)}</p>
      <h2 data-split>${escapeHtml(service.title)}</h2>
      <p class="service-description">${escapeHtml(service.description)}</p>
      <ul class="check-list">${service.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <a class="btn btn-primary magnetic" href="contact/?type=${escapeHtml(service.id)}">이 분야로 문의 <span aria-hidden="true">→</span></a>
    </div>
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
  <article class="case-study case-study-${index + 1}" data-reveal="flip">
    <a class="case-visual" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 운영 사이트 열기" data-parallax>
      <span class="browser-chrome" aria-hidden="true"><i></i><i></i><i></i><b>${escapeHtml((external || "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</b></span>
      <figure data-reveal="mask">${renderImage(project, { priority: index === 0, width: 1600, height: 1000 })}<span class="image-scan" aria-hidden="true"></span></figure>
    </a>
    <div class="case-copy">
      <p class="eyebrow">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</p>
      <h2 data-split>${escapeHtml(project.title)}</h2>
      <p class="case-summary">${escapeHtml(project.summary)}</p>
      <dl><div><dt>제작 범위</dt><dd>${escapeHtml(project.problem)}</dd></div><div><dt>구현 내용</dt><dd>${escapeHtml(project.solution)}</dd></div></dl>
      <p class="case-features">${project.features.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</p>
      ${external ? `<a class="btn btn-ghost magnetic" href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">운영 사이트 열기 <span aria-hidden="true">↗</span></a>` : ""}
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
  <li class="process-step" data-reveal="flip">
    <span class="process-step-no" aria-hidden="true"></span>
    <b>${escapeHtml(item.title)}</b>
    <span class="process-step-note">${escapeHtml(item.result)}</span>
  </li>`).join("");

const renderFaq = () => data.faq.map((item) => `
  <details data-reveal><summary><span>${escapeHtml(item.question)}</span><i aria-hidden="true"></i></summary><div class="faq-body"><p>${escapeHtml(item.answer)}</p></div></details>`).join("");

const renderContactStrip = () => `
  <section class="contact-strip" data-reveal>
    <div class="shell" data-spotlight>
      <div class="contact-strip-glow" aria-hidden="true"></div>
      <p class="eyebrow">CONTACT</p>
      <h2 data-split>아이디어만 있어도 충분해요</h2>
      <p class="contact-strip-lead">제작 종류와 필요한 기능만 알려 주세요. 견적과 일정을 안내해 드립니다.</p>
      <div class="contact-strip-actions"><a class="btn btn-invert magnetic" href="contact/">문의 내용 정리하기 <span aria-hidden="true">→</span></a><a class="btn btn-outline-invert magnetic" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a class="contact-strip-tel" href="tel:${phoneDigits}">${escapeHtml(data.contact.phone)}</a></div>
    </div>
  </section>`;

/* ------------------------------------------------------------- structured */

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
  PRELOADER: renderPreloader(),
  HERO: renderHero(),
  STATS: renderStats(),
  HOME_FILM: renderHomeFilm(),
  MOTION_ROWS: renderMotionRows(),
  PROCESS_PREVIEW: renderProcessPreview()
}, ["STRUCTURED_DATA", "HEADER", "FOOTER", "PRELOADER", "HERO", "STATS", "HOME_FILM", "MOTION_ROWS", "PROCESS_PREVIEW", "CONTACT_STRIP"]);

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
