# AI Time Limiter

A privacy-first Chrome extension that keeps AI tools useful without letting them become the default attention sink.

## Status

This project is in local UAT before Chrome Web Store submission. Install it as an unpacked extension for now.

## What It Does

- Shows an on-page timer on configured AI sites.
- Tracks active focused time only, so background tabs and unfocused windows do not count.
- Ships with ChatGPT, Claude, Gemini, Perplexity, Poe, and Copilot enabled.
- Supports custom AI domains.
- Offers first-run presets: Light use, Focus workday, and Strict reset.
- Lets users configure daily limits, weekday-specific limits, work-hours-only enforcement, alerts, friction mode, grace minutes, redirect URL, and block message.
- Shows an optional purpose prompt before an AI session.
- Provides a toolbar popup with remaining time, weekly local analytics, top site, and reset action.
- Blocks, warns, or requires a reason for grace time depending on friction mode.

## Install Locally

Clone the repo:

```bash
git clone https://github.com/unstatusthequo/ai-time-limiter.git
cd ai-time-limiter
```

Then load it in Chrome:

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the cloned `ai-time-limiter` folder.

Open the toolbar popup for the dashboard. Open settings from the popup or extension details page.

## Quick Test

1. Open settings and apply the **Strict reset** preset.
2. Set the default daily limit to `1` minute and save.
3. Visit `https://chatgpt.com` or `https://claude.ai`.
4. Confirm the timer and purpose prompt appear.
5. Wait for the limit to expire and confirm the block screen appears.
6. Use grace time, then reset today from the popup.

More detailed UAT steps are in `docs/UAT.md`.

## Development

Run tests:

```bash
npm test
```

Run extension package checks:

```bash
npm run check
```

Regenerate icons:

```bash
node scripts/generate-icons.js
```

There is no build step. Chrome loads the extension directly from this folder.

## Privacy

The extension stores settings, usage totals, per-site totals, and optional purpose entries in Chrome storage on the local device. It has no account system, ads, remote analytics, or external API calls. See `privacy-policy.md`.

## Manual Browser Test

- Load the unpacked extension.
- Open the popup and confirm the dashboard renders.
- Open options and apply each preset.
- Visit `https://chatgpt.com` or `https://claude.ai` and confirm the timer appears.
- Visit an untracked HTTPS page and confirm no timer appears.
- Lower the daily limit to 1 minute and confirm normal/strict/soft modes behave as configured.
- Reset today from the popup and confirm the counter clears.
