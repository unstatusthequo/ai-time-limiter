# Web Store Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand AI Time Limiter from a personal two-site timer into a polished, privacy-first Chrome Web Store candidate with onboarding, analytics, configurable AI sites, flexible limits, friction modes, purpose prompts, and store-readiness assets.

**Architecture:** Keep the extension no-build and local-first. Shared pure helpers in `src/usage.js` own settings normalization, site matching, schedules, grace decisions, analytics summaries, and reset timing. The MV3 background worker remains the storage authority, while content and popup/options UIs consume state through runtime messages.

**Tech Stack:** Plain JavaScript modules, Chrome Extension Manifest V3, Shadow DOM content UI, static HTML/CSS options/popup, Node built-in `node:test`, no runtime dependencies.

---

### Task 1: Shared Behavior Model

**Files:**
- Modify: `src/usage.js`
- Modify: `test/usage.test.js`

**Steps:**
1. Add failing tests for presets, configurable AI domains, weekday limits, work-hour enforcement, grace extension decisions, purpose logging, local week analytics, and next reset text.
2. Run `npm test` and confirm the new tests fail on missing exports or behavior.
3. Implement normalized defaults and helper functions.
4. Run `npm test` and confirm all tests pass.

### Task 2: Background Storage and Accounting

**Files:**
- Modify: `src/background.js`
- Modify: `manifest.json`

**Steps:**
1. Remove unnecessary `tabs` permission.
2. Expand content script matching to HTTPS pages and filter locally by configured sites.
3. Track per-day totals, per-site totals, grace usage, current purpose, and recent purpose log in `chrome.storage.local`.
4. Update badge text/color with remaining minutes.

### Task 3: Content Experience

**Files:**
- Modify: `src/content.js`

**Steps:**
1. Render nothing on untracked sites.
2. Add purpose prompt before tracking when enabled.
3. Add soft/normal/strict friction behavior.
4. Add improved block screen with next reset, grace button, redirect button, and user message.

### Task 4: Popup and Options Experience

**Files:**
- Modify: `options.html`
- Modify: `src/options.js`
- Modify: `styles/options.css`
- Create: `popup.html`
- Create: `src/popup.js`
- Create: `styles/popup.css`

**Steps:**
1. Add first-run onboarding with presets.
2. Add dashboard popup with today/weekly metrics, current sites, and quick controls.
3. Add options controls for domains, weekdays, work hours, friction, grace, purpose prompt, redirect URL, and privacy posture.

### Task 5: Store Readiness

**Files:**
- Create: `privacy-policy.md`
- Create: `store-listing.md`
- Create: `assets/icon.svg`
- Create: `scripts/generate-icons.js`
- Modify: `scripts/check-extension.js`
- Modify: `README.md`

**Steps:**
1. Generate required extension icons.
2. Add package checks for icons, popup, privacy docs, broad-match disclosure, and no remote endpoints.
3. Document privacy, permissions, QA, and store listing copy.
4. Run `npm test`, `npm run check`, and syntax checks.
