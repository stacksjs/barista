/** Resume the Store release through Pantry's public App Store Connect APIs. */
import type { AppStoreMetadata } from 'ts-pantry'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AppStoreConnectClient, ensureAppStoreVersions, prepareAppStoreSubmission, submitAppStore, waitForAppStoreBuilds } from 'ts-pantry'
import pkg from '../package.json' with { type: 'json' }
import { releaseVersion } from './release-version'
import { restoreStoreArtwork } from './restore-store-artwork'

const versionString = releaseVersion(`v${process.env.BARISTA_STORE_VERSION || pkg.version}`)
const appId = required('APPLE_STORE_APP_ID')
const declarationId = required('APPLE_STORE_ENCRYPTION_DECLARATION_ID')
const submissionAuth = {
  keyId: required('APPLE_STORE_SUBMISSION_API_KEY_ID'),
  issuerId: required('APPLE_STORE_SUBMISSION_API_ISSUER'),
  keyPath: required('APPLE_STORE_SUBMISSION_API_KEY_PATH'),
}
const client = new AppStoreConnectClient(submissionAuth)
const evidence = resolve(process.env.BARISTA_RELEASE_EVIDENCE || 'storage/release-verification')
const artwork = resolve(process.env.BARISTA_STORE_ARTWORK_DIR || 'storage/release-verification/store-artwork')

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.startsWith('encrypted:') || /[\r\n]/.test(value)) throw new Error(`Missing decrypted release variable: ${name}`)
  return value
}

function receipt(phase: string, details: Record<string, unknown>) {
  mkdirSync(evidence, { recursive: true })
  writeFileSync(join(evidence, 'app-store.json'), `${JSON.stringify({ version: versionString, appId, phase, ...details, checkedAt: new Date().toISOString() }, null, 2)}\n`)
  console.log(`Store release: ${phase}`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `phase=${phase}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Barista ${versionString} — ${phase}\n\n${JSON.stringify(details, null, 2)}\n`)
}

interface AppleResource {
  id: string
  type: string
  attributes: Record<string, unknown>
  relationships?: Record<string, { data?: { id: string, type: string } | null }>
}

async function latestBuildNumber(): Promise<string> {
  const query = new URLSearchParams({ 'filter[app]': appId, include: 'preReleaseVersion', sort: '-uploadedDate', limit: '200' })
  const response = await client.request<{ data: AppleResource[], included?: AppleResource[] }>(`/builds?${query}`)
  const versions = new Map((response.included || []).map(version => [version.id, version.attributes]))
  const build = response.data.find(build => {
    const version = versions.get(build.relationships?.preReleaseVersion?.data?.id || '')
    return version?.version === versionString && version.platform === 'MAC_OS' && build.attributes.expired !== true
  })
  assert(build, `No uploaded macOS build exists for ${versionString}`)
  return String(build.attributes.version)
}

function metadata(): AppStoreMetadata {
  return {
    subtitle: 'Timers and a global shortcut',
    privacyPolicyUrl: 'https://barista.stacksjs.com/docs/privacy/',
    description: 'Keep your Mac awake, one click from the menu bar.\n\nBarista is a small, free, open-source macOS utility for presentations, downloads, long-running tasks, and time at your desk.\n\n• Click the cup to start or stop keeping your Mac awake.\n• Choose a timer from five minutes to eight hours, or stay awake indefinitely.\n• Toggle from any app with Command–Shift–C.\n• Choose whether Barista starts awake and opens at login.\n• Updates arrive through the Mac App Store.\n\nBarista uses native macOS power assertions and the system WebKit view. It prevents idle sleep; manual sleep, closing the lid, and macOS power protections still apply.\n\nThe App Store edition focuses on keeping your Mac awake. Menu bar icon grouping is available separately in the GitHub edition and is not included in this edition.\n\nNo account. No subscription. Built with stx and Craft.',
    keywords: 'awake,caffeine,caffeinate,sleep,timer,presentation,menubar,utility,open source',
    supportUrl: 'https://barista.stacksjs.com/docs/',
    marketingUrl: 'https://barista.stacksjs.com/',
    promotionalText: 'A small, free menu bar app for keeping your Mac awake. Choose a timer or stay awake indefinitely, with a global shortcut and native login settings.',
    copyright: '2026 Chris Breuer',
    primaryCategory: 'UTILITIES',
    contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
    price: '0', releaseType: 'AFTER_APPROVAL',
    usesNonExemptEncryption: true, encryptionDeclarationId: declarationId,
    reviewContact: {
      firstName: required('APPLE_STORE_REVIEW_FIRST_NAME'), lastName: required('APPLE_STORE_REVIEW_LAST_NAME'),
      email: required('APPLE_STORE_REVIEW_EMAIL'), phone: required('APPLE_STORE_REVIEW_PHONE'),
      notes: 'Barista is a menu bar utility. No account or sign-in is required. The cup starts an indefinite awake session by default. Left-click it to stop or start, and right-click it for durations and Preferences. Command–Shift–C toggles keep-awake globally. Open at login is opt-in through the native macOS login-item service. This sandboxed App Store edition uses the public-only Craft runtime. It omits private menu bar icon grouping and external self-updating. Updates are managed exclusively by the Mac App Store.',
    },
    screenshots: [{ platform: 'MAC_APP_STORE', files: ['awake', 'timed', 'off'].map(scene => join(artwork, 'screenshots', `${scene}.png`)) }],
    submitForReview: true,
  }
}

