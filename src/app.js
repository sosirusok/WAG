const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

root.classList.add("motion-ready");
const revealItems = [...document.querySelectorAll("[data-reveal]")];
revealItems.forEach((item, index) => item.style.setProperty("--reveal-order", String(index % 5)));

const revealEverything = () => revealItems.forEach((item) => item.classList.add("is-visible"));

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealEverything();
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -5%" });
  revealItems.forEach((item) => revealObserver.observe(item));
  window.setTimeout(() => {
    revealItems.forEach((item) => {
      if (item.getBoundingClientRect().top < window.innerHeight * 1.15) item.classList.add("is-visible");
    });
  }, 900);
}

window.addEventListener("load", () => {
  document.body.classList.add("is-loaded");
}, { once: true });
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => document.body.classList.add("is-loaded"));
});

const smoothWheelEnabled = !reducedMotion
  && window.matchMedia("(pointer: fine)").matches
  && window.matchMedia("(min-width: 901px)").matches;

if (smoothWheelEnabled) {
  root.classList.add("inertia-scroll");
  let currentY = window.scrollY;
  let targetY = currentY;
  let smoothFrame = 0;
  let steering = false;

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const stopSmoothWheel = () => {
    if (smoothFrame) window.cancelAnimationFrame(smoothFrame);
    smoothFrame = 0;
    steering = false;
    currentY = window.scrollY;
    targetY = currentY;
  };

  const animateSmoothWheel = () => {
    const distance = targetY - currentY;
    currentY += distance * .16;
    window.scrollTo(0, currentY);
    if (Math.abs(distance) > .45) {
      smoothFrame = window.requestAnimationFrame(animateSmoothWheel);
      return;
    }
    window.scrollTo(0, targetY);
    smoothFrame = 0;
    steering = false;
  };

  window.addEventListener("wheel", (event) => {
    const nativeScroll = event.target instanceof Element
      && event.target.closest(".film-window, textarea, select, input, [data-native-scroll]");
    if (event.ctrlKey || event.shiftKey || root.classList.contains("menu-open") || nativeScroll || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;
    if (!steering) {
      currentY = window.scrollY;
      targetY = currentY;
    }
    targetY = Math.max(0, Math.min(maxScroll(), targetY + event.deltaY * unit));
    steering = true;
    event.preventDefault();
    if (!smoothFrame) smoothFrame = window.requestAnimationFrame(animateSmoothWheel);
  }, { passive: false });

  window.addEventListener("scroll", () => {
    if (!steering) {
      currentY = window.scrollY;
      targetY = currentY;
    }
  }, { passive: true });
  window.addEventListener("resize", stopSmoothWheel, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) stopSmoothWheel();
  });
}

const header = document.querySelector("[data-header]");
const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
const processSection = document.querySelector(".process-editorial");
let scrollFrame = 0;

const paintScroll = () => {
  const scrollTop = window.scrollY;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? Math.min(1, Math.max(0, scrollTop / distance)) : 0;
  root.style.setProperty("--scroll-progress", String(progress));
  header?.classList.toggle("is-scrolled", scrollTop > 20);

  if (!reducedMotion) {
    const viewportCenter = window.innerHeight / 2;
    parallaxItems.forEach((item) => {
      const bounds = item.getBoundingClientRect();
      if (bounds.bottom < -200 || bounds.top > window.innerHeight + 200) return;
      const itemCenter = bounds.top + bounds.height / 2;
      const normalized = Math.max(-1, Math.min(1, (itemCenter - viewportCenter) / (window.innerHeight + bounds.height)));
      item.style.setProperty("--parallax-y", `${-5 - normalized * 5}%`);
    });
  }

  if (processSection) {
    const bounds = processSection.getBoundingClientRect();
    const travel = bounds.height + window.innerHeight * .2;
    const current = window.innerHeight * .72 - bounds.top;
    root.style.setProperty("--process-progress", String(Math.max(0, Math.min(1, current / travel))));
  }

  scrollFrame = 0;
};

const requestScrollPaint = () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintScroll);
};

paintScroll();
window.addEventListener("scroll", requestScrollPaint, { passive: true });
window.addEventListener("resize", requestScrollPaint, { passive: true });

const mobileMenu = document.querySelector(".mobile-menu");
const mobileMenuToggle = mobileMenu?.querySelector("summary");

const closeMobileMenu = ({ restoreFocus = false } = {}) => {
  if (!mobileMenu?.open) return;
  mobileMenu.open = false;
  if (restoreFocus) mobileMenuToggle?.focus();
};

const syncMobileMenu = () => {
  const open = Boolean(mobileMenu?.open);
  mobileMenuToggle?.setAttribute("aria-expanded", String(open));
  mobileMenuToggle?.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  root.classList.toggle("menu-open", open);
};

mobileMenu?.addEventListener("toggle", syncMobileMenu);
syncMobileMenu();

document.querySelectorAll(".mobile-menu nav a").forEach((link) => {
  link.addEventListener("click", () => closeMobileMenu());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileMenu({ restoreFocus: true });
});

window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) closeMobileMenu();
});

const impactHero = document.querySelector("[data-impact-hero]");
const heroPhoto = document.querySelector("[data-hero-photo]");
let pointerFrame = 0;
let heroX = 0;
let heroY = 0;

const paintHeroPointer = () => {
  heroPhoto?.style.setProperty("--hero-x", `${heroX}px`);
  heroPhoto?.style.setProperty("--hero-y", `${heroY}px`);
  pointerFrame = 0;
};

impactHero?.addEventListener("pointermove", (event) => {
  if (reducedMotion || event.pointerType === "touch") return;
  const bounds = impactHero.getBoundingClientRect();
  heroX = ((event.clientX - bounds.left) / bounds.width - .5) * -14;
  heroY = ((event.clientY - bounds.top) / bounds.height - .5) * -10;
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintHeroPointer);
}, { passive: true });

