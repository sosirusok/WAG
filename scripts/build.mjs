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

const renderPrinciples = () => data.principles.map((item, index) => `
  <article class="principle-card reveal" data-reveal>
    <span>0${index + 1}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
  </article>`).join("");

const renderServices = () => data.services.map((item) => `
  <article class="service-row reveal" data-reveal>
    <div class="service-number">${escapeHtml(item.number)}</div>
    <div class="service-title"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.subtitle)}</p></div>
    <p class="service-description">${escapeHtml(item.description)}</p>
    <ul>${item.items.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
  </article>`).join("");

const renderProjectVisual = (project) => {
  const image = safeImage(project.image);
  if (image) {
    return `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.imageAlt || project.title)}" loading="lazy" decoding="async">`;
  }
  return `<div class="project-poster poster-${escapeHtml(project.visual || "yellow")}" aria-hidden="true">
    <span class="poster-code">${escapeHtml(project.category)}</span>
    <strong>${escapeHtml(project.title.split(" ")[0])}</strong>
    <i></i><i></i><i></i>
    <em>WAG / ${escapeHtml(project.year)}</em>
  </div>`;
};

const publicProjects = data.projects
  .filter((project) => project.published)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const renderProjects = () => publicProjects.map((project, index) => `
  <article class="project-card reveal" data-reveal>
    <div class="project-visual">${renderProjectVisual(project)}</div>
    <div class="project-meta"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(project.year)}</span></div>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.summary)}</p>
    <div class="project-features">${project.features.slice(0, 4).map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}</div>
    <button class="project-open" type="button" data-project-id="${escapeHtml(project.id)}">
      <span>구축 내용 보기</span><span aria-hidden="true">↗</span>
    </button>
    <span class="project-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
  </article>`).join("");

const renderProcess = () => data.process.map((item) => `
  <li class="process-item reveal" data-reveal>
    <span>${escapeHtml(item.number)}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
  </li>`).join("");

const renderFaq = () => data.faq.map((item, index) => `
  <details class="faq-item reveal" data-reveal${index === 0 ? " open" : ""}>
    <summary><span>${escapeHtml(item.question)}</span><i aria-hidden="true"></i></summary>
    <div><p>${escapeHtml(item.answer)}</p></div>
  </details>`).join("");

const normalizedSiteUrl = (() => {
  const candidate = process.env.SITE_URL || "https://sosirusok.github.io/WAG/";
  try {
    const url = new URL(candidate);
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch {
    return "https://sosirusok.github.io/WAG/";
  }
})();

const kakaoUrl = safeHttpUrl(data.contact.kakao);
const phoneDigits = data.contact.phone.replace(/\D/g, "");
const ogUrl = new URL("assets/wag-og.jpg", normalizedSiteUrl).href;
const capabilities = [...data.capabilities, ...data.capabilities]
  .map((item) => `<span>${escapeHtml(item)}</span><i aria-hidden="true">✳</i>`).join("");

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

const tokens = {
  META_TITLE: data.meta.title,
  META_DESCRIPTION: data.meta.description,
  SITE_URL: normalizedSiteUrl,
  OG_URL: ogUrl,
  STRUCTURED_DATA: structuredData,
  BRAND_NAME: data.brand.name,
  BRAND_EXPANSION: data.brand.expansion,
  AVAILABILITY: data.brand.availability,
  EYEBROW: data.brand.eyebrow,
  HEADLINE_TOP: data.brand.headlineTop,
  HEADLINE_FOCUS: data.brand.headlineFocus,
  HEADLINE_BOTTOM: data.brand.headlineBottom,
  HERO_DESCRIPTION: data.brand.description,
  PRIMARY_CTA: data.brand.primaryCta,
  SECONDARY_CTA: data.brand.secondaryCta,
  KAKAO_URL: kakaoUrl,
  KAKAO_LABEL: data.contact.kakaoLabel,
  PHONE: data.contact.phone,
  PHONE_DIGITS: phoneDigits,
  OWNER: data.contact.owner,
  RESPONSE_NOTE: data.contact.responseNote,
  CAPABILITY_MARQUEE: capabilities,
  PRINCIPLES: renderPrinciples(),
  PROJECTS: renderProjects(),
  SERVICES: renderServices(),
  PROCESS: renderProcess(),
  FAQ: renderFaq(),
  PROJECT_DATA: JSON.stringify(publicProjects).replaceAll("<", "\\u003c")
};

const fillTemplate = (template, rawKeys = new Set()) => Object.entries(tokens).reduce((html, [key, value]) => {
  const replacement = rawKeys.has(key) ? String(value) : escapeHtml(value);
  return html.replaceAll(`{{${key}}}`, replacement);
}, template);

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "assets"), { recursive: true });

const indexTemplate = await readFile(path.join(source, "index.template.html"), "utf8");
const rawIndexTokens = new Set(["STRUCTURED_DATA", "CAPABILITY_MARQUEE", "PRINCIPLES", "PROJECTS", "SERVICES", "PROCESS", "FAQ", "PROJECT_DATA"]);
await writeFile(path.join(output, "index.html"), fillTemplate(indexTemplate, rawIndexTokens));

const privacyTemplate = await readFile(path.join(source, "privacy.template.html"), "utf8");
await writeFile(path.join(output, "privacy.html"), fillTemplate(privacyTemplate));

await cp(path.join(source, "styles.css"), path.join(output, "styles.css"));
await cp(path.join(source, "app.js"), path.join(output, "app.js"));
await cp(path.join(source, "assets"), path.join(output, "assets"), { recursive: true });
await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true }).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
await cp(path.join(root, "data"), path.join(output, "data"), { recursive: true });

const version = {
  commitSha: process.env.GITHUB_SHA || "local",
  builtAt: new Date().toISOString(),
  contentUpdatedAt: data.meta.updatedAt
};
await writeFile(path.join(output, "version.json"), JSON.stringify(version, null, 2));
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", normalizedSiteUrl).href}\n`);
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(normalizedSiteUrl)}</loc></url><url><loc>${escapeHtml(new URL("privacy.html", normalizedSiteUrl).href)}</loc></url></urlset>\n`);

console.log(`Built WAG to ${output}`);
