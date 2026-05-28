export const DEFAULT_TRACKED_SITES = [
  { label: "ChatGPT", domain: "chatgpt.com", enabled: true, builtin: true },
  { label: "Claude", domain: "claude.ai", enabled: true, builtin: true },
  { label: "Gemini", domain: "gemini.google.com", enabled: true, builtin: true },
  { label: "Perplexity", domain: "perplexity.ai", enabled: true, builtin: true },
  { label: "Poe", domain: "poe.com", enabled: true, builtin: true },
  { label: "Copilot", domain: "copilot.microsoft.com", enabled: true, builtin: true }
];

const DEFAULT_DAY_LIMITS = {
  0: 60,
  1: 60,
  2: 60,
  3: 60,
  4: 60,
  5: 60,
  6: 60
};

export const PRESETS = {
  light: {
    label: "Light use",
    dailyLimitMinutes: 60,
    sessionAlertMinutes: 20,
    frictionMode: "normal"
  },
  focus: {
    label: "Focus workday",
    dailyLimitMinutes: 30,
    sessionAlertMinutes: 10,
    frictionMode: "normal"
  },
  strict: {
    label: "Strict reset",
    dailyLimitMinutes: 15,
    sessionAlertMinutes: 5,
    frictionMode: "strict"
  }
};

export const DEFAULT_SETTINGS = {
  dailyLimitMinutes: 60,
  sessionAlertMinutes: 15,
  alertEnabled: true,
  blockMessage: "Daily AI time is used up. Close this and get back to real work.",
  dayLimits: DEFAULT_DAY_LIMITS,
  frictionMode: "normal",
  graceMinutes: 5,
  graceUsesPerDay: 1,
  purposePromptEnabled: true,
  redirectUrl: "",
  trackedSites: DEFAULT_TRACKED_SITES,
  workEnd: "17:00",
  workHoursEnabled: false,
  workStart: "09:00"
};

const LIMITS = {
  dailyLimitMinutes: { min: 1, max: 720 },
  sessionAlertMinutes: { min: 1, max: 240 },
  graceMinutes: { min: 0, max: 60 },
  graceUsesPerDay: { min: 0, max: 12 },
  blockMessageLength: 180,
  purposeLength: 100,
  siteDomainLength: 120,
  siteLabelLength: 40
};

const FRICTION_MODES = new Set(["soft", "normal", "strict"]);

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeSettings(settings = {}) {
  const dailyLimitMinutes = clampInteger(
    settings.dailyLimitMinutes,
    DEFAULT_SETTINGS.dailyLimitMinutes,
    LIMITS.dailyLimitMinutes.min,
    LIMITS.dailyLimitMinutes.max
  );
  const sessionAlertMinutes = clampInteger(
    settings.sessionAlertMinutes,
    DEFAULT_SETTINGS.sessionAlertMinutes,
    LIMITS.sessionAlertMinutes.min,
    LIMITS.sessionAlertMinutes.max
  );
  const blockMessage = normalizeBlockMessage(settings.blockMessage);
  const dayLimits = normalizeDayLimits(settings.dayLimits, dailyLimitMinutes);
  const frictionMode = FRICTION_MODES.has(settings.frictionMode)
    ? settings.frictionMode
    : DEFAULT_SETTINGS.frictionMode;
  const graceMinutes = clampInteger(
    settings.graceMinutes,
    DEFAULT_SETTINGS.graceMinutes,
    LIMITS.graceMinutes.min,
    LIMITS.graceMinutes.max
  );
  const graceUsesPerDay = clampInteger(
    settings.graceUsesPerDay,
    DEFAULT_SETTINGS.graceUsesPerDay,
    LIMITS.graceUsesPerDay.min,
    LIMITS.graceUsesPerDay.max
  );

  return {
    dailyLimitMinutes,
    sessionAlertMinutes,
    alertEnabled:
      typeof settings.alertEnabled === "boolean"
        ? settings.alertEnabled
        : DEFAULT_SETTINGS.alertEnabled,
    blockMessage,
    dayLimits,
    frictionMode,
    graceMinutes,
    graceUsesPerDay,
    purposePromptEnabled:
      typeof settings.purposePromptEnabled === "boolean"
        ? settings.purposePromptEnabled
        : DEFAULT_SETTINGS.purposePromptEnabled,
    redirectUrl: normalizeRedirectUrl(settings.redirectUrl),
    trackedSites: normalizeTrackedSites(settings.trackedSites),
    workEnd: normalizeTime(settings.workEnd, DEFAULT_SETTINGS.workEnd),
    workHoursEnabled:
      typeof settings.workHoursEnabled === "boolean"
        ? settings.workHoursEnabled
        : DEFAULT_SETTINGS.workHoursEnabled,
    workStart: normalizeTime(settings.workStart, DEFAULT_SETTINGS.workStart)
  };
}

