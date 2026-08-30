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
      && event.target.closest("textarea, select, input, [data-native-scroll]");
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
  // 앵커 이동(부드러운 스크롤)이 시작될 때 관성 글라이드가 남아 있으면
  // 목적지로 가는 스크롤을 도로 끌어당긴다. 해시 링크를 누르면 손을 뗀다.
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element && event.target.closest('a[href*="#"]');
    if (link) stopSmoothWheel();
  }, true);
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
    // scrollVelocity 는 기술 스택 3개 행의 가속에만 쓴다.
    // CSS 변수로 내보내면 이를 쓰는 요소 전체가 매 프레임 스타일 재계산 대상이 된다.

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

/* ------------------------------------------------------ headline rotator */

const rotator = document.querySelector("[data-rotator]");

if (rotator) {
  let words = [];
  try {
    words = JSON.parse(rotator.dataset.rotatorWords || "[]");
  } catch {
    words = [];
  }
  if (words.length) {
    // 단어마다 정확한 너비를 재 두고, 바뀔 때 그 너비로 부드럽게 늘었다 줄었다 한다.
    // 가장 긴 단어로 자리를 고정하면 짧은 단어일 때 제목이 한 줄 더 내려간다.
    const slot = rotator.closest(".hero-rotator") || rotator;
    const heading = rotator.closest("h1") || slot.parentElement;
    let widths = [];
    let index = 0;

    // "운영 시스템"처럼 긴 단어가 오면 첫 줄이 칼럼보다 넓어져 로테이터가
    // 통째로 다음 줄로 꺾였다. 단어를 자를 수도, 자리를 넓힐 수도 없으니
    // 제일 긴 첫 줄이 딱 들어가는 비율로 제목 폰트를 줄인다(--h1-fit).
    // 로테이터 앞 글자("필요한 건 ")는 마크업에서 그대로 읽어 온다.
    const linePrefix = () => {
      let prefix = "";
      for (const node of heading.childNodes) {
        if (node === slot || (node.nodeType === 1 && node.contains(slot))) break;
        prefix += node.textContent;
      }
      return prefix;
    };

    // 뷰포트 폰트(5.6vw)라 크기가 바뀔 때마다 다시 재야 한다.
    // 예전에는 처음 잰 너비를 리사이즈에서 재사용해 폭이 어긋났다.
    const measure = () => {
      heading.style.setProperty("--h1-fit", "1");
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;";
      probe.className = "rotator-word";
      heading.append(probe);
      // 로테이터는 <b>라 제목(800)보다 굵게 그려질 수 있다.
      // 앞 글자는 제목 두께로, 단어는 실제 로테이터 두께로 따로 잰다.
      const rotatorWeight = window.getComputedStyle(rotator).fontWeight;
      const prefix = linePrefix();
      probe.style.fontWeight = "inherit";
      probe.textContent = prefix;
      const prefixWidth = probe.offsetWidth;
      probe.style.fontWeight = rotatorWeight;
      let longestWord = 0;
      words.forEach((word) => {
        probe.textContent = word;
        longestWord = Math.max(longestWord, probe.offsetWidth);
      });
      // 형광펜 블록의 좌우 패딩은 슬롯(.hero-rotator)에 있으므로 따로 더한다
      const slotStyle = window.getComputedStyle(slot);
      const slotPad = (parseFloat(slotStyle.paddingLeft) || 0) + (parseFloat(slotStyle.paddingRight) || 0);
      const longestLine = prefixWidth + longestWord + slotPad;
      // 슬롯이 ceil(+2px)로 잡히고 fit 은 소수점 4자리라, 딱 맞게 나누면
      // 1px 미만 오차로도 줄이 꺾인다. 눈에 안 보이는 여유(8px)를 빼고 계산한다.
      const available = heading.clientWidth;
      const fit = longestLine > 0 && available > 0
        ? Math.min(1, Math.floor(((available - 2) / (longestLine + 8)) * 1000) / 1000)
        : 1;
      heading.style.setProperty("--h1-fit", String(fit));
      widths = words.map((word) => {
        probe.textContent = word;
        return Math.ceil(probe.offsetWidth) + 2;
      });
      probe.remove();
      if (widths[index]) slot.style.width = `${widths[index]}px`;
    };

    let measureFrame = 0;
    const requestMeasure = () => {
      if (!measureFrame) measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("resize", requestMeasure, { passive: true });
    // SUIT 폰트가 늦게 도착하면 폴백 글꼴 기준 폭이 남는다. 도착 후 한 번 더.
    document.fonts?.ready?.then(requestMeasure);

    if (words.length > 1 && !reducedMotion) {
      window.setInterval(() => {
        if (document.hidden) return;
        rotator.classList.add("is-out");
        window.setTimeout(() => {
          index = (index + 1) % words.length;
          rotator.textContent = words[index];
          if (widths[index]) slot.style.width = `${widths[index]}px`;
          rotator.classList.remove("is-out");
          rotator.classList.add("is-in");
          window.setTimeout(() => rotator.classList.remove("is-in"), 460);
        }, 260);
      }, 2600);
    }
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

  /* 줄이 계속 흐르면 타일 하나를 짚기가 어렵다. 손을 뻗으면 천천히 느려지고
     떼면 다시 붙는다. 완전히 멈추지 않는 것은, 멈춰 버리면 고장 난 것처럼
     보이기 때문이다. */
  let speedScale = 1;
  let speedTarget = 1;

  if (finePointer) {
    motionStage.addEventListener("pointerenter", () => { speedTarget = .12; });
    motionStage.addEventListener("pointerleave", () => { speedTarget = 1; });
  }

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
    // 스크롤이 멈춘 뒤에도 속도값이 남아 가속이 눌어붙지 않게 매 프레임 식힌다
    scrollVelocity += (0 - scrollVelocity) * Math.min(1, delta * 3);
    const boost = 1 + Math.min(2.6, Math.abs(scrollVelocity) * .06);
    speedScale += (speedTarget - speedScale) * Math.min(1, delta * 6);

    motionRows.forEach((item) => {
      if (!item.distance) return;
      item.offset += item.speed * boost * speedScale * delta;
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
    motionFrame = 0;
  });
  // bfcache 복귀 시 죽은 프레임 id 가 재시작을 막지 않게 지우고 다시 돈다
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    motionFrame = 0;
    syncMotionRows();
  });

  measureMotionRows();
  if (document.fonts?.ready) document.fonts.ready.then(measureMotionRows);
  syncMotionRows();
}

