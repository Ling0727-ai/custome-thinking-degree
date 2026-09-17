import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = join(process.cwd(), 'src', 'components')
const failures = []
function inspect(directory) {
  const name = basename(directory)
  const entries = readdirSync(directory)
  for (const suffix of ['.data.ts', '.api.ts', '.ts', '.tsx']) {
    if (!entries.includes(`${name}${suffix}`)) failures.push(`${directory}: missing ${name}${suffix}`)
  }
  for (const entry of entries) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) inspect(path)
    else if (!entry.startsWith(`${name}.`)) failures.push(`${directory}: unrelated file ${entry}`)
  }
}
if (existsSync(root)) for (const entry of readdirSync(root)) {
  const path = join(root, entry)
  if (statSync(path).isDirectory()) inspect(path)
}
if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('Component structure is valid.')
