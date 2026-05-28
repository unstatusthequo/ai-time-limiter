# Privacy Policy

AI Time Limiter is local-first. It does not create accounts, show ads, call analytics services, sell data, or transmit usage data to any server.

## Data Stored Locally

The extension stores these items in Chrome storage on the user's device:

- Settings such as limits, enabled sites, work hours, friction mode, redirect URL, and block message.
- Daily and weekly AI-site usage totals.
- Per-site usage totals for configured AI domains.
- Optional purpose prompts entered by the user.

## Data Sharing

No data is shared with the developer or third parties. The extension has no remote API endpoint.

## Permissions

The extension uses Chrome `storage` permission to save settings and usage totals. The content script runs on HTTPS pages so custom user-added AI domains can be matched locally, but it renders and tracks only domains enabled in settings.

## Data Removal

Users can reset the current day's usage from the popup or options page. Removing the extension clears its local Chrome extension storage.