/* ------------------------------------------------- draggable service film */

/* 카드 줄은 기술 스택 행처럼 늘 왼쪽으로 흐른다. 복제 세트 폭만큼 오프셋을
   되감아 이음새 없이 돌고, 잡아끌면 그만큼 움직였다가 놓으면 다시 흐른다.
   손을 올리면 카드 하나를 짚을 수 있게 천천히 - 완전히 멈추지 않는 것은,
   멈춰 버리면 고장 난 것처럼 보이기 때문이다. */

const filmWindow = document.querySelector("[data-drag-film]");

if (filmWindow) {
  const filmTrack = filmWindow.querySelector(".film-track");
  const filmSet = filmWindow.querySelector("[data-film-set]");
  const FILM_SPEED = -27; // px/s, 음수 = 왼쪽
  let filmOffset = 0;
  let filmDistance = 0;
  let filmVisible = true;
  let autoFrame = 0;
  let previousTime = 0;
  let speedScale = 1;
  let speedTarget = 1;
  let dragging = false;
  let dragPointerId = 0;
  let dragStartX = 0;
  let dragStartOffset = 0;

  const wrapFilm = () => {
    if (!filmDistance) return;
    while (filmOffset <= -filmDistance) filmOffset += filmDistance;
    while (filmOffset > 0) filmOffset -= filmDistance;
  };

  const paintFilm = () => {
    if (filmTrack) filmTrack.style.transform = `translate3d(${filmOffset}px, 0, 0)`;
  };

  const measureFilm = () => {
    filmDistance = filmSet ? filmSet.offsetWidth : 0;
    if (reducedMotion) {
      // 모션 감소에서는 복제 세트가 숨고 원본을 손으로 넘긴다
      if (filmTrack) filmTrack.style.transform = "none";
      return;
    }
    wrapFilm();
    paintFilm();
  };

  const autoMove = (time = 0) => {
    if (!filmVisible || reducedMotion) {
      autoFrame = 0;
      return;
    }
    const delta = Math.min(50, time - previousTime || 16) / 1000;
    previousTime = time;
    speedScale += (speedTarget - speedScale) * Math.min(1, delta * 6);
    if (!dragging && filmDistance) {
      filmOffset += FILM_SPEED * speedScale * delta;
      wrapFilm();
      paintFilm();
    }
    autoFrame = window.requestAnimationFrame(autoMove);
  };

  const syncAutoMove = () => {
    if (reducedMotion) return;
    if (filmVisible && !autoFrame) {
      previousTime = 0;
      autoFrame = window.requestAnimationFrame(autoMove);
    }
    if (!filmVisible && autoFrame) {
      window.cancelAnimationFrame(autoFrame);
      autoFrame = 0;
    }
  };

  if (finePointer) {
    filmWindow.addEventListener("pointerenter", () => { speedTarget = .16; });
    filmWindow.addEventListener("pointerleave", () => { speedTarget = 1; });
  }

  // 탭(클릭)은 그대로 카드로 보내고, 6px 이상 끌 때부터 드래그로 본다.
  // 캡처를 그때 잡아야 드래그 뒤의 click 이 카드로 새지 않는다.
  filmWindow.addEventListener("pointerdown", (event) => {
    if (reducedMotion) return;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartOffset = filmOffset;
    dragging = false;
  });

  filmWindow.addEventListener("pointermove", (event) => {
    if (reducedMotion || event.pointerId !== dragPointerId) return;
    const moved = event.clientX - dragStartX;
    if (!dragging) {
      if (Math.abs(moved) < 6) return;
      dragging = true;
      filmWindow.classList.add("is-dragging");
      filmWindow.setPointerCapture(event.pointerId);
    }
    filmOffset = dragStartOffset + moved;
    wrapFilm();
    paintFilm();
  });

  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    filmWindow.classList.remove("is-dragging");
    if (filmWindow.hasPointerCapture(event.pointerId)) filmWindow.releasePointerCapture(event.pointerId);
  };

  filmWindow.addEventListener("pointerup", stopDragging);
  filmWindow.addEventListener("pointercancel", stopDragging);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      filmVisible = entry.isIntersecting;
      filmWindow.classList.toggle("is-inview", entry.isIntersecting);
      syncAutoMove();
    }, { rootMargin: "160px 0px" }).observe(filmWindow);
  } else filmWindow.classList.add("is-inview");

  if ("ResizeObserver" in window) new ResizeObserver(measureFilm).observe(filmWindow);
  else window.addEventListener("resize", measureFilm, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(measureFilm);

  measureFilm();
  syncAutoMove();
  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(autoFrame);
    autoFrame = 0;
  });
  // bfcache 복귀 시 죽은 프레임 id 가 재시작을 막지 않게 지우고 다시 돈다
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    autoFrame = 0;
    syncAutoMove();
  });
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

