(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setMenu = (open) => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const revealElements = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealElements.forEach((element) => observer.observe(element));
  }

  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      document.querySelectorAll(".faq-item[open]").forEach((other) => {
        if (other !== item) other.removeAttribute("open");
      });
    });
  });

  const dialog = document.querySelector("[data-project-dialog]");
  const closeDialog = document.querySelector("[data-dialog-close]");
  const projects = Array.isArray(window.__WAG_PROJECTS__) ? window.__WAG_PROJECTS__ : [];
  const fields = {
    category: dialog?.querySelector("[data-dialog-category]"),
    title: dialog?.querySelector("[data-dialog-title]"),
    summary: dialog?.querySelector("[data-dialog-summary]"),
    problem: dialog?.querySelector("[data-dialog-problem]"),
    solution: dialog?.querySelector("[data-dialog-solution]"),
    result: dialog?.querySelector("[data-dialog-result]"),
    tags: dialog?.querySelector("[data-dialog-tags]"),
    link: dialog?.querySelector("[data-dialog-link]")
  };

  const setText = (element, value) => {
    if (element) element.textContent = value || "";
  };

  const validHttpUrl = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  document.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = projects.find((item) => item.id === button.dataset.projectId);
      if (!project || !dialog) return;
      setText(fields.category, `${project.category || "PROJECT"} / ${project.year || ""}`);
      setText(fields.title, project.title);
      setText(fields.summary, project.summary);
      setText(fields.problem, project.problem);
      setText(fields.solution, project.solution);
      setText(fields.result, project.result);
      if (fields.tags) {
        fields.tags.replaceChildren(...(project.features || []).map((tag) => {
          const span = document.createElement("span");
          span.textContent = tag;
          return span;
        }));
      }
      const href = validHttpUrl(project.url);
      if (fields.link) {
        fields.link.hidden = !href;
        fields.link.href = href || "#";
      }
      dialog.showModal();
      document.body.classList.add("dialog-open");
    });
  });

  const dismissDialog = () => {
    dialog?.close();
    document.body.classList.remove("dialog-open");
  };
  closeDialog?.addEventListener("click", dismissDialog);
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dismissDialog();
  });
  dialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
