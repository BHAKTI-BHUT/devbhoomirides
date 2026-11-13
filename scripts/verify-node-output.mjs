import { stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { verifyNodeStartup } from './test-node-start.mjs'

const serverEntry = new URL('../.output/server/index.mjs', import.meta.url)
const runtimeEntry = new URL('../.output/server/nitro.mjs', import.meta.url)
const publicDirectory = new URL('../.output/public/', import.meta.url)

if (!(await stat(serverEntry)).isFile() || !(await stat(runtimeEntry)).isFile() || !(await stat(publicDirectory)).isDirectory()) {
  throw new Error('The Node build must contain .output/server/index.mjs, .output/server/nitro.mjs and .output/public/.')
}

for (const entry of [serverEntry, runtimeEntry]) {
  const syntaxCheck = spawnSync(process.execPath, ['--check', fileURLToPath(entry)], { stdio: 'inherit' })
  if (syntaxCheck.error) throw syntaxCheck.error
  if (syntaxCheck.status !== 0) throw new Error('A generated Node SSR entry failed its syntax check.')
}

console.log('Verified Node SSR entry: .output/server/index.mjs; static assets: .output/public/')
await verifyNodeStartup()
