# Barista

- Keep the app in TypeScript and `.stx`. Do not add Swift or Kotlin app sources.
- Put native implementation and reusable abstractions in stx/Craft at their source. Barista consumes their public APIs; do not add app-level native shims, monkey patches, or compatibility fallbacks.
- Use stx signals and composables in templates, with native access through `useNativeDesktop()`.
- Use Buddy/Buddy Bot for dependency upgrades, and Pantry for the Craft runtime.
- Verify native changes with `bun run check`, `pantry run build`, and `bun run test:native`. Native E2E needs macOS and runs against the packaged app with an isolated preference profile.
- Push completed, verified changes to `origin/main` using the user's configured Git identity. Do not add coauthor or agent attribution trailers.
- After pushing completed changes, run `bun run release:patch` to publish the next patch release.
