import {
  buildUsageState,
  buildWeeklyAnalytics,
  createPurposeEntry,
  getLocalDateKey,
  getTrackedSiteForUrl,
  normalizeSettings,
  shouldTrackUrl
} from "./usage.js";

const DAILY_USAGE_KEY = "dailyUsage";
const HISTORY_KEY = "usageHistory";
const MAX_HEARTBEAT_MS = 5000;

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await chrome.storage.sync.set(settings);
  await updateBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("AI Time Limiter message failed", error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});

async function handleMessage(message, sender) {
  if (!message || typeof message.type !== "string") {
    return { ok: false, error: "Invalid message" };
  }

  if (message.type === "OPEN_OPTIONS") {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  }

  if (message.type === "HEARTBEAT") {
    const settings = await getSettings();
    if (!isTrackedSender(sender, settings)) {
      return { ok: true, state: await buildState(await getUsageForToday(), sender, settings) };
    }

    const deltaMs = normalizeHeartbeatDelta(message.deltaMs);
    const usage = await addUsage(deltaMs, sender.url);
    await updateBadge();

    return { ok: true, state: await buildState(usage, sender, settings) };
  }

  if (message.type === "GET_STATE") {
    const settings = await getSettings();
    const usage = await getUsageForToday();

    return { ok: true, state: await buildState(usage, sender, settings) };
  }

  if (message.type === "USE_GRACE") {
    const settings = await getSettings();
    const usage = await getUsageForToday();

    if (buildUsageState(usage, settings).graceAvailable) {
      usage.graceUses += 1;
      await persistUsage(usage);
      await updateBadge();
    }

    return { ok: true, state: await buildState(usage, sender, settings) };
  }

  if (message.type === "SET_PURPOSE") {
    const settings = await getSettings();
    const usage = await getUsageForToday();
    const site = getTrackedSiteForUrl(sender?.url ?? "", settings);
    const entry = createPurposeEntry(message.purpose, site?.domain ?? "", new Date());

    usage.currentPurpose = entry.purpose;
    usage.purposeLog = [entry, ...(usage.purposeLog ?? [])].slice(0, 20);
    await persistUsage(usage);

    return { ok: true, state: await buildState(usage, sender, settings) };
  }

  if (message.type === "RESET_TODAY") {
    await resetToday();
    await updateBadge();

    return { ok: true, state: await buildState(await getUsageForToday(), sender, await getSettings()) };
  }

  return { ok: false, error: "Unknown message type" };
}

async function addUsage(deltaMs, url) {
  const usage = await getUsageForToday();
  const site = getTrackedSiteForUrl(url, await getSettings());

  if (deltaMs > 0) {
    usage.usedMs += deltaMs;
    if (site) {
      usage.siteMs[site.domain] = (usage.siteMs[site.domain] ?? 0) + deltaMs;
    }
    await persistUsage(usage);
  }

  return usage;
}

async function getUsageForToday() {
  const today = getLocalDateKey();
  const stored = await chrome.storage.local.get(DAILY_USAGE_KEY);
  const usage = stored[DAILY_USAGE_KEY];

  if (!usage || usage.dateKey !== today) {
    const freshUsage = createEmptyUsage(today);
    await chrome.storage.local.set({ [DAILY_USAGE_KEY]: freshUsage });
    return freshUsage;
  }

  return {
    dateKey: today,
    currentPurpose: typeof usage.currentPurpose === "string" ? usage.currentPurpose : "",
    graceUses: Math.max(0, Number(usage.graceUses) || 0),
    purposeLog: Array.isArray(usage.purposeLog) ? usage.purposeLog : [],
    siteMs: typeof usage.siteMs === "object" && usage.siteMs ? usage.siteMs : {},
    usedMs: Math.max(0, Number(usage.usedMs) || 0)
  };
}

async function buildState(usage, sender, settings = null) {
  const normalizedSettings = settings ?? (await getSettings());
  const now = new Date();
  const site = getTrackedSiteForUrl(sender?.url ?? "", normalizedSettings);
  const history = await getHistory();
  const tracked = Boolean(site) && shouldTrackUrl(sender?.url ?? "", normalizedSettings, now);

  return {
    ...buildUsageState(usage, normalizedSettings, now),
    analytics: buildWeeklyAnalytics(history, now),
    purposeLog: usage.purposeLog ?? [],
    site,
    tracked
  };
}

async function getSettings() {
  const stored = await chrome.storage.sync.get();

  return normalizeSettings(stored);
}

function normalizeHeartbeatDelta(deltaMs) {
  const parsed = Number(deltaMs);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(MAX_HEARTBEAT_MS, Math.floor(parsed));
}

function isTrackedSender(sender, settings) {
  if (!sender?.url) {
    return false;
  }

  return shouldTrackUrl(sender.url, settings, new Date());
}

function createEmptyUsage(dateKey) {
  return {
    currentPurpose: "",
    dateKey,
    graceUses: 0,
    purposeLog: [],
    siteMs: {},
    usedMs: 0
  };
}

async function persistUsage(usage) {
  const history = await getHistory();
  const historyEntry = {
    purposeLog: usage.purposeLog ?? [],
    siteMs: usage.siteMs ?? {},
    usedMs: usage.usedMs
  };

  history[usage.dateKey] = historyEntry;
  await chrome.storage.local.set({ [DAILY_USAGE_KEY]: usage, [HISTORY_KEY]: pruneHistory(history) });
}

async function getHistory() {
  const stored = await chrome.storage.local.get(HISTORY_KEY);

  return stored[HISTORY_KEY] && typeof stored[HISTORY_KEY] === "object" ? stored[HISTORY_KEY] : {};
}

function pruneHistory(history) {
  return Object.fromEntries(Object.entries(history).sort(([a], [b]) => b.localeCompare(a)).slice(0, 45));
}

async function updateBadge() {
  const usage = await getUsageForToday();
  const state = buildUsageState(usage, await getSettings(), new Date());
  const remainingMinutes = Math.max(0, Math.ceil(state.remainingMs / 60_000));

  await chrome.action.setBadgeText({ text: state.exhausted ? "0" : String(remainingMinutes) });
  await chrome.action.setBadgeBackgroundColor({ color: state.exhausted ? "#991b1b" : "#166534" });
}

async function resetToday() {
  const history = await getHistory();
  delete history[getLocalDateKey()];
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
  await chrome.storage.local.remove(DAILY_USAGE_KEY);
}
