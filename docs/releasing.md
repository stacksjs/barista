# Releasing

Barista’s native icon-hiding backend uses a private macOS API. Distribute the
signed direct app and DMG; the build refuses the former App Store path.

```sh
bun run check
pantry run build
bun run test:native
bun run release:patch
```

A tag runs the release workflow. It installs the locked Pantry runtime, installs
Bun dependencies, checks the source, signs and notarizes the app, and verifies
the packaged app and read-only DMG before publishing the DMG and update manifest.
The manifest records the release artifact’s SHA-256.

## Signing configuration

The GitHub workflow needs these repository secrets:

| Secret | Purpose |
| --- | --- |
| `APPLE_APPLICATION_CERTIFICATE` | Developer ID Application `.p12`, encoded as base64. |
| `APPLE_CERTIFICATE_PASSWORD` | Password for that certificate. |
| `APPLE_NOTARIZE_APPLE_ID` | Apple ID used for notarization. |
| `APPLE_NOTARIZE_PASSWORD` | Its app-specific notarization password. |

The bundle ID is `com.stacksjs.barista` and the signing team is `3JJRNQW6B7`.
Use a Developer ID Application certificate for direct distribution. Installer
certificates, provisioning profiles and App Store Connect credentials are not
used by this workflow. Missing signing/notarization configuration stops release
before publication.

For local native verification, `APPLE_SIGNING_IDENTITY=- pantry run build`
produces an ad hoc signed bundle. Set a Developer ID Application identity for a
signed local direct build. The normal build embeds the Craft executable resolved
from Pantry; local source runtime overrides are for development verification.
