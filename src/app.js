(() => {
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const saveData = Boolean(navigator.connection?.saveData);

  requestAnimationFrame(() => body.classList.add("is-ready"));

  doc.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });

  if (doc.fonts?.ready) {
    doc.fonts.ready.then(() => root.classList.add("fonts-ready")).catch(() => root.classList.add("fonts-ready"));
  } else {
    root.classList.add("fonts-ready");
  }

  const revealItems = [...doc.querySelectorAll(".reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  root.classList.add("motion-ready");
  window.setTimeout(() => revealItems.forEach((item) => item.classList.add("is-visible")), 4000);

  const autoMotionItems = [...doc.querySelectorAll("[data-auto-motion]")];
  if (reduceMotion) {
    autoMotionItems.forEach((item) => item.classList.add("is-static"));
  } else if ("IntersectionObserver" in window) {
    const autoMotionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-running", entry.isIntersecting && !doc.hidden));
    }, { rootMargin: "120px 0px", threshold: .02 });
    autoMotionItems.forEach((item) => autoMotionObserver.observe(item));
    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden) autoMotionItems.forEach((item) => item.classList.remove("is-running"));
      else autoMotionItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        item.classList.toggle("is-running", rect.bottom > -120 && rect.top < window.innerHeight + 120);
      });
    });
  } else {
    autoMotionItems.forEach((item) => item.classList.add("is-running"));
  }

  const autoScene = doc.querySelector("[data-auto-scene]");
  let autoSceneTimer = 0;
  const stopAutoScene = () => {
    if (autoSceneTimer) window.clearTimeout(autoSceneTimer);
    autoSceneTimer = 0;
  };
  const queueAutoScene = () => {
    stopAutoScene();
    if (!autoScene || reduceMotion || doc.hidden) return;
    autoSceneTimer = window.setTimeout(() => {
      if (autoScene.classList.contains("is-running")) autoScene.classList.toggle("is-inverted");
      queueAutoScene();
    }, 4600);
  };
  queueAutoScene();
  doc.addEventListener("visibilitychange", () => doc.hidden ? stopAutoScene() : queueAutoScene());
  window.addEventListener("pagehide", stopAutoScene);

  const header = doc.querySelector("[data-header]");
  let headerTicking = false;
  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
    headerTicking = false;
  };
  window.addEventListener("scroll", () => {
    if (headerTicking) return;
    headerTicking = true;
    requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();

  const navToggle = doc.querySelector("[data-nav-toggle]");
  const mobileMenu = doc.querySelector("[data-mobile-menu]");
  const pageMain = doc.querySelector("main");
  const pageFooter = doc.querySelector("footer");
  const setPageInert = (inert) => {
    if (pageMain) pageMain.inert = inert;
    if (pageFooter) pageFooter.inert = inert;
  };
  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!navToggle || !mobileMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    mobileMenu.hidden = true;
    body.classList.remove("is-menu-open");
    root.classList.remove("is-menu-open");
    setPageInert(false);
    if (restoreFocus) navToggle.focus({ preventScroll: true });
  };
  const openMenu = () => {
    if (!navToggle || !mobileMenu) return;
    navToggle.setAttribute("aria-expanded", "true");
    mobileMenu.hidden = false;
    body.classList.add("is-menu-open");
    root.classList.add("is-menu-open");
    setPageInert(true);
    mobileMenu.querySelector("a")?.focus({ preventScroll: true });
  };

  navToggle?.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    expanded ? closeMenu({ restoreFocus: true }) : openMenu();
  });
  mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu({ restoreFocus: link.target === "_blank" })));
  doc.addEventListener("keydown", (event) => {
    if (!navToggle || !mobileMenu || navToggle.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [navToggle, ...mobileMenu.querySelectorAll("a[href], button:not([disabled])")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) closeMenu();
  }, { passive: true });

  window.addEventListener("pageshow", (event) => {
    body.classList.remove("is-leaving");
    if (event.persisted) body.classList.add("is-restored");
    closeMenu();
    queueAutoScene();
  });

  doc.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      let target;
      try {
        target = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;
      const sameDocument = target.pathname === window.location.pathname && target.search === window.location.search;
      if (sameDocument && target.hash) return;
      event.preventDefault();
      body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = target.href;
      }, reduceMotion ? 0 : 360);
    });
  });

  if (finePointer && !reduceMotion) {
    const orb = doc.querySelector(".cursor-orb");
    if (orb) {
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight / 2;
      let currentX = targetX;
      let currentY = targetY;
      let orbFrame = 0;
      let lastMove = 0;

      const moveOrb = (time = 0) => {
        orbFrame = 0;
        currentX += (targetX - currentX) * .18;
        currentY += (targetY - currentY) * .18;
        orb.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        const distance = Math.hypot(targetX - currentX, targetY - currentY);
        if (!doc.hidden && (time - lastMove < 420 || distance > .2)) orbFrame = requestAnimationFrame(moveOrb);
      };
      const requestOrb = () => {
        if (!orbFrame && !doc.hidden) orbFrame = requestAnimationFrame(moveOrb);
      };

      window.addEventListener("pointermove", (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        lastMove = performance.now();
        orb.classList.add("is-visible");
        requestOrb();
      }, { passive: true });

      doc.addEventListener("visibilitychange", () => {
        if (doc.hidden && orbFrame) cancelAnimationFrame(orbFrame);
        if (doc.hidden) orbFrame = 0;
      });
      window.addEventListener("pagehide", () => {
        if (orbFrame) cancelAnimationFrame(orbFrame);
        orbFrame = 0;
      });

      doc.querySelectorAll("a, button, input, textarea, summary, [data-tilt]").forEach((item) => {
        item.addEventListener("pointerenter", () => orb.classList.add("is-active"));
        item.addEventListener("pointerleave", () => orb.classList.remove("is-active"));
      });
    }

    window.addEventListener("pointerdown", (event) => {
      const burst = doc.createElement("span");
      burst.className = "impact-burst";
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      body.append(burst);
      burst.addEventListener("animationend", () => burst.remove(), { once: true });
    }, { passive: true });

    doc.querySelectorAll(".magnetic").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .16;
        const y = (event.clientY - rect.top - rect.height / 2) * .16;
        item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      item.addEventListener("pointerleave", () => {
        item.style.transform = "";
      });
    });

    doc.querySelectorAll("[data-tilt]").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        item.style.setProperty("--tilt-x", `${(y - .5) * -4}deg`);
        item.style.setProperty("--tilt-y", `${(x - .5) * 4}deg`);
      });
      item.addEventListener("pointerleave", () => {
        item.style.setProperty("--tilt-x", "0deg");
        item.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  const hero = doc.querySelector("[data-cinematic-hero]");
  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--hero-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      hero.style.setProperty("--hero-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", "50%");
      hero.style.setProperty("--hero-y", "50%");
    });
  }


  const motionStage = doc.querySelector("[data-motion-stage]");
  if (motionStage && !reduceMotion) {
    let motionTicking = false;
    const updateMotionStage = () => {
      const rect = motionStage.getBoundingClientRect();
      const travel = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, travel));
      motionStage.style.setProperty("--kinetic-shift", `${(clamped - .5) * -120}px`);
      motionTicking = false;
    };
    const requestMotionUpdate = () => {
      if (motionTicking) return;
      motionTicking = true;
      requestAnimationFrame(updateMotionStage);
    };
    window.addEventListener("scroll", requestMotionUpdate, { passive: true });
    window.addEventListener("resize", requestMotionUpdate, { passive: true });
    updateMotionStage();
  }

  const processStory = doc.querySelector("[data-process-story]");
  if (processStory) {
    const scenes = [...processStory.querySelectorAll("[data-process-scene]")];
    const label = processStory.querySelector("[data-process-label]");
    const bar = processStory.querySelector("[data-process-bar]");
    let processTicking = false;

    const updateProcess = () => {
      const focus = window.innerHeight * .48;
      let current = 0;
      let closest = Infinity;
      scenes.forEach((scene, index) => {
        const rect = scene.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height * .42 - focus);
        if (distance < closest) {
          closest = distance;
          current = index;
        }
      });
      scenes.forEach((scene, index) => scene.classList.toggle("is-current", index === current));
      if (label) label.textContent = scenes[current]?.dataset.processLabel || "";
      if (bar) bar.style.setProperty("--process-progress", String((current + 1) / Math.max(1, scenes.length)));
      processTicking = false;
    };

    const requestProcessUpdate = () => {
      if (processTicking) return;
      processTicking = true;
      requestAnimationFrame(updateProcess);
    };

    window.addEventListener("scroll", requestProcessUpdate, { passive: true });
    window.addEventListener("resize", requestProcessUpdate, { passive: true });
    updateProcess();
  }

  const briefBuilder = doc.querySelector("[data-brief-builder]");
  if (briefBuilder) {
    const choices = [...briefBuilder.querySelectorAll("[data-brief-choice]")];
    const note = briefBuilder.querySelector("[data-brief-note]");
    const schedule = briefBuilder.querySelector("[data-brief-schedule]");
    const summary = briefBuilder.querySelector("[data-brief-summary]");
    const copyButton = briefBuilder.querySelector("[data-brief-copy]");
    const status = briefBuilder.querySelector("[data-brief-status]");
    const singleGroups = new Set(["제작 종류", "준비 상태"]);
    const state = new Map();

    const selectChoice = (choice, pressed) => {
      const group = choice.dataset.briefGroup || "";
      if (singleGroups.has(group) && pressed) {
        choices.filter((item) => item !== choice && item.dataset.briefGroup === group).forEach((item) => {
          item.setAttribute("aria-pressed", "false");
        });
      }
      choice.setAttribute("aria-pressed", String(pressed));
    };

    const selectedByGroup = (group) => choices
      .filter((item) => item.dataset.briefGroup === group && item.getAttribute("aria-pressed") === "true")
      .map((item) => item.dataset.briefValue || item.textContent.trim());

    const buildSummary = () => {
      state.set("제작 종류", selectedByGroup("제작 종류"));
      state.set("필요 기능", selectedByGroup("필요 기능"));
      state.set("준비 상태", selectedByGroup("준비 상태"));

      const lines = [];
      const types = state.get("제작 종류");
      const features = state.get("필요 기능");
      const readiness = state.get("준비 상태");
      if (types.length) lines.push(`만들 것: ${types.join(", ")}`);
      if (features.length) lines.push(`필요 기능: ${features.join(", ")}`);
      if (readiness.length) lines.push(`준비 상태: ${readiness.join(", ")}`);
      if (schedule?.value.trim()) lines.push(`희망 시기: ${schedule.value.trim()}`);
      if (note?.value.trim()) lines.push(`요청 내용:\n${note.value.trim()}`);

      if (summary) summary.textContent = lines.length ? lines.join("\n\n") : "고른 내용이 여기에 표시됩니다.";
      if (status) status.textContent = "";
      return lines.join("\n\n");
    };

    choices.forEach((choice) => {
      choice.addEventListener("click", () => {
        const pressed = choice.getAttribute("aria-pressed") !== "true";
        selectChoice(choice, pressed);
        buildSummary();
      });
    });
    note?.addEventListener("input", buildSummary);
    schedule?.addEventListener("input", buildSummary);

    const queryType = new URLSearchParams(window.location.search).get("type");
    if (queryType) {
      const matched = choices.find((item) => item.dataset.briefKey === queryType);
      if (matched) selectChoice(matched, true);
    }

    copyButton?.addEventListener("click", async () => {
      const text = buildSummary();
      if (!text) {
        if (status) status.textContent = "먼저 만들 것이나 하고 싶은 이야기를 적어주세요.";
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = "문의 내용을 복사했습니다.";
      } catch {
        const fallback = doc.createElement("textarea");
        fallback.value = text;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        body.append(fallback);
        fallback.select();
        const copied = doc.execCommand("copy");
        fallback.remove();
        if (status) status.textContent = copied ? "문의 내용을 복사했습니다." : "복사하지 못했습니다. 내용을 직접 선택해 주세요.";
      }
    });

    buildSummary();
  }
})();
