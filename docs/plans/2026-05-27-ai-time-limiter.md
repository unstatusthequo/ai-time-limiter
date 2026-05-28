# AI Time Limiter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a load-unpacked Chrome extension that limits daily active time on `chatgpt.com` and `claude.ai`, displays an on-page counter, warns after a configurable session threshold, and blocks the page after the daily budget is exhausted.

**Architecture:** A Manifest V3 extension uses a content script on AI sites to render the counter/blocking UI and send active-tab heartbeats. A background service worker owns usage accounting in `chrome.storage.local`, keyed by local date, and options pages edit `chrome.storage.sync` settings. Pure date/settings helpers are isolated for Node tests.

**Tech Stack:** Plain JavaScript, Chrome Extension Manifest V3, `node:test` for logic tests, no build step.

---

### Task 1: Usage Logic Tests

**Files:**
- Create: `package.json`
- Create: `src/usage.js`
- Create: `test/usage.test.js`

**Steps:**
1. Write tests for default settings, settings normalization, and local date keys.
2. Run `npm test` and confirm failures because `src/usage.js` does not exist.
3. Implement the minimal helper functions.
4. Run `npm test` and confirm the tests pass.

### Task 2: Extension Runtime

**Files:**
- Create: `manifest.json`
- Create: `src/background.js`
- Create: `src/content.js`

**Steps:**
1. Create the MV3 manifest with `storage`, `tabs`, matching content scripts, and module background service worker.
2. Implement heartbeat accounting in background using timestamps from content heartbeats.
3. Implement content UI for counter, warning toast, and blocking overlay.
4. Validate `manifest.json` parses and required source files exist.

### Task 3: Options UI and Docs

**Files:**
- Create: `options.html`
- Create: `src/options.js`
- Create: `styles/options.css`
- Create: `README.md`

**Steps:**
1. Build settings form for daily limit, session alert, alert enabled, and block message.
2. Save options to `chrome.storage.sync` through normalized settings.
3. Document load-unpacked installation, behavior, and known limits.
4. Run tests plus lightweight static checks.
