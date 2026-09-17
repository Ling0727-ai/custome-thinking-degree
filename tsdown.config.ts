import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const checkout = process.env['DSH_CHECKOUT'] ?? resolve(import.meta.dirname, '../../deepseek-harness')
const presetUrl = pathToFileURL(resolve(checkout, 'packages/client/tsdown.client.ts')).href
const { clientBundle } = await import(presetUrl) as {
  clientBundle: (id: string, libEntry: readonly string[]) => unknown
}

export default clientBundle('dsh-plugin-custom-thinking-degree', ['lib/types/index.js'])