/* 뒤로 가기(bfcache)로 돌아오면 확장 오버레이가 화면을 덮은 채 복원된다.
   페이지가 다시 보일 때 전환 잔재를 전부 걷는다. */
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  document.querySelectorAll(".route-expand-overlay").forEach((node) => node.remove());
  document.querySelectorAll(".is-expanding-source").forEach((node) => node.classList.remove("is-expanding-source"));
  root.classList.remove("route-leaving");
});

/* --------------------------------------------------------- magnetic links */

/* transform 을 인라인으로 덮으면 CSS 의 :active 눌림 · hover 리프트가 전부
   무시된다. 합성 가능한 translate 속성을 쓰면 둘이 자연스럽게 겹친다. */
if (!reducedMotion && finePointer) {
  document.querySelectorAll(".magnetic").forEach((link) => {
    link.addEventListener("pointermove", (event) => {
      const bounds = link.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * .08;
      const y = (event.clientY - bounds.top - bounds.height / 2) * .12;
      link.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    link.addEventListener("pointerleave", () => {
      link.style.translate = "";
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
  let cursorStopped = false;

  const paintCursor = () => {
    ringX += (pointerX - ringX) * .18;
    ringY += (pointerY - ringY) * .18;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
    cursorFrame = window.requestAnimationFrame(paintCursor);
  };

  document.addEventListener("pointermove", (event) => {
    if (cursorStopped || event.pointerType === "touch") return;
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
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(cursorFrame));

  // 뒤로 가기(bfcache)로 돌아오면 pagehide 에서 세운 루프가 죽은 채 남는다
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || cursorStopped) return;
    window.cancelAnimationFrame(cursorFrame);
    cursorFrame = window.requestAnimationFrame(paintCursor);
  });

  // 열려 있는 동안 OS 에서 모션 감소를 켜면 CSS 는 커서 레이어만 숨기고
  // body 의 cursor:none 은 is-live 에 걸려 남는다 - 커서가 통째로 사라진다.
  // 설정이 바뀌는 즉시 링을 내리고, pointermove 가 되살리지 못하게 잠근다.
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", (event) => {
    if (!event.matches) return;
    cursorStopped = true;
    layer.classList.remove("is-live", "is-hover", "is-down", "is-text");
    window.cancelAnimationFrame(cursorFrame);
  });
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
    // 여백을 두면 구역이 화면을 벗어난 뒤에도 그만큼 더 돈다. 히어로처럼
    // 화면을 꽉 채우는 구역은 두 번째 화면에서 애니메이션 10여 개가 헛돌았다.
    // 0 이면 구역의 아래끝이 화면 맨 위에 정확히 닿았을 때도 "보이는 중"으로
    // 판정된다. 히어로처럼 화면을 꽉 채우는 구역은 그 자리가 곧 두 번째 화면이라
    // 거기서 애니메이션 10여 개가 헛돌았다. 1px 물려 그 경계를 없앤다.
  }, { rootMargin: "-1px 0px" });
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

/* ======================================================================
   v51 효과 레이어

   구조는 건드리지 않고 여기서만 더한다. 여기 있는 모든 효과는
   transform / opacity / CSS 변수만 건드리고, 매 프레임 도는 루프를
   새로 만들지 않는다. 화면 밖 구역은 기존 IntersectionObserver 가
   이미 멈춰 준다.
   ====================================================================== */

/* --------------------------------------------------- 숫자 오도미터 롤 */

/* 기존 카운트업은 1.3초 동안 매 프레임 글자를 다시 그렸고, 0 -> 0 인 타일은
   아무 일도 일어나지 않는 것처럼 보였다. 0~9 가 세로로 쌓인 자리를
   transform 으로 한 번 밀어 올리면 프레임 비용 없이 훨씬 잘 읽힌다. */

const odometers = [...document.querySelectorAll("[data-count]")];

if (odometers.length) {
  odometers.forEach((item) => {
    const target = String(Math.max(0, Math.round(Number(item.dataset.count) || 0)));
    item.textContent = "";
    item.classList.add("odo");
    target.split("").forEach((digit, index) => {
      const column = document.createElement("span");
      column.className = "odo-col";
      const strip = document.createElement("i");
      strip.style.setProperty("--odo-target", digit);
      strip.style.setProperty("--odo-delay", `${index * 90}ms`);
      for (let n = 0; n <= 9; n += 1) {
        const cell = document.createElement("s");
        cell.textContent = String(n);
        strip.append(cell);
      }
      column.append(strip);
      item.append(column);
    });
  });

  const rollAll = () => odometers.forEach((item) => item.classList.add("is-rolled"));

  if (reducedMotion || !("IntersectionObserver" in window)) {
    rollAll();
  } else {
    const odoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-rolled");
        odoObserver.unobserve(entry.target);
      });
    }, { threshold: .4 });
    odometers.forEach((item) => odoObserver.observe(item));
  }
}

