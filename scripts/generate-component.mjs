import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const requested = process.argv[2]
if (!requested || requested.includes('..')) {
  console.error('Usage: npm run gen:comp <Component[/Child]>')
  process.exit(1)
}

const directory = join(process.cwd(), 'src', 'components', requested)
const name = basename(requested)
if (existsSync(directory)) {
  console.error(`Component already exists: ${requested}`)
  process.exit(1)
}

mkdirSync(directory, { recursive: true })
const files = {
  [`${name}.data.ts`]: `export interface ${name}State {}\n`,
  [`${name}.api.ts`]: `export interface ${name}Props {}\n`,
  [`${name}.ts`]: `export function use${name}() {\n  return {}\n}\n`,
  [`${name}.tsx`]: `import type { ReactNode } from 'react'\nimport type { ${name}Props } from './${name}.api.ts'\n\nexport function ${name}(_props: ${name}Props): ReactNode {\n  return null\n}\n`,
}
for (const [file, source] of Object.entries(files)) writeFileSync(join(directory, file), source)
