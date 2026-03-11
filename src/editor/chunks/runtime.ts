export function shouldInjectInteractiveChunkRuntime(html: string) {
  return /data-vi-runtime="required"/i.test(html);
}

export function getInteractiveChunkRuntimeScript() {
  return `(() => {
  if (window.__viChunkRuntimeLoaded) {
    return;
  }
  window.__viChunkRuntimeLoaded = true;

  function setupTabs(root) {
    root.querySelectorAll('[data-vi-component="tabs"]').forEach((tabs) => {
      const buttons = Array.from(tabs.querySelectorAll('[data-vi-tab]'));
      const panels = Array.from(tabs.querySelectorAll('[data-vi-panel]'));

      function activate(index) {
        buttons.forEach((button, buttonIndex) => {
          const active = buttonIndex === index;
          button.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach((panel, panelIndex) => {
          panel.hidden = panelIndex !== index;
        });
      }

      buttons.forEach((button, index) => {
        button.addEventListener('click', () => activate(index));
      });

      activate(0);
    });
  }

  function setupStepper(root) {
    root.querySelectorAll('[data-vi-component="stepper"]').forEach((stepper) => {
      const steps = Array.from(stepper.querySelectorAll('[data-vi-step]'));
      if (steps.length === 0) {
        return;
      }

      let index = 0;
      const previousButton = stepper.querySelector('[data-vi-stepper-prev]');
      const nextButton = stepper.querySelector('[data-vi-stepper-next]');

      function render() {
        steps.forEach((step, stepIndex) => {
          step.hidden = stepIndex !== index;
        });
      }

      previousButton?.addEventListener('click', () => {
        index = Math.max(0, index - 1);
        render();
      });

      nextButton?.addEventListener('click', () => {
        index = Math.min(steps.length - 1, index + 1);
        render();
      });

      render();
    });
  }

  function setupBeforeAfter(root) {
    root.querySelectorAll('[data-vi-component="before-after"]').forEach((slider) => {
      const range = slider.querySelector('[data-vi-slider-range]');
      const after = slider.querySelector('[data-vi-slider-after]');
      if (!range || !after) {
        return;
      }

      function apply() {
        const value = Number(range.value || 50);
        after.style.clipPath = 'inset(0 0 0 ' + value + '%)';
      }

      range.addEventListener('input', apply);
      apply();
    });
  }

  function setupScrollCarousel(root) {
    root.querySelectorAll('[data-vi-component="scroll-carousel"]').forEach((container) => {
      const track = container.querySelector('[data-vi-carousel-track]');
      if (!track || track.dataset.viCarouselBound === 'true') {
        return;
      }

      track.dataset.viCarouselBound = 'true';
      const previousButton = container.querySelector('[data-vi-carousel-prev]');
      const nextButton = container.querySelector('[data-vi-carousel-next]');
      const fallbackStep = Math.max(140, Math.round(track.clientWidth * 0.72));
      const configuredStep = Number(container.getAttribute('data-vi-scroll-step') || '');
      const step = Number.isFinite(configuredStep) && configuredStep > 0 ? configuredStep : fallbackStep;

      function updateDisabledState() {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        if (previousButton) {
          previousButton.disabled = track.scrollLeft <= 2;
        }
        if (nextButton) {
          nextButton.disabled = track.scrollLeft >= maxScroll - 2;
        }
      }

      function scrollBy(direction) {
        track.scrollBy({ left: direction * step, behavior: 'smooth' });
      }

      previousButton?.addEventListener('click', () => scrollBy(-1));
      nextButton?.addEventListener('click', () => scrollBy(1));
      track.addEventListener('scroll', updateDisabledState, { passive: true });
      window.addEventListener('resize', updateDisabledState);
      updateDisabledState();
    });
  }

  function setupLightbox(root) {
    root.querySelectorAll('[data-vi-component="lightbox"]').forEach((gallery) => {
      const overlay = gallery.querySelector('[data-vi-lightbox-overlay]');
      const previewImage = gallery.querySelector('[data-vi-lightbox-image]');
      const closeButton = gallery.querySelector('[data-vi-lightbox-close]');

      gallery.querySelectorAll('[data-vi-lightbox-src]').forEach((button) => {
        button.addEventListener('click', () => {
          const source = button.getAttribute('data-vi-lightbox-src') || '';
          if (previewImage) {
            previewImage.setAttribute('src', source);
          }
          if (overlay) {
            overlay.hidden = false;
          }
        });
      });

      closeButton?.addEventListener('click', () => {
        if (overlay) {
          overlay.hidden = true;
        }
      });
    });
  }

  function setupDismissible(root) {
    root.querySelectorAll('[data-vi-component="dismissible"]').forEach((container) => {
      const button = container.querySelector('[data-vi-dismiss]');
      button?.addEventListener('click', () => {
        container.remove();
      });
    });
  }

  function setupPoll(root) {
    root.querySelectorAll('[data-vi-component="poll"]').forEach((poll) => {
      const status = poll.querySelector('[data-vi-poll-status]');
      poll.querySelectorAll('[data-vi-poll-option]').forEach((option) => {
        option.addEventListener('click', () => {
          poll.querySelectorAll('[data-vi-poll-option]').forEach((candidate) => candidate.classList.remove('is-selected'));
          option.classList.add('is-selected');
          if (status) {
            status.textContent = 'Selection captured.';
          }
        });
      });
    });
  }

  function setupQuiz(root) {
    root.querySelectorAll('[data-vi-component="quiz"]').forEach((quiz) => {
      const status = quiz.querySelector('[data-vi-quiz-status]');
      quiz.querySelectorAll('[data-vi-quiz-option]').forEach((option) => {
        option.addEventListener('click', () => {
          const isCorrect = option.getAttribute('data-vi-correct') === 'true';
          quiz.querySelectorAll('[data-vi-quiz-option]').forEach((candidate) => candidate.classList.remove('is-correct', 'is-wrong'));
          option.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
          if (status) {
            status.textContent = isCorrect ? 'Correct answer.' : 'Try another option.';
          }
        });
      });
    });
  }

  function setupFilter(root) {
    root.querySelectorAll('[data-vi-component="filter"]').forEach((container) => {
      const buttons = Array.from(container.querySelectorAll('[data-vi-filter-key]'));
      const cards = Array.from(container.querySelectorAll('[data-vi-filter-item]'));
      const status = container.querySelector('[data-vi-filter-status]');
      let activeKey = '';

      function applyFilter(nextKey) {
        activeKey = nextKey;

        cards.forEach((card) => {
          const itemKey = card.getAttribute('data-vi-filter-item') || '';
          card.hidden = Boolean(activeKey) && activeKey !== itemKey;
        });

        buttons.forEach((button) => {
          const key = button.getAttribute('data-vi-filter-key') || '';
          const isActive = key === activeKey && Boolean(activeKey);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          if (isActive) {
            button.classList.add('is-selected');
          } else {
            button.classList.remove('is-selected');
          }
        });

        if (status) {
          status.textContent = activeKey ? 'Showing: ' + activeKey : 'Showing all items.';
        }
      }

      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.getAttribute('data-vi-filter-key') || '';
          applyFilter(key === activeKey ? '' : key);
        });
      });

      applyFilter('');
    });
  }

  function setupSort(root) {
    root.querySelectorAll('[data-vi-component="sort"]').forEach((container) => {
      const cards = Array.from(container.querySelectorAll('[data-vi-filter-item], .vi-card-grid > li'));
      const controls = container.querySelector('.vi-filter-controls') || container.querySelector('div');
      const grid = container.querySelector('.vi-card-grid') || container.querySelector('ol') || container.querySelector('ul');
      if (cards.length === 0 || !controls || !grid) {
        return;
      }

      let asc = controls.querySelector('[data-vi-sort-asc]');
      let desc = controls.querySelector('[data-vi-sort-desc]');

      if (!asc && !desc) {
        controls.insertAdjacentHTML('beforeend', '<button type="button" data-vi-sort-asc>Sort A-Z</button><button type="button" data-vi-sort-desc>Sort Z-A</button>');
        asc = controls.querySelector('[data-vi-sort-asc]');
        desc = controls.querySelector('[data-vi-sort-desc]');
      }

      const fallbackAsc = controls.querySelector('[data-vi-filter-key="asc"]');
      const fallbackDesc = controls.querySelector('[data-vi-filter-key="desc"]');
      asc = asc || fallbackAsc;
      desc = desc || fallbackDesc;

      function getSortValue(node) {
        const explicit = Number(node.getAttribute('data-vi-sort-value') || '');
        if (Number.isFinite(explicit)) {
          return explicit;
        }
        const parsed = Number((node.textContent || '').replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
      }

      function render(sorted) {
        cards.forEach((card) => card.remove());
        sorted.forEach((card) => grid.appendChild(card));
      }

      asc?.addEventListener('click', () => {
        render([...cards].sort((left, right) => {
          const leftNumber = getSortValue(left);
          const rightNumber = getSortValue(right);
          if (leftNumber != null && rightNumber != null) {
            return leftNumber - rightNumber;
          }
          return (left.textContent || '').localeCompare(right.textContent || '');
        }));
      });

      desc?.addEventListener('click', () => {
        render([...cards].sort((left, right) => {
          const leftNumber = getSortValue(left);
          const rightNumber = getSortValue(right);
          if (leftNumber != null && rightNumber != null) {
            return rightNumber - leftNumber;
          }
          return (right.textContent || '').localeCompare(left.textContent || '');
        }));
      });
    });
  }

  function setupFootnote(root) {
    root.querySelectorAll('[data-vi-component="footnote"]').forEach((trigger) => {
      if (trigger.dataset.viFootnoteBound === 'true') {
        return;
      }
      trigger.dataset.viFootnoteBound = 'true';

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const footnoteId = trigger.getAttribute('data-vi-footnote') || '';
        const scope = trigger.closest('li') || trigger.parentElement || root;
        const popover = scope.querySelector('[data-vi-footnote-popover="' + footnoteId + '"]');
        if (!popover) {
          return;
        }

        const currentlyExpanded = trigger.getAttribute('aria-expanded') === 'true';
        root.querySelectorAll('[data-vi-footnote-popover]').forEach((candidate) => {
          candidate.hidden = true;
        });
        root.querySelectorAll('[data-vi-component="footnote"]').forEach((candidate) => {
          candidate.setAttribute('aria-expanded', 'false');
        });

        if (!currentlyExpanded) {
          popover.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    if (document.body.dataset.viFootnoteDismissBound === 'true') {
      return;
    }
    document.body.dataset.viFootnoteDismissBound = 'true';

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest('[data-vi-component="footnote"]') || target.closest('[data-vi-footnote-popover]')) {
        return;
      }
      document.querySelectorAll('[data-vi-footnote-popover]').forEach((popover) => {
        popover.hidden = true;
      });
      document.querySelectorAll('[data-vi-component="footnote"]').forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      document.querySelectorAll('[data-vi-footnote-popover]').forEach((popover) => {
        popover.hidden = true;
      });
      document.querySelectorAll('[data-vi-component="footnote"]').forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function setupCountdown(root) {
    root.querySelectorAll('[data-vi-component="countdown"]').forEach((container) => {
      const output = container.querySelector('[data-vi-countdown-value]');
      const deadlineValue = container.getAttribute('data-vi-deadline');
      const deadline = deadlineValue ? new Date(deadlineValue) : null;
      const chunk = container.closest('[data-vi-runtime-update-ms]');
      const runtimeUpdateMs = Number(chunk?.getAttribute('data-vi-runtime-update-ms') || 30000);
      const updateMs = Number.isFinite(runtimeUpdateMs) ? Math.max(250, Math.min(30000, runtimeUpdateMs)) : 30000;

      if (!output || !deadline || Number.isNaN(deadline.getTime())) {
        return;
      }

      function tick() {
        const deltaMs = deadline.getTime() - Date.now();
        if (deltaMs <= 0) {
          output.textContent = '00d 00h 00m';
          return;
        }

        const minutes = Math.floor(deltaMs / 60000);
        const days = Math.floor(minutes / (60 * 24));
        const hours = Math.floor((minutes % (60 * 24)) / 60);
        const mins = minutes % 60;
        output.textContent = String(days).padStart(2, '0') + 'd ' + String(hours).padStart(2, '0') + 'h ' + String(mins).padStart(2, '0') + 'm';
      }

      tick();
      setInterval(tick, updateMs);
    });
  }

  function setupCopy(root) {
    root.querySelectorAll('[data-vi-component="copy"]').forEach((container) => {
      const button = container.querySelector('[data-vi-copy-target]');
      const status = container.querySelector('[data-vi-copy-status]');

      button?.addEventListener('click', async () => {
        const targetId = button.getAttribute('data-vi-copy-target');
        const idTarget = targetId && targetId !== 'inline' ? document.getElementById(targetId) : null;
        const inlineTarget = container.querySelector('[data-vi-copy-source], code');
        const target = idTarget || inlineTarget;
        const value = target?.textContent || '';

        try {
          if (navigator.clipboard && value) {
            await navigator.clipboard.writeText(value);
            if (status) {
              status.textContent = 'Copied.';
            }
          }
        } catch {
          if (status) {
            status.textContent = 'Copy failed.';
          }
        }
      });
    });
  }

  function setupShare(root) {
    root.querySelectorAll('[data-vi-component="share"]').forEach((container) => {
      const input = container.querySelector('[data-vi-share-input]');
      const button = container.querySelector('[data-vi-share-copy]');
      const status = container.querySelector('[data-vi-share-status]');

      button?.addEventListener('click', async () => {
        const value = input && 'value' in input ? input.value : '';
        try {
          if (navigator.clipboard && value) {
            await navigator.clipboard.writeText(value);
            if (status) {
              status.textContent = 'Link copied.';
            }
          }
        } catch {
          if (status) {
            status.textContent = 'Copy failed.';
          }
        }
      });
    });
  }

  function setupModal(root) {
    root.querySelectorAll('[data-vi-component="modal"]').forEach((container) => {
      const openButton = container.querySelector('[data-vi-modal-open]');
      const closeButton = container.querySelector('[data-vi-modal-close]');
      const sheet = container.querySelector('[data-vi-modal-sheet]');

      openButton?.addEventListener('click', () => {
        if (sheet) {
          sheet.hidden = false;
        }
      });

      closeButton?.addEventListener('click', () => {
        if (sheet) {
          sheet.hidden = true;
        }
      });
    });
  }

  function setupCounters(root) {
    root.querySelectorAll('[data-vi-component="counters"]').forEach((container) => {
      const chunk = container.closest('[data-vi-runtime-update-ms]');
      const runtimeUpdateMs = Number(chunk?.getAttribute('data-vi-runtime-update-ms') || 600);
      const animationMs = Number.isFinite(runtimeUpdateMs) ? Math.max(250, Math.min(5000, runtimeUpdateMs)) : 600;
      container.querySelectorAll('[data-vi-counter-value]').forEach((node) => {
        const target = Number(node.getAttribute('data-vi-counter-value') || '0');
        if (!Number.isFinite(target)) {
          return;
        }

        const steps = 20;
        const increment = target / steps;
        const stepDelay = Math.max(16, Math.round(animationMs / steps));
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            node.textContent = String(target);
            clearInterval(timer);
            return;
          }
          node.textContent = String(Math.round(current));
        }, stepDelay);
      });
    });
  }

  function setupStickyProgress(root) {
    root.querySelectorAll('[data-vi-component="sticky-progress"]').forEach((container) => {
      const fill = container.querySelector('[data-vi-progress-fill]');
      if (!fill) {
        return;
      }

      function update() {
        const rect = container.getBoundingClientRect();
        const windowHeight = window.innerHeight || 1;
        const ratio = Math.max(0, Math.min(1, (windowHeight - rect.top) / (rect.height + windowHeight)));
        fill.style.width = String(Math.round(ratio * 100)) + '%';
      }

      update();
      window.addEventListener('scroll', update, { passive: true });
    });
  }

  function setupHotspot(root) {
    root.querySelectorAll('[data-vi-component="hotspot"]').forEach((container) => {
      const copy = container.querySelector('[data-vi-hotspot-copy]');
      const buttons = Array.from(container.querySelectorAll('[data-vi-hotspot]'));

      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          if (copy) {
            copy.textContent = 'Selected: ' + (button.textContent || 'Hotspot');
          }
        });
      });
    });
  }

  function setupChecklistProgress(root) {
    root.querySelectorAll('[data-vi-component="checklist-progress"]').forEach((container) => {
      const progressFill = container.querySelector('[data-vi-progress-fill]');
      const progressValue = container.querySelector('[data-vi-progress-value]');
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"][data-vi-check-item]'));

      if (!progressFill || !progressValue || checkboxes.length === 0) {
        return;
      }

      function update() {
        const total = Math.max(checkboxes.length, 1);
        const checked = checkboxes.filter((checkbox) => checkbox.checked).length;
        const ratio = Math.round((checked / total) * 100);
        progressFill.style.width = String(ratio) + '%';
        progressValue.textContent = String(ratio) + '% complete';
      }

      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', update);
      });

      update();
    });
  }

  function setupAll(root) {
    setupTabs(root);
    setupStepper(root);
    setupBeforeAfter(root);
    setupScrollCarousel(root);
    setupLightbox(root);
    setupDismissible(root);
    setupPoll(root);
    setupQuiz(root);
    setupFilter(root);
    setupSort(root);
    setupFootnote(root);
    setupCountdown(root);
    setupCopy(root);
    setupShare(root);
    setupModal(root);
    setupCounters(root);
    setupStickyProgress(root);
    setupHotspot(root);
    setupChecklistProgress(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupAll(document));
  } else {
    setupAll(document);
  }
})();`;
}