impactHero?.addEventListener("pointerleave", () => {
  heroX = 0;
  heroY = 0;
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintHeroPointer);
}, { passive: true });

const canvas = document.querySelector("[data-film-canvas]");

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  let canvasWidth = 1;
  let canvasHeight = 1;
  let animationFrame = 0;
  let heroVisible = true;

  const resizeCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = Math.max(1, Math.round(bounds.width));
    canvasHeight = Math.max(1, Math.round(bounds.height));
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawFilm = (time = 0) => {
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const travel = ((time * .05) % (canvasWidth + 500)) - 250;
    context.strokeStyle = "rgba(207,71,20,.28)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(travel, 0);
    context.lineTo(travel + 72, canvasHeight);
    context.stroke();

    context.strokeStyle = "rgba(255,255,255,.44)";
    context.beginPath();
    context.moveTo(travel + 10, 0);
    context.lineTo(travel + 82, canvasHeight);
    context.stroke();

    for (let row = 0; row < 5; row += 1) {
      const base = canvasHeight * (.18 + row * .16);
      const phase = time * (.00016 + row * .000018);
      context.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const x = canvasWidth * (step / 48);
        const y = base + Math.sin(step * .32 + phase + row) * (4 + row * 1.4);
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = row === 2 ? "rgba(207,71,20,.12)" : "rgba(17,17,15,.065)";
      context.lineWidth = row === 2 ? 1.2 : .7;
      context.stroke();
    }

    if (!reducedMotion && !document.hidden && heroVisible) animationFrame = window.requestAnimationFrame(drawFilm);
    else animationFrame = 0;
  };

  const syncFilm = () => {
    const shouldPlay = !reducedMotion && !document.hidden && heroVisible;
    if (shouldPlay && !animationFrame) animationFrame = window.requestAnimationFrame(drawFilm);
    if (!shouldPlay && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      syncFilm();
    }, { rootMargin: "100px 0px" }).observe(canvas);
  }

  document.addEventListener("visibilitychange", syncFilm);
  window.addEventListener("resize", () => {
    resizeCanvas();
    if (reducedMotion) drawFilm(0);
  }, { passive: true });

  resizeCanvas();
  if (reducedMotion) drawFilm(0);
  else animationFrame = window.requestAnimationFrame(drawFilm);
}

const filmWindow = document.querySelector("[data-drag-film]");

if (filmWindow) {
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let autoDirection = 1;
  let autoFrame = 0;
  let previousTime = 0;
  let resumeAt = 0;
  let filmVisible = true;

  const autoMove = (time = 0) => {
    const delta = Math.min(40, time - previousTime || 16);
    previousTime = time;
    const max = Math.max(0, filmWindow.scrollWidth - filmWindow.clientWidth);
    if (!reducedMotion && filmVisible && !dragging && time > resumeAt && max > 0) {
      filmWindow.scrollLeft += autoDirection * delta * .035;
      if (filmWindow.scrollLeft >= max - 2) autoDirection = -1;
      if (filmWindow.scrollLeft <= 2) autoDirection = 1;
    }
    autoFrame = window.requestAnimationFrame(autoMove);
  };

  filmWindow.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startScroll = filmWindow.scrollLeft;
    filmWindow.classList.add("is-dragging");
    filmWindow.setPointerCapture(event.pointerId);
  });

  filmWindow.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    filmWindow.scrollLeft = startScroll - (event.clientX - startX) * 1.15;
  });

  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    resumeAt = performance.now() + 1800;
    filmWindow.classList.remove("is-dragging");
    if (filmWindow.hasPointerCapture(event.pointerId)) filmWindow.releasePointerCapture(event.pointerId);
  };

  filmWindow.addEventListener("pointerup", stopDragging);
  filmWindow.addEventListener("pointercancel", stopDragging);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      filmVisible = entry.isIntersecting;
      filmWindow.classList.toggle("is-inview", entry.isIntersecting);
    }, { rootMargin: "160px 0px" }).observe(filmWindow);
  } else filmWindow.classList.add("is-inview");

  if (!reducedMotion) autoFrame = window.requestAnimationFrame(autoMove);
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(autoFrame), { once: true });
}

document.querySelectorAll("[data-route-expand]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (reducedMotion || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    const source = link.querySelector("figure");
    if (!source || typeof source.animate !== "function") return;

    event.preventDefault();
    const bounds = source.getBoundingClientRect();
    const layer = source.cloneNode(true);
    const overlay = document.createElement("div");
    overlay.className = "route-expand-overlay";
    layer.className = "route-expand-layer";
    Object.assign(layer.style, {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`
    });
    overlay.append(layer);
    document.body.append(overlay);
    link.classList.add("is-expanding-source");
    root.classList.add("route-leaving");

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 520,
      easing: "cubic-bezier(.22, 1, .36, 1)",
      fill: "forwards"
    });
    const expansion = layer.animate([
      { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, borderRadius: "0px" },
      { left: "0px", top: "0px", width: "100vw", height: "100svh", borderRadius: "0px" }
    ], {
      duration: 620,
      easing: "cubic-bezier(.22, 1, .36, 1)",
      fill: "forwards"
    });

    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.location.assign(destination.href);
    };
    expansion.finished.then(navigate).catch(navigate);
    window.setTimeout(navigate, 760);
  });
});

if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".magnetic").forEach((link) => {
    link.addEventListener("pointermove", (event) => {
      const bounds = link.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * .08;
      const y = (event.clientY - bounds.top - bounds.height / 2) * .12;
      link.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    link.addEventListener("pointerleave", () => {
      link.style.transform = "";
    });
  });
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
