# Releasing

A release is one command:

```bash
bun run release:minor   # or release:patch / release:major
```

That bumps the version, writes the changelog, tags, and pushes. The tag push runs
[`.github/workflows/release.yml`](../.github/workflows/release.yml), which:

1. installs `deps.yaml` (bun, and the `craft` binary the build bundles),
2. imports the Apple signing certificates into a temporary keychain,
3. runs `bun run build` — a signed `.app`, a `.dmg`, and an App Store `.pkg`,
4. uploads the `.pkg` to App Store Connect and publishes the GitHub release.

Steps 2 and 4 are pantry's; nothing about signing or delivery lives in this repo.

## One-time Apple setup

Barista's bundle id is `org.stacksjs.barista` and it signs under team
`3JJRNQW6B7`. Before the first release the Apple side needs:

- an **App ID** for `org.stacksjs.barista`
- an **app record** in App Store Connect for it
- a **Mac App Store provisioning profile** for that App ID
- **Mac App Distribution** and **Mac Installer Distribution** certificates

pantry automates the identifier, certificates and profile:

```bash
pantry app-store:csr --name Barista
pantry app-store:provision \
  --bundle-id org.stacksjs.barista \
  --name Barista \
  --app-certificate-csr .pantry/apple/mac-app-distribution.csr \
  --installer-certificate-csr .pantry/apple/mac-installer-distribution.csr \
  --p12-password "$P12_PASSWORD" \
  --apply
```

Run it without `--apply` first to see what's missing.

## Repository secrets

The workflow reads these from GitHub Actions secrets. Certificates are base64 —
`base64 -i cert.p12 | pbcopy`.

| Secret | What it is |
| --- | --- |
| `APPLE_APPLICATION_CERTIFICATE` | Mac App Distribution `.p12`, base64 |
| `APPLE_INSTALLER_CERTIFICATE` | Mac Installer Distribution `.p12`, base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Password protecting both `.p12` files |
| `APPLE_PROVISIONING_PROFILE` | `.provisionprofile`, base64 |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API key id |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect issuer id |
| `APP_STORE_CONNECT_PRIVATE_KEY` | The key's `.p8` contents |

Every upload needs a build number higher than the last; the workflow uses the
run number, so this takes care of itself.

## Building locally

```bash
bun run build
```

Unsigned, and the App Store `.pkg` is skipped — the `.app` and `.dmg` are still
produced, so you can check the bundle. Set the `APPLE_*` identities to sign
locally. The build needs `craft` on `PATH`:

```bash
pantry install
```
