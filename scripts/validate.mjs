import { readFile } from "node:fs/promises";

const raw = await readFile(new URL("../data/site.json", import.meta.url), "utf8");
const data = JSON.parse(raw);
const errors = [];

const required = (value, path) => {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`);
};

required(data?.meta?.title, "meta.title");
required(data?.meta?.description, "meta.description");
required(data?.brand?.name, "brand.name");
required(data?.brand?.headlineTop, "brand.headlineTop");
required(data?.contact?.owner, "contact.owner");
required(data?.contact?.phone, "contact.phone");

try {
  const kakao = new URL(data?.contact?.kakao);
  if (kakao.protocol !== "https:") errors.push("contact.kakao must use https");
} catch {
  errors.push("contact.kakao must be a valid URL");
}

const ids = new Set();
for (const [index, project] of (data.projects || []).entries()) {
  required(project.id, `projects[${index}].id`);
  required(project.title, `projects[${index}].title`);
  required(project.summary, `projects[${index}].summary`);
  if (ids.has(project.id)) errors.push(`duplicate project id: ${project.id}`);
  ids.add(project.id);
  if (project.url) {
    try {
      const url = new URL(project.url);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      errors.push(`projects[${index}].url must be empty or a valid http(s) URL`);
    }
  }
}

if (!Array.isArray(data.services) || data.services.length < 1) errors.push("at least one service is required");
if (!Array.isArray(data.process) || data.process.length < 1) errors.push("at least one process step is required");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("WAG content validation passed");
