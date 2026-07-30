/**
 * Bun resolves a `type: 'file'` import to the asset's path on disk, and embeds
 * the file when compiling to a single binary. TypeScript needs telling.
 */
declare module '*.pdf' {
  const path: string
  export default path
}
