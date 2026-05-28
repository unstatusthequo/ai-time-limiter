(() => {
  const HEARTBEAT_INTERVAL_MS = 1000;
  const ROOT_ID = "ai-time-limiter-root";

  let root;
  let refs = {};
  let lastActiveAt = performance.now();
  let sessionActiveMs = 0;
  let alertShown = false;
  let latestState = null;

  init();

  function init() {
    requestState();
    setInterval(tick, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", resetActiveClock);
    window.addEventListener("focus", resetActiveClock);
    window.addEventListener("blur", resetActiveClock);
  }

  function tick() {
    const now = performance.now();
    const active = isPageActive();
    const deltaMs = active && latestState?.tracked ? now - lastActiveAt : 0;
    lastActiveAt = now;

    if (active && latestState?.tracked) {
      sessionActiveMs += deltaMs;
    }

    sendMessage({ type: "HEARTBEAT", deltaMs })
      .then((response) => {
        if (response?.ok && response.state) {
          latestState = response.state;
          render(response.state);
        }
      })
      .catch(renderOffline);
  }

  function requestState() {
    sendMessage({ type: "GET_STATE" })
      .then((response) => {
        if (response?.ok && response.state) {
          latestState = response.state;
          render(response.state);
        }
      })
      .catch(() => {});
  }

  function render(state) {
    if (!state.tracked) {
      hideRoot();
      return;
    }

    mountUi();

    const usedSeconds = Math.floor(state.usedMs / 1000);
    const remainingSeconds = Math.floor(state.remainingMs / 1000);
    const sessionAlertMs = state.settings.sessionAlertMinutes * 60 * 1000;

    refs.clock.textContent = formatClock(usedSeconds);
    refs.remaining.textContent = state.exhausted
      ? "Daily limit reached"
      : `${formatCompact(remainingSeconds)} left today`;
    refs.site.textContent = state.site?.label ?? state.site?.domain ?? "AI site";

    if (
      state.settings.purposePromptEnabled &&
      !state.currentPurpose &&
      !state.exhausted
    ) {
      refs.purposeText.textContent = "Set one below";
      refs.purpose.hidden = false;
    } else {
      refs.purposeText.textContent = state.currentPurpose || "Not required";
      refs.purpose.hidden = true;
    }

    if (
      state.settings.alertEnabled &&
      !alertShown &&
      sessionActiveMs >= sessionAlertMs &&
      !state.exhausted
    ) {
      alertShown = true;
      showToast(`You've spent ${state.settings.sessionAlertMinutes} minutes here this session.`);
    }

    if (state.exhausted && state.settings.frictionMode === "soft") {
      showToast("Daily AI budget reached. Soft mode is letting you continue.");
      hideBlocker();
      return;
    }

    if (state.exhausted) {
      showBlocker(state);
    } else {
      hideBlocker();
    }
  }

  function renderOffline() {
    if (refs.remaining) {
      refs.remaining.textContent = "Tracker unavailable";
    }
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.hidden = false;
    setTimeout(() => {
      refs.toast.hidden = true;
    }, 8000);
  }

  function showBlocker(state) {
    refs.blockMessage.textContent = state.settings.blockMessage;
    refs.blockStats.textContent = `${formatClock(Math.floor(state.limitMs / 1000))} used. Resets at ${state.nextResetLabel}.`;
    refs.graceButton.hidden = !state.graceAvailable;
    refs.redirectButton.hidden = !state.settings.redirectUrl;
    refs.strictField.hidden = state.settings.frictionMode !== "strict" || !state.graceAvailable;
    refs.blocker.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  function hideBlocker() {
    if (!refs.blocker) {
      return;
    }

    refs.blocker.hidden = true;
    document.documentElement.style.overflow = "";
  }

  function hideRoot() {
    if (root) {
      root.remove();
      root = null;
      refs = {};
    }
  }

  function mountUi() {
    if (root) {
      return;
    }

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.attachShadow({ mode: "open" });
    root.shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          color-scheme: light dark;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .badge {
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 2147483646;
          min-width: 184px;
          padding: 11px 12px;
          border: 1px solid rgba(20, 24, 32, 0.18);
          border-radius: 8px;
          background: rgba(255, 252, 245, 0.97);
          box-shadow: 0 12px 32px rgba(16, 24, 40, 0.16);
          color: #1f2937;
          line-height: 1.2;
        }

        .label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 5px;
          color: #685642;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .clock {
          font-variant-numeric: tabular-nums;
          font-size: 21px;
          font-weight: 850;
        }

        .remaining,
        .purpose-line {
          margin-top: 4px;
          color: #4b5563;
          font-size: 12px;
        }

        .toast,
        .purpose {
          position: fixed;
          right: 14px;
          z-index: 2147483647;
          max-width: 310px;
          border-radius: 8px;
          box-shadow: 0 16px 36px rgba(16, 24, 40, 0.22);
          font-size: 14px;
          line-height: 1.35;
        }

        .toast {
          top: 118px;
          padding: 12px 14px;
          background: #7c2d12;
          color: #fff7ed;
        }

        .purpose {
          top: 118px;
          display: grid;
          gap: 9px;
          padding: 14px;
          border: 1px solid rgba(20, 24, 32, 0.18);
          background: #fffcf5;
          color: #1f2937;
        }

        .purpose strong {
          font-size: 13px;
        }

        input,
        textarea {
          box-sizing: border-box;
          width: 100%;
          border: 1px solid #d6c8b5;
          border-radius: 8px;
          background: #ffffff;
          color: #1f2937;
          font: inherit;
          padding: 9px 10px;
        }

        .blocker {
          position: fixed;
          inset: 0;
          z-index: 2147483645;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(255, 252, 245, 0.98);
          color: #1f2937;
        }

        .blocker[hidden],
        .toast[hidden],
        .purpose[hidden],
        [hidden] {
          display: none;
        }

        .panel {
          width: min(560px, 100%);
          border: 1px solid rgba(88, 64, 41, 0.2);
          border-radius: 8px;
          background: #fffaf1;
          box-shadow: 0 24px 70px rgba(88, 64, 41, 0.18);
          padding: 30px;
          text-align: left;
        }

        .panel h1 {
          margin: 0 0 12px;
          color: #1f2937;
          font-size: 26px;
          line-height: 1.12;
          letter-spacing: 0;
        }

        .panel p {
          margin: 0 0 16px;
          color: #4b5563;
          font-size: 16px;
          line-height: 1.45;
        }

        .stats {
          color: #6b7280;
          font-size: 13px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        button {
          appearance: none;
          border: 1px solid #1f2937;
          border-radius: 8px;
          background: #1f2937;
          color: #fffaf1;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 12px;
        }

        button.secondary {
          background: transparent;
          color: #1f2937;
        }
      </style>
      <aside class="badge" aria-live="polite">
        <div class="label"><span>AI time today</span><span class="site">AI</span></div>
        <div class="clock">00:00:00</div>
        <div class="remaining">Loading...</div>
        <div class="purpose-line">Purpose: <span class="purpose-text">No purpose set</span></div>
      </aside>
      <form class="purpose" hidden>
        <strong>What are you here to do?</strong>
        <input maxlength="100" placeholder="e.g. Draft client email">
        <button type="submit">Start focused session</button>
      </form>
      <div class="toast" role="status" hidden></div>
      <section class="blocker" role="dialog" aria-modal="true" aria-labelledby="ai-time-limiter-title" hidden>
        <div class="panel">
          <h1 id="ai-time-limiter-title">Time to get back to real work</h1>
          <p class="message"></p>
          <div class="stats"></div>
          <textarea class="strict-field" rows="3" maxlength="120" placeholder="Strict mode: write why more AI time is necessary."></textarea>
          <div class="actions">
            <button class="grace" type="button">Use grace time</button>
            <button class="redirect" type="button">Go to focus page</button>
            <button class="settings secondary" type="button">Settings</button>
          </div>
        </div>
      </section>
    `;

    document.documentElement.append(root);
    protectExtensionInputs(root.shadowRoot);
    refs = {
      blockMessage: root.shadowRoot.querySelector(".message"),
      blocker: root.shadowRoot.querySelector(".blocker"),
      blockStats: root.shadowRoot.querySelector(".stats"),
      clock: root.shadowRoot.querySelector(".clock"),
      graceButton: root.shadowRoot.querySelector(".grace"),
      purpose: root.shadowRoot.querySelector(".purpose"),
      purposeInput: root.shadowRoot.querySelector(".purpose input"),
      purposeText: root.shadowRoot.querySelector(".purpose-text"),
      redirectButton: root.shadowRoot.querySelector(".redirect"),
      remaining: root.shadowRoot.querySelector(".remaining"),
      settingsButton: root.shadowRoot.querySelector(".settings"),
      site: root.shadowRoot.querySelector(".site"),
      strictField: root.shadowRoot.querySelector(".strict-field"),
      toast: root.shadowRoot.querySelector(".toast")
    };

    refs.purpose.addEventListener("submit", (event) => {
      event.preventDefault();
      const purpose = refs.purposeInput.value.trim();
      if (purpose) {
        sendMessage({ type: "SET_PURPOSE", purpose }).then((response) => {
          if (response?.state) {
            render(response.state);
          }
        });
      }
    });

    refs.graceButton.addEventListener("click", () => {
      if (latestState?.settings.frictionMode === "strict" && !refs.strictField.value.trim()) {
        showToast("Strict mode needs a reason before grace time starts.");
        return;
      }

      sendMessage({ type: "USE_GRACE" }).then((response) => {
        if (response?.state) {
          render(response.state);
        }
      });
    });

    refs.redirectButton.addEventListener("click", () => {
      if (latestState?.settings.redirectUrl) {
        window.location.assign(latestState.settings.redirectUrl);
      }
    });

    refs.settingsButton.addEventListener("click", () => {
      sendMessage({ type: "OPEN_OPTIONS" });
    });
  }

  function resetActiveClock() {
    lastActiveAt = performance.now();
  }

  function isPageActive() {
    return document.visibilityState === "visible" && document.hasFocus();
  }

  function sendMessage(message) {
    return chrome.runtime.sendMessage(message);
  }

  function protectExtensionInputs(shadowRoot) {
    const guardedEvents = [
      "beforeinput",
      "compositionend",
      "compositionstart",
      "compositionupdate",
      "copy",
      "cut",
      "input",
      "keydown",
      "keypress",
      "keyup",
      "mousedown",
      "paste",
      "pointerdown",
      "touchstart"
    ];

    for (const eventName of guardedEvents) {
      shadowRoot.addEventListener(
        eventName,
        (event) => {
          if (isExtensionEditable(event.target)) {
            event.stopPropagation();
          }
        }
      );
    }
  }

  function isExtensionEditable(target) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable
    );
  }

  function formatClock(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    return [hours, minutes, remainingSeconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  function formatCompact(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
})();
