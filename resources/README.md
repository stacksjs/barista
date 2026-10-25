# Barista website resources

The marketing page lives in `views/index.stx`. Its document shell is in
`layouts/site.stx`; shared navigation and footer live in `partials/`.

Styling uses Stacks’ ts-css utilities and semantic tokens in `assets/site.css`.
The native radio screenshot selector uses stx `state()` and `x-model`, while
stx’s site builder owns the appearance bootstrap and static asset delivery.

Run `bun run build:site` from the repository root, then `bun run preview:site`.
The built site includes the BunPress guide from `../docs/`. See
[Website development](../docs/site.md) for asset provenance, design decisions,
production URL configuration and verification.

Store listing compositions live separately in [`app-store/`](./app-store/README.md).
They use stx and captures of the sandboxed edition, without the direct
edition’s grouping or external updater controls.
