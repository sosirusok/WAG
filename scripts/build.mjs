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

/* ------------------------------------------------------------ 공개 주소

   SITE_URL 은 <base href> · canonical · OG · 구조화 데이터에 절대 경로로
   박히므로 실제 서비스되는 주소와 반드시 같아야 한다. 틀리면 상대 경로가
   전부 깨진다. 그래서 Cloudflare Pages 에서는 사람이 환경변수를 넣지 않아도
   되도록 빌드 환경이 자동으로 주는 값에서 알아낸다.

   결정 순서
   1) SITE_URL — 로컬 미리보기와 GitHub Actions 가 명시적으로 넘긴다
   2) Cloudflare Pages 가 자동 주입하는 값
      - 운영 브랜치(main) 빌드는 고정 주소를 쓴다. CF_PAGES_URL 은 배포마다
        달라지는 주소라서 canonical 에 박히면 매 배포가 다른 사이트가 된다
      - 그 외 미리보기 빌드는 그 배포 주소를 그대로 쓴다
   3) 둘 다 없으면 운영 주소

   예전 GitHub Pages 주소는 이제 사이트가 아니라 리디렉션 페이지만 올라간다
   (scripts/build-redirect.mjs). 그래서 기본값으로 쓰면 canonical 이 되넘김
   페이지를 가리키게 되므로 쓰지 않는다.                                     */

const PRODUCTION_URL = "https://swagstudio.pages.dev/";

const resolveSiteUrl = () => {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.CF_PAGES) {
    if (process.env.CF_PAGES_BRANCH === "main") return PRODUCTION_URL;
    return process.env.CF_PAGES_URL || PRODUCTION_URL;
  }
  return PRODUCTION_URL;
};

