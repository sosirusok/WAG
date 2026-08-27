import { createRequire } from "node:module";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const nodeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!nodeModules) throw new Error("CODEX_PRIMARY_RUNTIME_NODE_MODULES is required");
const { chromium, firefox, webkit } = require(path.join(nodeModules, "playwright"));

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4173/";
const auditDir = process.env.AUDIT_DIR || path.resolve(".audit/visual");
const screenshotMode = process.env.AUDIT_SCREENSHOTS || "key";
const routes = [
  { path: "", page: "home" },
  { path: "services/", page: "services" },
  { path: "work/", page: "work" },
  { path: "process/", page: "process" },
  { path: "about/", page: "about" },
  { path: "contact/", page: "contact" },
  { path: "privacy.html", page: "privacy" },
  { path: "404.html", page: "not-found" }
];
const viewports = [
  { width: 320, height: 812, label: "mobile-320" },
  { width: 390, height: 844, label: "mobile-390" },
  { width: 844, height: 390, label: "mobile-landscape-844" },
  { width: 768, height: 1024, label: "tablet-768" },
  { width: 1100, height: 900, label: "laptop-1100" },
  { width: 1440, height: 1000, label: "desktop-1440" }
];

const firstAvailable = async (candidates) => {
  for (const candidate of candidates.filter(Boolean)) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return undefined;
};

const requestedBrowser = process.env.AUDIT_BROWSER || "chromium";
const browserType = { chromium, firefox, webkit }[requestedBrowser] || chromium;
const executablePath = await firstAvailable([
  process.env.AUDIT_BROWSER_PATH,
  process.env.AUDIT_CHROME_PATH,
  process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "",
  process.platform === "win32" ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : "",
  browserType.executablePath()
]);

await mkdir(auditDir, { recursive: true });
const browser = await browserType.launch({
  headless: true,
  timeout: Number(process.env.AUDIT_LAUNCH_TIMEOUT || 180000),
  ...(executablePath ? { executablePath } : {}),
  args: ["--renderer-process-limit=2"]
});

const results = [];
const allAssertions = [];
let failed = false;
const safeRouteName = (route) => route ? route.replaceAll("/", "_").replaceAll(".html", "") : "home";
const rejectedCopy = [
  "필요한 만큼 정확하게",
  "실제로 운영 중인 화면을 직접 확인",
  "중요한 화면을 먼저 확인하고",
  "웹사이트부터 앱과 운영 시스템까지",
  "고객용 화면과 관리자 화면을 함께 설계",
  "직접 수정하고 관리할 수 있게 인계",
  "만들고 싶은 서비스가 있나요"
];

