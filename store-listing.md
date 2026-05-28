# Chrome Web Store Listing Draft

## Title

AI Time Limiter

## Short Description

A privacy-first daily time budget for ChatGPT, Claude, Gemini, Perplexity, Poe, Copilot, and custom AI sites.

## Description

AI Time Limiter helps you keep AI useful without letting it become the default place your attention goes.

Features:

- Daily AI time budgets with weekday-specific limits.
- On-page timer for configured AI sites.
- Session reminders after a configurable threshold.
- Optional purpose prompt before starting a session.
- Soft, normal, and strict friction modes.
- Grace minutes when you intentionally need extra time.
- Weekly local analytics and per-site totals.
- Work-hours-only enforcement.
- Custom AI domains.
- Local-only storage with no account, ads, or remote analytics.

## Privacy Summary

All settings, usage totals, and optional purpose entries stay in Chrome storage on the user's device. The extension does not send browsing activity or usage analytics to any server.

## Manual QA Before Submission

- Fresh install shows preset onboarding in options.
- Toolbar popup opens and shows today's usage.
- ChatGPT/Claude/Gemini pages show the timer and purpose prompt.
- Untracked HTTPS pages render no UI.
- Daily limit exhaustion blocks in normal mode.
- Soft mode warns without blocking.
- Strict mode requires a reason before grace time.
- Reset today clears the current counter.
- Work-hours-only mode does not track outside the configured window.
