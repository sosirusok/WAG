const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = String(new Date().getFullYear());
});

/* ------------------------------------------------------ 화면 진입 시 등장 */

const revealItems = [...document.querySelectorAll("[data-reveal]")];

// 같은 부모 안에서만 순번을 매긴다. 예전에는 문서 전체 인덱스에 % 5 를 걸어서
// 03 이 01 보다 먼저 도착하는 일이 있었다.
document.querySelectorAll("[data-reveal-group]").forEach((group) => {
  [...group.children].forEach((child, index) => {
    child.querySelectorAll?.("[data-reveal]").forEach((item) => item.style.setProperty("--reveal-order", String(index)));
    if (child.hasAttribute?.("data-reveal")) child.style.setProperty("--reveal-order", String(index));
  });
});

const revealEverything = () => revealItems.forEach((item) => item.classList.add("is-in"));

if (!revealItems.length) {
  // nothing to do
} else if (reducedMotion || !("IntersectionObserver" in window)) {
  revealEverything();
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: .1 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

window.addEventListener("load", () => document.body.classList.add("is-loaded"), { once: true });

/* --------------------------------------------------- 히어로 등장 안무

   글꼴이 준비되면(늦어도 400ms 뒤) 시작한다. 전체 1680ms 안에 끝나고
   지연 시간은 CSS 의 --b 커스텀 속성이 갖고 있다. */

const hero = document.querySelector("[data-hero]");

if (hero) {
  const play = () => {
    window.requestAnimationFrame(() => root.classList.add("hero-play"));
  };
  Promise.race([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((resolve) => window.setTimeout(resolve, 400))
  ]).then(play, play);


  // 안무가 끝난 요소에서 will-change 를 걷어낸다. 영구 레이어 승격을 남기지 않는다.
  hero.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform") event.target.style.willChange = "auto";
  });

  // 포인터는 결(field)을 아주 조금만 끌어당긴다. rAF 루프 없이 전환이 이징을 맡는다.
  if (finePointer && !reducedMotion) {
    hero.addEventListener("pointermove", (event) => {
      const ratio = (event.clientY / window.innerHeight) * 2 - 1;
      hero.style.setProperty("--py", String(Math.max(-1, Math.min(1, ratio)).toFixed(3)));
    }, { passive: true });
    hero.addEventListener("pointerleave", () => hero.style.setProperty("--py", "0"));
  }
}

/* ------------------------------------------ 스크롤 진행 · 헤더 · 진행선 */

const header = document.querySelector("[data-header]");
const processScrubs = [...document.querySelectorAll(".s-process, .process-editorial")];
let scrollFrame = 0;
let previousScrollY = window.scrollY;
let scrollVelocity = 0;

const paintScroll = () => {
  const scrollTop = window.scrollY;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? Math.min(1, Math.max(0, scrollTop / distance)) : 0;
  root.style.setProperty("--scroll-progress", String(progress));
  header?.classList.toggle("is-scrolled", scrollTop > 8);

  const rawVelocity = scrollTop - previousScrollY;
  previousScrollY = scrollTop;
  scrollVelocity += (rawVelocity - scrollVelocity) * .28;

  processScrubs.forEach((section) => {
    const bounds = section.getBoundingClientRect();
    if (bounds.bottom < -200 || bounds.top > window.innerHeight + 200) return;
    const travel = bounds.height + window.innerHeight * .2;
    const current = window.innerHeight * .72 - bounds.top;
    root.style.setProperty("--process-progress", String(Math.max(0, Math.min(1, current / travel))));
  });

  scrollFrame = 0;
};

const requestScrollPaint = () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintScroll);
};

paintScroll();
window.addEventListener("scroll", requestScrollPaint, { passive: true });
window.addEventListener("resize", requestScrollPaint, { passive: true });

/* ------------------------------------------------------------ 모바일 메뉴 */

const mobileMenu = document.querySelector(".mobile-menu");
const mobileMenuToggle = mobileMenu?.querySelector("summary");

const closeMobileMenu = ({ restoreFocus = false } = {}) => {
  if (!mobileMenu?.open) return;
  mobileMenu.open = false;
  syncMobileMenu();
  if (restoreFocus) mobileMenuToggle?.focus();
};

function syncMobileMenu() {
  const open = Boolean(mobileMenu?.open);
  mobileMenuToggle?.setAttribute("aria-expanded", String(open));
  mobileMenuToggle?.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  root.classList.toggle("menu-open", open);
}

mobileMenu?.addEventListener("toggle", syncMobileMenu);
mobileMenuToggle?.addEventListener("click", (event) => {
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

window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
  if (event.matches) closeMobileMenu();
});

/* ------------------------------------------------------- 기술 스택 3개 행

   서로 반대 방향으로 흐르는 세 줄. 스크롤이 빨라지면 각자의 방향으로 가속한다. */

const motionStage = document.querySelector("[data-motion-stage]");

