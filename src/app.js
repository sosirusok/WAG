(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const sentinel = document.querySelector("[data-header-sentinel]");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.documentElement.classList.add("motion-ready");
  let reduceMotion = motionQuery.matches;

  const siteProgress = document.querySelector("[data-site-progress]");
  let scrollFrame = 0;
  const updateScrollState = () => {
    scrollFrame = 0;
    if (!siteProgress) return;
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    siteProgress.style.transform = `scaleX(${progress})`;
  };
  const requestScrollState = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollState);
  };
  updateScrollState();
  window.addEventListener("scroll", requestScrollState, { passive: true });
  window.addEventListener("resize", requestScrollState, { passive: true });

  if (header && sentinel && "IntersectionObserver" in window) {
    const headerObserver = new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    });
    headerObserver.observe(sentinel);
  } else if (header) {
    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  const revealElements = document.querySelectorAll(".reveal");
  const revealAll = () => {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  };
  const revealAboveFold = () => {
    const revealFold = window.innerHeight + 24;
    revealElements.forEach((element) => {
      if (element.classList.contains("is-visible")) return;
      const rect = element.getBoundingClientRect();
      if (rect.top < revealFold && rect.bottom > 0) element.classList.add("is-visible");
    });
  };

  let revealObserver = null;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    revealAboveFold();
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "80px 0px -6%", threshold: 0.01 });
    revealElements.forEach((element) => {
      if (!element.classList.contains("is-visible")) revealObserver.observe(element);
    });
    window.requestAnimationFrame(revealAboveFold);
    window.addEventListener("load", revealAboveFold, { once: true });
  }

  const heroStage = document.querySelector(".hero-stage");
  let stageFrame = 0;
  let stageX = 0;
  let stageY = 0;

  const paintStage = () => {
    stageFrame = 0;
    if (!heroStage) return;
    heroStage.style.setProperty("--stage-x", `${stageX.toFixed(2)}px`);
    heroStage.style.setProperty("--stage-y", `${stageY.toFixed(2)}px`);
  };
  const requestStagePaint = () => {
    if (!stageFrame) stageFrame = window.requestAnimationFrame(paintStage);
  };
  const resetStage = () => {
    stageX = 0;
    stageY = 0;
    requestStagePaint();
  };

  heroStage?.addEventListener("pointermove", (event) => {
    if (reduceMotion || !finePointerQuery.matches || event.pointerType !== "mouse") return;
    const rect = heroStage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    stageX = Math.max(-1, Math.min(1, normalizedX)) * 8;
    stageY = Math.max(-1, Math.min(1, normalizedY)) * 6;
    requestStagePaint();
  }, { passive: true });
  heroStage?.addEventListener("pointerleave", resetStage, { passive: true });

  const ambientElements = [...document.querySelectorAll("[data-ambient]")];
  const ambientInlineTranslate = new Map(ambientElements.map((element) => [
    element,
    element.style.getPropertyValue("translate")
  ]));
  let ambientFrame = 0;
  let ambientPointerX = 0;
  let ambientPointerY = 0;

  const restoreAmbient = () => {
    if (ambientFrame) {
      window.cancelAnimationFrame(ambientFrame);
      ambientFrame = 0;
    }
    ambientElements.forEach((element) => {
      const initialTranslate = ambientInlineTranslate.get(element);
      if (initialTranslate) element.style.setProperty("translate", initialTranslate);
      else element.style.removeProperty("translate");
    });
  };
  const paintAmbient = () => {
    ambientFrame = 0;
    if (reduceMotion || !finePointerQuery.matches) {
      restoreAmbient();
      return;
    }
    const scrollOffset = Math.max(-3, Math.min(3, window.scrollY * -0.004));
    ambientElements.forEach((element) => {
      element.style.setProperty(
        "translate",
        `${ambientPointerX.toFixed(2)}px ${(ambientPointerY + scrollOffset).toFixed(2)}px`
      );
    });
  };
  const requestAmbientPaint = () => {
    if (ambientElements.length && !ambientFrame) {
      ambientFrame = window.requestAnimationFrame(paintAmbient);
    }
  };

  window.addEventListener("pointermove", (event) => {
    if (reduceMotion || !finePointerQuery.matches || event.pointerType !== "mouse") return;
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    ambientPointerX = Math.max(-1, Math.min(1, (event.clientX / width) * 2 - 1)) * 6;
    ambientPointerY = Math.max(-1, Math.min(1, (event.clientY / height) * 2 - 1)) * 6;
    requestAmbientPaint();
  }, { passive: true });
  window.addEventListener("scroll", requestAmbientPaint, { passive: true });

  const projectVisuals = [...document.querySelectorAll("[data-project-visual]")];
  const projectStates = projectVisuals.map((visual) => {
    const tiltTarget = visual.querySelector("[data-project-tilt]") || visual;
    const media = visual.matches("img, video") ? visual : visual.querySelector("img, video");
    return {
      visual,
      tiltTarget,
      media,
      initialTransform: tiltTarget.style.getPropertyValue("transform"),
      initialScale: media?.style.getPropertyValue("scale") || "",
      rotateX: 0,
      rotateY: 0,
      active: false
    };
  });
  let projectFrame = 0;

  const restoreProjectState = (state) => {
    if (state.initialTransform) state.tiltTarget.style.setProperty("transform", state.initialTransform);
    else state.tiltTarget.style.removeProperty("transform");
    if (!state.media) return;
    if (state.initialScale) state.media.style.setProperty("scale", state.initialScale);
    else state.media.style.removeProperty("scale");
  };
  const paintProjects = () => {
    projectFrame = 0;
    projectStates.forEach((state) => {
      if (reduceMotion || !finePointerQuery.matches || !state.active) {
        restoreProjectState(state);
        return;
      }
      const baseTransform = state.initialTransform ? `${state.initialTransform} ` : "";
      state.tiltTarget.style.setProperty(
        "transform",
        `${baseTransform}perspective(1100px) rotateX(${state.rotateX.toFixed(3)}deg) rotateY(${state.rotateY.toFixed(3)}deg)`
      );
      state.media?.style.setProperty("scale", "1.01");
    });
  };
  const requestProjectPaint = () => {
    if (projectStates.length && !projectFrame) {
      projectFrame = window.requestAnimationFrame(paintProjects);
    }
  };
  const resetProjects = () => {
    projectStates.forEach((state) => {
      state.active = false;
      state.rotateX = 0;
      state.rotateY = 0;
    });
    requestProjectPaint();
  };

  projectStates.forEach((state) => {
    state.visual.addEventListener("pointermove", (event) => {
      if (reduceMotion || !finePointerQuery.matches || event.pointerType !== "mouse") return;
      const rect = state.visual.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      state.rotateX = normalizedY * -1.2;
      state.rotateY = normalizedX * 1.2;
      state.active = true;
      requestProjectPaint();
    }, { passive: true });
    const resetProject = () => {
      state.active = false;
      state.rotateX = 0;
      state.rotateY = 0;
      requestProjectPaint();
    };
    state.visual.addEventListener("pointerleave", resetProject, { passive: true });
    state.visual.addEventListener("pointercancel", resetProject, { passive: true });
  });

  const handleMotionChange = (event) => {
    reduceMotion = event.matches;
    if (reduceMotion) {
      revealObserver?.disconnect();
      revealAll();
      resetStage();
      restoreAmbient();
      resetProjects();
    } else {
      requestAmbientPaint();
    }
  };
  motionQuery.addEventListener?.("change", handleMotionChange);
  finePointerQuery.addEventListener?.("change", (event) => {
    if (!event.matches) {
      resetStage();
      restoreAmbient();
      resetProjects();
    } else if (!reduceMotion) {
      requestAmbientPaint();
    }
  });

  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      document.querySelectorAll(".faq-item[open]").forEach((other) => {
        if (other !== item) other.removeAttribute("open");
      });
    });
  });

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        fallbackCopy(text);
        return;
      }
    }
    fallbackCopy(text);
  };

  document.querySelectorAll("[data-scope-builder]").forEach((builder) => {
    const steps = [...builder.querySelectorAll("[data-scope-step]")];
    const choices = [...builder.querySelectorAll("[data-scope-choice]")];
    const back = builder.querySelector("[data-scope-back]");
    const next = builder.querySelector("[data-scope-next]");
    const progress = builder.querySelector("[data-scope-progress]");
    const progressBar = builder.querySelector("[data-scope-progress-bar]");
    const summary = builder.querySelector("[data-scope-summary]");
    const copyButton = builder.querySelector("[data-scope-copy]");
    const copyStatus = builder.querySelector("[data-copy-status]");
    const jumpButtons = [...builder.querySelectorAll("[data-scope-jump]")];
    const singleGroups = new Set(["제작 종류", "준비 상태", "희망 일정"]);
    const requiredGroups = ["제작 종류", "필요 기능", "준비 상태", "희망 일정"];
    const groupByStep = ["제작 종류", "필요 기능", "준비 상태", "희망 일정"];
    const storageKey = "swag-scope-builder-v1";
    let currentStep = 1;

    const selectedValues = (group) => choices
      .filter((choice) => choice.dataset.scopeGroup === group && choice.getAttribute("aria-pressed") === "true")
      .map((choice) => choice.dataset.scopeValue);

    const summaryText = () => {
      const types = selectedValues("제작 종류");
      const features = selectedValues("필요 기능");
      const states = selectedValues("준비 상태");
      const schedules = selectedValues("희망 일정");
      if (![types, features, states, schedules].some((items) => items.length)) return "아직 선택한 내용이 없습니다";
      return [
        "[SWAG 제작 문의]",
        `제작 종류: ${types.join(", ") || "선택 전"}`,
        `필요 기능: ${features.join(", ") || "선택 전"}`,
        `준비 상태: ${states.join(", ") || "선택 전"}`,
        `희망 일정: ${schedules.join(", ") || "선택 전"}`
      ].join("\n");
    };

    const updateSummary = () => {
      if (summary) summary.textContent = summaryText();
      if (copyStatus) copyStatus.textContent = "";
    };

    const isComplete = () => requiredGroups.every((group) => selectedValues(group).length > 0);

    const isCurrentStepComplete = () => {
      return selectedValues(groupByStep[currentStep - 1]).length > 0;
    };

    const saveBuilderState = () => {
      try {
        const selected = choices
          .filter((choice) => choice.getAttribute("aria-pressed") === "true")
          .map((choice) => ({ group: choice.dataset.scopeGroup, value: choice.dataset.scopeValue }));
        sessionStorage.setItem(storageKey, JSON.stringify({ step: currentStep, selected }));
      } catch {
        // The builder still works when session storage is unavailable.
      }
    };

    const restoreBuilderState = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        if (!saved || !Array.isArray(saved.selected)) return;
        choices.forEach((choice) => {
          const selected = saved.selected.some((item) => item.group === choice.dataset.scopeGroup && item.value === choice.dataset.scopeValue);
          choice.setAttribute("aria-pressed", String(selected));
        });
        if (Number.isInteger(saved.step)) currentStep = Math.min(Math.max(saved.step, 1), steps.length);
      } catch {
        // Ignore stale or unavailable session data.
      }
    };

    const updateControls = () => {
      if (next) next.disabled = !isCurrentStepComplete();
      if (copyButton) copyButton.disabled = !isComplete();
      jumpButtons.forEach((button, index) => {
        button.dataset.complete = String(selectedValues(groupByStep[index]).length > 0);
      });
    };

    const showStep = (step, moveFocus = true) => {
      currentStep = Math.min(Math.max(step, 1), steps.length);
      steps.forEach((item) => { item.hidden = Number(item.dataset.scopeStep) !== currentStep; });
      if (progress) progress.textContent = `${currentStep} / ${steps.length}`;
      if (progressBar) progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
      if (back) back.disabled = currentStep === 1;
      if (next) next.innerHTML = currentStep === steps.length ? '요약 확인 <span aria-hidden="true">↗</span>' : '다음 <span aria-hidden="true">→</span>';
      jumpButtons.forEach((button) => {
        if (Number(button.dataset.scopeJump) === currentStep) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      if (moveFocus) {
        steps[currentStep - 1]?.querySelector("button")?.focus({ preventScroll: true });
      }
      updateControls();
      saveBuilderState();
    };

    choices.forEach((choice) => {
      choice.addEventListener("click", () => {
        const group = choice.dataset.scopeGroup;
        const pressed = choice.getAttribute("aria-pressed") === "true";
        if (singleGroups.has(group)) {
          choices.filter((item) => item.dataset.scopeGroup === group).forEach((item) => item.setAttribute("aria-pressed", "false"));
          choice.setAttribute("aria-pressed", "true");
        } else {
          choice.setAttribute("aria-pressed", String(!pressed));
        }
        updateSummary();
        updateControls();
        saveBuilderState();
      });
    });

    back?.addEventListener("click", () => showStep(currentStep - 1));
    next?.addEventListener("click", () => {
      if (currentStep < steps.length) showStep(currentStep + 1);
      else {
        summary?.setAttribute("tabindex", "-1");
        summary?.focus();
      }
    });

    jumpButtons.forEach((button) => {
      button.addEventListener("click", () => showStep(Number(button.dataset.scopeJump)));
    });

    copyButton?.addEventListener("click", async () => {
      try {
        await copyText(summaryText());
        if (copyStatus) copyStatus.textContent = "문의 내용이 복사됐습니다 카카오 상담에 붙여넣으시면 됩니다";
      } catch {
        if (copyStatus) copyStatus.textContent = "복사하지 못했습니다 위 내용을 직접 선택해 복사해 주세요";
      }
    });

    restoreBuilderState();

    const requestedType = new URLSearchParams(window.location.search).get("type");
    const requestedChoice = choices.find((choice) => choice.dataset.scopeKey === requestedType);
    if (requestedChoice) {
      choices.filter((choice) => choice.dataset.scopeGroup === "제작 종류").forEach((choice) => choice.setAttribute("aria-pressed", "false"));
      requestedChoice.setAttribute("aria-pressed", "true");
      currentStep = 1;
    }

    updateSummary();
    showStep(currentStep, false);
  });

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