/* ------------------------------------------------- 영문 라벨 해독 애니메이션 */

const scrambleTargets = [...document.querySelectorAll(".eyebrow")]
  .filter((item) => /^[A-Z0-9 ·.·-]+$/.test(item.textContent.trim()) && item.textContent.trim().length <= 40);

scrambleTargets.forEach((item) => item.setAttribute("data-scramble", ""));

const runScramble = (element) => {
  const finalText = element.dataset.scrambleText || element.textContent;
  element.dataset.scrambleText = finalText;
  // 기호를 섞으면 글자가 깨진 것처럼 보인다. 알파벳만 써서 "해독되는" 느낌을 낸다.
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const chars = [...finalText];
  // 문자열이 길어도 총 시간이 같도록 비율로 배분한다(약 0.5초 안에 끝난다).
  const span = Math.max(1, chars.length - 1);
  const settleAt = chars.map((char, index) => (char === " " || char === "·" ? 0 : 4 + (index / span) * 26));
  let frame = 0;

  const step = () => {
    let done = true;
    element.textContent = chars.map((char, index) => {
      if (frame >= settleAt[index]) return char;
      done = false;
      return glyphs[(frame * 7 + index * 13) % glyphs.length];
    }).join("");
    frame += 1;
    if (!done) window.requestAnimationFrame(step);
    else element.textContent = finalText;
  };

  window.requestAnimationFrame(step);
};

