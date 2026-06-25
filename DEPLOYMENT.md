# Deployment

Production URL:

https://soldiersmini-blip.github.io/spanish-learning-center/

## Local development

```bash
npm install
npm run dev
```

The local development server usually runs on `http://localhost:5173/`.

## Production build

```bash
npm ci
npm run build
```

The production build uses the GitHub Pages base path `/spanish-learning-center/`.

## Routing

This project uses hash routing for GitHub Pages compatibility:

- Home: `#/`
- A1: `#/a1`
- A2: `#/a2`
- B1: `#/b1`
- B2: `#/b2`
- A1 test: `#/a1/test?count=20`
- A2 test: `#/a2/test?count=20`
- Neural Link: `#/neural/{nodeId}`
- Settings and data migration: `#/settings`

Hash routes keep refresh and shared links working on GitHub Pages without a custom server fallback.

## Assets

Static assets in `public/` must be referenced through Vite's base URL or with `/spanish-learning-center/...` in manifest files. Avoid root-only paths such as `/icons/icon-192.png`, because they break on GitHub Pages project sites.

## GitHub Pages flow

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

Before replacing production, create a rollback branch from the previous online source commit, for example:

```bash
git push origin origin/main:refs/heads/backup/production-before-replace-2026-06-25
```

## Local learning data

Learning progress is stored in each browser's localStorage. Data from localhost, GitHub Pages, another browser, or another device does not transfer automatically.

Use `#/settings` to export a JSON backup from one browser and import it on the official site.
