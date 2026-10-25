import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { releaseVersion } from './release-version'

function gh(args: string[]): string {
  const result = Bun.spawnSync(['gh', ...args])
  assert.equal(result.exitCode, 0, result.stderr.toString())
  return result.stdout.toString().trim()
}

/** Retrieve native-test artwork from a trusted main/tag workflow, never a PR artifact. */
export function restoreStoreArtwork(tag: string, directory: string): string {
  releaseVersion(tag)
  const repository = 'stacksjs/barista'
  const revision = gh(['api', `repos/${repository}/commits/${tag}`, '--jq', '.sha'])
  const response = JSON.parse(gh(['api', `repos/${repository}/actions/artifacts?name=barista-store-artwork-${tag}&per_page=100`])) as {
    artifacts: Array<{ id: number, expired: boolean, workflow_run: { id: number } }>
  }
  const artifact = response.artifacts.find(artifact => {
    if (artifact.expired) return false
    const run = JSON.parse(gh(['run', 'view', String(artifact.workflow_run.id), '--repo', repository, '--json', 'headBranch,headSha,workflowName,event']))
    return (run.workflowName === 'App Store' && ['push', 'workflow_dispatch'].includes(run.event) && run.headSha === revision && [tag, `app-store/${tag}`].includes(run.headBranch))
      || (run.workflowName === 'Verify release' && run.event === 'workflow_dispatch' && run.headBranch === 'main')
  })
  assert(artifact, `No retained native Store artwork exists for ${tag}; run Verify release with its signed Store package run ID`)
  mkdirSync(directory, { recursive: true })
  gh(['run', 'download', String(artifact.workflow_run.id), '--repo', repository, '--name', `barista-store-artwork-${tag}`, '--dir', directory])
  return revision
}