async function main() {
  const app = await client.findApp('com.stacksjs.barista')
  assert.equal(app?.id, appId, 'Submission credentials must resolve Barista’s exact app record')
  const current = (await client.listAppStoreVersions(appId)).find(version => version.attributes.versionString === versionString && version.attributes.platform === 'MAC_OS')
  if (current && ['REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY', 'DEVELOPER_REJECTED'].includes(current.attributes.appStoreState) && !process.argv.includes('--resubmit')) {
    receipt('needs-app-review-response', { versionId: current.id, appStoreState: current.attributes.appStoreState })
    process.exitCode = 1
    return
  }
  const versions = await ensureAppStoreVersions(client, appId, [{ platform: 'MAC_OS', version: versionString }])
  const version = versions[0]
  if (version.status !== 'ready') {
    if (version.status === 'published') {
      assert(['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(version.appStoreState), 'The App Store version has been removed from distribution')
      const response = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=us&entity=macSoftware`, { signal: AbortSignal.timeout(15_000) })
      assert(response.ok, 'Apple’s public storefront lookup failed')
      const catalog = await response.json() as { results: Array<{ bundleId: string, version: string, trackViewUrl: string }> }
      const published = catalog.results.find(app => app.bundleId === 'com.stacksjs.barista' && app.version === versionString)
      receipt(published ? 'published' : 'awaiting-storefront', { versionId: version.id, appStoreState: version.appStoreState, ...(published ? { storeUrl: published.trackViewUrl } : {}) })
      return
    }
    if (version.appStoreState === 'READY_FOR_REVIEW') {
      const result = await submitAppStore(metadata(), { ...submissionAuth, version: versionString, bundleId: 'com.stacksjs.barista' })
      await confirmSubmission(version.id, result.reviewSubmissionIds)
      return
    }
    receipt('awaiting-app-review', { versionId: version.id, appStoreState: version.appStoreState, reason: version.reason })
    return
  }
  const buildNumber = process.env.BARISTA_STORE_BUILD_NUMBER || await latestBuildNumber()
  const builds = await waitForAppStoreBuilds(client, appId, versions, buildNumber)
  const declaration = await client.request<{ data: AppleResource }>(`/appEncryptionDeclarations/${encodeURIComponent(declarationId)}`)
  const complianceState = declaration.data.attributes.appEncryptionDeclarationState
  if (complianceState === 'IN_REVIEW' || complianceState === 'CREATED') {
    receipt('awaiting-export-approval', { versionId: version.id, buildNumber, declarationId, complianceState })
    return
  }
  assert.equal(complianceState, 'APPROVED', 'Apple must approve the encryption declaration before review submission')
  const sourceRevision = process.env.BARISTA_STORE_ARTWORK_DIR
    ? required('BARISTA_STORE_SOURCE_REVISION')
    : restoreStoreArtwork(`v${versionString}`, artwork)
  const manifest = JSON.parse(readFileSync(join(artwork, 'captures/manifest.json'), 'utf8'))
  assert.equal(manifest.version, versionString, 'Store screenshots must depict this release version')
  assert.equal(manifest.distribution, 'app-store')
  assert.equal(manifest.sourceRevision, sourceRevision, 'Store screenshots must come from this exact release commit')
  const result = await prepareAppStoreSubmission(client, metadata(), appId, builds.map(build => ({ platform: 'macos', id: build.versionId, buildId: build.buildId })))
  assert(result.reviewSubmissionIds.length > 0, 'Apple must return a review submission receipt')
  await confirmSubmission(version.id, result.reviewSubmissionIds, buildNumber)
}

async function confirmSubmission(versionId: string, reviewSubmissionIds: string[], buildNumber?: string): Promise<void> {
  const deadline = Date.now() + 90_000
  while (true) {
    const reviews = await Promise.all(reviewSubmissionIds.map(id => client.request<{ data: AppleResource }>(`/reviewSubmissions/${id}`)))
    const states = reviews.map(review => String(review.data.attributes.state))
    if (states.length > 0 && states.every(state => ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'COMPLETING', 'COMPLETE'].includes(state))) {
      const state = await client.request<{ data: AppleResource }>(`/appStoreVersions/${versionId}`)
      if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'ACCEPTED', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'PROCESSING_FOR_DISTRIBUTION', 'READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(String(state.data.attributes.appStoreState))) {
        receipt('submitted-for-review', { buildNumber, versionId, reviewSubmissionIds, reviewStates: states, appStoreState: state.data.attributes.appStoreState })
        return
      }
    }
    assert(!states.some(state => ['UNRESOLVED_ISSUES', 'CANCELING'].includes(state)), `Apple review submission needs attention: ${states.join(', ')}`)
    assert(Date.now() < deadline, 'Apple did not confirm receipt of the review submission')
    await Bun.sleep(5_000)
  }
}

await main().catch((error: Error) => {
  let message = error.message
  for (const [name, value] of Object.entries(process.env)) {
    if (value && /APPLE_STORE_(REVIEW_|SUBMISSION_API_KEY)/.test(name)) message = message.replaceAll(value, '[REDACTED]')
  }
  receipt('failed', { error: message })
  process.exitCode = 1
})
