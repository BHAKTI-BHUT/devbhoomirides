import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function writeNodeBootstrap(serverDirectory: string) {
  await writeFile(join(serverDirectory, 'index.mjs'), `if (process.env.PORT) process.env.NITRO_PORT = process.env.PORT;
process.env.NITRO_HOST = process.env.NITRO_HOST || process.env.HOST || '0.0.0.0';
await import('./nitro.mjs');
`)
}
