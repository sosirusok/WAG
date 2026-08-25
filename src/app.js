const root = document.documentElement;
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

let reducedMotion = motionQuery.matches;
let saveData = Boolean(connection?.saveData);

const motionAllowed = () => !reducedMotion && !saveData && !document.hidden;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const onMediaChange = (query, callback) => {
  if (typeof query.addEventListener === "function") query.addEventListener("change", callback);
  else query.addListener?.(callback);
};

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

root.classList.add("motion-ready");

const sparkLayer = document.createElement("div");
sparkLayer.className = "motion-sparks";
sparkLayer.setAttribute("aria-hidden", "true");
const sparkPositions = [
  [7, 82, -3.2, 12.4], [14, 32, -8.7, 10.8], [23, 68, -1.4, 14.1], [31, 16, -6.1, 11.6],
  [42, 88, -11.2, 13.5], [51, 47, -4.4, 9.8], [59, 74, -9.5, 12.9], [67, 22, -2.3, 10.4],
  [74, 91, -7.6, 14.6], [81, 56, -12.1, 11.2], [88, 27, -5.2, 13.8], [94, 76, -9.1, 10.1]
];
sparkPositions.forEach(([x, y, delay, duration]) => {
  const spark = document.createElement("i");
  spark.style.setProperty("--spark-x", `${x}vw`);
  spark.style.setProperty("--spark-y", `${y}vh`);
  spark.style.setProperty("--spark-delay", `${delay}s`);
  spark.style.setProperty("--spark-duration", `${duration}s`);
  sparkLayer.append(spark);
});
document.body.append(sparkLayer);

const revealItems = [...document.querySelectorAll("[data-reveal]")];
const hiddenRevealItems = new Set(revealItems);

const reveal = (item) => {
  if (!item || !hiddenRevealItems.has(item)) return;
  item.classList.add("is-visible");
  hiddenRevealItems.delete(item);
};

revealItems.forEach((item, index) => {
  item.style.setProperty("--reveal-order", String(index % 6));
});

const revealNearby = (margin = 120) => {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  hiddenRevealItems.forEach((item) => {
    const bounds = item.getBoundingClientRect();
    if (bounds.top <= viewportHeight + margin && bounds.bottom >= -margin) reveal(item);
  });
};

let revealObserver;
if (reducedMotion || saveData || !("IntersectionObserver" in window)) {
  revealItems.forEach(reveal);
} else {
  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -5%" });
  revealItems.forEach((item) => revealObserver.observe(item));
  window.setTimeout(() => revealNearby(window.innerHeight * 0.35), 1400);
  window.setTimeout(() => hiddenRevealItems.forEach(reveal), 5000);
}

const logoItems = [...document.querySelectorAll("[data-wordmark], .hero-logo, .brand")];
logoItems.forEach((item) => item.classList.add("is-logo-ready"));

const showLogos = () => {
  logoItems.forEach((item) => item.classList.add("is-logo-visible"));
  root.classList.add("is-intro-visible");
};

const logoImages = logoItems.flatMap((item) => [...item.querySelectorAll("img")]);
const logoDecode = Promise.allSettled(logoImages.map((image) => {
  if (image.complete) return image.decode?.() || Promise.resolve();
  return image.decode?.() || new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}));

if (reducedMotion || saveData) showLogos();
else {
  Promise.race([
    logoDecode,
    new Promise((resolve) => window.setTimeout(resolve, 650))
  ]).finally(() => window.requestAnimationFrame(() => window.requestAnimationFrame(showLogos)));
  window.setTimeout(showLogos, 1200);
}

const shutterItems = [...document.querySelectorAll("[data-shutter]")];
const flashItems = [...document.querySelectorAll("[data-flash]")];
const marqueeItems = [...document.querySelectorAll("[data-marquee]")];
const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
const heroMotionItems = [...document.querySelectorAll("[data-impact-hero]")];
const wordmarkMotionItems = [...document.querySelectorAll("[data-wordmark], .hero-logo")];
const impactTitleItems = [...document.querySelectorAll("[data-impact-title]")];
const activeParallax = new Set();
const flashTimers = new WeakMap();

shutterItems.forEach((item) => item.classList.add("is-shutter-ready"));
flashItems.forEach((item) => item.classList.add("is-flash-ready"));
marqueeItems.forEach((item) => item.classList.add("is-marquee-ready"));
parallaxItems.forEach((item) => item.classList.add("is-parallax-ready"));

