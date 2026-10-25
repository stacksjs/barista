import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'bun:test'

function run(state: string, compliance = 'IN_REVIEW'): { phase: string, writes: string[], exitCode: number } {
  const directory = mkdtempSync(join(tmpdir(), 'barista-submission-policy-'))
  const script = resolve('scripts/submit-store.ts')
  const fixture = join(directory, 'apple.ts')
  const trace = join(directory, 'writes.json')
  mkdirSync(join(directory, 'captures'))
  writeFileSync(join(directory, 'captures/manifest.json'), JSON.stringify({ version: '0.0.8', sourceRevision: 'release-commit', distribution: 'app-store' }))
  writeFileSync(fixture, `
    import { mock } from 'bun:test'
    import { writeFileSync } from 'node:fs'
    const writes = []
    const record = value => { writes.push(value); writeFileSync(${JSON.stringify(trace)}, JSON.stringify(writes)) }
    writeFileSync(${JSON.stringify(trace)}, '[]')
    mock.module(${JSON.stringify(import.meta.resolve('ts-pantry'))}, () => ({
      AppStoreConnectClient: class {
        async findApp() { return { id: 'app-1' } }
        async listAppStoreVersions() { return [{id:'version-1', attributes:{platform:'MAC_OS',versionString:'0.0.8',appStoreState:${JSON.stringify(state)}}}] }
        async request(path) {
          if(path.startsWith('/builds?')) return {data:[{id:'build-1',attributes:{version:'2.1'},relationships:{preReleaseVersion:{data:{id:'pre-1'}}}}],included:[{id:'pre-1',attributes:{platform:'MAC_OS',version:'0.0.8'}}]}
          if(path.startsWith('/appEncryptionDeclarations/')) return {data:{attributes:{appEncryptionDeclarationState:${JSON.stringify(compliance)}}}}
          if(path.startsWith('/reviewSubmissions/')) return {data:{attributes:{state:'WAITING_FOR_REVIEW'}}}
          if(path.startsWith('/appStoreVersions/')) return {data:{attributes:{appStoreState:'WAITING_FOR_REVIEW'}}}
          throw new Error('Unexpected Apple endpoint: '+path)
        }
      },
      ensureAppStoreVersions: async () => [{id:'version-1',platform:'MAC_OS',version:'0.0.8',status:${JSON.stringify(state === 'IN_REVIEW' ? 'deferred' : 'ready')},appStoreState:${JSON.stringify(state)}}],
      waitForAppStoreBuilds: async () => { record('select-processed-build'); return [{platform:'MAC_OS',versionId:'version-1',buildId:'build-1',buildNumber:'2.1'}] },
      prepareAppStoreSubmission: async (_client, metadata) => {
        if(metadata.usesNonExemptEncryption !== true || metadata.encryptionDeclarationId !== 'declaration-1') throw new Error('Compliance config lost')
        record('submit-review'); return {reviewSubmissionIds:['review-1']}
      },
      submitAppStore: async () => { record('resume-prepared-review'); return {reviewSubmissionIds:['review-1']} },
    }))
  `)
  try {
    const result = Bun.spawnSync([process.execPath, '--preload', fixture, script], { cwd: directory, env: {
      APPLE_STORE_APP_ID: 'app-1', APPLE_STORE_ENCRYPTION_DECLARATION_ID: 'declaration-1',
      APPLE_STORE_SUBMISSION_API_KEY_ID: 'fake', APPLE_STORE_SUBMISSION_API_ISSUER: 'fake', APPLE_STORE_SUBMISSION_API_KEY_PATH: join(directory, 'missing-test-key'),
      APPLE_STORE_REVIEW_FIRST_NAME: 'Test', APPLE_STORE_REVIEW_LAST_NAME: 'Contact', APPLE_STORE_REVIEW_EMAIL: 'test@example.com', APPLE_STORE_REVIEW_PHONE: 'test-phone',
      BARISTA_STORE_VERSION: '0.0.8', BARISTA_STORE_ARTWORK_DIR: directory, BARISTA_STORE_SOURCE_REVISION: 'release-commit', BARISTA_RELEASE_EVIDENCE: directory,
    } })
    if (!existsSync(join(directory, 'app-store.json'))) throw new Error(result.stderr.toString())
    const receipt = JSON.parse(readFileSync(join(directory, 'app-store.json'), 'utf8'))
    return { phase: receipt.phase, writes: JSON.parse(readFileSync(trace, 'utf8')), exitCode: result.exitCode }
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
}

test('unapproved compliance selects a processed build without submitting review', () => {
  expect(run('PREPARE_FOR_SUBMISSION')).toEqual({ phase: 'awaiting-export-approval', writes: ['select-processed-build'], exitCode: 0 })
})

test('the schedule respects rejection and developer withdrawal without resubmitting', () => {
  for (const state of ['REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY', 'DEVELOPER_REJECTED'])
    expect(run(state)).toEqual({ phase: 'needs-app-review-response', writes: [], exitCode: 1 })
})

test('an active review remains untouched', () => {
  expect(run('IN_REVIEW')).toEqual({ phase: 'awaiting-app-review', writes: [], exitCode: 0 })
})

test('approved compliance progresses to an Apple-confirmed review submission', () => {
  expect(run('PREPARE_FOR_SUBMISSION', 'APPROVED')).toEqual({ phase: 'submitted-for-review', writes: ['select-processed-build', 'submit-review'], exitCode: 0 })
})
