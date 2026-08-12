# Desktop release workflow

Build outputs land in `release/` after a successful build.

## Build installers (local)

1. Set the API URL students will use (once per release build):

```bash
cd v1.0/web-client
cp .env.desktop.example .env.desktop
# VITE_API_BASE_URL=https://your-app.up.railway.app
```

2. From `v1.0/desktop`:

```bash
npm install
npm run build:win   # Windows → release/Assessly-Setup-1.0.0.exe
npm run build:mac   # macOS → release/Assessly-1.0.0.dmg (requires Mac)
```

Students who install that build **do not** enter a server URL — only sign in.

## Publish to GitHub Releases

1. Bump `version` in `package.json` if shipping a new release.
2. Create a GitHub personal access token with `repo` scope.
3. Publish:

```bash
cd v1.0/desktop
set GH_TOKEN=your_github_token   # Windows
# export GH_TOKEN=your_github_token   # macOS/Linux
npm run build:win:publish
```

electron-builder uploads the installer and `latest.yml` (Windows) or `latest-mac.yml` (macOS) to GitHub Releases. Installed apps use `electron-updater` to check that release on startup.

## Download URLs (website)

Default links (v1.0.0):

- Windows: `https://github.com/omaaryouussef/Assessly/releases/download/v1.0.0/Assessly-Setup-1.0.0.exe`
- macOS: `https://github.com/omaaryouussef/Assessly/releases/download/v1.0.0/Assessly-1.0.0.dmg`
- Latest release page: `https://github.com/omaaryouussef/Assessly/releases/latest`

The Vercel download page uses these by default. Override with `VITE_DESKTOP_DOWNLOAD_WIN` and `VITE_DESKTOP_DOWNLOAD_MAC` in Vercel env vars after each release if you prefer explicit URLs.

## Vercel environment variables

Set in the web-client project (optional overrides):

```env
VITE_DESKTOP_DOWNLOAD_WIN=https://github.com/omaaryouussef/Assessly/releases/download/v1.0.0/Assessly-Setup-1.0.0.exe
VITE_DESKTOP_DOWNLOAD_MAC=https://github.com/omaaryouussef/Assessly/releases/download/v1.0.0/Assessly-1.0.0.dmg
```

Redeploy after changing env vars.

## Code signing (production)

Unsigned builds trigger SmartScreen / Gatekeeper warnings. For production:

- Windows: set `CSC_LINK` and `CSC_KEY_PASSWORD` before building.
- macOS: set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for notarization.

See comments in `electron-builder.yml`.