const finishShutter = (item) => {
  item.classList.add("is-shutter-open", "is-revealed");
};

const playFlash = (item) => {
  if (item.classList.contains("is-flash-done")) return;
  item.classList.add("is-flash-active");
  const finish = () => {
    window.clearTimeout(flashTimers.get(item));
    item.classList.remove("is-flash-active");
    item.classList.add("is-flash-done");
  };
  item.addEventListener("animationend", finish, { once: true });
  flashTimers.set(item, window.setTimeout(finish, 1100));
};

const setMarqueeState = (item, inView) => {
  const running = inView && motionAllowed();
  item.classList.toggle("is-marquee-active", running);
  item.style.setProperty("--motion-play-state", running ? "running" : "paused");
};

const setInfiniteAnimationState = (item, running) => {
  item.getAnimations?.({ subtree: true }).forEach((animation) => {
    if (animation.effect?.getTiming().iterations !== Infinity) return;
    if (running) animation.play();
    else animation.pause();
  });
};

if (reducedMotion || saveData) {
  shutterItems.forEach(finishShutter);
  flashItems.forEach((item) => item.classList.add("is-flash-done"));
  marqueeItems.forEach((item) => setMarqueeState(item, false));
  parallaxItems.forEach((item) => {
    item.style.setProperty("--parallax-y", "0px");
    item.style.setProperty("--parallax-progress", "0");
  });
} else if ("IntersectionObserver" in window) {
  const effectObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const item = entry.target;
      if (entry.isIntersecting) {
        if (item.matches("[data-shutter]")) finishShutter(item);
        if (item.matches("[data-flash]")) playFlash(item);
        if (item.matches("[data-parallax]")) activeParallax.add(item);
      } else if (item.matches("[data-parallax]")) {
        activeParallax.delete(item);
      }
      if (item.matches("[data-marquee]")) setMarqueeState(item, entry.isIntersecting);
      item.classList.toggle("is-motion-inview", entry.isIntersecting);
      setInfiniteAnimationState(item, entry.isIntersecting && motionAllowed());
    });
  }, { threshold: 0.06, rootMargin: "12% 0px 12%" });
  [...new Set([
    ...shutterItems,
    ...flashItems,
    ...marqueeItems,
    ...parallaxItems,
    ...heroMotionItems,
    ...wordmarkMotionItems,
    ...impactTitleItems
  ])]
    .forEach((item) => effectObserver.observe(item));
} else {
  shutterItems.forEach(finishShutter);
  flashItems.forEach(playFlash);
  marqueeItems.forEach((item) => setMarqueeState(item, true));
  parallaxItems.forEach((item) => activeParallax.add(item));
}

const header = document.querySelector("[data-header]");
const impactHero = document.querySelector("[data-impact-hero]");
const wordmark = document.querySelector("[data-wordmark], .hero-logo");
let scrollFrame = 0;

const paintParallax = () => {
  if (!motionAllowed()) {
    parallaxItems.forEach((item) => {
      item.style.setProperty("--parallax-y", "0px");
      item.style.setProperty("--parallax-progress", "0");
    });
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  activeParallax.forEach((item) => {
    const bounds = item.getBoundingClientRect();
    const progress = clamp((viewportHeight * 0.5 - (bounds.top + bounds.height * 0.5)) / viewportHeight, -1, 1);
    const requestedAmount = Number.parseFloat(item.dataset.parallaxAmount || "34");
    const amount = clamp(Number.isFinite(requestedAmount) ? requestedAmount : 34, 8, 80);
    item.style.setProperty("--parallax-y", `${(progress * amount).toFixed(2)}px`);
    item.style.setProperty("--parallax-progress", progress.toFixed(4));
  });
};

const paintScroll = () => {
  const scrollTop = window.scrollY;
  header?.classList.toggle("is-scrolled", scrollTop > 18);
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty("--scroll-progress", String(distance > 0 ? clamp(scrollTop / distance, 0, 1) : 0));

  if (impactHero) {
    const heroProgress = clamp(scrollTop / Math.max(1, impactHero.offsetHeight), 0, 1);
    root.style.setProperty("--hero-scroll", String(heroProgress));
    root.style.setProperty("--hero-shift", `${motionAllowed() ? heroProgress * 30 : 0}px`);
  }

  revealNearby();
  paintParallax();
  scrollFrame = 0;
};

const requestScrollPaint = () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintScroll);
};

