import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'bun:test'

test('Store submission credentials are isolated from signing and require an explicit compliance reference', () => {
  const directory = mkdtempSync(join(tmpdir(), 'barista-release-env-'))
  const environment = join(directory, 'github.env')
  const script = resolve('scripts/prepare-release.ts')
  const values: Record<string, string> = Object.fromEntries([
    'APPLE_STORE_SUBMISSION_API_KEY_ID', 'APPLE_STORE_SUBMISSION_API_ISSUER', 'APPLE_STORE_APP_ID',
    'APPLE_STORE_REVIEW_FIRST_NAME', 'APPLE_STORE_REVIEW_LAST_NAME', 'APPLE_STORE_REVIEW_EMAIL', 'APPLE_STORE_REVIEW_PHONE',
  ].map(name => [name, `test-${name}`]))
  values.APPLE_STORE_SUBMISSION_API_KEY_BASE64 = Buffer.from('test private key').toString('base64')
  const env = { ...values, RUNNER_TEMP: directory, GITHUB_ENV: environment }
  try {
    const rejected = Bun.spawnSync([process.execPath, script, '--submission'], { cwd: directory, env })
    expect(rejected.exitCode).not.toBe(0)
    expect(rejected.stderr.toString()).toContain('APPLE_STORE_ENCRYPTION_DECLARATION_ID')
    const accepted = Bun.spawnSync([process.execPath, script, '--submission'], { cwd: directory, env: { ...env, APPLE_STORE_ENCRYPTION_DECLARATION_ID: 'approved-reference' } })
    expect(accepted.exitCode).toBe(0)
    const exported = readFileSync(environment, 'utf8')
    expect(exported).toContain('APPLE_STORE_SUBMISSION_API_KEY_PATH=')
    expect(exported).not.toContain('APPLE_NOTARY_')
    expect(exported).not.toContain('BASE64=')
    expect(exported).not.toContain('test private key')
    const key = join(directory, 'barista-submission.p8')
    expect(readFileSync(key, 'utf8')).toBe('test private key')
    expect(statSync(key).mode & 0o777).toBe(0o600)
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
})
