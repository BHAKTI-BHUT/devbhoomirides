import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { createConnection, createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const serverEntry = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))
const stdinGuard = fileURLToPath(new URL('./reject-stdin.cjs', import.meta.url))

async function availablePort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const address = probe.address()
  assert(address && typeof address === 'object')
  const port = address.port
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()))
  return port
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM')
  await Promise.race([exited, delay(2_000)])
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    await exited
  }
}

async function canConnect(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    const finish = (connected) => {
      socket.destroy()
      resolve(connected)
    }
    socket.setTimeout(1_000)
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.once('timeout', () => finish(false))
  })
}

export async function verifyNodeStartup() {
  await access(serverEntry)
  for (const guarded of [false, true]) {
    const port = await availablePort()
    const argumentsList = guarded ? ['--require', stdinGuard, serverEntry] : [serverEntry]
    const child = spawn(process.execPath, argumentsList, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...(guarded ? {} : process.env),
        NODE_ENV: 'production',
        PORT: String(port),
        HOST: '0.0.0.0',
        NITRO_PORT: '0',
        NITRO_HOST: '0.0.0.0',
      },
    })
    let failedToSpawn = false
    let touchedStdin = false
    child.on('error', () => { failedToSpawn = true })
    child.stdout.resume()
    child.stderr.on('data', (data) => {
      if (data.toString().includes('Production runtime accessed stdin.')) touchedStdin = true
    })
    try {
      const deadline = Date.now() + 15_000
      let ready = false
      while (Date.now() < deadline) {
        assert(!touchedStdin, 'Production server accessed stdin during startup.')
        assert(!failedToSpawn && child.exitCode === null && child.signalCode === null, 'Production server exited during headless startup; inspect its runtime logs securely.')
        if (await canConnect(port)) {
          ready = true
          break
        }
        await delay(100)
      }
      assert(ready, 'Production server was not reachable on the assigned runtime PORT.')
      const asset = await fetch(`http://127.0.0.1:${port}/favicon.svg`, { signal: AbortSignal.timeout(5_000), redirect: 'manual' })
      assert.equal(asset.status, 200, 'Production server is reachable, but /favicon.svg was not served successfully.')
      assert.match(await asset.text(), /<svg/, 'Production server returned invalid /favicon.svg content.')
      for (const route of ['/', '/app', '/drive', '/login']) {
        const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(5_000), redirect: 'manual' })
        assert.equal(response.status, 200, `SSR smoke test failed for ${route}.`)
        assert.match(await response.text(), /Devbhoomi/i, `SSR content missing for ${route}.`)
      }
      assert(!touchedStdin, 'Production server accessed stdin.')
    } finally {
      await stopChild(child)
    }
  }
  console.log('Verified headless Nitro startup, configured and isolated environments, unavailable stdin, assigned PORT, wildcard host, and SSR routes.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await verifyNodeStartup()