if (scrambleTargets.length && !reducedMotion && "IntersectionObserver" in window) {
  const scrambleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      runScramble(entry.target);
      scrambleObserver.unobserve(entry.target);
    });
  }, { threshold: .6 });
  scrambleTargets.forEach((item) => scrambleObserver.observe(item));
}

/* ------------------------------------------------------- 카드 깊이 시차 */

if (finePointer && !reducedMotion) {
  document.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--cx", ((event.clientX - bounds.left) / bounds.width * 2 - 1).toFixed(3));
      card.style.setProperty("--cy", ((event.clientY - bounds.top) / bounds.height * 2 - 1).toFixed(3));
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--cx", "0");
      card.style.setProperty("--cy", "0");
    });
  });

  /* 버튼 위 광원은 커서를 따라온다 */
  document.querySelectorAll(".btn").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const bounds = button.getBoundingClientRect();
      button.style.setProperty("--bx", `${Math.round(event.clientX - bounds.left)}px`);
      button.style.setProperty("--by", `${Math.round(event.clientY - bounds.top)}px`);
    }, { passive: true });
  });
}

/* --------------------------------------------------- 내비 글자 단위 반응 */

document.querySelectorAll(".desktop-nav a > span").forEach((label) => {
  const text = label.textContent;
  if (!text || label.querySelector(".ch")) return;
  label.textContent = "";
  [...text].forEach((char, index) => {
    const piece = document.createElement("span");
    piece.className = char === " " ? "ch ch-space" : "ch";
    piece.style.setProperty("--ch-i", String(index));
    // 공백도 그대로 넣는다. 비워 두면 "제작 분야"가 "제작분야"가 되어 라벨이 달라진다.
    piece.textContent = char;
    label.append(piece);
  });
});

/* ------------------------------------------------- 기술 스택 타일 이름표 */

document.querySelectorAll(".stack-tile").forEach((tile) => {
  const name = tile.getAttribute("title");
  if (!name) return;
  tile.setAttribute("data-name", name);
  // 브라우저 기본 툴팁과 겹치지 않도록 title 은 걷어내고 접근성 이름만 남긴다
  tile.removeAttribute("title");
  tile.setAttribute("aria-label", name);
});

/* --------------------------------------------- 화면 진입 시 광택 훑기 */

const sweepTargets = [...document.querySelectorAll(".service-card-visual, .stat-tile")];
sweepTargets.forEach((item) => item.classList.add("sweep"));

