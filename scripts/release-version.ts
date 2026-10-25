export function releaseVersion(tag: string): string {
  if (!/^v\d+\.\d+\.\d+$/.test(tag))
    throw new Error('Expected a stable vMAJOR.MINOR.PATCH release tag')
  return tag.slice(1)
}

export function compareReleases(left: string, right: string): number {
  const a = releaseVersion(left).split('.').map(Number)
  const b = releaseVersion(right).split('.').map(Number)
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

if (import.meta.main && compareReleases(process.argv[2], process.argv[3]) <= 0)
  throw new Error('A release must be newer than the current stable release')
