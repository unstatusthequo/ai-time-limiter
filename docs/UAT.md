# UAT Checklist

Use this before preparing the Chrome Web Store submission.

## Install

1. Clone the repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repo folder.
5. Confirm the extension icon appears in the toolbar.

## Core Behavior

- Popup dashboard opens from the toolbar.
- Options page opens from the popup.
- Presets apply correctly: Light use, Focus workday, Strict reset.
- Timer appears on enabled AI sites.
- Timer does not appear on unrelated HTTPS sites.
- Active time does not increase when the tab is hidden or unfocused.
- Daily reset happens on the next local day.

## Limit Modes

- Soft mode warns after the daily limit but does not block.
- Normal mode blocks after the daily limit.
- Strict mode blocks after the daily limit and requires a reason before grace time.
- Grace time can be used only the configured number of times per day.
- Reset today clears the current day and popup chart.

## Configuration

- Built-in sites can be enabled and disabled.
- A custom AI domain can be added and removed.
- Weekday-specific limits override the default daily limit.
- Work-hours-only mode tracks inside the configured window and ignores time outside it.
- Redirect URL opens from the block screen when configured.
- Custom block message appears on the block screen.

## Privacy and Store Readiness

- No account is required.
- No network calls are made by extension code.
- Privacy policy accurately describes local storage behavior.
- Store listing draft matches implemented behavior.
- Required icons render in Chrome.

## Checks

Run:

```bash
npm test
npm run check
```