if (sweepTargets.length && !reducedMotion && "IntersectionObserver" in window) {
  const sweepObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      // is-visible 은 등장 애니메이션이 쓰는 이름이라 건드리면 안 된다.
      // 광택 훑기는 자기 이름(is-swept)만 쓰고, 끝나면 그것만 걷는다.
      entry.target.classList.add("is-swept");
      sweepObserver.unobserve(entry.target);
      entry.target.addEventListener("animationend", (event) => {
        if (event.animationName !== "sweepRun") return;
        entry.target.classList.remove("sweep", "is-swept");
      }, { once: true });
    });
  }, { threshold: .35 });
  sweepTargets.forEach((item) => sweepObserver.observe(item));
}

/* --------------------------------------------------- 진행 미리보기 진행선 */

const processPreview = document.querySelector(".process-preview");

if (processPreview) {
  if (!processPreview.querySelector(".process-rail")) {
    const rail = document.createElement("div");
    rail.className = "process-rail";
    rail.setAttribute("aria-hidden", "true");
    rail.append(document.createElement("i"));
    processPreview.prepend(rail);
  }

  const railFill = processPreview.querySelector(".process-rail i");
  const steps = [...processPreview.querySelectorAll(".process-step")];

  if ("IntersectionObserver" in window) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = steps.indexOf(entry.target);
        entry.target.classList.add("is-lit");
        railFill.style.transform = `scaleX(${((index + 1) / steps.length).toFixed(3)})`;
      });
    }, { threshold: .55 });
    steps.forEach((step) => stepObserver.observe(step));
  } else {
    steps.forEach((step) => step.classList.add("is-lit"));
    railFill.style.transform = "scaleX(1)";
  }
}

/* ------------------------------------------------- 히어로 코드 하이라이트 */

const codeBody = document.querySelector(".code-body");

if (codeBody && !reducedMotion) {
  const bar = document.createElement("span");
  bar.className = "code-highlight";
  bar.setAttribute("aria-hidden", "true");
  codeBody.append(bar);

  const lines = [...codeBody.querySelectorAll(".code-line")];
  let lineIndex = 0;
  let highlightTimer = 0;
  let highlightInView = false;

  const moveHighlight = () => {
    if (document.hidden || !lines.length) return;
    const line = lines[lineIndex % lines.length];
    bar.style.setProperty("--hl-y", `${line.offsetTop - 4}px`);
    lineIndex += 1;
  };

  const startHighlight = () => {
    if (highlightTimer) return;
    moveHighlight();
    highlightTimer = window.setInterval(moveHighlight, 1400);
  };

  const stopHighlight = () => {
    window.clearInterval(highlightTimer);
    highlightTimer = 0;
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      highlightInView = entry.isIntersecting;
      if (entry.isIntersecting) startHighlight();
      else stopHighlight();
    }, { threshold: .2 }).observe(codeBody);
  } else {
    highlightInView = true;
    startHighlight();
  }

  // 탭이 돌아왔다고 무조건 다시 켜면, 화면 밖에서 관찰자가 세워 둔
  // 타이머가 도로 살아난다. 히어로가 보일 때만 다시 켠다.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopHighlight();
    else if (highlightInView) startHighlight();
  });
}

/* --------------------------------------- 제목 등장이 끝나면 승격 반납

   [data-split] 제목은 단어마다 레이어로 올라간다. 등장이 끝난 뒤에도
   승격을 붙들고 있으면 제목 수만큼 레이어가 영구히 남는다. */

document.querySelectorAll("[data-split]").forEach((heading) => {
  const settle = () => heading.classList.add("words-done");
  if (reducedMotion) { settle(); return; }
  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, 260);
  };
  heading.addEventListener("transitionend", schedule);
  // 전환이 아예 시작되지 않는 경우(이미 보이는 제목 등)를 위한 대비
  window.setTimeout(settle, 3200);
});

/* ------------------------------------------------------- 복사 완료 체크 */

document.querySelectorAll("[data-brief-copy]").forEach((button) => {
  if (button.querySelector(".copy-check")) return;
  const mark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  mark.setAttribute("class", "copy-check");
  mark.setAttribute("viewBox", "0 0 20 20");
  mark.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4 10.6 8.2 15 16 5.6");
  mark.append(path);
  button.prepend(mark);
});
