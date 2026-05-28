import { DEFAULT_SETTINGS, PRESETS, applyPreset, normalizeSettings } from "./usage.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const form = document.getElementById("settings-form");
const siteList = document.getElementById("site-list");
const dayLimits = document.getElementById("day-limits");
const customDomainInput = document.getElementById("custom-domain");
const statusNode = document.getElementById("status");

let currentSettings = DEFAULT_SETTINGS;

init();

async function init() {
  currentSettings = normalizeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
  renderSettings(currentSettings);

  form.addEventListener("submit", saveSettings);
  document.getElementById("reset-usage").addEventListener("click", resetUsage);
  document.getElementById("add-site").addEventListener("click", addSite);
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      currentSettings = applyPreset(button.dataset.preset, currentSettings);
      renderSettings(currentSettings);
      showStatus(`${PRESETS[button.dataset.preset].label} preset applied. Save to keep it.`);
    });
  });
}

async function saveSettings(event) {
  event.preventDefault();

  currentSettings = normalizeSettings({
    alertEnabled: field("alert-enabled").checked,
    blockMessage: field("block-message").value,
    dailyLimitMinutes: field("daily-limit").value,
    dayLimits: collectDayLimits(),
    frictionMode: field("friction-mode").value,
    graceMinutes: field("grace-minutes").value,
    graceUsesPerDay: field("grace-uses").value,
    purposePromptEnabled: field("purpose-prompt-enabled").checked,
    redirectUrl: field("redirect-url").value,
    sessionAlertMinutes: field("session-alert").value,
    trackedSites: collectSites(),
    workEnd: field("work-end").value,
    workHoursEnabled: field("work-hours-enabled").checked,
    workStart: field("work-start").value
  });

  await chrome.storage.sync.set(currentSettings);
  renderSettings(currentSettings);
  showStatus("Settings saved.");
}

async function resetUsage() {
  await chrome.runtime.sendMessage({ type: "RESET_TODAY" });
  showStatus("Today's usage reset.");
}

function addSite() {
  const domain = customDomainInput.value.trim();

  if (!domain) {
    return;
  }

  currentSettings = normalizeSettings({
    ...currentSettings,
    trackedSites: [
      ...collectSites(),
      { label: domain.replace(/^www\./, ""), domain, enabled: true, builtin: false }
    ]
  });
  customDomainInput.value = "";
  renderSettings(currentSettings);
}

function renderSettings(settings) {
  field("daily-limit").value = settings.dailyLimitMinutes;
  field("session-alert").value = settings.sessionAlertMinutes;
  field("alert-enabled").checked = settings.alertEnabled;
  field("block-message").value = settings.blockMessage;
  field("friction-mode").value = settings.frictionMode;
  field("grace-minutes").value = settings.graceMinutes;
  field("grace-uses").value = settings.graceUsesPerDay;
  field("purpose-prompt-enabled").checked = settings.purposePromptEnabled;
  field("redirect-url").value = settings.redirectUrl;
  field("work-hours-enabled").checked = settings.workHoursEnabled;
  field("work-start").value = settings.workStart;
  field("work-end").value = settings.workEnd;
  renderDayLimits(settings);
  renderSites(settings);
}

function renderDayLimits(settings) {
  dayLimits.innerHTML = DAY_LABELS.map(
    (label, index) => `
      <label>
        <span>${label}</span>
        <input data-day="${index}" type="number" min="1" max="720" step="1" value="${settings.dayLimits[index]}">
      </label>
    `
  ).join("");
}

function renderSites(settings) {
  siteList.innerHTML = settings.trackedSites.map((site, index) => `
    <label class="site-row">
      <input type="checkbox" data-site-enabled="${index}" ${site.enabled ? "checked" : ""}>
      <span>${escapeHtml(site.label)}</span>
      <input data-site-domain="${index}" value="${escapeHtml(site.domain)}" ${site.builtin ? "readonly" : ""}>
      <button type="button" data-remove-site="${index}" ${site.builtin ? "disabled" : ""}>Remove</button>
    </label>
  `).join("");

  siteList.querySelectorAll("[data-remove-site]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeSite);
      currentSettings = normalizeSettings({
        ...currentSettings,
        trackedSites: collectSites().filter((_, siteIndex) => siteIndex !== index)
      });
      renderSettings(currentSettings);
    });
  });
}

function collectDayLimits() {
  return Object.fromEntries(
    [...dayLimits.querySelectorAll("[data-day]")].map((input) => [input.dataset.day, input.value])
  );
}

function collectSites() {
  return [...siteList.querySelectorAll(".site-row")].map((row, index) => ({
    builtin: currentSettings.trackedSites[index]?.builtin ?? false,
    domain: row.querySelector("[data-site-domain]").value,
    enabled: row.querySelector("[data-site-enabled]").checked,
    label: currentSettings.trackedSites[index]?.label ?? row.querySelector("[data-site-domain]").value
  }));
}

function field(id) {
  return document.getElementById(id);
}

function showStatus(message) {
  statusNode.textContent = message;
  setTimeout(() => {
    if (statusNode.textContent === message) {
      statusNode.textContent = "";
    }
  }, 3500);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
