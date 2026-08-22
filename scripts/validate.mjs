import { access, readFile } from "node:fs/promises";

const raw = await readFile(new URL("../data/site.json", import.meta.url), "utf8");
const data = JSON.parse(raw);
const errors = [];
const projects = Array.isArray(data.projects) ? data.projects : [];
const services = Array.isArray(data.services) ? data.services : [];
const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
const processSteps = Array.isArray(data.process) ? data.process : [];
const faqItems = Array.isArray(data.faq) ? data.faq : [];

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

if (!Array.isArray(data.projects)) errors.push("projects must be an array");
if (!Array.isArray(data.services)) errors.push("services must be an array");
if (!Array.isArray(data.capabilities)) errors.push("capabilities must be an array");
if (!Array.isArray(data.process)) errors.push("process must be an array");
if (!Array.isArray(data.faq)) errors.push("faq must be an array");

const fileExists = async (url) => {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
};

const ids = new Set();
for (const [index, project] of projects.entries()) {
  required(project.id, `projects[${index}].id`);
  required(project.title, `projects[${index}].title`);
  if (project.published) {
    required(project.summary, `projects[${index}].summary`);
    required(project.category, `projects[${index}].category`);
    required(project.year, `projects[${index}].year`);
    required(project.problem, `projects[${index}].problem`);
    required(project.solution, `projects[${index}].solution`);
    required(project.result, `projects[${index}].result`);
    required(project.imageAlt, `projects[${index}].imageAlt`);
  }
  if (project.id && !/^[a-z0-9][a-z0-9-]*$/.test(project.id)) errors.push(`projects[${index}].id must use lowercase letters, numbers, and hyphens only`);
  if (ids.has(project.id)) errors.push(`duplicate project id: ${project.id}`);
  ids.add(project.id);
  if (project.published && !project.image) errors.push(`projects[${index}].image is required when published`);
  if (project.featured && !project.published) errors.push(`projects[${index}] must be published before it can be featured`);
  if (project.published && (!Array.isArray(project.features) || project.features.length < 1 || project.features.some((feature) => typeof feature !== "string" || !feature.trim()))) {
    errors.push(`projects[${index}].features must be a non-empty string array`);
  }
  if (project.image) {
    if (project.image.startsWith("assets/")) {
      const safeLocalPath = /^assets\/[a-zA-Z0-9_./-]+$/.test(project.image) && !project.image.includes("..");
      if (!safeLocalPath) {
        errors.push(`projects[${index}].image must be a safe assets path`);
      } else {
        const inSource = await fileExists(new URL(`../src/${project.image}`, import.meta.url));
        const inManagedAssets = await fileExists(new URL(`../${project.image}`, import.meta.url));
        if (!inSource && !inManagedAssets) errors.push(`projects[${index}].image file does not exist: ${project.image}`);
      }
    } else {
      try {
        const imageUrl = new URL(project.image);
        if (imageUrl.protocol !== "https:") throw new Error();
      } catch {
        errors.push(`projects[${index}].image must be a safe assets path or HTTPS URL`);
      }
    }
  }
  if (project.url) {
    try {
      const url = new URL(project.url);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      errors.push(`projects[${index}].url must be empty or a valid HTTPS URL`);
    }
  }
}

if (!projects.some((project) => project.published)) errors.push("at least one published project is required");

const serviceIds = new Set();
for (const [index, service] of services.entries()) {
  required(service.id, `services[${index}].id`);
  required(service.number, `services[${index}].number`);
  required(service.title, `services[${index}].title`);
  required(service.subtitle, `services[${index}].subtitle`);
  required(service.description, `services[${index}].description`);
  if (service.id && !/^[a-z0-9][a-z0-9-]*$/.test(service.id)) errors.push(`services[${index}].id must use lowercase letters, numbers, and hyphens only`);
  if (serviceIds.has(service.id)) errors.push(`duplicate service id: ${service.id}`);
  serviceIds.add(service.id);
  if (!Array.isArray(service.items) || service.items.length < 1 || service.items.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`services[${index}].items must be a non-empty string array`);
  }
}

if (services.length < 1) errors.push("at least one service is required");
if (capabilities.length < 1 || capabilities.some((item) => typeof item !== "string" || !item.trim())) errors.push("capabilities must be a non-empty string array");
if (processSteps.length < 1) errors.push("at least one process step is required");
processSteps.forEach((step, index) => {
  required(step.number, `process[${index}].number`);
  required(step.title, `process[${index}].title`);
  required(step.description, `process[${index}].description`);
});
if (faqItems.length < 1) errors.push("at least one FAQ item is required");
faqItems.forEach((item, index) => {
  required(item.question, `faq[${index}].question`);
  required(item.answer, `faq[${index}].answer`);
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWAG content validation passed");
