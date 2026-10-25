import { expect, test } from 'bun:test'
import { compareReleases, releaseVersion } from '../scripts/release-version'

test('release qualification orders full versions numerically', () => {
  expect(compareReleases('v0.0.10', 'v0.0.9')).toBeGreaterThan(0)
  expect(compareReleases('v1.0.0', 'v0.99.99')).toBeGreaterThan(0)
  expect(compareReleases('v0.1.0', 'v0.0.99')).toBeGreaterThan(0)
  expect(compareReleases('v0.0.8', 'v0.0.8')).toBe(0)
  expect(compareReleases('v0.0.7', 'v0.0.8')).toBeLessThan(0)
})

test('release tags cannot contain prerelease suffixes, shell input or missing components', () => {
  for (const tag of ['main', '0.0.8', 'v0.0', 'v0.0.8-beta', 'v0.0.8; echo surprise', 'vNaN.0.0'])
    expect(() => releaseVersion(tag)).toThrow()
  expect(releaseVersion('v0.0.8')).toBe('0.0.8')
})
