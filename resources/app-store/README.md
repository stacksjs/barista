# App Store artwork

`screenshot.stx` presents real captures of the sandboxed Store edition in a
1440 × 900 composition. These files are separate from the public website.
The website hero uses its own stx component and shows the GitHub edition.

Release CI generates current captures and these compositions automatically:

```sh
BARISTA_STORE_ARTWORK_DIR=storage/release-verification/store-artwork \
BARISTA_STORE_SOURCE_REVISION=$(git rev-parse HEAD) bun run test:native:store
```

The native test captures real session states through stx’s system WebKit API,
then renders `screenshot.stx` at an Apple-supported size. Its manifest records
the packaged app version and source commit. CI retains the artwork for 90 days;
the submission workflow restores only artifacts from trusted main/tag runs and
checks their provenance before uploading. The existing captures below remain
useful for local artwork preview and visual review.

Run the packaged Store app in an isolated sandboxed development profile, using
the signing procedure in `scripts/native-store-e2e.ts`. For artwork, open its
authenticated local stx view at a 320 × 740 viewport and save
`captures/awake.png`, `captures/timed.png` and `captures/off.png`. These are the
packaged app's real template and state; verify its native window separately.
Keep the session URL private and never include it in a capture or commit.
Check the version and Store update text in every capture;
grouping and external updater controls must be absent. Disable any login item
enabled for verification before closing the test app.

Record the app version in `captures/manifest.json`. The preview refuses stale
captures when that version differs from `package.json`.

Run `bun scripts/preview-store-artwork.ts`, then view `/awake`, `/timed` and
`/off` at `http://127.0.0.1:4174`. Export each page with a viewport of exactly
1440 × 900, inspect the complete image, and save actual PNG files under
`screenshots/`. Verify the image encoding and dimensions before uploading; a
`.png` extension alone does not establish the format. Upload those PNGs to Barista's Mac
screenshots in App Store Connect. Regenerate the captures when the shipped UI
changes. Do not substitute the GitHub edition's grouping screenshots.