if (motionStage) {
  const motionRows = [...motionStage.querySelectorAll("[data-motion-row]")].map((row) => {
    const track = row.querySelector(".motion-track");
    const leadSet = row.querySelector("[data-motion-set]");
    if (!track || !leadSet) return null;
    return { row, track, leadSet, speed: Number(row.dataset.speed) || 0, distance: 0, offset: 0, initialized: false };
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

/* ---------------------------------------- 구역 단위 관찰: 레일 · 진행 · 숫자 */

if ("IntersectionObserver" in window) {
  // 왼쪽 여백 레일의 눈금은 구역이 바뀔 때 한 번만 옮긴다. 스크롤 계산 없음.
  const railNo = document.querySelector("[data-rail-no]");
  const railTick = document.querySelector("[data-rail-tick]");
  const railSections = [...document.querySelectorAll("[data-rail-section]")];

  if (railNo && railTick && railSections.length) {
    const step = 200 / railSections.length;
    const railObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = railSections.indexOf(entry.target);
        if (index < 0) return;
        railNo.textContent = entry.target.dataset.railSection;
        railTick.style.setProperty("--rail-y", `${Math.round(index * step)}px`);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    railSections.forEach((section) => railObserver.observe(section));
  }

  // 밝은 띠의 이음새를 따라 초록 실선이 그어진다
  const paperBand = document.querySelector(".s-process");
  if (paperBand) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) entry.target.classList.add("is-in");
    }, { threshold: .12 }).observe(paperBand);
  }

  // 진행 단계는 진행선이 닿는 순간 번호가 밝아진다
  const steps = [...document.querySelectorAll("[data-pstep]")];
  if (steps.length) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-lit", entry.isIntersecting));
    }, { threshold: .6 });
    steps.forEach((step) => stepObserver.observe(step));
  }

  // 숫자는 칸 밖에서 올라온다. 0 이 마지막에 가장 세게 도착한다.
  const factBlock = document.querySelector("[data-facts]");
  if (factBlock) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) entry.target.classList.add("is-in");
    }, { threshold: .3 }).observe(factBlock);
  }
}

// 숫자를 슬롯 안에 넣는다(마크업을 단순하게 두려고 여기서 감싼다)
document.querySelectorAll("[data-facts] .n").forEach((slot) => {
  slot.innerHTML = `<i>${slot.textContent.trim()}</i>`;
});

/* ------------------------------------------- 화면 밖 구역 애니메이션 정지 */

/* 측정 결과 실행 중이던 애니메이션 28개가 전부 화면 밖이었다.
   보이는 구역만 재생하면 효과는 그대로 두고 프레임 예산만 되찾는다. */
const motionScopes = [...document.querySelectorAll("[data-motion-scope]")];

if (motionScopes.length && "IntersectionObserver" in window) {
  motionScopes.forEach((scope) => scope.classList.add("is-idle"));
  const scopeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-idle", !entry.isIntersecting));
  }, { rootMargin: "120px 0px" });
  motionScopes.forEach((scope) => scopeObserver.observe(scope));
}

/* ------------------------------------------------------- 홈 문의 미리 담기

   /contact/ 의 문의 빌더와 같은 형식을 쓴다. 상태 기계는 사이트에 하나뿐이고,
   여기서 고른 값은 ?type= 로 그대로 넘어간다. */

const seedSection = document.querySelector("[data-seed]");

if (seedSection) {
  const choices = [...seedSection.querySelectorAll("[data-seed-key]")];
  const link = seedSection.querySelector("[data-seed-link]");
  const copyButton = seedSection.querySelector("[data-seed-copy]");
  const status = seedSection.querySelector(".seed-status");
  let picked = null;

  const message = () => [
    "[SWAG 제작 문의]",
    `제작 종류: ${picked ? picked.dataset.seedLabel : "선택 전"}`,
    "필요 기능:",
    "참고 자료:",
    "희망 일정:"
  ].join("\n");

  choices.forEach((button) => {
    button.addEventListener("click", () => {
      const isOn = button.getAttribute("aria-pressed") === "true";
      choices.forEach((item) => item.setAttribute("aria-pressed", "false"));
      picked = isOn ? null : button;
      button.setAttribute("aria-pressed", String(!isOn));
      if (link) link.setAttribute("href", picked ? `contact/?type=${picked.dataset.seedKey}` : "contact/");
      if (status) status.textContent = "";
    });
  });

  copyButton?.addEventListener("click", async () => {
    const label = copyButton.querySelector("span");
    try {
      await navigator.clipboard.writeText(message());
      copyButton.classList.remove("is-done");
      void copyButton.offsetWidth;
      copyButton.classList.add("is-done");
      if (label) label.textContent = "복사됨";
      if (status) status.textContent = "카카오 오픈채팅에 그대로 붙여 넣으세요.";
      window.setTimeout(() => {
        if (label) label.textContent = "메시지 복사";
        copyButton.classList.remove("is-done");
      }, 2200);
    } catch {
      if (status) status.textContent = "내용을 직접 선택해 복사해 주세요.";
    }
  });
}

/* ----------------------------------------------------------- 문의 빌더 */

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
      copyButton.textContent = "복사됨";
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

/* ------------------------------------------------------- 내부 이동 전환

   브라우저가 지원하면 뷰 트랜지션으로 이어지고, 아니면 평범하게 이동한다.
   직접 만든 커튼 오버레이는 쓰지 않는다. */

if (!reducedMotion && typeof document.startViewTransition === "function") {
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;
    event.preventDefault();
    document.startViewTransition(() => { window.location.href = url.href; });
  });
}