export function applyPreset(presetName, baseSettings = {}) {
  const preset = PRESETS[presetName] ?? {};

  return normalizeSettings({
    ...baseSettings,
    ...preset,
    dayLimits: buildPresetDayLimits(preset.dailyLimitMinutes, baseSettings.dayLimits)
  });
}

export function buildUsageState(usage, settings, now = new Date()) {
  const normalizedSettings = normalizeSettings(settings);
  const baseLimitMs = getLimitMinutesForDate(now, normalizedSettings) * 60 * 1000;
  const graceUsedMs =
    Math.max(0, Number(usage?.graceUses) || 0) * normalizedSettings.graceMinutes * 60 * 1000;
  const limitMs = baseLimitMs + graceUsedMs;
  const rawUsedMs = Math.max(0, Number(usage?.usedMs) || 0);

  return {
    baseLimitMs,
    currentPurpose: usage?.currentPurpose ?? "",
    dateKey: usage?.dateKey ?? getLocalDateKey(),
    usedMs: Math.min(rawUsedMs, limitMs),
    remainingMs: Math.max(0, limitMs - rawUsedMs),
    limitMs,
    exhausted: rawUsedMs >= limitMs,
    graceAvailable: canUseGrace(usage, normalizedSettings),
    nextResetLabel: formatResetTime(now),
    settings: normalizedSettings
  };
}

export function getLimitMinutesForDate(date = new Date(), settings = DEFAULT_SETTINGS) {
  const normalizedSettings = normalizeSettings(settings);
  const day = date.getDay();

  return normalizedSettings.dayLimits[day] ?? normalizedSettings.dailyLimitMinutes;
}

export function isTrackedUrl(urlValue, settings = DEFAULT_SETTINGS) {
  const settingsWithDefaults = normalizeSettings(settings);
  const host = getHostname(urlValue);

  if (!host) {
    return false;
  }

  return settingsWithDefaults.trackedSites.some((site) => {
    if (!site.enabled) {
      return false;
    }

    return host === site.domain || host.endsWith(`.${site.domain}`);
  });
}

export function getTrackedSiteForUrl(urlValue, settings = DEFAULT_SETTINGS) {
  const settingsWithDefaults = normalizeSettings(settings);
  const host = getHostname(urlValue);

  if (!host) {
    return null;
  }

  return (
    settingsWithDefaults.trackedSites.find(
      (site) => site.enabled && (host === site.domain || host.endsWith(`.${site.domain}`))
    ) ?? null
  );
}

