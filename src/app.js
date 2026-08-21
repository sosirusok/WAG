(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const sentinel = document.querySelector("[data-header-sentinel]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const main = document.querySelector("main");
  const footer = document.querySelector(".site-footer");
  const wordmark = document.querySelector(".wordmark");
  const mobileContactBar = document.querySelector(".mobile-contact-bar");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  let returnFocus = null;
  const setOutsideInert = (inert) => {
    [main, footer, wordmark, mobileContactBar].forEach((element) => {
      if (!element) return;
      if ("inert" in element) element.inert = inert;
      else if (inert) element.setAttribute("aria-hidden", "true");
      else element.removeAttribute("aria-hidden");
    });
  };

  const setMenu = (open, restoreFocus = false) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".menu-label").textContent = open ? "닫기" : "메뉴";
    mobileMenu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    header?.classList.toggle("menu-visible", open);
    setOutsideInert(open);
    if (open) {
      returnFocus = document.activeElement;
      mobileMenu.querySelector("a")?.focus();
    } else if (restoreFocus && returnFocus instanceof HTMLElement) {
      returnFocus.focus();
    }
  };

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true", true);
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (!mobileMenu || mobileMenu.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setMenu(false, true);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [menuToggle, ...mobileMenu.querySelectorAll("a, button")].filter((element) => element && !element.hasAttribute("disabled"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820 && mobileMenu && !mobileMenu.hidden) setMenu(false);
  }, { passive: true });

  const revealElements = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7%", threshold: 0.05 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const setupTabs = (rootSelector, buttonSelector, panelSelector, buttonAttribute, panelAttribute) => {
    document.querySelectorAll(rootSelector).forEach((root) => {
      const buttons = [...root.querySelectorAll(buttonSelector)];
      const panels = [...root.querySelectorAll(panelSelector)];
      if (!buttons.length || !panels.length) return;
      const activate = (button, focus = false) => {
        const value = button.getAttribute(buttonAttribute);
        buttons.forEach((item) => {
          const selected = item === button;
          item.setAttribute("aria-selected", String(selected));
          item.tabIndex = selected ? 0 : -1;
        });
        panels.forEach((panel) => { panel.hidden = panel.getAttribute(panelAttribute) !== value; });
        if (focus) button.focus();
      };
      buttons.forEach((button, index) => {
        button.tabIndex = button.getAttribute("aria-selected") === "true" ? 0 : -1;
        button.addEventListener("click", () => activate(button));
        button.addEventListener("keydown", (event) => {
          if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let nextIndex = index;
          if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (index + 1) % buttons.length;
          if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (index - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          activate(buttons[nextIndex], true);
        });
      });
    });
  };

  setupTabs("[data-showcase]", "[data-showcase-button]", "[data-showcase-panel]", "data-showcase-button", "data-showcase-panel");
  setupTabs("[data-service-explorer]", "[data-service-tab]", "[data-service-panel]", "data-service-tab", "data-service-panel");

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
    const singleGroups = new Set(["제작 종류", "준비 상태", "희망 일정"]);
    const requiredGroups = ["제작 종류", "필요 기능", "준비 상태", "희망 일정"];
    let currentStep = 1;

    const selectedValues = (group) => choices
      .filter((choice) => choice.dataset.scopeGroup === group && choice.getAttribute("aria-pressed") === "true")
      .map((choice) => choice.dataset.scopeValue);

    const summaryText = () => {
      const types = selectedValues("제작 종류");
      const features = selectedValues("필요 기능");
      const states = selectedValues("준비 상태");
      const schedules = selectedValues("희망 일정");
      if (![types, features, states, schedules].some((items) => items.length)) return "아직 선택한 내용이 없습니다.";
      return [
        "[WAG 외주 문의]",
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
      const groupByStep = ["제작 종류", "필요 기능", "준비 상태", "희망 일정"];
      return selectedValues(groupByStep[currentStep - 1]).length > 0;
    };

    const updateControls = () => {
      if (next) next.disabled = !isCurrentStepComplete();
      if (copyButton) copyButton.disabled = !isComplete();
    };

    const showStep = (step, moveFocus = true) => {
      currentStep = Math.min(Math.max(step, 1), steps.length);
      steps.forEach((item) => { item.hidden = Number(item.dataset.scopeStep) !== currentStep; });
      if (progress) progress.textContent = `${currentStep} / ${steps.length}`;
      if (progressBar) progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
      if (back) back.disabled = currentStep === 1;
      if (next) next.innerHTML = currentStep === steps.length ? '요약 확인 <span aria-hidden="true">↗</span>' : '다음 <span aria-hidden="true">→</span>';
      if (moveFocus) {
        steps[currentStep - 1]?.querySelector("button")?.focus({ preventScroll: true });
      }
      updateControls();
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

    copyButton?.addEventListener("click", async () => {
      try {
        await copyText(summaryText());
        if (copyStatus) copyStatus.textContent = "문의 내용이 복사되었습니다. 카카오 상담에서 붙여넣으시면 됩니다.";
      } catch {
        if (copyStatus) copyStatus.textContent = "복사하지 못했습니다. 위 내용을 직접 선택해 복사해 주세요.";
      }
    });

    const requestedType = new URLSearchParams(window.location.search).get("type");
    const requestedChoice = choices.find((choice) => choice.dataset.scopeKey === requestedType);
    if (requestedChoice) requestedChoice.setAttribute("aria-pressed", "true");

    updateSummary();
    showStep(1, false);
  });

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