const normalizedSiteUrl = (() => {
  try {
    const url = new URL(resolveSiteUrl());
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch {
    return PRODUCTION_URL;
  }
})();

const pageUrl = (relative = "") => new URL(relative, normalizedSiteUrl).href;
const kakaoUrl = safeHttpUrl(data.contact.kakao);
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
      <div class="footer-direct"><p>DIRECT</p><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a><a href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">김의현 (SWAG)</a></div>
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
    <text class="mk-t mk-t-url" x="80" y="23">brand.kr</text>
    <text class="mk-t mk-t-nav" x="20" y="52">홈</text>
    <text class="mk-t mk-t-nav" x="42" y="52">소개</text>
    <text class="mk-t mk-t-nav" x="76" y="52">예약</text>
    <text class="mk-t mk-t-head" x="20" y="78">이번 주 예약 가능</text>
    <text class="mk-t mk-t-body" x="20" y="94">원하는 시간을 골라 신청하세요</text>
    <rect x="20" y="104" width="70" height="22" rx="11" class="mk-cta"/>
    <text class="mk-t mk-t-cta" x="33" y="119">예약하기</text>
    <circle class="mk-click" cx="55" cy="115" r="16"/>
    <g class="mk-cursor"><path d="M0 0 L0 12 L3.2 9 L5.4 13.6 L7.6 12.6 L5.4 8.2 L9.2 8.2 Z"/></g>
    <rect class="mk-card" x="212" y="50" width="88" height="74" rx="10"/>
    <text class="mk-t mk-t-label" x="222" y="66">운영시간</text>
    <text class="mk-t mk-t-num" x="222" y="86">10:00</text>
    <text class="mk-t mk-t-body" x="222" y="100">~ 22:00</text>
    <rect x="222" y="106" width="34" height="12" rx="6" class="mk-chip"/>
    <g class="mk-cols">
      <rect x="20" y="142" width="88" height="52" rx="10" class="mk-card"/>
      <text class="mk-t mk-t-label" x="32" y="166">공지</text>
      <rect x="116" y="142" width="88" height="52" rx="10" class="mk-card"/>
      <text class="mk-t mk-t-label" x="128" y="166">오시는 길</text>
      <rect x="212" y="142" width="88" height="52" rx="10" class="mk-card"/>
      <text class="mk-t mk-t-label" x="224" y="166">문의</text>
    </g>
  </svg>`,
  app: `<svg class="mock mock-app" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
    <rect class="mk-phone" x="112" y="10" width="96" height="200" rx="18"/>
    <rect x="140" y="18" width="40" height="8" rx="4" class="mk-notch"/>
    <text class="mk-t mk-t-head" x="124" y="46">내 예약</text>
    <circle cx="192" cy="41" r="7" class="mk-chip"/>
    <rect x="124" y="58" width="72" height="34" rx="8" class="mk-hero"/>
    <text class="mk-t mk-t-onhero" x="132" y="74">오늘 14:00</text>
    <text class="mk-t mk-t-onhero-sub" x="132" y="85">확정</text>
    <g class="mk-rows">
      <rect x="124" y="100" width="72" height="20" rx="6" class="mk-card"/>
      <text class="mk-t mk-t-row" x="131" y="114">지난 예약</text>
      <rect x="124" y="126" width="72" height="20" rx="6" class="mk-card"/>
      <text class="mk-t mk-t-row" x="131" y="140">알림 설정</text>
      <rect x="124" y="152" width="72" height="20" rx="6" class="mk-card"/>
      <text class="mk-t mk-t-row" x="131" y="166">내 정보</text>
    </g>
    <rect x="124" y="182" width="72" height="16" rx="8" class="mk-tabbar"/>
    <circle cx="138" cy="190" r="4" class="mk-dot-b"/><circle cx="160" cy="190" r="4" class="mk-dot-mute"/><circle cx="182" cy="190" r="4" class="mk-dot-mute"/>
    <g class="mk-float">
      <rect x="24" y="52" width="80" height="30" rx="10" class="mk-toast"/>
      <circle cx="40" cy="67" r="7" class="mk-chip"/>
      <text class="mk-t mk-t-toast" x="52" y="65">예약 확정</text>
      <text class="mk-t mk-t-toast-sub" x="52" y="76">14:00 · 2인</text>
    </g>
    <g class="mk-float mk-float-late">
      <rect x="220" y="120" width="76" height="30" rx="10" class="mk-toast"/>
      <circle cx="236" cy="135" r="7" class="mk-dot-g"/>
      <text class="mk-t mk-t-toast" x="248" y="133">결제 완료</text>
      <text class="mk-t mk-t-toast-sub" x="248" y="144">카드</text>
    </g>
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
    <text class="mk-t mk-t-head" x="20" y="31">상담 챗봇</text>
    <g class="mk-chat">
      <rect x="20" y="46" width="150" height="34" rx="12" class="mk-bubble-user"/>
      <text class="mk-t mk-t-row" x="32" y="61">예약 언제 가능해요?</text>
      <text class="mk-t mk-t-body" x="32" y="73">오늘 저녁으로요</text>
    </g>
    <g class="mk-chat mk-chat-late">
      <rect x="108" y="92" width="192" height="58" rx="12" class="mk-bubble-ai"/>
      <text class="mk-t mk-t-onhero" x="120" y="109">오늘 18:00, 20:00 자리가</text>
      <text class="mk-t mk-t-onhero" x="120" y="123">남아 있습니다.</text>
      <text class="mk-t mk-t-onhero-sub" x="120" y="138">바로 예약해 드릴까요?</text>
    </g>
    <g class="mk-spark">
      <path d="M78 104 L84 118 L98 124 L84 130 L78 144 L72 130 L58 124 L72 118 Z" class="mk-spark-a"/>
      <path d="M50 138 L53 146 L61 149 L53 152 L50 160 L47 152 L39 149 L47 146 Z" class="mk-spark-b"/>
    </g>
    <rect x="20" y="168" width="240" height="24" rx="12" class="mk-prompt"/>
    <text class="mk-t mk-t-body" x="32" y="184">메시지를 입력하세요</text>
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

/* 히어로는 숨고 홈의 문법을 그대로 따른다: 순백 캔버스, 중앙 정렬 헤드라인,
   검색바 모양의 문의 진입점, 알록달록한 분야 아이콘 한 줄, 어두운 배너 스트립.
   떠다니는 장식 카드는 쓰지 않는다. 화면의 모든 값과 링크는 실제 데이터다. */

const heroCheck = `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6.2 4.8 9 10 3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const heroTinyStar = `<svg class="mq-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c1.1 6.2 3.7 8.8 11 11-7.3 2.2-9.9 4.8-11 11-1.1-6.2-3.7-8.8-11-11 7.3-2.2 9.9-4.8 11-11Z"/></svg>`;

/* 분야 아이콘 - 숨고 카테고리처럼 분야마다 색이 다르다. 단순한 도형이라
   어느 크기에서도 깨지지 않고, 본문 글자 규칙과도 무관한 장식 그래픽이다. */
const heroCatIcons = {
  all: `<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="#8a94ad"><circle cx="17" cy="17" r="5"/><circle cx="31" cy="17" r="5"/><circle cx="17" cy="31" r="5"/><circle cx="31" cy="31" r="5"/></g></svg>`,
  web: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="27" rx="5" fill="#2145e6"/><rect x="6" y="10" width="36" height="8" rx="4" fill="#183ac2"/><circle cx="11.5" cy="14" r="1.6" fill="#9db4ff"/><circle cx="16.5" cy="14" r="1.6" fill="#9db4ff"/><rect x="11" y="23" width="17" height="3.2" rx="1.6" fill="#fff" opacity=".95"/><rect x="11" y="29" width="11" height="3.2" rx="1.6" fill="#9db4ff"/><rect x="18" y="38" width="12" height="3" rx="1.5" fill="#c6d2ff"/></svg>`,
  app: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="14" y="5" width="20" height="38" rx="6" fill="#16b878"/><rect x="14" y="5" width="20" height="38" rx="6" fill="none"/><rect x="21" y="9" width="6" height="2.6" rx="1.3" fill="#bff2db"/><circle cx="24" cy="37" r="2.4" fill="#bff2db"/><rect x="19" y="16" width="10" height="10" rx="3" fill="#eafcf3"/></svg>`,
  game: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 13h20c5.2 0 9 4.6 8.4 9.8l-1 7.8c-.4 3.6-3.4 6.4-7 6.4-2 0-3.8-1-5-2.4l-1.4-1.8c-1-1.2-2.6-2-4-2s-3 .8-4 2l-1.4 1.8c-1.2 1.4-3 2.4-5 2.4-3.6 0-6.6-2.8-7-6.4l-1-7.8C5 17.6 8.8 13 14 13Z" fill="#f0609e"/><path d="M16 20v6M13 23h6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="21.5" r="2.2" fill="#ffd3e6"/><circle cx="35.5" cy="26" r="2.2" fill="#fff"/></svg>`,
  ai: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c1.2 9.2 6.8 14.8 16 16-9.2 1.2-14.8 6.8-16 16-1.2-9.2-6.8-14.8-16-16 9.2-1.2 14.8-6.8 16-16Z" fill="#8b5cf6"/><path d="M38 6.5c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6Z" fill="#c4b0fb"/></svg>`,
  platform: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="16" height="16" rx="4.5" fill="#f5a623"/><rect x="26" y="6" width="16" height="10" rx="4" fill="#ffd28a"/><rect x="26" y="20" width="16" height="22" rx="4.5" fill="#f5a623"/><rect x="6" y="26" width="16" height="16" rx="4.5" fill="#ffd28a"/></svg>`
};

const renderHeroCats = () => {
  const services = data.services.map((service) => `
      <a class="hero-cat" href="services/#${escapeHtml(service.id)}">
        <span class="hc-ic">${heroCatIcons[service.id] || heroCatIcons.web}</span>
        <span class="hc-lb">${escapeHtml(service.title)}</span>
      </a>`).join("");
  return `
      <a class="hero-cat" href="services/">
        <span class="hc-ic">${heroCatIcons.all}</span>
        <span class="hc-lb">전체 보기</span>
      </a>${services}`;
};

const renderHeroBand = () => {
  const items = data.capabilities.map((cap) => `<span class="mq-item">${heroTinyStar}${escapeHtml(cap)}</span>`).join("");
  return `
      <div class="hero-band" data-reveal aria-hidden="true">
        <div class="mq-track"><span class="mq-set">${items}</span><span class="mq-set">${items}</span></div>
        <i class="band-star band-star-1"></i>
        <i class="band-star band-star-2"></i>
      </div>`;
};

const renderHero = () => `
  <section class="hero" data-motion-scope>
    <div class="hero-core shell">
      <p class="hero-eyebrow" data-reveal>${escapeHtml(data.brand.expansion)}</p>
      <h1 data-reveal data-split>필요한 건 <span class="hero-rotator"><b class="rotator-word" data-rotator data-rotator-words="${escapeHtml(JSON.stringify(rotatorWords))}">${escapeHtml(rotatorWords[0])}</b><svg class="rotator-squiggle" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path d="M3 5.5H117"/></svg><svg class="rotator-pop" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c1.1 6.2 3.7 8.8 11 11-7.3 2.2-9.9 4.8-11 11-1.1-6.2-3.7-8.8-11-11 7.3-2.2 9.9-4.8 11-11Z"/></svg></span><br>만드는 건 <em class="h1-brand">SWAG</em></h1>
      <p class="hero-lead" data-reveal>상담한 두 사람이 기획 · 디자인 · 개발 · 검수 · 배포를 끝까지 맡는 ${escapeHtml(data.brand.description)}입니다.</p>
      <div class="hero-search" data-reveal>
        <a class="hs-field" href="contact/" aria-label="${escapeHtml(data.brand.primaryCta)}" data-type-field>
          <svg class="hs-loupe" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.2 16.2 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="hs-ph hs-ph-full" data-type-words="${escapeHtml(JSON.stringify(data.capabilities))}">${escapeHtml(data.contact.responseNote)}</span>
          <span class="hs-ph hs-ph-short">제작 종류 · 필요한 기능</span>
          <i class="hs-caret" aria-hidden="true"></i>
        </a>
        <a class="btn btn-primary hs-btn magnetic" href="contact/">${escapeHtml(data.brand.primaryCta)}</a>
      </div>
      <ul class="hero-trust" data-reveal>
        <li>같은 담당자가 끝까지</li>
        <li>재하청 없는 직접 개발</li>
        <li>카카오 오픈채팅 상담</li>
      </ul>
      <nav class="hero-cats" data-reveal aria-label="제작 분야">${renderHeroCats()}
      </nav>${renderHeroBand()}
    </div>
  </section>`;

/* ------------------------------------------------------------ home stats */

/* 숫자는 전부 실제 데이터에서 뽑는다.
   예전에는 "5개"라고 써 놓고 밑에 네 가지만 나열했고, "6단계"라고 써 놓고
   같은 페이지 아래 진행 방식은 네 단계만 보여 주고 있었다.
   화면 안에서 스스로 어긋나는 숫자는 눈에 띄게 어설퍼 보인다. */

const statTiles = [
  {
    value: data.services.length,
    unit: "개",
    label: "제작 분야",
    note: data.services.map((service) => service.title).join(" · ")
  },
  {
    value: data.process.length,
    unit: "단계",
    label: "담당 과정",
    note: data.process.map((step) => step.title).join(" · ")
  },
  { value: data.people?.count ?? 2, unit: "인", label: "전담 인원", note: "상담한 사람이 직접 제작" },
  { value: 0, unit: "건", label: "중간 하청", note: "재하청 없이 전 과정 직접" }
];

const renderStats = () => statTiles.map((stat, index) => `
  <article class="stat-tile stat-tile-${index + 1}" data-reveal="flip">
    <p class="stat-value"><b data-count="${stat.value}">0</b><span>${escapeHtml(stat.unit)}</span></p>
    <p class="stat-label">${escapeHtml(stat.label)}</p>
    <p class="stat-note">${escapeHtml(stat.note)}</p>
  </article>`).join("");

/* --------------------------------------------------------- service cards */

/* 카드 줄은 늘 왼쪽으로 흐르는 무한 루프다. 이어 붙일 복제 세트는
   읽히지 않게 aria-hidden 으로 두고, 링크가 탭 순서에 두 번 잡히지 않게
   tabindex 를 걷는다. */
const renderHomeFilm = () => {
  const filmCard = (service, index, duplicated) => `
    <a class="service-card film-shot film-shot-${index + 1}" href="services/#${escapeHtml(service.id)}" data-route-expand data-tilt${duplicated ? ' tabindex="-1"' : ""}>
      <figure class="service-card-visual" data-motion-scope>${mockups[service.id] || mockups.web}<span class="card-sheen" aria-hidden="true"></span></figure>
      <div class="service-card-copy">
        <p class="service-card-tag">${escapeHtml(service.short)}</p>
        <h3>${escapeHtml(service.title)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <span class="btn btn-small">자세히 보기</span>
      </div>
    </a>`;
  const items = data.services.map((service, index) => filmCard(service, index, false)).join("");
  const duplicates = data.services.map((service, index) => filmCard(service, index, true)).join("");
  return `<div class="film-track"><div class="film-set" data-film-set>${items}</div><div class="film-set" aria-hidden="true">${duplicates}</div></div>`;
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
  <section class="contact-strip" data-reveal data-motion-scope>
    <div class="shell" data-spotlight>
      <i class="strip-aurora" aria-hidden="true"></i>
      <div class="contact-strip-glow" aria-hidden="true"></div>
      <p class="eyebrow">CONTACT</p>
      <h2 data-split>아이디어만 있어도 충분해요</h2>
      <p class="contact-strip-lead">제작 종류와 필요한 기능만 알려 주세요. 견적과 일정을 안내해 드립니다.</p>
      <div class="contact-strip-actions"><a class="btn btn-invert magnetic" href="contact/">문의 내용 정리하기 <span aria-hidden="true">→</span></a><a class="btn btn-outline-invert magnetic" href="${escapeHtml(kakaoUrl)}" target="_blank" rel="noopener noreferrer">카카오 오픈채팅 ↗</a></div>
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