const addAssertion = (bucket, id, condition, evidence = "") => {
  const assertion = { id, passed: Boolean(condition), evidence };
  bucket.push(assertion);
  allAssertions.push(assertion);
  return assertion.passed;
};

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "light",
    reducedMotion: "no-preference"
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });

  for (const route of routes) {
    console.log(`Auditing ${viewport.label} ${route.path || "/"}`);
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => runtimeErrors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`));

    const response = await page.goto(new URL(route.path, baseUrl).href, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const scrollStep = Math.max(360, Math.round(viewport.height * .78));
    for (let y = 0; y < pageHeight; y += scrollStep) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);

    const inspection = await page.evaluate(({ expectedPage, rejected }) => {
      const visible = (element) => {
        if (!element) return false;
        if (element.matches(".sr-only") || element.closest(".sr-only")) return false;
        const closedDetails = element.closest("details:not([open])");
        if (closedDetails && element !== closedDetails.querySelector(":scope > summary")) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const textSelector = "h1,h2,h3,p,a,button,legend,label,li,summary,pre,dt,dd,span";
      const textElements = [...document.querySelectorAll(textSelector)].filter((element) => visible(element) && element.textContent.trim());
      const clippedText = textElements.filter((element) => {
        if (element.closest("[aria-hidden='true'], .platform-loop") || element.matches("a,button") && element.children.length) return false;
        const style = getComputedStyle(element);
        const clippedX = element.scrollWidth > element.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
        const clippedY = element.scrollHeight > element.clientHeight + 2 && ["hidden", "clip"].includes(style.overflowY);
        return clippedX || clippedY;
      }).map((element) => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 80) }));
      const offscreenText = textElements.filter((element) => {
        if (element.closest("[aria-hidden='true'], .mobile-menu:not([open]), .film-window, .motion-ribbon, .chapter-jump, .capability-marquee, .footer-film")) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -2 || rect.right > document.documentElement.clientWidth + 2;
      }).map((element) => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 80), rect: [Math.round(element.getBoundingClientRect().left), Math.round(element.getBoundingClientRect().right)] }));
      const tinyText = textElements.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 14)
        .map((element) => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 80), size: getComputedStyle(element).fontSize }));
      const brokenImages = [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
      const interactive = [...document.querySelectorAll("a,button,input,textarea,summary")].filter(visible);
      const smallTargets = interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).map((element) => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 60), size: [Math.round(element.getBoundingClientRect().width), Math.round(element.getBoundingClientRect().height)] }));
      const overlaps = [];
      for (let first = 0; first < interactive.length; first += 1) {
        const a = interactive[first];
        const ar = a.getBoundingClientRect();
        for (let second = first + 1; second < interactive.length; second += 1) {
          const b = interactive[second];
          if (a.contains(b) || b.contains(a)) continue;
          const br = b.getBoundingClientRect();
          const width = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
          const height = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
          const area = width * height;
          const smaller = Math.min(ar.width * ar.height, br.width * br.height);
          if (smaller > 0 && area / smaller > .42) overlaps.push({ first: a.textContent.trim().slice(0, 44), second: b.textContent.trim().slice(0, 44), ratio: Number((area / smaller).toFixed(2)) });
        }
      }
      const brandOverflow = [...document.querySelectorAll(".brand img")].map((image) => {
        const frame = image.closest(".brand").getBoundingClientRect();
        const rect = image.getBoundingClientRect();
        return { width: rect.width, height: rect.height, frameWidth: frame.width, frameHeight: frame.height, overflow: rect.width > frame.width + 2 || rect.height > frame.height + 2 };
      });
      const headings = [...document.querySelectorAll("h1,h2")].filter(visible).map((heading) => heading.textContent.trim());
      const largeSentenceHeadings = headings.filter((text) => /(?:합니다|됩니다|있습니다|했습니다)[.!?]?$/u.test(text));
      const bodyText = document.body.innerText.replace(/\s+/g, " ");
      return {
        expectedPage,
        actualPage: document.body.dataset.page || "",
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        bodyLength: document.body.innerText.trim().length,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        fontReady: document.fonts.status === "loaded",
        suitReady: document.fonts.check('16px "SUIT Variable"'),
        clippedText,
        offscreenText,
        tinyText,
        brokenImages,
        smallTargets,
        overlaps,
        brandOverflow,
        largeSentenceHeadings,
        rejectedCopy: rejected.filter((phrase) => bodyText.includes(phrase)),
        activeAnimationCount: document.getAnimations().filter((animation) => animation.playState === "running").length,
        canvasCount: document.querySelectorAll("canvas").length,
        revealHidden: [...document.querySelectorAll("[data-reveal]")].filter((item) => !item.classList.contains("is-visible")).map((item) => ({
          tag: item.tagName,
          className: item.className,
          text: item.textContent.trim().slice(0, 80),
          top: Math.round(item.getBoundingClientRect().top)
        })),
        desktopNavVisible: visible(document.querySelector(".desktop-nav")),
        mobileMenuVisible: visible(document.querySelector(".mobile-menu > summary")),
        navLabels: [...document.querySelectorAll(".desktop-nav a")].map((item) => item.textContent.trim()),
        projectElements: document.querySelectorAll(".case-study,.case-browser,.work-list").length,
        imageCount: document.images.length,
        linkCount: document.querySelectorAll("a").length
      };
    }, { expectedPage: route.page, rejected: rejectedCopy });

    let motionInspection = null;
    if (route.page === "home") {
      await page.locator(".motion-ribbon").scrollIntoViewIfNeeded();
      await page.waitForTimeout(220);
      const before = await page.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => new DOMMatrix(getComputedStyle(track).transform).m41));
      await page.waitForTimeout(520);
      const after = await page.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => new DOMMatrix(getComputedStyle(track).transform).m41));
      await page.locator("[data-motion-toggle]").click();
      await page.waitForTimeout(80);
      const pausedBefore = await page.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => new DOMMatrix(getComputedStyle(track).transform).m41));
      await page.waitForTimeout(260);
      const pausedAfter = await page.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => new DOMMatrix(getComputedStyle(track).transform).m41));
      motionInspection = await page.evaluate(({ before, after, pausedBefore, pausedAfter }) => ({
        rows: document.querySelectorAll("[data-motion-row]").length,
        sets: document.querySelectorAll(".motion-set").length,
        speeds: [...document.querySelectorAll("[data-motion-row]")].map((row) => Number(row.dataset.speed)),
        setWidths: [...document.querySelectorAll("[data-motion-row]")].map((row) => [...row.querySelectorAll(".motion-set")].map((set) => set.offsetWidth)),
        before,
        after,
        deltas: after.map((value, index) => value - before[index]),
        pausedDeltas: pausedAfter.map((value, index) => value - pausedBefore[index]),
        paused: document.querySelector("[data-motion-toggle]")?.getAttribute("aria-pressed")
      }), { before, after, pausedBefore, pausedAfter });
      await page.locator("[data-motion-toggle]").click();
    }

    const assertions = [];
    const prefix = `${viewport.label}:${route.path || "/"}`;
    addAssertion(assertions, `${prefix}:http`, Boolean(response) && response.status() < 400, String(response?.status() || 0));
    addAssertion(assertions, `${prefix}:runtime-errors`, runtimeErrors.length === 0, runtimeErrors.join(" | "));
    addAssertion(assertions, `${prefix}:page-identity`, inspection.actualPage === route.page, `${inspection.actualPage}/${route.page}`);
    addAssertion(assertions, `${prefix}:title`, inspection.title.length > 3, inspection.title);
    addAssertion(assertions, `${prefix}:one-h1`, inspection.h1Count === 1, String(inspection.h1Count));
    addAssertion(assertions, `${prefix}:content-length`, inspection.bodyLength >= 100, String(inspection.bodyLength));
    addAssertion(assertions, `${prefix}:horizontal-overflow`, inspection.scrollWidth <= inspection.clientWidth + 1, `${inspection.scrollWidth}/${inspection.clientWidth}`);
    addAssertion(assertions, `${prefix}:fonts-loaded`, inspection.fontReady, String(inspection.fontReady));
    addAssertion(assertions, `${prefix}:suit-loaded`, inspection.suitReady, String(inspection.suitReady));
    addAssertion(assertions, `${prefix}:no-clipped-text`, inspection.clippedText.length === 0, JSON.stringify(inspection.clippedText.slice(0, 4)));
    addAssertion(assertions, `${prefix}:no-offscreen-text`, inspection.offscreenText.length === 0, JSON.stringify(inspection.offscreenText.slice(0, 4)));
    addAssertion(assertions, `${prefix}:minimum-text-14`, inspection.tinyText.length === 0, JSON.stringify(inspection.tinyText.slice(0, 4)));
    addAssertion(assertions, `${prefix}:images-decoded`, inspection.brokenImages.length === 0, inspection.brokenImages.join(", "));
    addAssertion(assertions, `${prefix}:mobile-targets-44`, viewport.width > 390 || inspection.smallTargets.length === 0, JSON.stringify(inspection.smallTargets.slice(0, 6)));
    addAssertion(assertions, `${prefix}:no-interactive-overlap`, inspection.overlaps.length === 0, JSON.stringify(inspection.overlaps.slice(0, 4)));
    addAssertion(assertions, `${prefix}:brand-contained`, inspection.brandOverflow.every((item) => !item.overflow), JSON.stringify(inspection.brandOverflow));
    addAssertion(assertions, `${prefix}:automatic-motion`, inspection.activeAnimationCount >= 1, String(inspection.activeAnimationCount));
    addAssertion(assertions, `${prefix}:canvas-scope`, inspection.canvasCount === (route.page === "home" ? 1 : 0), String(inspection.canvasCount));
    addAssertion(assertions, `${prefix}:reveals-complete`, inspection.revealHidden.length === 0, JSON.stringify(inspection.revealHidden));
    addAssertion(assertions, `${prefix}:heading-copy`, inspection.largeSentenceHeadings.length === 0, inspection.largeSentenceHeadings.join(" | "));
    addAssertion(assertions, `${prefix}:rejected-copy`, inspection.rejectedCopy.length === 0, inspection.rejectedCopy.join(" | "));
    addAssertion(assertions, `${prefix}:desktop-nav-mode`, viewport.width <= 900 || inspection.desktopNavVisible, String(inspection.desktopNavVisible));
    addAssertion(assertions, `${prefix}:mobile-nav-mode`, viewport.width > 900 || inspection.mobileMenuVisible, String(inspection.mobileMenuVisible));
    addAssertion(assertions, `${prefix}:desktop-nav-labels`, inspection.navLabels.join("|") === "제작 분야|프로젝트|진행 방식|소개|견적 문의", inspection.navLabels.join("|"));
    addAssertion(assertions, `${prefix}:home-project-free`, route.page !== "home" || inspection.projectElements === 0, String(inspection.projectElements));
    addAssertion(assertions, `${prefix}:about-project-free`, route.page !== "about" || inspection.projectElements === 0, String(inspection.projectElements));
    addAssertion(assertions, `${prefix}:motion-three-rows`, route.page !== "home" || motionInspection?.rows === 3, String(motionInspection?.rows || 0));
    addAssertion(assertions, `${prefix}:motion-duplicate-sets`, route.page !== "home" || motionInspection?.sets === 6, String(motionInspection?.sets || 0));
    addAssertion(assertions, `${prefix}:motion-speeds`, route.page !== "home" || motionInspection?.speeds.join(",") === "27,-21,24", motionInspection?.speeds.join(",") || "missing");
    addAssertion(assertions, `${prefix}:motion-equal-loops`, route.page !== "home" || motionInspection?.setWidths.every(([first, second]) => Math.abs(first - second) <= 1), JSON.stringify(motionInspection?.setWidths || []));
    addAssertion(assertions, `${prefix}:motion-directions`, route.page !== "home" || (motionInspection?.deltas[0] > 0 && motionInspection?.deltas[1] < 0 && motionInspection?.deltas[2] > 0), JSON.stringify(motionInspection?.deltas || []));
    addAssertion(assertions, `${prefix}:motion-pause`, route.page !== "home" || (motionInspection?.paused === "true" && motionInspection?.pausedDeltas.every((delta) => Math.abs(delta) < .2)), JSON.stringify(motionInspection?.pausedDeltas || []));

    const errors = assertions.filter((item) => !item.passed).map((item) => `${item.id}${item.evidence ? ` (${item.evidence})` : ""}`);
    const screenshotWanted = screenshotMode !== "none" && (viewport.width === 320 || viewport.width === 1440 || errors.length > 0 || screenshotMode === "all");
    const screenshotPath = screenshotWanted ? path.join(auditDir, `${viewport.label}-${safeRouteName(route.path)}.png`) : "";
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

    results.push({ viewport: viewport.label, route: route.path || "/", status: response?.status() || 0, screenshotPath, inspection, motionInspection, assertions, errors });
    console.log(`Finished ${viewport.label} ${route.path || "/"}: ${assertions.filter((item) => item.passed).length}/${assertions.length}`);
    if (errors.length) failed = true;
    await page.close();
  }

  const interactionPage = await context.newPage();
  const response = await interactionPage.goto(new URL("contact/?type=app", baseUrl).href, { waitUntil: "domcontentloaded", timeout: 60000 });
  await interactionPage.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
  await interactionPage.waitForTimeout(250);
  const interactionAssertions = [];
  const interactionPrefix = `${viewport.label}:interaction`;
  addAssertion(interactionAssertions, `${interactionPrefix}:http`, Boolean(response) && response.status() < 400, String(response?.status() || 0));
  const appType = interactionPage.locator('[data-brief-key="app"]');
  addAssertion(interactionAssertions, `${interactionPrefix}:query-preselect`, await appType.getAttribute("aria-pressed") === "true", await appType.getAttribute("aria-pressed") || "missing");
  await interactionPage.locator('[data-brief-group="제작 종류"]').first().click();
  await interactionPage.locator('[data-brief-group="필요 기능"]').nth(2).click();
  await interactionPage.locator('[data-brief-group="필요 기능"]').nth(3).click();
  await interactionPage.locator('[data-brief-group="준비 상태"]').first().click();
  await interactionPage.locator("[data-brief-note]").fill("브랜드 사이트를 새로 만들고 싶습니다.");
  await interactionPage.locator("[data-brief-schedule]").fill("9월 시작");
  const summaryText = await interactionPage.locator("[data-brief-summary]").innerText();
  addAssertion(interactionAssertions, `${interactionPrefix}:summary-type`, summaryText.includes("웹사이트"), summaryText);
  addAssertion(interactionAssertions, `${interactionPrefix}:summary-multiselect`, summaryText.includes("모바일 앱") && summaryText.includes("브라우저 게임"), summaryText);
  addAssertion(interactionAssertions, `${interactionPrefix}:summary-note`, summaryText.includes("브랜드 사이트를 새로 만들고 싶습니다"), summaryText);
  addAssertion(interactionAssertions, `${interactionPrefix}:summary-schedule`, summaryText.includes("9월 시작"), summaryText);
  await interactionPage.locator("[data-brief-copy]").click();
  const clipboardText = await interactionPage.evaluate(() => navigator.clipboard.readText());
  const normalizeClipboard = (value) => value.replaceAll("\r\n", "\n").trim();
  addAssertion(interactionAssertions, `${interactionPrefix}:clipboard`, normalizeClipboard(clipboardText) === normalizeClipboard(summaryText), clipboardText);
  const trueTypes = await interactionPage.locator('[data-brief-group="제작 종류"][aria-pressed="true"]').count();
  const trueStates = await interactionPage.locator('[data-brief-group="준비 상태"][aria-pressed="true"]').count();
  const trueFeatures = await interactionPage.locator('[data-brief-group="필요 기능"][aria-pressed="true"]').count();
  addAssertion(interactionAssertions, `${interactionPrefix}:single-type`, trueTypes === 1, String(trueTypes));
  addAssertion(interactionAssertions, `${interactionPrefix}:single-state`, trueStates === 1, String(trueStates));
  addAssertion(interactionAssertions, `${interactionPrefix}:multi-feature`, trueFeatures === 2, String(trueFeatures));

  if (viewport.width <= 900) {
    const menu = interactionPage.locator(".mobile-menu");
    const summary = interactionPage.locator(".mobile-menu > summary");
    await summary.click();
    addAssertion(interactionAssertions, `${interactionPrefix}:menu-open`, await menu.getAttribute("open") !== null, await menu.getAttribute("open") || "missing");
    addAssertion(interactionAssertions, `${interactionPrefix}:menu-label-open`, await summary.getAttribute("aria-label") === "메뉴 닫기", await summary.getAttribute("aria-label") || "missing");
    const menuSizes = await interactionPage.locator(".mobile-menu nav a").evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    addAssertion(interactionAssertions, `${interactionPrefix}:menu-targets`, menuSizes.every((size) => size.width >= 44 && size.height >= 44), JSON.stringify(menuSizes));
    await summary.press("Escape");
    addAssertion(interactionAssertions, `${interactionPrefix}:menu-escape-close`, await menu.getAttribute("open") === null, await menu.getAttribute("open") || "closed");
    const focusReturned = await summary.evaluate((element) => element === document.activeElement);
    addAssertion(interactionAssertions, `${interactionPrefix}:menu-focus-return`, focusReturned, String(focusReturned));
  } else {
    addAssertion(interactionAssertions, `${interactionPrefix}:desktop-nav-visible`, await interactionPage.locator(".desktop-nav").isVisible(), "desktop nav");
  }

  const interactionErrors = interactionAssertions.filter((item) => !item.passed).map((item) => `${item.id}${item.evidence ? ` (${item.evidence})` : ""}`);
  results.push({ viewport: viewport.label, route: "interaction", assertions: interactionAssertions, errors: interactionErrors, summaryText });
  if (interactionErrors.length) failed = true;
  await interactionPage.close();
  await context.close();
}

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
  reducedMotion: "reduce"
});
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
await reducedPage.locator(".motion-ribbon").scrollIntoViewIfNeeded();
await reducedPage.waitForTimeout(180);
const reducedBefore = await reducedPage.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => getComputedStyle(track).transform));
await reducedPage.waitForTimeout(320);
const reducedAfter = await reducedPage.evaluate(() => [...document.querySelectorAll(".motion-track")].map((track) => getComputedStyle(track).transform));
const reducedInspection = await reducedPage.evaluate(({ before, after }) => ({
  mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
  before,
  after,
  duplicateDisplays: [...document.querySelectorAll('.motion-set[aria-hidden="true"]')].map((set) => getComputedStyle(set).display)
}), { before: reducedBefore, after: reducedAfter });
const reducedAssertions = [];
addAssertion(reducedAssertions, "reduced-motion:media", reducedInspection.mediaMatches, String(reducedInspection.mediaMatches));
addAssertion(reducedAssertions, "reduced-motion:static-tracks", reducedInspection.before.join("|") === reducedInspection.after.join("|"), `${reducedInspection.before.join("|")} / ${reducedInspection.after.join("|")}`);
addAssertion(reducedAssertions, "reduced-motion:no-duplicates", reducedInspection.duplicateDisplays.every((display) => display === "none"), reducedInspection.duplicateDisplays.join(","));
const reducedErrors = reducedAssertions.filter((item) => !item.passed).map((item) => `${item.id}${item.evidence ? ` (${item.evidence})` : ""}`);
results.push({ viewport: "mobile-390-reduced", route: "/", inspection: reducedInspection, assertions: reducedAssertions, errors: reducedErrors });
if (reducedErrors.length) failed = true;
await reducedPage.close();
await reducedContext.close();

await browser.close();
const passedCount = allAssertions.filter((item) => item.passed).length;
const failedCount = allAssertions.length - passedCount;
const reportPath = path.join(auditDir, "report.json");
await writeFile(reportPath, JSON.stringify({ baseUrl, browser: requestedBrowser, summary: { assertions: allAssertions.length, passed: passedCount, failed: failedCount }, results }, null, 2));
console.log(`Visual audit completed: ${passedCount}/${allAssertions.length} assertions passed`);
console.log(`Report: ${reportPath}`);
if (failed) {
  results.filter((result) => result.errors?.length).forEach((result) => console.error(`${result.viewport} ${result.route}: ${result.errors.join(" | ")}`));
  process.exit(1);
}
