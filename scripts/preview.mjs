import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const valueAfter = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const host = valueAfter("--host", "0.0.0.0");
const port = Number(valueAfter("--port", process.env.PORT || "4173"));
const publicHost = valueAfter("--public-host", host === "0.0.0.0" ? "127.0.0.1" : host);
process.env.SITE_URL = `http://${publicHost}:${port}/`;
await import("./build.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

const safeTarget = async (requestUrl) => {
  const url = new URL(requestUrl || "/", "http://preview.local");
  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
  const target = path.resolve(root, `.${relative}`);
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) return null;
  try {
    if ((await stat(target)).isFile()) return target;
  } catch {}
  return null;
};

createServer(async (request, response) => {
  const target = await safeTarget(request.url);
  if (!target) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": contentTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(target).pipe(response);
}).listen(port, host, () => {
  console.log(`SWAG preview listening on ${host}:${port}`);
});
