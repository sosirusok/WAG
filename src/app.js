const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

/* ------------------------------------------------------ reveal on scroll */

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

/* ----------------------------------------------------- inertia wheel scroll */

const smoothWheelEnabled = !reducedMotion
  && finePointer
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

/* --------------------------------------- scroll progress, parallax, header */

const header = document.querySelector("[data-header]");
const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
const processSection = document.querySelector(".process-editorial");
let scrollFrame = 0;
let previousScrollY = window.scrollY;
let scrollVelocity = 0;
let headerIdleTimer = 0;

const paintScroll = () => {
  const scrollTop = window.scrollY;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? Math.min(1, Math.max(0, scrollTop / distance)) : 0;
  root.style.setProperty("--scroll-progress", String(progress));
  header?.classList.toggle("is-scrolled", scrollTop > 20);

  const rawVelocity = scrollTop - previousScrollY;
  previousScrollY = scrollTop;
  scrollVelocity += (rawVelocity - scrollVelocity) * .28;
  if (!reducedMotion) {
    const clamped = Math.max(-40, Math.min(40, scrollVelocity));
    root.style.setProperty("--scroll-velocity", clamped.toFixed(2));
    root.style.setProperty("--scroll-skew", `${(clamped * .045).toFixed(3)}deg`);
    root.style.setProperty("--scroll-stretch", String(1 + Math.min(.05, Math.abs(clamped) * .0012)));

    // 아래로 빠르게 내릴 때만 헤더를 감추고, 멈추거나 올리면 반드시 되돌린다
    if (header && !root.classList.contains("menu-open")) {
      if (scrollTop > 260 && rawVelocity > 6) header.classList.add("is-hidden");
      else if (rawVelocity < -2 || scrollTop < 200) header.classList.remove("is-hidden");
      window.clearTimeout(headerIdleTimer);
      headerIdleTimer = window.setTimeout(() => header.classList.remove("is-hidden"), 420);
    }
  }

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

/* ------------------------------------------------------------ mobile menu */

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
mobileMenuToggle?.addEventListener("click", (event) => {
  // details toggles asynchronously; flip it ourselves so aria state updates in the same task
  event.preventDefault();
  mobileMenu.open = !mobileMenu.open;
  syncMobileMenu();
});
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

/* -------------------------------------------------- hero pointer parallax */

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

/* ------------------------------------------------ hero particle constellation */

const canvas = document.querySelector("[data-film-canvas]");

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  let canvasWidth = 1;
  let canvasHeight = 1;
  let animationFrame = 0;
  let heroVisible = true;
  let particles = [];

  const seedParticles = () => {
    // 연결선 계산은 입자 수의 제곱에 비례하므로 개수를 줄이는 게 가장 효과가 크다
    const count = Math.max(16, Math.min(30, Math.round(canvasWidth / 54)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - .5) * .22,
      vy: (Math.random() - .5) * .18,
      radius: 1.1 + Math.random() * 1.9,
      green: index % 4 === 0
    }));
  };

  const resizeCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    // 배경 장식이므로 1x 로 그린다. 1.5x 대비 픽셀 수가 절반 이하로 줄어든다.
    const ratio = 1;
    canvasWidth = Math.max(1, Math.round(bounds.width));
    canvasHeight = Math.max(1, Math.round(bounds.height));
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedParticles();
  };

  let lastDraw = 0;

  const drawFilm = (now = 0) => {
    // 느리게 떠다니는 배경 장식이므로 20fps 로 충분하다.
    if (now - lastDraw < 48) {
      if (!reducedMotion && !document.hidden && heroVisible) animationFrame = window.requestAnimationFrame(drawFilm);
      else animationFrame = 0;
      return;
    }
    lastDraw = now;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const linkDistance = Math.min(130, canvasWidth * .1 + 60);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < -20) particle.x = canvasWidth + 20;
      if (particle.x > canvasWidth + 20) particle.x = -20;
      if (particle.y < -20) particle.y = canvasHeight + 20;
      if (particle.y > canvasHeight + 20) particle.y = -20;
    });

    // 선을 하나씩 stroke() 하면 호출 수가 수백 번이 된다.
    // 진하기별로 3개 묶음에 모아 한 번씩만 그린다 (보이는 결과는 같다).
    context.lineWidth = 1;
    const buckets = [[], [], [], [], [], []];
    for (let first = 0; first < particles.length; first += 1) {
      const a = particles[first];
      for (let second = first + 1; second < particles.length; second += 1) {
        const b = particles[second];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > linkDistance || Math.abs(dy) > linkDistance) continue;
        const distance = Math.hypot(dx, dy);
        if (distance > linkDistance) continue;
        const strength = 1 - distance / linkDistance;
        const tier = strength > .66 ? 0 : strength > .33 ? 1 : 2;
        buckets[(a.green || b.green ? 3 : 0) + tier].push(a, b);
      }
    }

    const tierAlpha = [.22, .13, .06];
    buckets.forEach((points, index) => {
      if (!points.length) return;
      context.strokeStyle = index < 3
        ? `rgba(150, 180, 255, ${tierAlpha[index]})`
        : `rgba(120, 240, 180, ${tierAlpha[index - 3]})`;
      context.beginPath();
      for (let i = 0; i < points.length; i += 2) {
        context.moveTo(points[i].x, points[i].y);
        context.lineTo(points[i + 1].x, points[i + 1].y);
      }
      context.stroke();
    });

    [false, true].forEach((green) => {
      context.fillStyle = green ? "rgba(120, 240, 180, .6)" : "rgba(160, 190, 255, .5)";
      context.beginPath();
      particles.forEach((particle) => {
        if (particle.green !== green) return;
        context.moveTo(particle.x + particle.radius, particle.y);
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      });
      context.fill();
    });

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
    if (reducedMotion) drawFilm();
  }, { passive: true });

  resizeCanvas();
  if (reducedMotion) drawFilm();
  else animationFrame = window.requestAnimationFrame(drawFilm);
}

