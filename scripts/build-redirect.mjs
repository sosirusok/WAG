/* 옛 주소(GitHub Pages)를 새 주소로 넘기는 페이지만 만든다.

   GitHub Pages 는 정적 호스팅이라 서버에서 301 을 줄 수 없다. 그래서 경로마다
   아주 작은 HTML 을 두고 세 가지를 함께 건다.

     canonical      검색엔진이 새 주소로 신호를 몰아주게 한다
     meta refresh   자바스크립트가 꺼져 있어도 넘어간다
     location.replace  가장 빠르고, 뒤로 가기에 옛 주소가 남지 않는다

   404.html 은 위 목록에 없는 경로까지 받아서 같은 경로로 넘긴다.
   그래서 예전에 공유된 링크가 어떤 형태든 새 주소의 같은 자리로 도착한다. */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist-redirect");

const TARGET = process.env.REDIRECT_TARGET || "https://swagstudio.pages.dev/";
const OLD_BASE = process.env.REDIRECT_OLD_BASE || "/WAG/";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

/* 옛 경로 -> 새 주소에서의 같은 자리 */
const routes = [
  ["index.html", ""],
  ["services/index.html", "services/"],
  ["work/index.html", "work/"],
  ["process/index.html", "process/"],
  ["about/index.html", "about/"],
  ["contact/index.html", "contact/"],
  ["privacy.html", "privacy.html"]
];

const shell = (destination, body, head = "") => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SWAG — 새 주소로 이동합니다</title>
<link rel="canonical" href="${escapeHtml(destination)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(destination)}">
<link rel="icon" href="${escapeHtml(new URL("assets/favicon.svg", TARGET).href)}" type="image/svg+xml">
<style>
  html { background: #0a1122; color-scheme: dark; }
  body {
    margin: 0; min-height: 100svh;
    display: grid; place-content: center; gap: 14px;
    padding: 32px; text-align: center;
    font-family: system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
    font-size: 17px; line-height: 1.7; color: #e2eaff;
  }
  strong { font-size: 21px; font-weight: 800; }
  a { color: #7ff0b6; }
</style>
${head}</head>
<body>
${body}
</body>
</html>
`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const [file, suffix] of routes) {
  const destination = new URL(suffix, TARGET).href;
  const html = shell(
    destination,
    `<strong>SWAG는 새 주소로 옮겼습니다.</strong>
<p>잠시 뒤 자동으로 이동합니다. 바로 가려면 아래를 눌러 주세요.</p>
<p><a href="${escapeHtml(destination)}">${escapeHtml(destination)}</a></p>`,
    `<script>location.replace(${JSON.stringify(destination)})</script>\n`
  );
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

/* 목록에 없는 경로까지 같은 자리로 넘긴다 */
const fallbackScript = `<script>
(function () {
  var base = ${JSON.stringify(OLD_BASE)};
  var rest = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : "";
  location.replace(${JSON.stringify(TARGET)} + rest + location.search + location.hash);
})();
</script>
`;

await writeFile(path.join(output, "404.html"), shell(
  TARGET,
  `<strong>SWAG는 새 주소로 옮겼습니다.</strong>
<p>잠시 뒤 자동으로 이동합니다. 바로 가려면 아래를 눌러 주세요.</p>
<p><a href="${escapeHtml(TARGET)}">${escapeHtml(TARGET)}</a></p>`,
  fallbackScript
));

await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Built ${routes.length + 1} redirect pages -> ${TARGET}`);
