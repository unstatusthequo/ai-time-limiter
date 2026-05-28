const remainingNode = document.getElementById("remaining");
const usedNode = document.getElementById("used");
const modeNode = document.getElementById("mode");
const barsNode = document.getElementById("bars");
const summaryNode = document.getElementById("summary");
const sitesNode = document.getElementById("sites");

init();

async function init() {
  await refresh();
  document.getElementById("open-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("reset-today").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "RESET_TODAY" });
    await refresh();
  });
}

async function refresh() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });

  if (!response?.ok) {
    return;
  }

  render(response.state);
}

function render(state) {
  remainingNode.textContent = state.exhausted ? "Limit reached" : `${Math.ceil(state.remainingMs / 60_000)}m left`;
  usedNode.textContent = formatMinutes(state.usedMs);
  modeNode.textContent = labelMode(state.settings.frictionMode);
  sitesNode.textContent = state.settings.trackedSites
    .filter((site) => site.enabled)
    .map((site) => site.label)
    .join(", ");

  const max = Math.max(...state.analytics.days.map((day) => day.usedMs), 1);
  barsNode.innerHTML = state.analytics.days.map((day) => `
    <div class="bar" title="${day.dateKey}: ${formatMinutes(day.usedMs)}">
      <span style="height:${Math.max(4, Math.round((day.usedMs / max) * 70))}px"></span>
    </div>
  `).join("");

  summaryNode.textContent = `${formatMinutes(state.analytics.totalMs)} this week. Top site: ${
    state.analytics.topSite.domain || "none yet"
  }.`;
}

function formatMinutes(ms) {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours ? `${hours}h ${rest}m` : `${minutes}m`;
}

function labelMode(mode) {
  return {
    normal: "Normal",
    soft: "Soft",
    strict: "Strict"
  }[mode] ?? "Normal";
}