/* ------------------------------------------------------ headline rotator */

const rotator = document.querySelector("[data-rotator]");

if (rotator) {
  let words = [];
  try {
    words = JSON.parse(rotator.dataset.rotatorWords || "[]");
  } catch {
    words = [];
  }
  if (words.length > 1 && !reducedMotion) {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;";
    probe.className = rotator.className;
    rotator.parentElement?.append(probe);
    let widest = 0;
    words.forEach((word) => {
      probe.textContent = word;
      widest = Math.max(widest, probe.offsetWidth);
    });
    probe.remove();
    if (widest) rotator.style.minWidth = `${Math.ceil(widest) + 2}px`;

    let index = 0;
    window.setInterval(() => {
      if (document.hidden) return;
      rotator.classList.add("is-out");
      window.setTimeout(() => {
        index = (index + 1) % words.length;
        rotator.textContent = words[index];
        rotator.classList.remove("is-out");
        rotator.classList.add("is-in");
        window.setTimeout(() => rotator.classList.remove("is-in"), 460);
      }, 260);
    }, 2600);
  }
}

/* ------------------------------------------------------------- count up */

const countItems = [...document.querySelectorAll("[data-count]")];

if (countItems.length) {
  const animateCount = (item) => {
    const target = Number(item.dataset.count) || 0;
    if (reducedMotion) {
      item.textContent = String(target);
      return;
    }
    const start = performance.now();
    const duration = 1300;
    const step = (now) => {
      const linear = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - linear, 3);
      item.textContent = String(Math.round(target * eased));
      if (linear < 1) window.requestAnimationFrame(step);
      else item.textContent = String(target);
    };
    window.requestAnimationFrame(step);
  };

  if ("IntersectionObserver" in window && !reducedMotion) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    countItems.forEach((item) => countObserver.observe(item));
  } else {
    countItems.forEach(animateCount);
  }
}

