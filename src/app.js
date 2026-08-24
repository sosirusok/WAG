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
      const parsedDepth = Number.parseFloat(element.dataset.ambientDepth || "1");
      const depth = Number.isFinite(parsedDepth) ? Math.max(.1, Math.min(parsedDepth, 1.6)) : 1;
      element.style.setProperty(
        "translate",
        `${(ambientPointerX * depth).toFixed(2)}px ${((ambientPointerY * depth) + (scrollOffset * depth)).toFixed(2)}px`
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

  const brandHero = document.querySelector("[data-brand-hero]");
  if (brandHero) {
    const resetBrandLight = () => {
      brandHero.style.setProperty("--brand-pointer-x", "72%");
      brandHero.style.setProperty("--brand-pointer-y", "23%");
      brandHero.style.setProperty("--brand-shift-x", "0px");
      brandHero.style.setProperty("--brand-shift-y", "0px");
      brandHero.style.setProperty("--brand-scene-x", "0px");
      brandHero.style.setProperty("--brand-scene-y", "0px");
    };
    resetBrandLight();
    brandHero.addEventListener("pointermove", (event) => {
      if (reduceMotion || !finePointerQuery.matches || event.pointerType !== "mouse") return;
      const rect = brandHero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(8, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100));
      brandHero.style.setProperty("--brand-pointer-x", `${x.toFixed(1)}%`);
      brandHero.style.setProperty("--brand-pointer-y", `${y.toFixed(1)}%`);
      brandHero.style.setProperty("--brand-shift-x", `${((x - 50) * .035).toFixed(2)}px`);
      brandHero.style.setProperty("--brand-shift-y", `${((y - 50) * .035).toFixed(2)}px`);
      brandHero.style.setProperty("--brand-scene-x", `${((x - 50) * .055).toFixed(2)}px`);
      brandHero.style.setProperty("--brand-scene-y", `${((y - 50) * .045).toFixed(2)}px`);
    }, { passive: true });
    brandHero.addEventListener("pointerleave", resetBrandLight, { passive: true });
    brandHero.addEventListener("pointercancel", resetBrandLight, { passive: true });
  }

  const homeHero = document.querySelector("[data-home-hero]");
  const homeCanvas = homeHero?.querySelector("[data-home-canvas]");
  const homeContext = homeCanvas?.getContext("2d", { alpha: true });
  let homePointerX = .72;
  let homePointerY = .36;
  let homeCanvasWidth = 0;
  let homeCanvasHeight = 0;
  let homeAnimationFrame = 0;
  let homeVisible = true;

  const resizeHomeCanvas = () => {
    if (!homeHero || !homeCanvas || !homeContext) return;
    const rect = homeHero.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    homeCanvasWidth = Math.max(1, rect.width);
    homeCanvasHeight = Math.max(1, rect.height);
    homeCanvas.width = Math.round(homeCanvasWidth * pixelRatio);
    homeCanvas.height = Math.round(homeCanvasHeight * pixelRatio);
    homeCanvas.style.width = `${homeCanvasWidth}px`;
    homeCanvas.style.height = `${homeCanvasHeight}px`;
    homeContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const drawHomeField = (time = 0) => {
    if (!homeContext || !homeCanvasWidth || !homeCanvasHeight) return;
    homeContext.clearRect(0, 0, homeCanvasWidth, homeCanvasHeight);
    const motionTime = reduceMotion ? 0 : time * .00014;
    const pointerOffsetX = (homePointerX - .5) * 20;
    const pointerOffsetY = (homePointerY - .5) * 14;

    for (let line = 0; line < 4; line += 1) {
      const phase = motionTime + line * .72;
      const baseY = homeCanvasHeight * (.2 + line * .2);
      const amplitude = homeCanvasHeight * (.032 + line * .006);
      const gradient = homeContext.createLinearGradient(0, 0, homeCanvasWidth, 0);
      gradient.addColorStop(0, "rgba(38,118,165,0)");
      gradient.addColorStop(.34, `rgba(38,118,165,${.08 + line * .018})`);
      gradient.addColorStop(.72, `rgba(115,191,226,${.17 + line * .012})`);
      gradient.addColorStop(1, "rgba(38,118,165,0)");
      homeContext.beginPath();
      for (let x = 0; x <= homeCanvasWidth + 12; x += 12) {
        const ratio = x / homeCanvasWidth;
        const pointerWeight = Math.exp(-Math.pow((ratio - homePointerX) * 3.2, 2));
        const y = baseY
          + Math.sin(ratio * 7.2 + phase) * amplitude
          + Math.sin(ratio * 2.5 - phase * 1.4) * amplitude * .58
          + pointerOffsetY * pointerWeight;
        if (x === 0) homeContext.moveTo(x, y);
        else homeContext.lineTo(x + pointerOffsetX * pointerWeight, y);
      }
      homeContext.strokeStyle = gradient;
      homeContext.lineWidth = line === 2 ? 1.25 : .75;
      homeContext.stroke();
    }

    const pointCount = homeCanvasWidth < 700 ? 15 : 26;
    for (let point = 0; point < pointCount; point += 1) {
      const seed = point * 91.73;
      const x = ((seed * 13.17 + motionTime * 34) % 1000) / 1000 * homeCanvasWidth;
      const y = ((seed * 7.31) % 1000) / 1000 * homeCanvasHeight;
      const pulse = .25 + Math.sin(motionTime * 5 + point) * .15;
      homeContext.beginPath();
      homeContext.arc(x, y, point % 5 === 0 ? 1.6 : .8, 0, Math.PI * 2);
      homeContext.fillStyle = `rgba(40,126,176,${Math.max(.08, pulse)})`;
      homeContext.fill();
    }
  };

  const animateHomeField = (time) => {
    homeAnimationFrame = 0;
    drawHomeField(time);
    if (!reduceMotion && homeVisible) homeAnimationFrame = window.requestAnimationFrame(animateHomeField);
  };

  const requestHomeField = () => {
    if (!homeAnimationFrame && homeVisible) homeAnimationFrame = window.requestAnimationFrame(animateHomeField);
  };

  if (homeHero && homeCanvas && homeContext) {
    resizeHomeCanvas();
    drawHomeField();
    requestHomeField();
    window.addEventListener("resize", () => {
      resizeHomeCanvas();
      drawHomeField();
    }, { passive: true });
    homeHero.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = homeHero.getBoundingClientRect();
      homePointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
      homePointerY = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1)));
      if (!reduceMotion) {
        homeHero.style.setProperty("--hero-x", `${((homePointerX - .5) * -8).toFixed(2)}px`);
        homeHero.style.setProperty("--hero-y", `${((homePointerY - .5) * -6).toFixed(2)}px`);
      }
    }, { passive: true });
    homeHero.addEventListener("pointerleave", () => {
      homePointerX = .72;
      homePointerY = .36;
      homeHero.style.setProperty("--hero-x", "0px");
      homeHero.style.setProperty("--hero-y", "0px");
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      const homeObserver = new IntersectionObserver(([entry]) => {
        homeVisible = entry.isIntersecting;
        if (homeVisible) requestHomeField();
        else if (homeAnimationFrame) {
          window.cancelAnimationFrame(homeAnimationFrame);
          homeAnimationFrame = 0;
        }
      }, { threshold: 0 });
      homeObserver.observe(homeHero);
    }
  }

  const processRoot = document.querySelector("[data-process]");
  const processChapters = processRoot ? [...processRoot.querySelectorAll("[data-process-step]")] : [];
  const processCurrent = processRoot?.querySelector("[data-process-current]");
  const processProgress = processRoot?.querySelector("[data-process-progress]");
  let processActiveIndex = -1;
  const setProcessStep = (index) => {
    if (!processChapters.length) return;
    const nextIndex = Math.max(0, Math.min(index, processChapters.length - 1));
    if (nextIndex === processActiveIndex) return;
    processActiveIndex = nextIndex;
    processChapters.forEach((chapter, chapterIndex) => chapter.classList.toggle("is-current", chapterIndex === nextIndex));
    if (processCurrent) processCurrent.textContent = processChapters[nextIndex].dataset.processNumber || String(nextIndex + 1).padStart(2, "0");
    if (processProgress) {
      const progress = processChapters.length === 1 ? 100 : (nextIndex / (processChapters.length - 1)) * 100;
      processProgress.style.height = `${progress}%`;
    }
  };
  if (processChapters.length) {
    setProcessStep(0);
    if ("IntersectionObserver" in window) {
      const processObserver = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setProcessStep(processChapters.indexOf(visible.target));
      }, { rootMargin: "-28% 0px -48%", threshold: [0, .1, .25, .5] });
      processChapters.forEach((chapter) => processObserver.observe(chapter));
    } else {
      processChapters.forEach((chapter) => chapter.classList.add("is-current"));
    }
  }

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
      restoreAmbient();
      resetProjects();
      if (homeAnimationFrame) {
        window.cancelAnimationFrame(homeAnimationFrame);
        homeAnimationFrame = 0;
      }
      homeHero?.style.setProperty("--hero-x", "0px");
      homeHero?.style.setProperty("--hero-y", "0px");
      drawHomeField();
    } else {
      requestAmbientPaint();
      requestHomeField();
    }
  };
  motionQuery.addEventListener?.("change", handleMotionChange);
  finePointerQuery.addEventListener?.("change", (event) => {
    if (!event.matches) {
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
    textarea.readOnly = true;
    textarea.tabIndex = -1;
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("copy failed");
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
    const progressMeter = builder.querySelector(".scope-progress");
    const summary = builder.querySelector("[data-scope-summary]");
    const copyButton = builder.querySelector("[data-scope-copy]");
    const copyStatus = builder.querySelector("[data-copy-status]");
    const formStatus = builder.querySelector("[data-scope-form-status]");
    const jumpButtons = [...builder.querySelectorAll("[data-scope-jump]")];
    const scheduleInput = builder.querySelector("[data-scope-schedule]");
    const editButton = builder.querySelector("[data-scope-edit]");
    const summaryTitle = builder.querySelector("#summary-title");
    const singleGroups = new Set(["제작 종류", "준비 상태"]);
    const requiredChoiceGroups = ["제작 종류", "필요 기능", "준비 상태"];
    const groupByStep = ["제작 종류", "필요 기능", "준비 상태", "희망 일정"];
    const storageKey = "swag-scope-builder-v2";
    let currentStep = 1;

    const selectedValues = (group) => choices
      .filter((choice) => choice.dataset.scopeGroup === group && choice.getAttribute("aria-pressed") === "true")
      .map((choice) => choice.dataset.scopeValue);

    const scheduleValue = () => scheduleInput?.value.trim() || "";
    const groupHasValue = (group) => group === "희망 일정"
      ? scheduleValue().length > 0
      : selectedValues(group).length > 0;

    const summaryText = () => {
      const types = selectedValues("제작 종류");
      const features = selectedValues("필요 기능");
      const states = selectedValues("준비 상태");
      const schedule = scheduleValue();
      if (![types, features, states].some((items) => items.length) && !schedule) return "아직 입력한 내용이 없습니다";
      return [
        "[SWAG 제작 문의]",
        `제작 종류: ${types.join(", ") || "선택 전"}`,
        `필요 기능: ${features.join(", ") || "선택 전"}`,
        `준비 상태: ${states.join(", ") || "선택 전"}`,
        `희망 기간: ${schedule || "입력 전"}`
      ].join("\n");
    };

    const updateSummary = () => {
      if (summary) summary.textContent = summaryText();
      if (copyStatus) copyStatus.textContent = "";
    };

    const isComplete = () => requiredChoiceGroups.every(groupHasValue) && groupHasValue("희망 일정");
    const isCurrentStepComplete = () => groupHasValue(groupByStep[currentStep - 1]);
    const firstIncompleteStep = () => groupByStep.findIndex((group) => !groupHasValue(group)) + 1;

    const saveBuilderState = () => {
      try {
        const selected = choices
          .filter((choice) => choice.getAttribute("aria-pressed") === "true")
          .map((choice) => ({ group: choice.dataset.scopeGroup, value: choice.dataset.scopeValue }));
        sessionStorage.setItem(storageKey, JSON.stringify({ step: currentStep, selected, schedule: scheduleValue() }));
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
        if (scheduleInput && typeof saved.schedule === "string") scheduleInput.value = saved.schedule;
        if (Number.isInteger(saved.step)) currentStep = Math.min(Math.max(saved.step, 1), steps.length);
      } catch {
        // Ignore stale or unavailable session data.
      }
    };

    const updateControls = () => {
      if (next) next.disabled = !isCurrentStepComplete();
      if (copyButton) copyButton.disabled = !isComplete();
      jumpButtons.forEach((button, index) => {
        const complete = groupHasValue(groupByStep[index]);
        button.dataset.complete = String(complete);
        button.setAttribute("aria-label", `${index + 1}단계 ${groupByStep[index]} ${complete ? "완료" : "미완료"}`);
      });
    };

    const showStep = (step, moveFocus = true) => {
      builder.classList.remove("is-reviewing");
      if (editButton) editButton.hidden = true;
      if (summaryTitle) summaryTitle.textContent = "선택한 내용";
      currentStep = Math.min(Math.max(step, 1), steps.length);
      steps.forEach((item) => { item.hidden = Number(item.dataset.scopeStep) !== currentStep; });
      if (progress) progress.textContent = `${currentStep} / ${steps.length}`;
      if (progressBar) progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
      if (progressMeter) {
        progressMeter.setAttribute("aria-valuenow", String(currentStep));
        progressMeter.setAttribute("aria-valuetext", `${currentStep}단계 / ${steps.length}단계`);
      }
      if (formStatus) formStatus.textContent = "";
      if (back) back.disabled = currentStep === 1;
      if (next) next.innerHTML = currentStep === steps.length ? '요약 확인 <span aria-hidden="true">↗</span>' : '다음 <span aria-hidden="true">→</span>';
      jumpButtons.forEach((button) => {
        if (Number(button.dataset.scopeJump) === currentStep) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      if (moveFocus) {
        steps[currentStep - 1]?.querySelector("button, input, textarea")?.focus({ preventScroll: true });
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

    scheduleInput?.addEventListener("input", () => {
      updateSummary();
      updateControls();
      saveBuilderState();
    });

    back?.addEventListener("click", () => showStep(currentStep - 1));
    next?.addEventListener("click", () => {
      if (currentStep < steps.length) showStep(currentStep + 1);
      else {
        const incompleteStep = firstIncompleteStep();
        if (incompleteStep > 0) {
          showStep(incompleteStep);
          if (formStatus) formStatus.textContent = `${groupByStep[incompleteStep - 1]} 항목을 먼저 입력해 주세요`;
          return;
        }
        updateSummary();
        builder.classList.add("is-reviewing");
        if (editButton) editButton.hidden = false;
        if (summaryTitle) summaryTitle.textContent = "상담 내용 확인";
        window.requestAnimationFrame(() => {
          builder.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          summaryTitle?.focus({ preventScroll: true });
        });
      }
    });

    editButton?.addEventListener("click", () => {
      showStep(1, false);
      builder.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      steps[0]?.querySelector("button, input, textarea")?.focus({ preventScroll: true });
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
      choices.forEach((choice) => choice.setAttribute("aria-pressed", "false"));
      requestedChoice.setAttribute("aria-pressed", "true");
      if (scheduleInput) scheduleInput.value = "";
      currentStep = 1;
    }

    updateSummary();
    showStep(currentStep, false);
  });

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
