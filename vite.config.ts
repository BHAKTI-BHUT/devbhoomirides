import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import { nitro } from 'nitro/vite'
import { writeNodeBootstrap } from './scripts/node-output.ts'

const config = defineConfig(({ mode }) => ({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    mode === 'netlify' ? netlify() : [],
    tanstackStart(),
    mode === 'netlify'
      ? []
      : nitro({
          preset: 'node-server',
          serverEntry: false,
          rollupConfig: {
            output: {
              entryFileNames: 'nitro.mjs',
            },
          },
          hooks: {
            compiled: async (nitro) => {
              await writeNodeBootstrap(nitro.options.output.serverDir)
            },
          },
          handlers: [
            { route: '/.netlify/identity/**', handler: './src/server/identity-proxy.ts' },
          ],
          output: {
            dir: '.output',
            serverDir: '.output/server',
            publicDir: '.output/public',
          },
        }),
    viteReact(),
  ],
}))

export default config