/* ------------------------------------------------------------ card tilt */

if (!reducedMotion && finePointer) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    let tiltFrame = 0;
    let rx = 0;
    let ry = 0;

    const paintTilt = () => {
      card.style.setProperty("--tilt-x", `${rx}deg`);
      card.style.setProperty("--tilt-y", `${ry}deg`);
      tiltFrame = 0;
    };

    card.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = card.getBoundingClientRect();
      ry = ((event.clientX - bounds.left) / bounds.width - .5) * 7;
      rx = ((event.clientY - bounds.top) / bounds.height - .5) * -6;
      if (!tiltFrame) tiltFrame = window.requestAnimationFrame(paintTilt);
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      rx = 0;
      ry = 0;
      if (!tiltFrame) tiltFrame = window.requestAnimationFrame(paintTilt);
    }, { passive: true });
  });
}

/* --------------------------------------------- three opposing marquee rows */

const motionStage = document.querySelector("[data-motion-stage]");

if (motionStage) {
  const motionRibbon = motionStage.closest(".motion-ribbon");
  const motionRows = [...motionStage.querySelectorAll("[data-motion-row]")].map((row) => {
    const track = row.querySelector(".motion-track");
    const leadSet = row.querySelector("[data-motion-set]");
    if (!track || !leadSet) return null;
    return {
      row,
      track,
      leadSet,
      speed: Number(row.dataset.speed) || 0,
      distance: 0,
      offset: 0,
      initialized: false
    };
  }).filter(Boolean);

  let motionFrame = 0;
  let motionVisible = true;
  let previousMotionTime = 0;

  const measureMotionRows = () => {
    motionRows.forEach((item) => {
      const distance = item.leadSet.offsetWidth;
      if (distance <= 0) return;
      item.distance = distance;

      // 모션 감소 모드에서는 복제 세트를 숨기므로 트랙 폭이 한 세트뿐이다.
      // 이때 음수 오프셋을 주면 행 전체가 화면 왼쪽 밖으로 밀려 사라진다.
      if (reducedMotion) {
        item.offset = 0;
        item.initialized = true;
        item.track.style.transform = "none";
        return;
      }

      if (!item.initialized) {
        item.offset = item.speed > 0 ? -distance : 0;
        item.initialized = true;
      } else {
        while (item.offset < -distance) item.offset += distance;
        while (item.offset > 0) item.offset -= distance;
      }
      item.track.style.transform = `translate3d(${item.offset}px, 0, 0)`;
    });
  };

  const moveMotionRows = (time = 0) => {
    motionFrame = 0;
    if (reducedMotion || document.hidden || !motionVisible) return;
    const delta = Math.min(50, time - previousMotionTime || 16) / 1000;
    previousMotionTime = time;

    // scrolling fast pushes every row along its own direction - the wall reacts to you
    const boost = 1 + Math.min(2.6, Math.abs(scrollVelocity) * .06);

    motionRows.forEach((item) => {
      if (!item.distance) return;
      item.offset += item.speed * boost * delta;
      while (item.speed < 0 && item.offset <= -item.distance) item.offset += item.distance;
      while (item.speed > 0 && item.offset >= 0) item.offset -= item.distance;
      item.track.style.transform = `translate3d(${item.offset}px, 0, 0)`;
    });

    motionFrame = window.requestAnimationFrame(moveMotionRows);
  };

  const syncMotionRows = () => {
    const shouldMove = !reducedMotion && !document.hidden && motionVisible;
    motionRibbon?.classList.toggle("is-moving", shouldMove);
    if (shouldMove && !motionFrame) {
      previousMotionTime = 0;
      motionFrame = window.requestAnimationFrame(moveMotionRows);
    }
    if (!shouldMove && motionFrame) {
      window.cancelAnimationFrame(motionFrame);
      motionFrame = 0;
    }
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      motionVisible = entry.isIntersecting;
      syncMotionRows();
    }, { rootMargin: "160px 0px" }).observe(motionStage);
  }

  if ("ResizeObserver" in window) new ResizeObserver(measureMotionRows).observe(motionStage);
  else window.addEventListener("resize", measureMotionRows, { passive: true });

  document.addEventListener("visibilitychange", syncMotionRows);
  window.addEventListener("pagehide", () => {
    if (motionFrame) window.cancelAnimationFrame(motionFrame);
  }, { once: true });

  measureMotionRows();
  if (document.fonts?.ready) document.fonts.ready.then(measureMotionRows);
  syncMotionRows();
}