paintScroll();
window.addEventListener("scroll", requestScrollPaint, { passive: true });
window.addEventListener("resize", requestScrollPaint, { passive: true });
window.addEventListener("load", () => {
  revealNearby(window.innerHeight * 0.35);
  requestScrollPaint();
}, { once: true });

let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;

const paintPointer = () => {
  wordmark?.style.setProperty("--wordmark-x", `${pointerX}px`);
  wordmark?.style.setProperty("--wordmark-y", `${pointerY}px`);
  pointerFrame = 0;
};

impactHero?.addEventListener("pointermove", (event) => {
  if (!motionAllowed() || event.pointerType === "touch") return;
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

const mobileMenus = [...document.querySelectorAll("details.mobile-menu")];
let keyboardNavigation = false;

document.addEventListener("pointerdown", () => {
  keyboardNavigation = false;
}, { passive: true });
document.addEventListener("keydown", (event) => {
  if (["Tab", "Enter", " "].includes(event.key)) keyboardNavigation = true;
});

const menuFocusable = (menu) => [...menu.querySelectorAll("nav a, nav button, nav input, nav textarea, nav select")];
const setMenuInert = (menu, inert) => {
  const nav = menu.querySelector("nav");
  if (!nav) return;
  if ("inert" in nav) nav.inert = inert;
  else {
    menuFocusable(menu).forEach((item) => {
      if (inert) {
        if (!item.hasAttribute("data-menu-tabindex")) item.dataset.menuTabindex = item.getAttribute("tabindex") ?? "";
        item.setAttribute("tabindex", "-1");
      } else if (item.hasAttribute("data-menu-tabindex")) {
        const previous = item.dataset.menuTabindex;
        if (previous) item.setAttribute("tabindex", previous);
        else item.removeAttribute("tabindex");
        delete item.dataset.menuTabindex;
      }
    });
  }
};

const closeMenu = (menu, restoreFocus = false) => {
  if (!menu.open) return;
  menu.open = false;
  const summary = menu.querySelector("summary");
  summary?.setAttribute("aria-expanded", "false");
  summary?.setAttribute("aria-label", "메뉴 열기");
  setMenuInert(menu, true);
  if (restoreFocus) summary?.focus({ preventScroll: true });
};

mobileMenus.forEach((menu) => {
  const summary = menu.querySelector("summary");
  const nav = menu.querySelector("nav");
  summary?.setAttribute("aria-expanded", String(menu.open));
  summary?.setAttribute("aria-label", menu.open ? "메뉴 닫기" : "메뉴 열기");
  setMenuInert(menu, !menu.open);

  menu.addEventListener("toggle", () => {
    if (menu.open) {
      mobileMenus.filter((item) => item !== menu).forEach((item) => closeMenu(item));
      summary?.setAttribute("aria-expanded", "true");
      summary?.setAttribute("aria-label", "메뉴 닫기");
      setMenuInert(menu, false);
      if (keyboardNavigation) window.requestAnimationFrame(() => nav?.querySelector("a")?.focus());
    } else {
      summary?.setAttribute("aria-expanded", "false");
      summary?.setAttribute("aria-label", "메뉴 열기");
      setMenuInert(menu, true);
    }
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu(menu);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openMenu = mobileMenus.find((menu) => menu.open);
  if (openMenu) {
    event.preventDefault();
    closeMenu(openMenu, true);
  }
});

document.addEventListener("pointerdown", (event) => {
  mobileMenus.filter((menu) => menu.open && !menu.contains(event.target)).forEach((menu) => closeMenu(menu));
}, { passive: true });

let menuResizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(menuResizeTimer);
  menuResizeTimer = window.setTimeout(() => mobileMenus.forEach((menu) => closeMenu(menu)), 120);
}, { passive: true });

const canvas = document.querySelector("[data-impact-canvas]");
let syncCanvasMotion = () => {};

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  if (context) {
    const readRgb = (name, fallback) => {
      const value = getComputedStyle(root).getPropertyValue(name).trim();
      const shortHex = value.match(/^#([\da-f])([\da-f])([\da-f])$/i);
      if (shortHex) return shortHex.slice(1).map((part) => Number.parseInt(part + part, 16));
      const hex = value.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i);
      if (hex) return hex.slice(1).map((part) => Number.parseInt(part, 16));
      const rgb = value.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
      return rgb ? rgb.slice(1).map(Number) : fallback;
    };

    const accent = readRgb("--accent", [210, 24, 38]);
    const ink = readRgb("--ink", [11, 11, 11]);
    const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    const contours = Array.from({ length: 10 }, (_, index) => ({
      phase: index * 0.69,
      speed: 0.00013 + (index % 4) * 0.000018,
      amplitude: 20 + (index % 5) * 8,
      offset: index / 9,
      width: index % 4 === 0 ? 1.35 : 0.75,
      accent: index === 2 || index === 7
    }));
    const pointer = { x: 0.5, y: 0.5, active: false };
    let canvasWidth = 1;
    let canvasHeight = 1;
    let canvasFrame = 0;
    let canvasInView = true;
    let lastCanvasPaint = -Infinity;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, saveData ? 1 : 1.5);
      canvasWidth = Math.max(1, Math.round(bounds.width));
      canvasHeight = Math.max(1, Math.round(bounds.height));
      canvas.width = Math.round(canvasWidth * ratio);
      canvas.height = Math.round(canvasHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawCanvas = (time = 0) => {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      const scan = ((time * 0.032) % (canvasWidth + 360)) - 180;
      const scanGradient = context.createLinearGradient(scan - 180, 0, scan + 180, 0);
      scanGradient.addColorStop(0, rgba(accent, 0));
      scanGradient.addColorStop(0.5, rgba(accent, 0.08));
      scanGradient.addColorStop(1, rgba(accent, 0));
      context.fillStyle = scanGradient;
      context.fillRect(scan - 180, 0, 360, canvasHeight);

      contours.forEach((contour, index) => {
        const baseY = canvasHeight * (0.16 + contour.offset * 0.7);
        const pull = pointer.active ? (pointer.y - 0.5) * 38 * Math.max(0, 1 - Math.abs(contour.offset - pointer.y)) : 0;
        context.beginPath();
        for (let step = 0; step <= 64; step += 1) {
          const progress = step / 64;
          const x = progress * canvasWidth;
          const wave = Math.sin(progress * 8.2 + contour.phase + time * contour.speed) * contour.amplitude;
          const cross = Math.cos(progress * 3.5 - contour.phase + time * contour.speed * 0.7) * 11;
          const localPull = pointer.active ? Math.max(0, 1 - Math.abs(progress - pointer.x) * 4) * pull : 0;
          const y = baseY + wave + cross + localPull;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = contour.accent
          ? rgba(accent, 0.19 + (index % 3) * 0.035)
          : rgba(ink, 0.06 + (index % 4) * 0.018);
        context.lineWidth = contour.width;
        context.stroke();
      });
    };

    const canvasShouldRun = () => motionAllowed() && canvasInView;
    const canvasTick = (time) => {
      canvasFrame = 0;
      if (!canvasShouldRun()) return;
      if (time - lastCanvasPaint >= 1000 / 30) {
        drawCanvas(time);
        lastCanvasPaint = time;
      }
      canvasFrame = window.requestAnimationFrame(canvasTick);
    };

    const syncCanvas = () => {
      if (canvasShouldRun()) {
        if (!canvasFrame) canvasFrame = window.requestAnimationFrame(canvasTick);
      } else {
        if (canvasFrame) window.cancelAnimationFrame(canvasFrame);
        canvasFrame = 0;
        pointer.active = false;
        if (!document.hidden) drawCanvas(0);
      }
    };
    syncCanvasMotion = syncCanvas;

    impactHero?.addEventListener("pointermove", (event) => {
      if (!motionAllowed() || event.pointerType === "touch") return;
      const bounds = impactHero.getBoundingClientRect();
      pointer.x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      pointer.y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      pointer.active = true;
    }, { passive: true });

    impactHero?.addEventListener("pointerleave", () => {
      pointer.active = false;
    }, { passive: true });

    if (impactHero && "IntersectionObserver" in window) {
      const canvasObserver = new IntersectionObserver(([entry]) => {
        canvasInView = Boolean(entry?.isIntersecting);
        syncCanvas();
      }, { threshold: 0.01, rootMargin: "8% 0px" });
      canvasObserver.observe(impactHero);
    } else if (impactHero) {
      const checkCanvasVisibility = () => {
        const bounds = impactHero.getBoundingClientRect();
        canvasInView = bounds.bottom > 0 && bounds.top < window.innerHeight;
        syncCanvas();
      };
      window.addEventListener("scroll", checkCanvasVisibility, { passive: true });
      window.addEventListener("resize", checkCanvasVisibility, { passive: true });
      checkCanvasVisibility();
    }

    const resizeAndPaintCanvas = () => {
      resizeCanvas();
      drawCanvas(lastCanvasPaint > 0 ? lastCanvasPaint : 0);
      syncCanvas();
    };

    if ("ResizeObserver" in window) new ResizeObserver(resizeAndPaintCanvas).observe(canvas);
    else window.addEventListener("resize", resizeAndPaintCanvas, { passive: true });

    resizeAndPaintCanvas();
  }
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
  let copyResetTimer = 0;

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

    if (summary) {
      summary.textContent = lines.join("\n");
      summary.setAttribute("aria-label", lines.join(", "));
    }
    briefBuilder.dispatchEvent(new CustomEvent("brief:update", { detail: { lines } }));
  };

  choiceButtons.forEach((button) => {
    if (!button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const group = button.dataset.briefGroup || "";
      const isSelected = button.getAttribute("aria-pressed") === "true";
      if (singleGroups.has(group)) {
        choiceButtons.filter((item) => item.dataset.briefGroup === group)
          .forEach((item) => item.setAttribute("aria-pressed", "false"));
      }
      button.setAttribute("aria-pressed", String(!isSelected));
      updateBrief();
    });
  });

  note?.addEventListener("input", updateBrief);
  schedule?.addEventListener("input", updateBrief);

  let queryType = "";
  try {
    queryType = new URLSearchParams(window.location.search).get("type") || "";
  } catch {}
  const queryChoice = queryType && choiceButtons.find((button) => button.dataset.briefKey === queryType);
  if (queryChoice) queryChoice.click();
  else updateBrief();

  const copyWithTextarea = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    Object.assign(textarea.style, {
      position: "fixed",
      top: "0",
      left: "-9999px",
      width: "1px",
      height: "1px",
      opacity: "0"
    });
    document.body.append(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try {
      copied = Boolean(document.execCommand?.("copy"));
    } catch {}
    textarea.remove();
    copyButton?.focus({ preventScroll: true });
    return copied;
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }
    return copyWithTextarea(text);
  };

  copyButton?.addEventListener("click", async () => {
    const copied = await copyText(summary?.textContent || "");
    window.clearTimeout(copyResetTimer);
    if (copied) {
      copyButton.textContent = "복사 완료";
      if (status) status.textContent = "카카오 대화창에 붙여 넣을 수 있습니다.";
      copyResetTimer = window.setTimeout(() => {
        copyButton.textContent = "내용 복사하기";
        if (status) status.textContent = "";
      }, 2200);
    } else if (status) {
      status.textContent = "문의 내용 영역을 선택해 직접 복사해 주세요.";
    }
  });
}

