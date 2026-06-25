# Production Deployment Report - 2026-06-25

## Production URL

https://soldiersmini-blip.github.io/spanish-learning-center/

## Deployment Summary

- Repository: `https://github.com/soldiersmini-blip/spanish-learning-center`
- Branch deployed: `main`
- Initial deployment commit verified online: `bab1190e586e20fcede04f06228d5a84e8900657`
- GitHub Actions run: `https://github.com/soldiersmini-blip/spanish-learning-center/actions/runs/28161815884`
- GitHub Actions result: `success`
- Rollback branch created before replacement: `backup/production-before-replace-2026-06-25`
- Rollback branch source SHA: `ec6598133fd1b9b81222c73318e787ff95cff768`

## Build Verification

- `npm ci`: passed
- `npm run build`: passed
- Build output:
  - `dist/index.html`
  - `dist/assets/index-DjGYn6kw.css`
  - `dist/assets/index-Bj5V-Sme.js`
- No lint script exists in `package.json`.
- No test script exists in `package.json`.
- `npm ci` reported one low-severity audit item. `npm audit fix` was intentionally not run.

## Production Path Verification

- Vite base path: `/spanish-learning-center/`
- `index.html` uses `%BASE_URL%` for icons and manifest.
- `manifest.json` uses `/spanish-learning-center/...` asset paths.
- Public HTML check:
  - Title contains `西班牙语学习中心`
  - Assets load from `/spanish-learning-center/assets/...`
  - No root `/assets/...` references detected

## Online HTTP Checks

All checks returned `200 OK`:

- `https://soldiersmini-blip.github.io/spanish-learning-center/`
- `https://soldiersmini-blip.github.io/spanish-learning-center/manifest.json`
- `https://soldiersmini-blip.github.io/spanish-learning-center/icons/icon-192.png`
- `https://soldiersmini-blip.github.io/spanish-learning-center/#/a1`
- `https://soldiersmini-blip.github.io/spanish-learning-center/#/a2`
- `https://soldiersmini-blip.github.io/spanish-learning-center/#/a1/test?count=20`
- `https://soldiersmini-blip.github.io/spanish-learning-center/#/settings`

## Routing

The app now uses hash routing for GitHub Pages compatibility:

- `#/`
- `#/a1`
- `#/a2`
- `#/b1`
- `#/b2`
- `#/a1/test?count=20`
- `#/a2/test?count=20`
- `#/neural/{nodeId}`
- `#/settings`

This prevents refresh/share-link 404 errors on GitHub Pages project hosting.

## Included Feature Areas

- A1/A2 learning areas
- A1/A2 grammar explorer
- Categorized vocabulary browsing
- Categorized sentence browsing
- Vocabulary mastery test
- Vocabulary training center
- Neural Link learning system
- Brand logo/favicon/PWA icons
- Dark/light mode
- Chinese/English/Spanish UI switching
- Settings page for local learning data export/import

## Vocabulary Verification

Merged display/test vocabulary:

- A1 total: `812`
- A2 total: `1203`

Duplicate source entries are removed by `mergeUnique(...)` before display and testing:

- A1 source duplicate entries detected: `3`
- A2 source duplicate entries detected: `33`
- Display/test duplicate count after merge: `0`

Vocabulary validation:

- A1 blocking issues: `0`
- A2 blocking issues: `0`

## Local Learning Data

Learning records are stored in browser `localStorage`. They do not automatically transfer between:

- local development (`localhost` / `127.0.0.1`)
- GitHub Pages production
- different browsers
- different devices

Use `#/settings` to:

1. Export a JSON file from the old browser/origin.
2. Open the official production site.
3. Import the JSON file.
4. Refresh the page if needed.

No browser storage was cleared during this deployment.

## Screenshot

Automatic screenshot capture succeeded after adding a page-load wait:

- Screenshot file: `production-screenshot-2026-06-25.png`
- Captured URL: `https://soldiersmini-blip.github.io/spanish-learning-center/?v=ffdc82e`
- Result: homepage renders with the circular Spanish icon in the navigation and the large hero logo above `西班牙语学习中心`.

## Notes

- `dist/`, `node_modules/`, and local Vite logs are ignored and were not committed.
- Existing C-drive project files and backups were not deleted or moved.
- The old production source remains recoverable through `backup/production-before-replace-2026-06-25`.
