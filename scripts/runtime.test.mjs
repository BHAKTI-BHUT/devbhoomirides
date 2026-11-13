import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { getIdentityEndpoint } from '../src/server/identity-endpoint.ts'
import identityProxy from '../src/server/identity-proxy.ts'
import { writeNodeBootstrap } from './node-output.ts'

async function createNodeOutputFixture(context, source, entryName = 'index.mjs') {
  const directory = await mkdtemp(join(tmpdir(), 'devbhoomi-node-runtime-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, '.output', 'server'), { recursive: true })
  await writeFile(join(directory, '.output', 'server', entryName), source)
  return directory
}

test('Node bootstrap prioritizes PORT before evaluating static runtime dependencies', async (context) => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8')
  assert.match(config, /entryFileNames:\s*'nitro\.mjs'/)
  assert.match(config, /await writeNodeBootstrap\(nitro\.options\.output\.serverDir\)/)
  const directory = await createNodeOutputFixture(context, '')
  const serverDirectory = join(directory, '.output', 'server')
  await writeFile(join(serverDirectory, 'settings.mjs'), `
    export const port = process.env.NITRO_PORT ?? process.env.PORT
    export const host = process.env.NITRO_HOST || process.env.HOST
  `)
  await writeFile(join(serverDirectory, 'nitro.mjs'), `
    import assert from 'node:assert/strict'
    import { port, host } from './settings.mjs'
    assert.equal(port, process.env.PORT || '38102')
    assert.equal(host, process.env.EXPECTED_HOST)
  `)
  await writeNodeBootstrap(serverDirectory)
  for (const scenario of [
    { env: {}, host: '0.0.0.0' },
    { env: { HOST: '127.0.0.1' }, host: '127.0.0.1' },
    { env: { HOST: '127.0.0.1', NITRO_HOST: '0.0.0.0', NITRO_PORT: '38102' }, host: '0.0.0.0' },
  ]) {
    const child = spawnSync(process.execPath, [join(serverDirectory, 'index.mjs')], {
      stdio: 'ignore',
      env: { NODE_ENV: 'production', PORT: '38101', EXPECTED_HOST: scenario.host, ...scenario.env },
      timeout: 10_000,
    })
    assert.equal(child.status, 0, 'The Node bootstrap ignored PORT or configured the host after imports.')
  }
  const fallback = spawnSync(process.execPath, [join(serverDirectory, 'index.mjs')], {
    stdio: 'ignore', env: { NITRO_PORT: '38102', EXPECTED_HOST: '0.0.0.0' }, timeout: 10_000,
  })
  assert.equal(fallback.status, 0, 'An explicit Nitro port must remain usable when PORT is absent.')
})

test('custom launcher imports the Nitro entry without changing runtime settings', async (context) => {
  const directory = await createNodeOutputFixture(context, `
    import assert from 'node:assert/strict'
    assert.equal(process.env.PORT, '38101')
    assert.equal(process.env.NITRO_PORT, '38102')
    assert.equal(process.env.HOST, '127.0.0.1')
    assert.equal(process.env.NITRO_HOST, '0.0.0.0')
  `)
  const launcher = join(directory, 'server.mjs')
  await copyFile(new URL('../server.mjs', import.meta.url), launcher)
  const child = spawnSync(process.execPath, [launcher], {
    stdio: 'ignore',
    env: { NODE_ENV: 'production', PORT: '38101', NITRO_PORT: '38102', HOST: '127.0.0.1', NITRO_HOST: '0.0.0.0' },
    timeout: 10_000,
  })
  assert.equal(child.status, 0, 'The launcher failed to import the Nitro entry or changed runtime settings.')
})

test('startup verifier checks configured and isolated environments, PORT precedence, and child cleanup', async (context) => {
  const directory = await createNodeOutputFixture(context, `
    import { port, host } from './settings.mjs'
    import assert from 'node:assert/strict'
    import { appendFileSync } from 'node:fs'
    import { createServer } from 'node:http'
    const lifecycle = new URL('../../lifecycle.log', import.meta.url)
    appendFileSync(lifecycle, 'start:' + process.pid + '\\n')
    assert.equal(process.env.HOST, '0.0.0.0')
    assert.equal(process.env.NITRO_HOST, '0.0.0.0')
    assert.equal(process.env.NITRO_PORT, process.env.PORT)
    assert.equal(process.env.RUNTIME_ENV_PROBE, process.execArgv.includes('--require') ? undefined : 'configured')
    const server = createServer((request, response) => {
      response.end(request.url === '/favicon.svg' ? '<svg></svg>' : '<html>Devbhoomi</html>')
    })
    server.listen(Number(port), host)
    process.on('SIGTERM', () => server.close(() => {
      appendFileSync(lifecycle, 'stop:' + process.pid + '\\n')
    }))
  `, 'nitro.mjs')
  const serverDirectory = join(directory, '.output', 'server')
  await writeFile(join(serverDirectory, 'settings.mjs'), `
    export const port = process.env.NITRO_PORT ?? process.env.PORT
    export const host = process.env.NITRO_HOST || process.env.HOST
  `)
  await writeNodeBootstrap(serverDirectory)
  const scripts = join(directory, 'scripts')
  await mkdir(scripts)
  for (const name of ['test-node-start.mjs', 'reject-stdin.cjs']) {
    await copyFile(new URL(name, import.meta.url), join(scripts, name))
  }
  const lifecycle = join(directory, 'lifecycle.log')
  try {
    const child = spawnSync(process.execPath, [join(scripts, 'test-node-start.mjs')], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { NODE_ENV: 'production', RUNTIME_ENV_PROBE: 'configured', PORT: '1', NITRO_PORT: '2' },
      timeout: 30_000,
    })
    assert.equal(child.status, 0, 'The startup verifier failed against the isolated Node fixture.')
    assert.match(child.stdout.toString(), /Verified headless Nitro startup/)
    const events = (await readFile(lifecycle, 'utf8')).trim().split('\n')
    const started = events.filter((event) => event.startsWith('start:')).map((event) => event.slice(6))
    const stopped = events.filter((event) => event.startsWith('stop:')).map((event) => event.slice(5))
    assert.equal(started.length, 2)
    assert.deepEqual(stopped, started, 'Every verification child must stop after its test.')
  } finally {
    const events = await readFile(lifecycle, 'utf8').catch(() => '')
    for (const event of events.split('\n').filter((entry) => entry.startsWith('start:'))) {
      try {
        process.kill(Number(event.slice(6)), 'SIGKILL')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
  }
})

test('server dependencies do not initialize stdin', () => {
  const guard = fileURLToPath(new URL('./reject-stdin.cjs', import.meta.url))
  const child = spawnSync(process.execPath, ['--require', guard, '--input-type=module', '-e', 'await import("@netlify/blobs"); await import("@netlify/database"); await import("@netlify/identity"); await import("drizzle-orm/netlify-db"); await import("@tanstack/react-start/server");'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { NODE_ENV: 'production' },
    timeout: 10_000,
  })
  assert.equal(child.status, 0, 'A server dependency accessed stdin or failed to import.')
})

test('startup verifier reports an HTTP failure instead of an unreachable port', async (context) => {
  const directory = await createNodeOutputFixture(context, `
    import { createServer } from 'node:http'
    const server = createServer((request, response) => {
      response.writeHead(404)
      response.end('Not found')
    })
    server.listen(Number(process.env.PORT), process.env.HOST)
    process.on('SIGTERM', () => server.close())
  `)
  const scripts = join(directory, 'scripts')
  await mkdir(scripts)
  for (const name of ['test-node-start.mjs', 'reject-stdin.cjs']) {
    await copyFile(new URL(name, import.meta.url), join(scripts, name))
  }
  const child = spawnSync(process.execPath, [join(scripts, 'test-node-start.mjs')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { NODE_ENV: 'production' },
    timeout: 10_000,
  })
  assert.equal(child.status, 1)
  assert.match(child.stderr.toString(), /Production server is reachable, but \/favicon.svg was not served successfully/)
  assert.doesNotMatch(child.stderr.toString(), /not reachable on the assigned runtime PORT/)
})

test('identity integration is explicit and does not proxy to itself', async (context) => {
  const previousUrl = process.env.URL
  const previousIdentityUrl = process.env.NETLIFY_IDENTITY_URL
  context.after(() => {
    if (previousUrl === undefined) delete process.env.URL
    else process.env.URL = previousUrl
    if (previousIdentityUrl === undefined) delete process.env.NETLIFY_IDENTITY_URL
    else process.env.NETLIFY_IDENTITY_URL = previousIdentityUrl
  })
  delete process.env.URL
  delete process.env.NETLIFY_IDENTITY_URL
  const requestUrl = 'https://rides.example.test/.netlify/identity/settings'
  assert.equal(getIdentityEndpoint(requestUrl), null)
  const unavailable = await identityProxy({ req: new Request(requestUrl) })
  assert.equal(unavailable.status, 503)
  process.env.NETLIFY_IDENTITY_URL = 'https://rides.example.test'
  assert.equal(getIdentityEndpoint(requestUrl), null)
  process.env.NETLIFY_IDENTITY_URL = 'http://identity.example.test'
  assert.equal(getIdentityEndpoint(requestUrl), null)
  process.env.NETLIFY_IDENTITY_URL = 'https://identity.example.test'
  assert.equal(getIdentityEndpoint(requestUrl)?.pathname, '/.netlify/identity')
  const forbidden = await identityProxy({ req: new Request('https://rides.example.test/.netlify/identity/admin/users') })
  assert.equal(forbidden.status, 404)
})

test('identity proxy uses configured HTTPS upstream without forwarding platform cookies', async (context) => {
  const previous = process.env.NETLIFY_IDENTITY_URL
  process.env.NETLIFY_IDENTITY_URL = 'https://identity.example.test'
  context.after(() => {
    if (previous === undefined) delete process.env.NETLIFY_IDENTITY_URL
    else process.env.NETLIFY_IDENTITY_URL = previous
  })
  const session = randomUUID()
  context.mock.method(globalThis, 'fetch', async (target, options) => {
    assert.equal(target.origin, 'https://identity.example.test')
    assert.equal(target.pathname, '/.netlify/identity/user')
    assert.equal(options.headers.get('authorization'), `Bearer ${session}`)
    assert.equal(options.headers.get('cookie'), null)
    assert.equal(options.redirect, 'manual')
    return Response.json({ id: randomUUID() })
  })
  const response = await identityProxy({ req: new Request('https://rides.example.test/.netlify/identity/user', {
    headers: { authorization: `Bearer ${session}`, cookie: 'unrelated=private' },
  }) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('identity transport failures return a sanitized unavailable response', async (context) => {
  const previous = process.env.NETLIFY_IDENTITY_URL
  process.env.NETLIFY_IDENTITY_URL = 'https://identity.example.test'
  context.after(() => {
    if (previous === undefined) delete process.env.NETLIFY_IDENTITY_URL
    else process.env.NETLIFY_IDENTITY_URL = previous
  })
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('Internal transport detail') })
  const response = await identityProxy({ req: new Request('https://rides.example.test/.netlify/identity/settings') })
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: 'The sign-in service is unavailable.' })
})