const syncMotionState = () => {
  reducedMotion = motionQuery.matches;
  saveData = Boolean(connection?.saveData);
  const running = motionAllowed();
  root.classList.toggle("prefers-reduced-motion", reducedMotion);
  root.classList.toggle("save-data", saveData);
  root.classList.toggle("motion-paused", !running);
  root.classList.toggle("motion-running", running);

  if (reducedMotion || saveData) {
    hiddenRevealItems.forEach(reveal);
    shutterItems.forEach(finishShutter);
    flashItems.forEach((item) => {
      item.classList.remove("is-flash-active");
      item.classList.add("is-flash-done");
    });
    parallaxItems.forEach((item) => item.style.setProperty("--parallax-y", "0px"));
  }

  marqueeItems.forEach((item) => {
    const inView = item.classList.contains("is-motion-inview");
    setMarqueeState(item, inView);
  });
  document.getAnimations?.().forEach((animation) => {
    if (animation.effect?.getTiming().iterations !== Infinity) return;
    const target = animation.effect?.target;
    const managed = target instanceof Element
      ? target.closest("[data-impact-hero], [data-marquee], [data-wordmark], .hero-logo")
      : null;
    if (running && (!managed || managed.classList.contains("is-motion-inview"))) animation.play();
    else animation.pause();
  });
  syncCanvasMotion();
  requestScrollPaint();
};

onMediaChange(motionQuery, syncMotionState);
connection?.addEventListener?.("change", syncMotionState);
document.addEventListener("visibilitychange", syncMotionState);
window.addEventListener("pageshow", syncMotionState);
window.addEventListener("pagehide", () => root.classList.add("motion-paused"));
syncMotionState();