function markPreviewBound(element: Element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.dataset.viPreviewBound === "true") {
    return false;
  }
  element.dataset.viPreviewBound = "true";
  return true;
}

let footnoteDismissListenersBound = false;

function ensureFootnoteDismissListeners() {
  if (footnoteDismissListenersBound) {
    return;
  }
  footnoteDismissListenersBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('[data-vi-component="footnote"]') || target.closest("[data-vi-footnote-popover]")) {
      return;
    }
    document.querySelectorAll<HTMLElement>("[data-vi-footnote-popover]").forEach((popover) => {
      popover.hidden = true;
    });
    document.querySelectorAll<HTMLElement>('[data-vi-component="footnote"]').forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    document.querySelectorAll<HTMLElement>("[data-vi-footnote-popover]").forEach((popover) => {
      popover.hidden = true;
    });
    document.querySelectorAll<HTMLElement>('[data-vi-component="footnote"]').forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  });
}

const MANAGED_COMPONENTS = new Set([
  "tabs",
  "stepper",
  "before-after",
  "scroll-carousel",
  "snap-gallery",
  "lightbox",
  "dismissible",
  "poll",
  "quiz",
  "filter",
  "sort",
  "countdown",
  "copy",
  "share",
  "modal",
  "counters",
  "sticky-progress",
  "hotspot",
  "checklist-progress",
  "footnote",
]);