/* ------------------------------------------------- draggable service film */

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

/* ------------------------------------------------- route expand transition */

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
      { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, borderRadius: "22px" },
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

/* --------------------------------------------------------- magnetic links */

if (!reducedMotion && finePointer) {
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

/* ----------------------------------------------------------- brief builder */

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
    summary.classList.remove("summary-flash");
    void summary.offsetWidth;
    summary.classList.add("summary-flash");
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
      copyButton.textContent = "복사 완료 ✓";
      copyButton.classList.add("is-copied");
      status.textContent = "카카오 대화창에 붙여 넣을 수 있습니다.";
      window.setTimeout(() => {
        copyButton.textContent = "내용 복사하기";
        copyButton.classList.remove("is-copied");
        status.textContent = "";
      }, 2200);
    } catch {
      status.textContent = "내용을 직접 선택해 복사해 주세요.";
    }
  });
}

/* ======================================================================
   여기부터 연출 레이어 - 인트로, 글자 분해 등장, 커서, 스포트라이트, 리플
   ====================================================================== */

/* ----------------------------------------------------------- 인트로 커튼 */

const preloader = document.querySelector("[data-preloader]");

if (preloader) {
  if (reducedMotion) {
    preloader.remove();
    root.classList.add("intro-done");
  } else {
    let dismissed = false;
    const dismissIntro = () => {
      if (dismissed) return;
      dismissed = true;
      preloader.classList.add("is-done");
      root.classList.add("intro-done");
      window.setTimeout(() => preloader.remove(), 1000);
    };
    window.addEventListener("load", () => window.setTimeout(dismissIntro, 620), { once: true });
    window.setTimeout(dismissIntro, 2400);
  }
} else {
  root.classList.add("intro-done");
}

/* ------------------------------------------------- 제목 단어 분해 등장 */

const splitWords = (element) => {
  const pieces = [];
  [...element.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      pieces.push(node);
      return;
    }
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        pieces.push(document.createTextNode(part));
        return;
      }
      const word = document.createElement("span");
      word.className = "word";
      word.textContent = part;
      pieces.push(word);
    });
  });
  element.replaceChildren(...pieces);
  element.querySelectorAll(".word").forEach((word, index) => {
    word.style.setProperty("--wi", String(index));
  });
  element.classList.add("is-split");
};

const splitTargets = [...document.querySelectorAll("[data-split]")];

if (!reducedMotion && splitTargets.length) {
  splitTargets.forEach(splitWords);
  if ("IntersectionObserver" in window) {
    const splitObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("words-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8%" });
    splitTargets.forEach((item) => splitObserver.observe(item));
    window.setTimeout(() => splitTargets.forEach((item) => item.classList.add("words-in")), 1600);
  } else {
    splitTargets.forEach((item) => item.classList.add("words-in"));
  }
}

/* ------------------------------------------------------------ 커스텀 커서 */

