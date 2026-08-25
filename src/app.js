const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

root.classList.add("motion-ready");
const revealItems = [...document.querySelectorAll("[data-reveal]")];
revealItems.forEach((item, index) => item.style.setProperty("--reveal-order", String(index % 6)));

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -6%" });
  revealItems.forEach((item) => revealObserver.observe(item));
}

const header = document.querySelector("[data-header]");
const impactHero = document.querySelector("[data-impact-hero]");
const wordmark = document.querySelector("[data-wordmark]");
let scrollFrame = 0;

const paintScroll = () => {
  const scrollTop = window.scrollY;
  header?.classList.toggle("is-scrolled", scrollTop > 18);
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty("--scroll-progress", String(distance > 0 ? Math.min(1, scrollTop / distance) : 0));
  if (impactHero) {
    const heroProgress = Math.min(1, scrollTop / Math.max(1, impactHero.offsetHeight));
    root.style.setProperty("--hero-scroll", String(heroProgress));
    root.style.setProperty("--hero-shift", `${heroProgress * 30}px`);
  }
  scrollFrame = 0;
};

const requestScrollPaint = () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintScroll);
};

paintScroll();
window.addEventListener("scroll", requestScrollPaint, { passive: true });
window.addEventListener("resize", requestScrollPaint, { passive: true });

document.querySelectorAll(".mobile-menu nav a").forEach((link) => {
  link.addEventListener("click", () => link.closest("details")?.removeAttribute("open"));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".mobile-menu[open]").forEach((menu) => menu.removeAttribute("open"));
});

let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;

const paintPointer = () => {
  wordmark?.style.setProperty("--wordmark-x", `${pointerX}px`);
  wordmark?.style.setProperty("--wordmark-y", `${pointerY}px`);
  pointerFrame = 0;
};

impactHero?.addEventListener("pointermove", (event) => {
  if (reducedMotion || event.pointerType === "touch") return;
  const bounds = impactHero.getBoundingClientRect();
  pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
  pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintPointer);
}, { passive: true });

impactHero?.addEventListener("pointerleave", () => {
  pointerX = 0;
  pointerY = 0;
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintPointer);
}, { passive: true });

const canvas = document.querySelector("[data-impact-canvas]");

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  const contours = Array.from({ length: 12 }, (_, index) => ({
    phase: index * 0.63,
    speed: 0.00012 + (index % 4) * 0.000018,
    amplitude: 22 + (index % 5) * 9,
    offset: index / 11,
    width: index % 4 === 0 ? 1.4 : 0.75,
    accent: index === 3 || index === 9
  }));
  let canvasWidth = 1;
  let canvasHeight = 1;
  let frame = 0;
  let active = true;
  const pointer = { x: 0.5, y: 0.5, active: false };

  const resizeCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = Math.max(1, Math.round(bounds.width));
    canvasHeight = Math.max(1, Math.round(bounds.height));
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawCanvas = (time = 0) => {
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const scan = ((time * 0.035) % (canvasWidth + 360)) - 180;
    const scanGradient = context.createLinearGradient(scan - 180, 0, scan + 180, 0);
    scanGradient.addColorStop(0, "rgba(201,52,0,0)");
    scanGradient.addColorStop(0.5, "rgba(201,52,0,0.075)");
    scanGradient.addColorStop(1, "rgba(201,52,0,0)");
    context.fillStyle = scanGradient;
    context.fillRect(scan - 180, 0, 360, canvasHeight);

    contours.forEach((contour, index) => {
      const baseY = canvasHeight * (0.15 + contour.offset * 0.72);
      const pull = pointer.active ? (pointer.y - 0.5) * 38 * Math.max(0, 1 - Math.abs(contour.offset - pointer.y)) : 0;
      context.beginPath();
      for (let step = 0; step <= 72; step += 1) {
        const progress = step / 72;
        const x = progress * canvasWidth;
        const wave = Math.sin(progress * 8.2 + contour.phase + time * contour.speed) * contour.amplitude;
        const cross = Math.cos(progress * 3.6 - contour.phase + time * contour.speed * 0.7) * 12;
        const localPull = pointer.active ? Math.max(0, 1 - Math.abs(progress - pointer.x) * 4) * pull : 0;
        const y = baseY + wave + cross + localPull;
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = contour.accent
        ? `rgba(201,52,0,${0.18 + (index % 3) * 0.035})`
        : `rgba(10,10,10,${0.065 + (index % 4) * 0.018})`;
      context.lineWidth = contour.width;
      context.stroke();
    });

    for (let column = 0; column < 7; column += 1) {
      const travel = (time * (0.018 + column * 0.0015) + column * 173) % (canvasWidth + 260) - 130;
      context.fillStyle = column % 3 === 0 ? "rgba(201,52,0,0.045)" : "rgba(0,0,0,0.025)";
      context.fillRect(travel, 0, column % 3 === 0 ? 2 : 1, canvasHeight);
    }

    if (!reducedMotion && active) frame = window.requestAnimationFrame(drawCanvas);
  };

  impactHero?.addEventListener("pointermove", (event) => {
    const bounds = impactHero.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = (event.clientY - bounds.top) / bounds.height;
    pointer.active = event.pointerType !== "touch";
  }, { passive: true });

  impactHero?.addEventListener("pointerleave", () => {
    pointer.active = false;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    active = !document.hidden;
    if (active && !reducedMotion && !frame) frame = window.requestAnimationFrame(drawCanvas);
    if (!active && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (reducedMotion) drawCanvas(0);
  }, { passive: true });

  resizeCanvas();
  if (reducedMotion) drawCanvas(0);
  else frame = window.requestAnimationFrame(drawCanvas);
}

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
  if (queryType) choiceButtons.find((button) => button.dataset.briefKey === queryType)?.click();
  else updateBrief();

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summary.textContent);
      copyButton.textContent = "복사 완료";
      status.textContent = "카카오 대화창에 붙여 넣을 수 있습니다.";
      window.setTimeout(() => {
        copyButton.textContent = "내용 복사하기";
        status.textContent = "";
      }, 2200);
    } catch {
      status.textContent = "내용을 직접 선택해 복사해 주세요.";
    }
  });
}