export function isWithinWorkHours(date = new Date(), settings = DEFAULT_SETTINGS) {
  const settingsWithDefaults = normalizeSettings(settings);

  if (!settingsWithDefaults.workHoursEnabled) {
    return true;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = timeToMinutes(settingsWithDefaults.workStart);
  const endMinutes = timeToMinutes(settingsWithDefaults.workEnd);

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function shouldTrackUrl(urlValue, settings = DEFAULT_SETTINGS, date = new Date()) {
  return isTrackedUrl(urlValue, settings) && isWithinWorkHours(date, settings);
}

export function canUseGrace(usage, settings = DEFAULT_SETTINGS) {
  const settingsWithDefaults = normalizeSettings(settings);
  const graceUses = Math.max(0, Number(usage?.graceUses) || 0);

  return settingsWithDefaults.graceMinutes > 0 && graceUses < settingsWithDefaults.graceUsesPerDay;
}

export function buildWeeklyAnalytics(history = {}, now = new Date()) {
  const days = [];
  const siteTotals = new Map();
  let totalMs = 0;

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const dateKey = getLocalDateKey(date);
    const entry = history[dateKey] ?? {};
    const usedMs = Math.max(0, Number(entry.usedMs) || 0);

    totalMs += usedMs;
    days.push({ dateKey, usedMs });

    for (const [domain, siteMs] of Object.entries(entry.siteMs ?? {})) {
      siteTotals.set(domain, (siteTotals.get(domain) ?? 0) + Math.max(0, Number(siteMs) || 0));
    }
  }

  const topSite = [...siteTotals.entries()]
    .map(([domain, usedMs]) => ({ domain, usedMs }))
    .sort((a, b) => b.usedMs - a.usedMs)[0] ?? { domain: "", usedMs: 0 };

  return {
    averageMs: Math.round(totalMs / 7),
    days,
    topSite,
    totalMs
  };
}

export function createPurposeEntry(purpose, domain, date = new Date()) {
  return {
    purpose: normalizePurpose(purpose),
    domain: normalizeDomain(domain),
    startedAt: date.toISOString()
  };
}

export function formatResetTime(date = new Date()) {
  const nextReset = new Date(date);
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);

  return nextReset.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function secondsToClock(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeBlockMessage(message) {
  if (typeof message !== "string") {
    return DEFAULT_SETTINGS.blockMessage;
  }

  const trimmed = message.trim();

  if (!trimmed) {
    return DEFAULT_SETTINGS.blockMessage;
  }

  return trimmed.slice(0, LIMITS.blockMessageLength);
}

function normalizeDayLimits(dayLimits, fallback) {
  const normalized = {};

  for (let day = 0; day < 7; day += 1) {
    normalized[day] = clampInteger(
      dayLimits?.[day],
      fallback,
      LIMITS.dailyLimitMinutes.min,
      LIMITS.dailyLimitMinutes.max
    );
  }

  return normalized;
}

function normalizeTrackedSites(sites) {
  const source = Array.isArray(sites) && sites.length > 0 ? sites : DEFAULT_TRACKED_SITES;
  const seen = new Set();
  const normalized = [];

  for (const site of source) {
    const domain = normalizeDomain(site?.domain);

    if (!domain || seen.has(domain)) {
      continue;
    }

    seen.add(domain);
    normalized.push({
      label: normalizeSiteLabel(site?.label, domain),
      domain,
      enabled: typeof site?.enabled === "boolean" ? site.enabled : true,
      builtin: Boolean(site?.builtin)
    });
  }

  return normalized.length ? normalized : DEFAULT_TRACKED_SITES;
}

function normalizeDomain(domain) {
  if (typeof domain !== "string") {
    return "";
  }

  const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const withoutPort = trimmed.split(":")[0];

  if (!/^[a-z0-9.-]+$/.test(withoutPort)) {
    return "";
  }

  return withoutPort.slice(0, LIMITS.siteDomainLength);
}

function normalizeSiteLabel(label, fallback) {
  if (typeof label !== "string" || !label.trim()) {
    return fallback;
  }

  return label.trim().slice(0, LIMITS.siteLabelLength);
}

function normalizeRedirectUrl(urlValue) {
  if (typeof urlValue !== "string" || !urlValue.trim()) {
    return DEFAULT_SETTINGS.redirectUrl;
  }

  try {
    const url = new URL(urlValue.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeTime(time, fallback) {
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return fallback;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return fallback;
  }

  return time;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function getHostname(urlValue) {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return normalizeDomain(urlValue);
  }
}

function normalizePurpose(purpose) {
  if (typeof purpose !== "string") {
    return "Unspecified";
  }

  const trimmed = purpose.trim();

  return trimmed ? trimmed.slice(0, LIMITS.purposeLength) : "Unspecified";
}

function buildPresetDayLimits(limit, existingDayLimits) {
  if (!limit) {
    return existingDayLimits;
  }

  return {
    0: limit,
    1: limit,
    2: limit,
    3: limit,
    4: limit,
    5: limit,
    6: limit
  };
}
