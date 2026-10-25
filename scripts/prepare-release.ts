/** Restore Buddy Env release credentials only inside the CI runner. */
import { appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const appStore = process.argv.includes('--app-store')
const submission = process.argv.includes('--submission')
const names = [
  ...(submission ? [
    'APPLE_STORE_SUBMISSION_API_KEY_BASE64',
    'APPLE_STORE_SUBMISSION_API_KEY_ID',
    'APPLE_STORE_SUBMISSION_API_ISSUER',
    'APPLE_STORE_APP_ID',
    'APPLE_STORE_ENCRYPTION_DECLARATION_ID',
    'APPLE_STORE_REVIEW_FIRST_NAME',
    'APPLE_STORE_REVIEW_LAST_NAME',
    'APPLE_STORE_REVIEW_EMAIL',
    'APPLE_STORE_REVIEW_PHONE',
  ] : [
    'APPLE_NOTARY_API_KEY_BASE64',
    'APPLE_NOTARY_API_KEY_ID',
    'APPLE_NOTARY_API_ISSUER',
    'APPLE_NOTARIZE_TEAM_ID',
    ...(appStore ? [
      'APPLE_STORE_APPLICATION_CERTIFICATE',
      'APPLE_STORE_INSTALLER_CERTIFICATE',
      'APPLE_STORE_CERTIFICATE_PASSWORD',
      'APPLE_STORE_PROVISIONING_PROFILE_BASE64',
      'APPLE_STORE_APP_ID',
    ] : ['APPLE_APPLICATION_CERTIFICATE', 'APPLE_CERTIFICATE_PASSWORD']),
  ]),
] as const

if (!process.env.GITHUB_ENV || !process.env.RUNNER_TEMP)
  throw new Error('Release preparation requires the GitHub runner environment')

for (const name of names) {
  const value = process.env[name]
  if (!value || /[\r\n]/.test(value) || value.startsWith('encrypted:'))
    throw new Error(`Missing or invalid decrypted release variable: ${name}`)
  // Register masks before writing credentials for subsequent action steps.
  console.log(`::add-mask::${value}`)
}

const path = join(process.env.RUNNER_TEMP, submission ? 'barista-submission.p8' : appStore ? `AuthKey_${process.env.APPLE_NOTARY_API_KEY_ID}.p8` : 'barista-notary.p8')
writeFileSync(path, Buffer.from(process.env[submission ? 'APPLE_STORE_SUBMISSION_API_KEY_BASE64' : 'APPLE_NOTARY_API_KEY_BASE64']!, 'base64'), { mode: 0o600 })
for (const name of names.filter(name => !name.endsWith('_BASE64') || name === 'APPLE_STORE_PROVISIONING_PROFILE_BASE64'))
  appendFileSync(process.env.GITHUB_ENV, `${name}=${process.env[name]}\n`)
appendFileSync(process.env.GITHUB_ENV, `${submission ? 'APPLE_STORE_SUBMISSION_API_KEY_PATH' : 'APPLE_NOTARY_API_KEY_PATH'}=${path}\n`)
console.log(submission ? 'Prepared encrypted Store submission credentials.' : appStore ? 'Prepared encrypted App Store signing credentials.' : 'Prepared encrypted signing and notarization credentials.')
