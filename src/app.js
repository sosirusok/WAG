const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

root.classList.add("motion-ready");
const revealItems = [...document.querySelectorAll("[data-reveal]")];

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
  revealItems.forEach((item) => revealObserver.observe(item));
}

const header = document.querySelector("[data-header]");
const updateScroll = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty("--scroll-progress", String(distance > 0 ? Math.min(1, window.scrollY / distance) : 0));
};
updateScroll();
window.addEventListener("scroll", updateScroll, { passive: true });

const hero = document.querySelector(".hero");
const heroStage = document.querySelector(".hero-stage");
let pointerFrame = 0;
let pointerX = 50;
let pointerY = 40;

const paintPointer = () => {
  if (heroStage && !reducedMotion) {
    heroStage.style.setProperty("--stage-x", `${(pointerX - 50) * 0.035}px`);
    heroStage.style.setProperty("--stage-y", `${(pointerY - 50) * 0.035}px`);
  }
  pointerFrame = 0;
};

hero?.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const bounds = hero.getBoundingClientRect();
  pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
  pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintPointer);
}, { passive: true });

document.querySelectorAll(".mobile-menu nav a").forEach((link) => {
  link.addEventListener("click", () => link.closest("details")?.removeAttribute("open"));
});

const briefBuilder = document.querySelector("[data-brief-builder]");

if (briefBuilder) {
  const choiceButtons = [...briefBuilder.querySelectorAll("[data-brief-choice]")];
  const note = briefBuilder.querySelector("[data-brief-note]");
  const schedule = briefBuilder.querySelector("[data-brief-schedule]");
  const summary = briefBuilder.querySelector("[data-brief-summary]");
  const copyButton = briefBuilder.querySelector("[data-brief-copy]");
  const status = briefBuilder.querySelector("[data-brief-status]");
  const singleGroups = new Set(["제작 종류", "준비 상태"]);

  const updateBrief = () => {
    const selected = new Map();
    choiceButtons.filter((button) => button.getAttribute("aria-pressed") === "true").forEach((button) => {
      const group = button.dataset.briefGroup || "";
      const values = selected.get(group) || [];
      values.push(button.dataset.briefValue || button.textContent.trim());
      selected.set(group, values);
    });

    const lines = ["[SWAG 제작 문의]"];
    lines.push(`제작 종류: ${selected.get("제작 종류")?.join(", ") || "선택 전"}`);
    lines.push(`필요 기능: ${selected.get("필요 기능")?.join(", ") || "선택 전"}`);
    lines.push(`준비 상태: ${selected.get("준비 상태")?.join(", ") || "선택 전"}`);
    if (note?.value.trim()) lines.push(`요청 내용: ${note.value.trim()}`);
    if (schedule?.value.trim()) lines.push(`희망 시기: ${schedule.value.trim()}`);
    summary.textContent = lines.join("\n");
  };

  choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.briefGroup || "";
      const isSelected = button.getAttribute("aria-pressed") === "true";
      if (singleGroups.has(group)) {
        choiceButtons.filter((item) => item.dataset.briefGroup === group).forEach((item) => item.setAttribute("aria-pressed", "false"));
      }
      button.setAttribute("aria-pressed", String(!isSelected));
      updateBrief();
    });
  });

  note?.addEventListener("input", updateBrief);
  schedule?.addEventListener("input", updateBrief);

  const queryType = new URLSearchParams(window.location.search).get("type");
  if (queryType) {
    const matched = choiceButtons.find((button) => button.dataset.briefKey === queryType);
    matched?.click();
  } else {
    updateBrief();
  }

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summary.textContent);
      copyButton.textContent = "복사했습니다";
      status.textContent = "카카오 대화창에 붙여 넣으면 됩니다.";
      window.setTimeout(() => {
        copyButton.textContent = "내용 복사하기";
        status.textContent = "";
      }, 2200);
    } catch {
      status.textContent = "복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요.";
    }
  });
}
