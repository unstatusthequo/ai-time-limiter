import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SETTINGS,
  PRESETS,
  applyPreset,
  buildUsageState,
  buildWeeklyAnalytics,
  canUseGrace,
  createPurposeEntry,
  formatResetTime,
  getLocalDateKey,
  getLimitMinutesForDate,
  isTrackedUrl,
  isWithinWorkHours,
  normalizeSettings,
  secondsToClock
} from "../src/usage.js";

test("normalizeSettings returns safe defaults for missing settings", () => {
  assert.deepEqual(normalizeSettings(), DEFAULT_SETTINGS);
});

test("normalizeSettings clamps numeric settings and preserves valid message", () => {
  assert.deepEqual(
    normalizeSettings({
      dailyLimitMinutes: "2000",
      sessionAlertMinutes: "0",
      alertEnabled: false,
      blockMessage: "Close this and get back to real work."
    }),
    {
      dailyLimitMinutes: 720,
      sessionAlertMinutes: 1,
      alertEnabled: false,
      blockMessage: "Close this and get back to real work.",
      dayLimits: {
        0: 720,
        1: 720,
        2: 720,
        3: 720,
        4: 720,
        5: 720,
        6: 720
      },
      frictionMode: DEFAULT_SETTINGS.frictionMode,
      graceMinutes: DEFAULT_SETTINGS.graceMinutes,
      graceUsesPerDay: DEFAULT_SETTINGS.graceUsesPerDay,
      purposePromptEnabled: DEFAULT_SETTINGS.purposePromptEnabled,
      redirectUrl: DEFAULT_SETTINGS.redirectUrl,
      trackedSites: DEFAULT_SETTINGS.trackedSites,
      workEnd: DEFAULT_SETTINGS.workEnd,
      workHoursEnabled: DEFAULT_SETTINGS.workHoursEnabled,
      workStart: DEFAULT_SETTINGS.workStart
    }
  );
});

test("getLocalDateKey uses the local date components", () => {
  const noon = new Date(2026, 4, 27, 12, 30, 0);

  assert.equal(getLocalDateKey(noon), "2026-05-27");
});

test("secondsToClock formats elapsed time as HH:MM:SS", () => {
  assert.equal(secondsToClock(0), "00:00:00");
  assert.equal(secondsToClock(65), "00:01:05");
  assert.equal(secondsToClock(3661), "01:01:01");
});

test("buildUsageState marks the day exhausted at the configured limit", () => {
  const state = buildUsageState(
    { dateKey: "2026-05-27", usedMs: 60_500 },
    { dailyLimitMinutes: 1 },
    new Date(2026, 4, 27, 12)
  );

  assert.equal(state.exhausted, true);
  assert.equal(state.usedMs, 60_000);
  assert.equal(state.remainingMs, 0);
  assert.equal(state.limitMs, 60_000);
});

test("applyPreset returns mass-appeal default configurations", () => {
  assert.equal(PRESETS.focus.label, "Focus workday");
  assert.equal(applyPreset("strict").dailyLimitMinutes, 15);
  assert.equal(applyPreset("missing").dailyLimitMinutes, DEFAULT_SETTINGS.dailyLimitMinutes);
});

test("isTrackedUrl supports built-in and custom enabled AI domains", () => {
  const settings = normalizeSettings({
    trackedSites: [
      ...DEFAULT_SETTINGS.trackedSites,
      { label: "Local AI", domain: "ai.example.com", enabled: true }
    ]
  });

  assert.equal(isTrackedUrl("https://chatgpt.com/c/123", settings), true);
  assert.equal(isTrackedUrl("https://subdomain.chatgpt.com/path", settings), true);
  assert.equal(isTrackedUrl("https://ai.example.com/session", settings), true);
  assert.equal(isTrackedUrl("https://docs.example.com/session", settings), false);
});

test("day-specific limits override the default daily limit", () => {
  const settings = normalizeSettings({
    dailyLimitMinutes: 60,
    dayLimits: { 1: 25, 6: 120 }
  });

  assert.equal(getLimitMinutesForDate(new Date(2026, 4, 25, 9), settings), 25);
  assert.equal(getLimitMinutesForDate(new Date(2026, 4, 30, 9), settings), 120);
  assert.equal(getLimitMinutesForDate(new Date(2026, 4, 27, 9), settings), 60);
});

test("work-hour enforcement handles normal and overnight windows", () => {
  const daytime = normalizeSettings({
    workHoursEnabled: true,
    workStart: "09:00",
    workEnd: "17:00"
  });
  const overnight = normalizeSettings({
    workHoursEnabled: true,
    workStart: "22:00",
    workEnd: "06:00"
  });

  assert.equal(isWithinWorkHours(new Date(2026, 4, 27, 10, 30), daytime), true);
  assert.equal(isWithinWorkHours(new Date(2026, 4, 27, 18, 0), daytime), false);
  assert.equal(isWithinWorkHours(new Date(2026, 4, 27, 23, 0), overnight), true);
  assert.equal(isWithinWorkHours(new Date(2026, 4, 28, 5, 30), overnight), true);
  assert.equal(isWithinWorkHours(new Date(2026, 4, 28, 12, 0), overnight), false);
});

test("canUseGrace respects configured daily grace uses", () => {
  const settings = normalizeSettings({ graceUsesPerDay: 2, graceMinutes: 5 });

  assert.equal(canUseGrace({ graceUses: 1 }, settings), true);
  assert.equal(canUseGrace({ graceUses: 2 }, settings), false);
});

test("buildWeeklyAnalytics summarizes local history and top site", () => {
  const analytics = buildWeeklyAnalytics(
    {
      "2026-05-21": { usedMs: 5 * 60_000, siteMs: { "chatgpt.com": 5 * 60_000 } },
      "2026-05-26": { usedMs: 20 * 60_000, siteMs: { "claude.ai": 20 * 60_000 } },
      "2026-05-27": { usedMs: 10 * 60_000, siteMs: { "chatgpt.com": 10 * 60_000 } }
    },
    new Date(2026, 4, 27, 12)
  );

  assert.equal(analytics.totalMs, 35 * 60_000);
  assert.equal(analytics.averageMs, 5 * 60_000);
  assert.deepEqual(analytics.topSite, { domain: "claude.ai", usedMs: 20 * 60_000 });
  assert.equal(analytics.days.length, 7);
});

test("createPurposeEntry normalizes purpose log entries", () => {
  assert.deepEqual(createPurposeEntry("  Writing proposal  ", "claude.ai", new Date(2026, 4, 27, 12)), {
    purpose: "Writing proposal",
    domain: "claude.ai",
    startedAt: "2026-05-27T19:00:00.000Z"
  });
});

test("formatResetTime returns the next local midnight", () => {
  assert.equal(formatResetTime(new Date(2026, 4, 27, 22, 15)), "12:00 AM");
});