if (finePointer && !reducedMotion && window.matchMedia("(min-width: 901px)").matches) {
  const layer = document.createElement("div");
  layer.className = "cursor-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = '<i class="cursor-ring"></i><i class="cursor-dot"></i>';
  document.body.append(layer);

  const ring = layer.querySelector(".cursor-ring");
  const dot = layer.querySelector(".cursor-dot");
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;
  let cursorFrame = 0;

  const paintCursor = () => {
    ringX += (pointerX - ringX) * .18;
    ringY += (pointerY - ringY) * .18;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
    cursorFrame = window.requestAnimationFrame(paintCursor);
  };

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!layer.classList.contains("is-live")) layer.classList.add("is-live");
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("a, button, summary, input, textarea, [data-tilt], .stack-tile")
      : null;
    layer.classList.toggle("is-hover", Boolean(target));
    layer.classList.toggle("is-text", Boolean(target && target.matches("input, textarea")));
  }, { passive: true });

  document.addEventListener("pointerdown", () => layer.classList.add("is-down"), { passive: true });
  document.addEventListener("pointerup", () => layer.classList.remove("is-down"), { passive: true });
  document.addEventListener("pointerleave", () => layer.classList.remove("is-live"), { passive: true });

  cursorFrame = window.requestAnimationFrame(paintCursor);
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(cursorFrame), { once: true });
}

/* ------------------------------------------------- 어두운 구역 스포트라이트 */

if (!reducedMotion && finePointer) {
  document.querySelectorAll("[data-spotlight]").forEach((section) => {
    let spotFrame = 0;
    let spotX = 50;
    let spotY = 50;

    const paintSpot = () => {
      section.style.setProperty("--spot-x", `${spotX}%`);
      section.style.setProperty("--spot-y", `${spotY}%`);
      spotFrame = 0;
    };

    section.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = section.getBoundingClientRect();
      spotX = ((event.clientX - bounds.left) / bounds.width) * 100;
      spotY = ((event.clientY - bounds.top) / bounds.height) * 100;
      section.classList.add("is-lit");
      if (!spotFrame) spotFrame = window.requestAnimationFrame(paintSpot);
    }, { passive: true });

    section.addEventListener("pointerleave", () => section.classList.remove("is-lit"), { passive: true });
  });
}

/* ------------------------------------------- 화면 밖 구역 애니메이션 정지 */

/* 측정 결과 실행 중이던 애니메이션 28개가 전부 화면 밖이었다.
   보이는 구역만 재생하면 효과는 그대로 두고 프레임 예산만 되찾는다. */
const motionScopes = [...document.querySelectorAll("[data-motion-scope]")];

if (motionScopes.length && "IntersectionObserver" in window) {
  motionScopes.forEach((scope) => scope.classList.add("is-idle"));
  const scopeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-idle", !entry.isIntersecting);
      // 히어로 코드 편집기는 처음 보일 때 한 번만 타이핑한다
      if (entry.isIntersecting) entry.target.classList.add("is-typing");
    });
  }, { rootMargin: "120px 0px" });
  motionScopes.forEach((scope) => scopeObserver.observe(scope));
} else {
  motionScopes.forEach((scope) => scope.classList.add("is-typing"));
}

/* ------------------------------------------------------------ 클릭 리플 */

if (!reducedMotion) {
  document.querySelectorAll(".btn, .choice-lines button, .stack-tile, .chapter-jump a").forEach((target) => {
    target.addEventListener("pointerdown", (event) => {
      const bounds = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const size = Math.max(bounds.width, bounds.height) * 2.2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - bounds.left}px`;
      ripple.style.top = `${event.clientY - bounds.top}px`;
      target.append(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    }, { passive: true });
  });
}

/* ------------------------------------------ 내부 이동 시 커튼 전환 */

if (!reducedMotion) {
  const curtain = document.createElement("div");
  curtain.className = "route-curtain";
  curtain.setAttribute("aria-hidden", "true");
  curtain.innerHTML = "<i></i><i></i><i></i>";
  document.body.append(curtain);

  document.querySelectorAll("a[href]").forEach((link) => {
    if (link.hasAttribute("data-route-expand") || link.target === "_blank") return;
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname) return;
      if (/^(?:tel:|mailto:)/i.test(link.getAttribute("href") || "")) return;

      event.preventDefault();
      curtain.classList.add("is-closing");
      window.setTimeout(() => window.location.assign(destination.href), 560);
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) curtain.classList.remove("is-closing");
  });
}
