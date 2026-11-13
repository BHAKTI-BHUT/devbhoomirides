import { access } from 'node:fs/promises'

const serverEntry = new URL('./.output/server/index.mjs', import.meta.url)

try {
  await access(serverEntry)
} catch {
  throw new Error('Missing Node SSR output. Run pnpm run build before pnpm start; the Netlify build cannot be started as a Node server.')
}

await import(serverEntry.href)