function isJavaScriptChunk(chunk: HTMLElement | null) {
  if (!chunk) {
    return false;
  }
  const engine = String(chunk.getAttribute("data-vi-engine") ?? "").toLowerCase();
  if (engine === "javascript") {
    return true;
  }
  return String(chunk.getAttribute("data-vi-runtime") ?? "").toLowerCase() === "required";
}

function getOrCreateRuntimeStatus(chunk: HTMLElement) {
  const existing = chunk.querySelector<HTMLElement>("[data-vi-runtime-status]");
  const status = existing ?? document.createElement("small");
  if (!existing) {
    status.dataset.viRuntimeStatus = "true";
    chunk.appendChild(status);
  }

  const preset = resolveInteractionPreset(chunk);
  const gestureMode = resolveGestureMode(chunk);
  const shouldPrimeOnLoad = readChunkRuntimeBoolean(chunk, "data-vi-status-on-load", false) || preset === "guided";
  if (shouldPrimeOnLoad && status.dataset.viRuntimePrimed !== "true") {
    const message = resolveStatusMessage(
      chunk,
      "Ready.",
      "Interactive controls ready.",
      `Interactive controls are ready (${preset} preset, ${gestureMode} input mode). Use click, keyboard, or hover controls based on the behavior settings.`,
    );
    if (message) {
      status.textContent = message;
    }
    status.dataset.viRuntimePrimed = "true";
  }

  return status;
}

function isManagedComponentCandidate(chunk: HTMLElement, candidate: HTMLElement) {
  const owner = candidate.closest<HTMLElement>("[data-vi-component]");
  if (!owner || owner === chunk) {
    return false;
  }
  const component = String(owner.getAttribute("data-vi-component") ?? "").toLowerCase();
  return MANAGED_COMPONENTS.has(component);
}

function applyStaggerReveal(chunk: HTMLElement, candidates: HTMLElement[]) {
  const staggerMs = readChunkRuntimeNumber(chunk, "data-vi-stagger-ms", 0, 0, 400);
  if (staggerMs <= 0 || resolveMotionProfile(chunk) === "reduced") {
    return;
  }

  const transitionMs = resolveTransitionMs(chunk, 260);
  candidates.forEach((candidate, index) => {
    if (candidate.dataset.viRevealBound === "true") {
      return;
    }
    candidate.dataset.viRevealBound = "true";
    candidate.style.opacity = "0";
    candidate.style.transform = "translateY(6px)";
    candidate.style.transition = `opacity ${String(transitionMs)}ms ease, transform ${String(transitionMs)}ms ease`;
    window.setTimeout(() => {
      candidate.style.opacity = "1";
      candidate.style.transform = "translateY(0)";
    }, index * staggerMs);
  });
}

function resolveChunkRuntimeContainer(node: Element | null) {
  return node?.closest<HTMLElement>("[data-vi-template]") ?? null;
}

function readChunkRuntimeBoolean(chunk: HTMLElement | null, attr: string, fallback: boolean) {
  const raw = chunk?.getAttribute(attr);
  if (raw == null) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

function readChunkRuntimeNumber(chunk: HTMLElement | null, attr: string, fallback: number, min?: number, max?: number) {
  const raw = Number(chunk?.getAttribute(attr) || "");
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  const boundedMin = typeof min === "number" ? Math.max(min, raw) : raw;
  const boundedMax = typeof max === "number" ? Math.min(max, boundedMin) : boundedMin;
  return boundedMax;
}

function readChunkRuntimeString(chunk: HTMLElement | null, attr: string, fallback: string) {
  const raw = chunk?.getAttribute(attr);
  if (!raw) {
    return fallback;
  }
  return raw;
}

function resolveMotionProfile(chunk: HTMLElement | null) {
  const profile = readChunkRuntimeString(chunk, "data-vi-motion-profile", "balanced").toLowerCase();
  if (profile === "reduced" || profile === "balanced" || profile === "expressive") {
    return profile;
  }
  return "balanced";
}

function resolveTransitionMs(chunk: HTMLElement | null, fallback: number) {
  const configured = readChunkRuntimeNumber(chunk, "data-vi-transition-ms", fallback, 0, 6000);
  const profile = resolveMotionProfile(chunk);
  if (profile === "reduced") {
    return Math.min(configured, 120);
  }
  if (profile === "expressive") {
    return Math.min(6000, Math.max(160, Math.round(configured * 1.35)));
  }
  return configured;
}

function resolveScrollBehavior(chunk: HTMLElement | null): ScrollBehavior {
  return resolveMotionProfile(chunk) === "reduced" ? "auto" : "smooth";
}

function resolveInteractionPreset(chunk: HTMLElement | null) {
  const preset = readChunkRuntimeString(chunk, "data-vi-interaction-preset", "balanced").toLowerCase();
  if (preset === "guided" || preset === "balanced" || preset === "expert") {
    return preset;
  }
  return "balanced";
}

function resolveGestureMode(chunk: HTMLElement | null) {
  const mode = readChunkRuntimeString(chunk, "data-vi-gesture-mode", "pointer-touch").toLowerCase();
  if (mode === "click" || mode === "pointer-touch" || mode === "keyboard-pointer") {
    return mode;
  }
  return "pointer-touch";
}

function resolveNavigationWrap(chunk: HTMLElement | null) {
  return readChunkRuntimeBoolean(chunk, "data-vi-navigation-wrap", true);
}

function resolveHoverActivation(chunk: HTMLElement | null, componentSupportsGesture = false) {
  const base = readChunkRuntimeBoolean(chunk, "data-vi-hover-activation", false);
  if (!base) {
    return false;
  }
  if (!componentSupportsGesture) {
    return base;
  }
  return resolveGestureMode(chunk) !== "click";
}

function resolveKeyboardEnabled(chunk: HTMLElement | null, componentSupportsGesture = false) {
  const enabled = readChunkRuntimeBoolean(chunk, "data-vi-keyboard-shortcuts", true);
  if (!enabled) {
    return false;
  }
  if (!componentSupportsGesture) {
    return true;
  }
  return resolveGestureMode(chunk) === "keyboard-pointer";
}

function resolveStepIndex(currentIndex: number, delta: number, length: number, wrap: boolean) {
  if (length <= 0) {
    return 0;
  }
  if (wrap) {
    return (currentIndex + delta + length) % length;
  }
  return Math.max(0, Math.min(length - 1, currentIndex + delta));
}

function bindHoverActivation(target: HTMLElement, onActivate: () => void) {
  target.addEventListener("mouseenter", onActivate);
  target.addEventListener("mouseover", onActivate);
}

function resolveStatusMessage(
  chunk: HTMLElement | null,
  concise: string,
  balanced: string,
  didactic: string,
) {
  if (!readChunkRuntimeBoolean(chunk, "data-vi-announce-state", true)) {
    return null;
  }
  let verbosity = readChunkRuntimeString(chunk, "data-vi-status-verbosity", "balanced").toLowerCase();
  if (verbosity === "balanced") {
    const preset = resolveInteractionPreset(chunk);
    if (preset === "guided") {
      verbosity = "didactic";
    } else if (preset === "expert") {
      verbosity = "concise";
    }
  }
  if (verbosity === "concise") {
    return concise;
  }
  if (verbosity === "didactic") {
    return didactic;
  }
  return balanced;
}

function resolveStateStorage(mode: string) {
  try {
    if (mode === "local") {
      return window.localStorage;
    }
    if (mode === "session") {
      return window.sessionStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveChunkStateKey(chunk: HTMLElement, component: string) {
  const templateId = chunk.getAttribute("data-vi-template") || "chunk";
  const heading = chunk.querySelector("h3")?.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "untitled";
  return `vi-chunk-state:${templateId}:${component}:${heading}`;
}

function readChunkState<T>(chunk: HTMLElement | null, component: string): T | null {
  if (!chunk || !readChunkRuntimeBoolean(chunk, "data-vi-persist-state", true)) {
    return null;
  }
  const scope = readChunkRuntimeString(chunk, "data-vi-state-memory", "session").toLowerCase();
  const storage = resolveStateStorage(scope);
  if (!storage) {
    return null;
  }
  const key = resolveChunkStateKey(chunk, component);
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeChunkState(chunk: HTMLElement | null, component: string, value: unknown) {
  if (!chunk || !readChunkRuntimeBoolean(chunk, "data-vi-persist-state", true)) {
    return;
  }
  const scope = readChunkRuntimeString(chunk, "data-vi-state-memory", "session").toLowerCase();
  const storage = resolveStateStorage(scope);
  if (!storage) {
    return;
  }
  const key = resolveChunkStateKey(chunk, component);
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and privacy mode failures.
  }
}

function setupInitialStatusRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-vi-template]").forEach((chunk) => {
    if (!isJavaScriptChunk(chunk) || chunk.dataset.viInitialStatusBound === "true") {
      return;
    }
    chunk.dataset.viInitialStatusBound = "true";
    if (!readChunkRuntimeBoolean(chunk, "data-vi-show-status", true)) {
      return;
    }
    if (!readChunkRuntimeBoolean(chunk, "data-vi-status-on-load", false) && resolveInteractionPreset(chunk) !== "guided") {
      return;
    }
    getOrCreateRuntimeStatus(chunk);
  });
}

function setupTabsRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="tabs"]').forEach((tabs) => {
    if (!markPreviewBound(tabs)) {
      return;
    }

    const buttons = Array.from(tabs.querySelectorAll<HTMLElement>("[data-vi-tab]"));
    const panels = Array.from(tabs.querySelectorAll<HTMLElement>("[data-vi-panel]"));
    const chunk = resolveChunkRuntimeContainer(tabs);
    const keyboardEnabled = resolveKeyboardEnabled(chunk);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);
    const autoAdvanceMs = readChunkRuntimeNumber(chunk, "data-vi-auto-advance-ms", 0, 0, 30000);

    if (buttons.length === 0 || panels.length === 0) {
      return;
    }

    let currentIndex = 0;
    const persisted = readChunkState<number>(chunk, "tabs");
    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      currentIndex = Math.max(0, Math.min(buttons.length - 1, Math.round(persisted)));
    }

    const activate = (index: number) => {
      currentIndex = Math.max(0, Math.min(buttons.length - 1, index));
      buttons.forEach((button, buttonIndex) => {
        const active = buttonIndex === currentIndex;
        button.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach((panel, panelIndex) => {
        panel.hidden = panelIndex !== currentIndex;
      });

      writeChunkState(chunk, "tabs", currentIndex);
    };

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => activate(index));
      if (hoverActivation) {
        bindHoverActivation(button, () => activate(index));
      }
    });

    if (keyboardEnabled) {
      tabs.tabIndex = tabs.tabIndex >= 0 ? tabs.tabIndex : 0;
      tabs.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          activate(resolveStepIndex(currentIndex, 1, buttons.length, wrapNavigation));
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          activate(resolveStepIndex(currentIndex, -1, buttons.length, wrapNavigation));
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          activate(0);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          activate(buttons.length - 1);
        }
      });
    }

    if (autoAdvanceMs > 0 && buttons.length > 1) {
      const interval = Math.max(800, autoAdvanceMs);
      window.setInterval(() => {
        const nextIndex = resolveStepIndex(currentIndex, 1, buttons.length, wrapNavigation);
        if (!wrapNavigation && nextIndex === currentIndex) {
          return;
        }
        activate(nextIndex);
      }, interval);
    }

    activate(currentIndex);
  });
}

function setupStepperRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="stepper"]').forEach((stepper) => {
    if (!markPreviewBound(stepper)) {
      return;
    }

    const steps = Array.from(stepper.querySelectorAll<HTMLElement>("[data-vi-step]"));
    const chunk = resolveChunkRuntimeContainer(stepper);
    const keyboardEnabled = resolveKeyboardEnabled(chunk);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const autoAdvanceMs = readChunkRuntimeNumber(chunk, "data-vi-auto-advance-ms", 0, 0, 30000);
    if (steps.length === 0) {
      return;
    }

    let index = 0;
    const persisted = readChunkState<number>(chunk, "stepper");
    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      index = Math.max(0, Math.min(steps.length - 1, Math.round(persisted)));
    }
    const previousButton = stepper.querySelector<HTMLElement>("[data-vi-stepper-prev]");
    const nextButton = stepper.querySelector<HTMLElement>("[data-vi-stepper-next]");

    const render = () => {
      steps.forEach((step, stepIndex) => {
        step.hidden = stepIndex !== index;
      });
      writeChunkState(chunk, "stepper", index);
    };

    previousButton?.addEventListener("click", () => {
      index = resolveStepIndex(index, -1, steps.length, wrapNavigation);
      render();
    });

    nextButton?.addEventListener("click", () => {
      index = resolveStepIndex(index, 1, steps.length, wrapNavigation);
      render();
    });

    if (keyboardEnabled) {
      stepper.tabIndex = stepper.tabIndex >= 0 ? stepper.tabIndex : 0;
      stepper.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          index = resolveStepIndex(index, 1, steps.length, wrapNavigation);
          render();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          index = resolveStepIndex(index, -1, steps.length, wrapNavigation);
          render();
        }
      });
    }

    if (autoAdvanceMs > 0 && steps.length > 1) {
      const interval = Math.max(900, autoAdvanceMs);
      window.setInterval(() => {
        const nextIndex = resolveStepIndex(index, 1, steps.length, wrapNavigation);
        if (!wrapNavigation && nextIndex === index) {
          return;
        }
        index = nextIndex;
        render();
      }, interval);
    }

    render();
  });
}

function setupBeforeAfterRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="before-after"]').forEach((slider) => {
    if (!markPreviewBound(slider)) {
      return;
    }

    const range = slider.querySelector<HTMLInputElement>("[data-vi-slider-range]");
    const after = slider.querySelector<HTMLElement>("[data-vi-slider-after]");
    const chunk = resolveChunkRuntimeContainer(slider);
    const keyboardEnabled = resolveKeyboardEnabled(chunk, true);
    const transitionMs = resolveTransitionMs(chunk, 340);
    if (!range || !after) {
      return;
    }

    const persisted = readChunkState<number>(chunk, "before-after");
    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      range.value = String(Math.max(0, Math.min(100, Math.round(persisted))));
    }

    after.style.transition = `clip-path ${String(transitionMs)}ms ease`;

    const apply = () => {
      const value = Number(range.value || 50);
      after.style.clipPath = `inset(0 0 0 ${String(value)}%)`;
      writeChunkState(chunk, "before-after", value);
    };

    range.addEventListener("input", apply);

    if (keyboardEnabled) {
      slider.tabIndex = slider.tabIndex >= 0 ? slider.tabIndex : 0;
      slider.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
          return;
        }
        event.preventDefault();
        const current = Number(range.value || 50);
        const delta = event.key === "ArrowRight" ? 5 : -5;
        range.value = String(Math.max(0, Math.min(100, current + delta)));
        apply();
      });
    }

    apply();
  });
}

function setupScrollCarouselRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="scroll-carousel"], [data-vi-component="snap-gallery"]').forEach((container) => {
    const track = container.querySelector<HTMLElement>("[data-vi-carousel-track]");
    if (!track || track.dataset.viCarouselBound === "true") {
      return;
    }

    track.dataset.viCarouselBound = "true";
    const chunk = resolveChunkRuntimeContainer(container);
    const previousButton = container.querySelector<HTMLButtonElement>("[data-vi-carousel-prev]");
    const nextButton = container.querySelector<HTMLButtonElement>("[data-vi-carousel-next]");
    const fallbackStep = Math.max(140, Math.round(track.clientWidth * 0.72));
    const configuredStep = Number(container.getAttribute("data-vi-scroll-step") || "");
    const step = Number.isFinite(configuredStep) && configuredStep > 0 ? configuredStep : fallbackStep;
    const keyboardEnabled = resolveKeyboardEnabled(chunk, true);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const autoAdvanceMs = readChunkRuntimeNumber(chunk, "data-vi-auto-advance-ms", 0, 0, 30000);
    const behavior = resolveScrollBehavior(chunk);
    const persistedScroll = readChunkState<number>(chunk, `scroll:${container.getAttribute("data-vi-component") || "carousel"}`);

    const updateDisabledState = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (previousButton) {
        previousButton.disabled = track.scrollLeft <= 2;
      }
      if (nextButton) {
        nextButton.disabled = track.scrollLeft >= maxScroll - 2;
      }
    };

    const scrollBy = (direction: number) => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (wrapNavigation && direction < 0 && track.scrollLeft <= 2) {
        track.scrollTo({ left: maxScroll, behavior });
        return;
      }
      if (wrapNavigation && direction > 0 && track.scrollLeft >= maxScroll - 2) {
        track.scrollTo({ left: 0, behavior });
        return;
      }
      track.scrollBy({ left: direction * step, behavior });
    };

    previousButton?.addEventListener("click", () => scrollBy(-1));
    nextButton?.addEventListener("click", () => scrollBy(1));
    track.addEventListener(
      "scroll",
      () => {
        updateDisabledState();
        writeChunkState(chunk, `scroll:${container.getAttribute("data-vi-component") || "carousel"}`, track.scrollLeft);
      },
      { passive: true },
    );
    window.addEventListener("resize", updateDisabledState);

    if (typeof persistedScroll === "number" && Number.isFinite(persistedScroll)) {
      track.scrollLeft = Math.max(0, persistedScroll);
    }

    if (keyboardEnabled) {
      container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
      container.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollBy(1);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollBy(-1);
        }
      });
    }

    if (autoAdvanceMs > 0) {
      const interval = Math.max(1000, autoAdvanceMs);
      window.setInterval(() => {
        if (document.hidden) {
          return;
        }
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        if (track.scrollLeft >= maxScroll - 4) {
          if (wrapNavigation) {
            track.scrollTo({ left: 0, behavior });
          }
          return;
        }
        scrollBy(1);
      }, interval);
    }

    updateDisabledState();
  });
}

function setupLightboxRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="lightbox"]').forEach((gallery) => {
    if (!markPreviewBound(gallery)) {
      return;
    }

    const overlay = gallery.querySelector<HTMLElement>("[data-vi-lightbox-overlay]");
    const previewImage = gallery.querySelector<HTMLImageElement>("[data-vi-lightbox-image]");
    const closeButton = gallery.querySelector<HTMLElement>("[data-vi-lightbox-close]");

    gallery.querySelectorAll<HTMLElement>("[data-vi-lightbox-src]").forEach((button) => {
      button.addEventListener("click", () => {
        const source = button.getAttribute("data-vi-lightbox-src") ?? "";
        if (previewImage) {
          previewImage.setAttribute("src", source);
        }
        if (overlay) {
          overlay.hidden = false;
        }
      });
    });

    closeButton?.addEventListener("click", () => {
      if (overlay) {
        overlay.hidden = true;
      }
    });
  });
}

function setupDismissibleRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="dismissible"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }
    const chunk = resolveChunkRuntimeContainer(container);
    const button = container.querySelector<HTMLElement>("[data-vi-dismiss]");
    const persisted = readChunkState<boolean>(chunk, "dismissible");
    if (persisted === true) {
      container.hidden = true;
    }
    button?.addEventListener("click", () => {
      container.hidden = true;
      writeChunkState(chunk, "dismissible", true);
    });
  });
}

function setupPollRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="poll"]').forEach((poll) => {
    if (!markPreviewBound(poll)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(poll);
    const keyboardEnabled = resolveKeyboardEnabled(chunk);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);
    const interactionPreset = resolveInteractionPreset(chunk);
    const status = poll.querySelector<HTMLElement>("[data-vi-poll-status]");
    const options = Array.from(poll.querySelectorAll<HTMLElement>("[data-vi-poll-option]"));
    const persisted = readChunkState<number>(chunk, "poll");
    let activeIndex = 0;

    const selectOption = (optionIndex: number) => {
      const target = options[optionIndex];
      if (!target) {
        return;
      }
      options.forEach((candidate) => {
        candidate.classList.remove("is-selected");
      });
      target.classList.add("is-selected");
      activeIndex = optionIndex;
      writeChunkState(chunk, "poll", optionIndex);
      if (status) {
        const label = target.textContent?.trim() || "option";
        const message = resolveStatusMessage(
          chunk,
          "Saved.",
          "Selection captured.",
          `Selection captured: ${label}. You can click again to compare alternatives.`,
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    options.forEach((option, optionIndex) => {
      option.addEventListener("click", () => {
        selectOption(optionIndex);
      });
      if (hoverActivation) {
        bindHoverActivation(option, () => {
          selectOption(optionIndex);
        });
      }
    });

    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      selectOption(Math.max(0, Math.min(options.length - 1, Math.round(persisted))));
    } else if (options.length > 0 && interactionPreset !== "expert") {
      selectOption(0);
    }

    if (keyboardEnabled) {
      poll.tabIndex = poll.tabIndex >= 0 ? poll.tabIndex : 0;
      poll.addEventListener("keydown", (event) => {
        if (options.length === 0) {
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          selectOption(resolveStepIndex(activeIndex, 1, options.length, wrapNavigation));
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          selectOption(resolveStepIndex(activeIndex, -1, options.length, wrapNavigation));
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          selectOption(0);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          selectOption(options.length - 1);
        }
      });
    }
  });
}

function setupQuizRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="quiz"]').forEach((quiz) => {
    if (!markPreviewBound(quiz)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(quiz);
    const keyboardEnabled = resolveKeyboardEnabled(chunk);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);
    const interactionPreset = resolveInteractionPreset(chunk);
    const status = quiz.querySelector<HTMLElement>("[data-vi-quiz-status]");
    const options = Array.from(quiz.querySelectorAll<HTMLElement>("[data-vi-quiz-option]"));
    const persisted = readChunkState<number>(chunk, "quiz");
    let activeIndex = 0;

    const selectOption = (optionIndex: number) => {
      const option = options[optionIndex];
      if (!option) {
        return;
      }
      const isCorrect = option.getAttribute("data-vi-correct") === "true";
      options.forEach((candidate) => {
        candidate.classList.remove("is-correct", "is-wrong");
      });
      option.classList.add(isCorrect ? "is-correct" : "is-wrong");
      activeIndex = optionIndex;
      writeChunkState(chunk, "quiz", optionIndex);
      if (status) {
        const message = resolveStatusMessage(
          chunk,
          isCorrect ? "Correct." : "Try again.",
          isCorrect ? "Correct answer." : "Try another option.",
          isCorrect
            ? "Correct answer. This option currently maps to the expected outcome in this template."
            : "Not quite. Review the options and try another response.",
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    options.forEach((option, optionIndex) => {
      option.addEventListener("click", () => {
        selectOption(optionIndex);
      });
      if (hoverActivation) {
        bindHoverActivation(option, () => {
          selectOption(optionIndex);
        });
      }
    });

    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      selectOption(Math.max(0, Math.min(options.length - 1, Math.round(persisted))));
    } else if (options.length > 0 && interactionPreset !== "expert") {
      selectOption(0);
    }

    if (keyboardEnabled) {
      quiz.tabIndex = quiz.tabIndex >= 0 ? quiz.tabIndex : 0;
      quiz.addEventListener("keydown", (event) => {
        if (options.length === 0) {
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          selectOption(resolveStepIndex(activeIndex, 1, options.length, wrapNavigation));
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          selectOption(resolveStepIndex(activeIndex, -1, options.length, wrapNavigation));
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          selectOption(0);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          selectOption(options.length - 1);
        }
      });
    }
  });
}

function setupFilterRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="filter"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const keyboardEnabled = resolveKeyboardEnabled(chunk);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);
    const interactionPreset = resolveInteractionPreset(chunk);
    const buttons = Array.from(container.querySelectorAll<HTMLElement>("[data-vi-filter-key]"));
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-vi-filter-item]"));
    const status = container.querySelector<HTMLElement>("[data-vi-filter-status]");
    let activeKey = "";

    const persisted = readChunkState<string>(chunk, "filter");
    if (typeof persisted === "string") {
      activeKey = persisted;
    }

    const applyFilter = (nextKey: string) => {
      activeKey = nextKey;

      cards.forEach((card) => {
        const itemKey = card.getAttribute("data-vi-filter-item") || "";
        card.hidden = Boolean(activeKey) && activeKey !== itemKey;
      });

      buttons.forEach((button) => {
        const key = button.getAttribute("data-vi-filter-key") || "";
        const isActive = key === activeKey && Boolean(activeKey);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        if (isActive) {
          button.classList.add("is-selected");
        } else {
          button.classList.remove("is-selected");
        }
      });

      writeChunkState(chunk, "filter", activeKey);
      if (status) {
        const message = resolveStatusMessage(
          chunk,
          activeKey ? `Showing ${activeKey}.` : "Showing all.",
          activeKey ? `Showing: ${activeKey}` : "Showing all items.",
          activeKey
            ? `Filter applied: ${activeKey}. Only matching cards are visible. Click again to reset.`
            : "No filter is active. All cards are visible.",
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-vi-filter-key") || "";
        applyFilter(key === activeKey ? "" : key);
      });
      if (hoverActivation) {
        bindHoverActivation(button, () => {
          const key = button.getAttribute("data-vi-filter-key") || "";
          applyFilter(key);
        });
      }
    });

    if (keyboardEnabled) {
      container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
      container.addEventListener("keydown", (event) => {
        if (buttons.length === 0) {
          return;
        }
        const currentIndex = buttons.findIndex((button) => (button.getAttribute("data-vi-filter-key") || "") === activeKey);
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const nextIndex = currentIndex < 0 ? 0 : resolveStepIndex(currentIndex, 1, buttons.length, wrapNavigation);
          const key = buttons[nextIndex]?.getAttribute("data-vi-filter-key") || "";
          applyFilter(key);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const previousIndex =
            currentIndex < 0 ? (wrapNavigation ? buttons.length - 1 : 0) : resolveStepIndex(currentIndex, -1, buttons.length, wrapNavigation);
          const key = buttons[previousIndex]?.getAttribute("data-vi-filter-key") || "";
          applyFilter(key);
        }
      });
    }

    if (!activeKey && interactionPreset === "guided" && buttons.length > 0) {
      const firstKey = buttons[0]?.getAttribute("data-vi-filter-key") || "";
      applyFilter(firstKey);
      return;
    }

    applyFilter(activeKey);
  });
}

function setupSortRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="sort"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-vi-filter-item], .vi-card-grid > li"));
    const controls = container.querySelector<HTMLElement>(".vi-filter-controls") ?? container.querySelector<HTMLElement>("div");
    const grid =
      container.querySelector<HTMLElement>(".vi-card-grid") ??
      container.querySelector<HTMLElement>("ol") ??
      container.querySelector<HTMLElement>("ul");
    if (!controls || !grid || cards.length === 0) {
      return;
    }

    let asc = controls.querySelector<HTMLElement>("[data-vi-sort-asc]");
    let desc = controls.querySelector<HTMLElement>("[data-vi-sort-desc]");
    if (!asc && !desc) {
      controls.insertAdjacentHTML(
        "beforeend",
        '<button type="button" data-vi-sort-asc>Sort A-Z</button><button type="button" data-vi-sort-desc>Sort Z-A</button>',
      );
      asc = controls.querySelector<HTMLElement>("[data-vi-sort-asc]");
      desc = controls.querySelector<HTMLElement>("[data-vi-sort-desc]");
    }
    asc = asc ?? controls.querySelector<HTMLElement>('[data-vi-filter-key="asc"]');
    desc = desc ?? controls.querySelector<HTMLElement>('[data-vi-filter-key="desc"]');
    let status = container.querySelector<HTMLElement>("[data-vi-filter-status]");
    if (!status) {
      status = document.createElement("small");
      status.dataset.viFilterStatus = "true";
      status.style.opacity = "0.78";
      status.style.display = "block";
      status.style.marginTop = "6px";
      grid.insertAdjacentElement("afterend", status);
    }

    const getSortValue = (node: HTMLElement) => {
      const explicit = Number(node.getAttribute("data-vi-sort-value") || "");
      if (Number.isFinite(explicit)) {
        return explicit;
      }
      const parsed = Number((node.textContent || "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    };

    const render = (sorted: HTMLElement[]) => {
      cards.forEach((card) => card.remove());
      sorted.forEach((card) => {
        grid?.appendChild(card);
      });
    };

    const applySort = (direction: "asc" | "desc") => {
      if (direction === "asc") {
        render(
          [...cards].sort((left, right) => {
            const leftNumber = getSortValue(left);
            const rightNumber = getSortValue(right);
            if (leftNumber != null && rightNumber != null) {
              return leftNumber - rightNumber;
            }
            return (left.textContent || "").localeCompare(right.textContent || "");
          }),
        );
      } else {
        render(
          [...cards].sort((left, right) => {
            const leftNumber = getSortValue(left);
            const rightNumber = getSortValue(right);
            if (leftNumber != null && rightNumber != null) {
              return rightNumber - leftNumber;
            }
            return (right.textContent || "").localeCompare(left.textContent || "");
          }),
        );
      }

      writeChunkState(chunk, "sort", direction);
      if (status) {
        const message = resolveStatusMessage(
          chunk,
          direction === "asc" ? "Ascending." : "Descending.",
          direction === "asc" ? "Sorted ascending." : "Sorted descending.",
          direction === "asc"
            ? "Cards sorted ascending. Lowest values and alphabetically earlier labels appear first."
            : "Cards sorted descending. Highest values and alphabetically later labels appear first.",
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    asc?.addEventListener("click", () => {
      applySort("asc");
    });

    desc?.addEventListener("click", () => {
      applySort("desc");
    });

    const persisted = readChunkState<string>(chunk, "sort");
    if (persisted === "asc" || persisted === "desc") {
      applySort(persisted);
    }
  });
}

function setupFootnoteRuntime(root: ParentNode) {
  ensureFootnoteDismissListeners();

  root.querySelectorAll<HTMLElement>('[data-vi-component="footnote"]').forEach((trigger) => {
    if (trigger.dataset.viFootnoteBound === "true") {
      return;
    }
    trigger.dataset.viFootnoteBound = "true";

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const footnoteId = trigger.getAttribute("data-vi-footnote") || "";
      const scope = trigger.closest("li") ?? trigger.parentElement ?? null;
      const popover = scope?.querySelector<HTMLElement>(`[data-vi-footnote-popover="${footnoteId}"]`) ?? null;
      if (!popover) {
        return;
      }

      const currentlyExpanded = trigger.getAttribute("aria-expanded") === "true";
      root.querySelectorAll<HTMLElement>("[data-vi-footnote-popover]").forEach((candidate) => {
        candidate.hidden = true;
      });
      root.querySelectorAll<HTMLElement>('[data-vi-component="footnote"]').forEach((candidate) => {
        candidate.setAttribute("aria-expanded", "false");
      });

      if (!currentlyExpanded) {
        popover.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function setupCountdownRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="countdown"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const output = container.querySelector<HTMLElement>("[data-vi-countdown-value]");
    const deadlineValue = container.getAttribute("data-vi-deadline");
    const deadline = deadlineValue ? new Date(deadlineValue) : null;
    const chunk = container.closest<HTMLElement>("[data-vi-runtime-update-ms]");
    const runtimeUpdateMs = Number(chunk?.getAttribute("data-vi-runtime-update-ms") || 30000);
    const updateMs = Number.isFinite(runtimeUpdateMs) ? Math.max(250, Math.min(30000, runtimeUpdateMs)) : 30000;

    if (!output || !deadline || Number.isNaN(deadline.getTime())) {
      return;
    }

    const tick = () => {
      const deltaMs = deadline.getTime() - Date.now();
      if (deltaMs <= 0) {
        output.textContent = "00d 00h 00m";
        return;
      }

      const minutes = Math.floor(deltaMs / 60000);
      const days = Math.floor(minutes / (60 * 24));
      const hours = Math.floor((minutes % (60 * 24)) / 60);
      const mins = minutes % 60;
      output.textContent = `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
    };

    tick();
    window.setInterval(tick, updateMs);
  });
}

function setupCopyRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="copy"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const button = container.querySelector<HTMLElement>("[data-vi-copy-target]");
    const status = container.querySelector<HTMLElement>("[data-vi-copy-status]");

    button?.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-vi-copy-target");
      const idTarget = targetId && targetId !== "inline" ? document.getElementById(targetId) : null;
      const inlineTarget = container.querySelector<HTMLElement>("[data-vi-copy-source], code");
      const target = idTarget ?? inlineTarget;
      const value = target?.textContent || "";

      try {
        if (navigator.clipboard && value) {
          await navigator.clipboard.writeText(value);
          if (status) {
            const message = resolveStatusMessage(
              chunk,
              "Copied.",
              "Copied.",
              "Copied to clipboard. You can paste it wherever this snippet is needed.",
            );
            if (message) {
              status.textContent = message;
            }
          }
        }
      } catch {
        if (status) {
          status.textContent = "Copy failed.";
        }
      }
    });
  });
}

function setupShareRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="share"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const input = container.querySelector<HTMLInputElement>("[data-vi-share-input]");
    const button = container.querySelector<HTMLElement>("[data-vi-share-copy]");
    const status = container.querySelector<HTMLElement>("[data-vi-share-status]");

    button?.addEventListener("click", async () => {
      const value = input?.value || "";
      try {
        if (navigator.clipboard && value) {
          await navigator.clipboard.writeText(value);
          if (status) {
            const message = resolveStatusMessage(
              chunk,
              "Copied.",
              "Link copied.",
              "Share link copied. You can now paste it in email, chat, or social posts.",
            );
            if (message) {
              status.textContent = message;
            }
          }
        }
      } catch {
        if (status) {
          status.textContent = "Copy failed.";
        }
      }
    });
  });
}

function setupModalRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="modal"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const openButton = container.querySelector<HTMLElement>("[data-vi-modal-open]");
    const closeButton = container.querySelector<HTMLElement>("[data-vi-modal-close]");
    const sheet = container.querySelector<HTMLElement>("[data-vi-modal-sheet]");
    const persisted = readChunkState<boolean>(chunk, "modal-open");
    if (sheet) {
      sheet.hidden = persisted !== true;
    }

    openButton?.addEventListener("click", () => {
      if (sheet) {
        sheet.hidden = false;
      }
      writeChunkState(chunk, "modal-open", true);
    });

    closeButton?.addEventListener("click", () => {
      if (sheet) {
        sheet.hidden = true;
      }
      writeChunkState(chunk, "modal-open", false);
    });
  });
}

function setupCountersRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="counters"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = container.closest<HTMLElement>("[data-vi-runtime-update-ms]");
    const runtimeUpdateMs = Number(chunk?.getAttribute("data-vi-runtime-update-ms") || 600);
    const chunkEngine = resolveChunkRuntimeContainer(container);
    const animationMs = resolveTransitionMs(
      chunkEngine,
      Number.isFinite(runtimeUpdateMs) ? Math.max(250, Math.min(5000, runtimeUpdateMs)) : 600,
    );

    container.querySelectorAll<HTMLElement>("[data-vi-counter-value]").forEach((node) => {
      const target = Number(node.getAttribute("data-vi-counter-value") || "0");
      if (!Number.isFinite(target)) {
        return;
      }

      const steps = 20;
      const increment = target / steps;
      const stepDelay = Math.max(16, Math.round(animationMs / steps));
      let current = 0;
      const timer = window.setInterval(() => {
        current += increment;
        if (current >= target) {
          node.textContent = String(target);
          window.clearInterval(timer);
          return;
        }
        node.textContent = String(Math.round(current));
      }, stepDelay);
    });
  });
}

function setupStickyProgressRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="sticky-progress"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const fill = container.querySelector<HTMLElement>("[data-vi-progress-fill]");
    if (!fill) {
      return;
    }

    const update = () => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight || 1;
      const ratio = Math.max(0, Math.min(1, (windowHeight - rect.top) / (rect.height + windowHeight)));
      fill.style.width = `${String(Math.round(ratio * 100))}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  });
}

function setupHotspotRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="hotspot"]').forEach((container) => {
    if (!markPreviewBound(container)) {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(container);
    const keyboardEnabled = resolveKeyboardEnabled(chunk, true);
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk, true);
    const interactionPreset = resolveInteractionPreset(chunk);
    const copy = container.querySelector<HTMLElement>("[data-vi-hotspot-copy]");
    const buttons = Array.from(container.querySelectorAll<HTMLElement>("[data-vi-hotspot]"));
    const persisted = readChunkState<number>(chunk, "hotspot");
    let activeIndex = 0;

    const selectHotspot = (index: number) => {
      const target = buttons[index];
      if (!target) {
        return;
      }
      buttons.forEach((button) => button.classList.remove("is-selected"));
      target.classList.add("is-selected");
      if (copy) {
        copy.textContent = `Selected: ${target.textContent || "Hotspot"}`;
      }
      activeIndex = index;
      writeChunkState(chunk, "hotspot", index);
    };

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        selectHotspot(index);
      });
      if (hoverActivation) {
        bindHoverActivation(button, () => {
          selectHotspot(index);
        });
      }
    });

    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      selectHotspot(Math.max(0, Math.min(buttons.length - 1, Math.round(persisted))));
    } else if (buttons.length > 0 && interactionPreset !== "expert") {
      selectHotspot(0);
    }

    if (keyboardEnabled) {
      container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
      container.addEventListener("keydown", (event) => {
        if (buttons.length === 0) {
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          selectHotspot(resolveStepIndex(activeIndex, 1, buttons.length, wrapNavigation));
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          selectHotspot(resolveStepIndex(activeIndex, -1, buttons.length, wrapNavigation));
        }
      });
    }
  });
}

function setupChecklistProgressRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-vi-component="checklist-progress"]').forEach((container) => {
    const chunk = resolveChunkRuntimeContainer(container);
    const fill = container.querySelector<HTMLElement>("[data-vi-progress-fill]");
    const value = container.querySelector<HTMLElement>("[data-vi-progress-value]");
    const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-vi-check-item]'));
    if (!fill || !value || checkboxes.length === 0) {
      return;
    }

    const persisted = readChunkState<number[]>(chunk, "checklist");
    if (Array.isArray(persisted)) {
      checkboxes.forEach((checkbox, index) => {
        checkbox.checked = Boolean(persisted.includes(index));
      });
    }

    const updateProgress = () => {
      const total = Math.max(checkboxes.length, 1);
      const checked = checkboxes.filter((checkbox) => checkbox.checked).length;
      const ratio = Math.round((checked / total) * 100);
      fill.style.width = `${ratio}%`;
      value.textContent = `${ratio}% complete`;
      const checkedIndexes = checkboxes
        .map((checkbox, index) => (checkbox.checked ? index : -1))
        .filter((index) => index >= 0);
      writeChunkState(chunk, "checklist", checkedIndexes);
    };

    checkboxes.forEach((checkbox) => {
      if (checkbox.dataset.viChecklistBound === "true") {
        return;
      }
      checkbox.dataset.viChecklistBound = "true";
      checkbox.addEventListener("change", updateProgress);
    });

    updateProgress();
  });
}

function setupGenericSelectableRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-vi-template]").forEach((chunk) => {
    if (!isJavaScriptChunk(chunk) || chunk.dataset.viGenericSelectableBound === "true") {
      return;
    }
    chunk.dataset.viGenericSelectableBound = "true";

    const selectionBehavior = readChunkRuntimeString(chunk, "data-vi-selection-behavior", "single").toLowerCase();
    if (selectionBehavior === "none") {
      return;
    }
    const allowMultiple = selectionBehavior === "multiple";
    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);

    const candidates = Array.from(chunk.querySelectorAll<HTMLElement>('[data-vi-selectable-item="true"]')).filter(
      (candidate) => !isManagedComponentCandidate(chunk, candidate),
    );

    if (candidates.length === 0) {
      return;
    }

    applyStaggerReveal(chunk, candidates);
    const status = readChunkRuntimeBoolean(chunk, "data-vi-show-status", true) ? getOrCreateRuntimeStatus(chunk) : null;
    const persisted = readChunkState<number[]>(chunk, "generic-selection");
    const selectedIndexes = new Set<number>(
      Array.isArray(persisted)
        ? persisted.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        : [],
    );

    const renderSelectedState = () => {
      candidates.forEach((candidate, index) => {
        const selected = selectedIndexes.has(index);
        candidate.classList.toggle("vi-runtime-selected", selected);
        candidate.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      writeChunkState(chunk, "generic-selection", Array.from(selectedIndexes).sort((left, right) => left - right));
      if (status) {
        const count = selectedIndexes.size;
        const message = resolveStatusMessage(
          chunk,
          count === 0 ? "None selected." : `${String(count)} selected.`,
          count === 0 ? "No items selected." : `${String(count)} item${count === 1 ? "" : "s"} selected.`,
          count === 0
            ? "No items are currently selected. Click a card or list item to focus attention."
            : `${String(count)} item${count === 1 ? "" : "s"} selected. Use arrow keys to move focus and Enter to toggle selection.`,
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    const toggleIndex = (index: number) => {
      if (!allowMultiple) {
        if (selectedIndexes.has(index)) {
          selectedIndexes.clear();
        } else {
          selectedIndexes.clear();
          selectedIndexes.add(index);
        }
      } else if (selectedIndexes.has(index)) {
        selectedIndexes.delete(index);
      } else {
        selectedIndexes.add(index);
      }
      renderSelectedState();
    };

    candidates.forEach((candidate, index) => {
      if (!candidate.matches("a,button,input,select,textarea,summary,[tabindex]")) {
        candidate.tabIndex = candidate.tabIndex >= 0 ? candidate.tabIndex : 0;
      }

      candidate.addEventListener("click", () => {
        toggleIndex(index);
      });
      if (hoverActivation) {
        bindHoverActivation(candidate, () => {
          toggleIndex(index);
        });
      }

      candidate.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleIndex(index);
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          candidates[resolveStepIndex(index, 1, candidates.length, wrapNavigation)]?.focus();
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          candidates[resolveStepIndex(index, -1, candidates.length, wrapNavigation)]?.focus();
        }
      });
    });

    renderSelectedState();
  });
}

function setupGenericDetailsRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-vi-template]").forEach((chunk) => {
    if (!isJavaScriptChunk(chunk) || chunk.dataset.viGenericDetailsBound === "true") {
      return;
    }
    chunk.dataset.viGenericDetailsBound = "true";

    const details = Array.from(chunk.querySelectorAll<HTMLDetailsElement>("details")).filter(
      (candidate) => !isManagedComponentCandidate(chunk, candidate),
    );
    if (details.length === 0) {
      return;
    }

    const disclosureMode = readChunkRuntimeString(chunk, "data-vi-details-mode", "single").toLowerCase();
    const allowMultiple = disclosureMode === "multiple";
    const wrapNavigation = resolveNavigationWrap(chunk);
    const status = readChunkRuntimeBoolean(chunk, "data-vi-show-status", true) ? getOrCreateRuntimeStatus(chunk) : null;
    const persisted = readChunkState<number[]>(chunk, "generic-details-open");

    const applyOpenState = (openIndexes: Set<number>) => {
      details.forEach((detail, index) => {
        detail.open = openIndexes.has(index);
      });
      writeChunkState(chunk, "generic-details-open", Array.from(openIndexes).sort((left, right) => left - right));
      if (status) {
        const count = openIndexes.size;
        const message = resolveStatusMessage(
          chunk,
          count === 0 ? "Closed." : `${String(count)} open.`,
          count === 0 ? "All details closed." : `${String(count)} detail${count === 1 ? "" : "s"} open.`,
          count === 0
            ? "All details are collapsed. Expand entries to reveal supporting content."
            : `${String(count)} detail${count === 1 ? "" : "s"} expanded. Use arrow keys on a summary to move between entries.`,
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    const openIndexes = new Set<number>(
      Array.isArray(persisted)
        ? persisted.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        : [],
    );
    if (!allowMultiple && openIndexes.size > 1) {
      const firstOpen = openIndexes.values().next().value;
      openIndexes.clear();
      if (typeof firstOpen === "number") {
        openIndexes.add(firstOpen);
      }
    }
    applyOpenState(openIndexes);

    details.forEach((detail, index) => {
      const summary = detail.querySelector<HTMLElement>("summary");

      detail.addEventListener("toggle", () => {
        if (detail.open) {
          if (!allowMultiple) {
            openIndexes.clear();
          }
          openIndexes.add(index);
        } else {
          openIndexes.delete(index);
        }
        applyOpenState(openIndexes);
      });

      summary?.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          details[resolveStepIndex(index, 1, details.length, wrapNavigation)]?.querySelector<HTMLElement>("summary")?.focus();
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          details[resolveStepIndex(index, -1, details.length, wrapNavigation)]?.querySelector<HTMLElement>("summary")?.focus();
        }
      });
    });
  });
}

function setupFormFeedbackRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLFormElement>("form.vi-form").forEach((form) => {
    if (form.dataset.viFormBound === "true") {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(form);
    if (!isJavaScriptChunk(chunk)) {
      return;
    }
    form.dataset.viFormBound = "true";

    const status = chunk && readChunkRuntimeBoolean(chunk, "data-vi-show-status", true) ? getOrCreateRuntimeStatus(chunk) : null;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const filledCount = Array.from(data.values()).reduce((total, value) => {
        return String(value).trim().length > 0 ? total + 1 : total;
      }, 0);
      writeChunkState(chunk, "form-last-submit", {
        at: Date.now(),
        filledCount,
      });
      if (status) {
        const message = resolveStatusMessage(
          chunk,
          "Submitted.",
          "Form captured.",
          `Form captured in preview with ${String(filledCount)} populated field${filledCount === 1 ? "" : "s"}. Connect this layout to your backend in production.`,
        );
        if (message) {
          status.textContent = message;
        }
      }
    });
  });
}

function setupAnchorNavRuntime(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".vi-anchor-nav").forEach((nav) => {
    if (nav.dataset.viAnchorBound === "true") {
      return;
    }

    const chunk = resolveChunkRuntimeContainer(nav);
    if (!isJavaScriptChunk(chunk)) {
      return;
    }
    nav.dataset.viAnchorBound = "true";

    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
    if (links.length === 0) {
      return;
    }

    const wrapNavigation = resolveNavigationWrap(chunk);
    const hoverActivation = resolveHoverActivation(chunk);
    const status = chunk && readChunkRuntimeBoolean(chunk, "data-vi-show-status", true) ? getOrCreateRuntimeStatus(chunk) : null;
    const persisted = readChunkState<number>(chunk, "anchor-nav");
    let activeIndex = typeof persisted === "number" && Number.isFinite(persisted) ? Math.round(persisted) : -1;

    const applyActive = (index: number) => {
      activeIndex = index;
      links.forEach((link, linkIndex) => {
        link.classList.toggle("vi-runtime-selected", linkIndex === activeIndex);
        link.setAttribute("aria-current", linkIndex === activeIndex ? "true" : "false");
      });
      writeChunkState(chunk, "anchor-nav", activeIndex);
      if (status && activeIndex >= 0) {
        const label = links[activeIndex]?.textContent?.trim() || "anchor";
        const message = resolveStatusMessage(
          chunk,
          "Anchor selected.",
          `Selected: ${label}.`,
          `Anchor selected: ${label}. In export/runtime contexts this link jumps to the matching section.`,
        );
        if (message) {
          status.textContent = message;
        }
      }
    };

    links.forEach((link, index) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        applyActive(index);
      });
      if (hoverActivation) {
        bindHoverActivation(link, () => {
          applyActive(index);
        });
      }

      link.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const nextIndex = resolveStepIndex(index, 1, links.length, wrapNavigation);
          links[nextIndex]?.focus();
          applyActive(nextIndex);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const previousIndex = resolveStepIndex(index, -1, links.length, wrapNavigation);
          links[previousIndex]?.focus();
          applyActive(previousIndex);
        }
      });
    });

    if (activeIndex >= 0 && activeIndex < links.length) {
      applyActive(activeIndex);
    }
  });
}

export function hydrateInteractiveChunkRuntime(root: ParentNode) {
  setupInitialStatusRuntime(root);
  setupTabsRuntime(root);
  setupStepperRuntime(root);
  setupBeforeAfterRuntime(root);
  setupScrollCarouselRuntime(root);
  setupLightboxRuntime(root);
  setupDismissibleRuntime(root);
  setupPollRuntime(root);
  setupQuizRuntime(root);
  setupFilterRuntime(root);
  setupSortRuntime(root);
  setupFootnoteRuntime(root);
  setupCountdownRuntime(root);
  setupCopyRuntime(root);
  setupShareRuntime(root);
  setupModalRuntime(root);
  setupCountersRuntime(root);
  setupStickyProgressRuntime(root);
  setupHotspotRuntime(root);
  setupChecklistProgressRuntime(root);
  setupGenericSelectableRuntime(root);
  setupGenericDetailsRuntime(root);
  setupFormFeedbackRuntime(root);
  setupAnchorNavRuntime(root);
}
