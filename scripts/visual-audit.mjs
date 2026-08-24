import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const nodeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!nodeModules) throw new Error("CODEX_PRIMARY_RUNTIME_NODE_MODULES is required");
const { chromium } = require(path.join(nodeModules, "playwright"));

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4173/";
const auditDir = process.env.AUDIT_DIR || "/tmp/swag-visual-audit";
const routes = [
  "",
  "work/",
  "about/",
  "services/",
  "process/",
  "contact/",
  "privacy.html",
  "404.html",
  "work/escape-booking.html",
  "work/store-experience.html"
];
const viewports = [
  { width: 320, height: 812, label: "mobile-320" },
  { width: 390, height: 844, label: "mobile-390" },
  { width: 768, height: 1024, label: "tablet-768" },
  { width: 1440, height: 1000, label: "desktop-1440" }
];

await mkdir(auditDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: chromium.executablePath()
});
const results = [];
let failed = false;

const safeRouteName = (route) => route ? route.replaceAll("/", "_").replaceAll(".html", "") : "home";

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "light",
    reducedMotion: "no-preference"
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });

  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => {
      errors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`);
    });

    const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(450);

    const inspection = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const textSelector = "h1,h2,h3,p,a,button,legend,label,li,summary,pre";
      const textElements = [...document.querySelectorAll(textSelector)].filter((element) => visible(element) && element.textContent.trim());
      const clippedText = textElements.filter((element) => {
        const style = getComputedStyle(element);
        const clippedX = element.scrollWidth > element.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
        const clippedY = element.scrollHeight > element.clientHeight + 2 && ["hidden", "clip"].includes(style.overflowY);
        return clippedX || clippedY;
      }).map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent.trim().slice(0, 80),
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight]
      }));
      const offscreenText = textElements.filter((element) => {
        if (element.closest("[aria-hidden='true'], .mobile-menu[hidden]")) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -2 || rect.right > document.documentElement.clientWidth + 2;
      }).map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent.trim().slice(0, 80),
        rect: [Math.round(element.getBoundingClientRect().left), Math.round(element.getBoundingClientRect().right)]
      }));
      const tinyText = textElements.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 80), size: getComputedStyle(element).fontSize }));
      const brokenImages = [...document.images].filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      const interactive = [...document.querySelectorAll("a,button,input,textarea,summary")].filter(visible);
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
          if (smaller > 0 && area / smaller > .42) {
            overlaps.push({
              first: a.textContent.trim().slice(0, 44),
              second: b.textContent.trim().slice(0, 44),
              ratio: Number((area / smaller).toFixed(2))
            });
          }
        }
      }
      const koreanElement = textElements.find((element) => /[가-힣]/.test(element.textContent));
      return {
        title: document.title,
        h1: document.querySelector("h1")?.textContent.trim() || "",
        bodyLength: document.body.innerText.trim().length,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        fontReady: document.fonts.check('16px "Plex KR"'),
        koreanFont: koreanElement ? getComputedStyle(koreanElement).fontFamily : "",
        clippedText,
        offscreenText,
        tinyText,
        brokenImages,
        overlaps,
        activeAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
        canvasCount: document.querySelectorAll("canvas").length,
        linkCount: document.querySelectorAll("a").length
      };
    });

    if (!response || response.status() >= 400) errors.push(`http: ${response?.status() || "no response"}`);
    if (!inspection.h1) errors.push("missing h1");
    if (inspection.bodyLength < 80) errors.push("page content is unexpectedly short");
    if (inspection.scrollWidth > inspection.clientWidth + 1) errors.push(`horizontal overflow: ${inspection.scrollWidth}/${inspection.clientWidth}`);
    if (!inspection.fontReady || !inspection.koreanFont.includes("Plex KR")) errors.push(`font did not load: ${inspection.koreanFont}`);
    if (inspection.clippedText.length) errors.push(`clipped text: ${JSON.stringify(inspection.clippedText.slice(0, 4))}`);
    if (inspection.offscreenText.length) errors.push(`offscreen text: ${JSON.stringify(inspection.offscreenText.slice(0, 4))}`);
    if (inspection.tinyText.length) errors.push(`tiny text: ${JSON.stringify(inspection.tinyText.slice(0, 4))}`);
    if (inspection.brokenImages.length) errors.push(`broken images: ${inspection.brokenImages.join(", ")}`);
    if (inspection.overlaps.length) errors.push(`interactive overlap: ${JSON.stringify(inspection.overlaps.slice(0, 4))}`);

    const screenshotPath = path.join(auditDir, `${viewport.label}-${safeRouteName(route)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    results.push({
      viewport: viewport.label,
      route: route || "/",
      status: response?.status() || 0,
      screenshotPath,
      inspection,
      errors
    });
    if (errors.length) failed = true;
    await page.close();
  }

  const interactionPage = await context.newPage();
  await interactionPage.goto(new URL("contact/", baseUrl).href, { waitUntil: "networkidle" });
  await interactionPage.locator('[data-brief-group="제작 종류"]').first().click();
  await interactionPage.locator('[data-brief-group="필요 기능"]').nth(2).click();
  await interactionPage.locator('[data-brief-group="준비 상태"]').first().click();
  await interactionPage.locator("[data-brief-note]").fill("브랜드 사이트를 새로 만들고 싶습니다.");
  await interactionPage.locator("[data-brief-schedule]").fill("9월 시작");
  const summaryText = await interactionPage.locator("[data-brief-summary]").innerText();
  await interactionPage.locator("[data-brief-copy]").click();
  const clipboardText = await interactionPage.evaluate(() => navigator.clipboard.readText());
  const interactionErrors = [];
  if (!summaryText.includes("브랜드 사이트") || !summaryText.includes("9월 시작")) interactionErrors.push("brief summary did not update");
  if (clipboardText !== summaryText) interactionErrors.push("clipboard content did not match summary");

  if (viewport.width <= 390) {
    await interactionPage.locator("[data-nav-toggle]").click();
    const menuVisible = await interactionPage.locator("[data-mobile-menu]").isVisible();
    const targetSizes = await interactionPage.locator("[data-mobile-menu] a").evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { text: link.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (!menuVisible) interactionErrors.push("mobile menu did not open");
    if (targetSizes.some((size) => size.height < 44 || size.width < 44)) interactionErrors.push(`mobile target below 44px: ${JSON.stringify(targetSizes)}`);
  }

  results.push({ viewport: viewport.label, route: "interaction", errors: interactionErrors, summaryText });
  if (interactionErrors.length) failed = true;
  await interactionPage.close();
  await context.close();
}

await browser.close();
const reportPath = path.join(auditDir, "report.json");
await writeFile(reportPath, JSON.stringify({ baseUrl, results }, null, 2));
const issueCount = results.reduce((count, result) => count + (result.errors?.length || 0), 0);
console.log(`Visual audit completed: ${results.length} checks, ${issueCount} issues`);
console.log(`Report: ${reportPath}`);
if (failed) {
  results.filter((result) => result.errors?.length).forEach((result) => {
    console.error(`${result.viewport} ${result.route}: ${result.errors.join(" | ")}`);
  });
  process.exit(1);
}
