# Module: manifest.json

## Purpose
Defines extension metadata, permissions, and entry points for content scripts, background service worker, and options UI.

## Responsibilities
- Declare Manifest V3 format.
- Request required permissions: `activeTab`, `scripting`, `storage`.
- Register content scripts and background service worker.
- Register options page.

## Behavioral Rules
- No host permissions are required for MVP.
- Content scripts should run on all pages or a narrow list (to be decided by the manifest). For MVP, all pages is acceptable if no host permissions are needed.

## Notes
- Must support Chrome/Arc and Firefox WebExtensions. Some fields differ across browsers; keep the manifest minimal and compatible.
