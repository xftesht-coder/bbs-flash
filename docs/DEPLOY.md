# Deployment and release

Canonical site: https://xftesht-coder.github.io/bbs-flash/ (landing), `/bbs-flash.html` (app). HTTPS is required for hardware access; localhost is suitable for development. The app loads no CDN scripts, has no service worker and does not send profiles to a backend.

GitHub Pages serves the repository root from `main`. `.nojekyll` disables Jekyll processing. `index.html` and `landing.html` must be identical; `npm test` checks this and local asset references. Legacy configurator URLs redirect to the current app. The previous VPS scripts are retired because they modified unrelated server configuration and omitted the new modules.

## Release procedure

1. Work in a branch and open a PR. `CI and release` runs syntax, protocol, site and headless Chromium checks. Review the diff and known hardware limits.
2. Merge only after successful checks. GitHub Pages publishes `main` using its existing configuration.
3. The main-branch workflow waits for the served application, core and landing to match the committed SHA-256 hashes and tests their basic browser behavior over HTTPS.
4. Only after that verification, create the version tag and GitHub release from `package.json` and `docs/RELEASE.md`. Existing tags are not moved or overwritten.
5. Check the release URL and live app manually. The release package is available from the tagged source archive; host `index.html`, `landing.html`, `bbs-flash.html`, `src/`, `assets/icon.svg`, `assets/RussoOne-Regular.ttf` and `assets/OFL-RussoOne.txt` together. The font and its license are self-hosted and included in deployment verification.

If deployment verification times out, leave the tag/release unpublished and inspect the Pages run. A blocked Pages run is not a successful deploy. For a hotfix, bump the patch version and repeat the procedure. Roll back a bad deployment by reverting its PR in a new reviewed commit; do not rewrite published tags.

For custom hosting, copy the complete static site into its own directory behind HTTPS. Do not run the historical scripts against an unrelated nginx site. Custom domains are outside this release's deployment target.
