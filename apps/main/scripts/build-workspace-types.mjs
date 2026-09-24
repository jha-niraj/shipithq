/**
 * Type definitions for the workspace editor (plan/project-workspace WS-11).
 *
 *   pnpm workspace-types
 *
 * Writes public/workspace/types.json: the .d.ts files Monaco needs to type-check
 * a learner's React + TypeScript project, copied from the versions installed in
 * this repo. Static, so the editor has no runtime dependency on a CDN and no
 * TypeScript compiler in the page. Re-run when the starters' React major moves.
 *
 * Two are stubs, on purpose:
 *   - csstype (800 KB) is only used by React for CSSProperties; a permissive
 *     interface keeps `style={{ ... }}` checked as an object without the weight.
 *   - vite/client: the starters' vite-env.d.ts references it; the stub declares
 *     what Vite adds (CSS and asset imports, import.meta.env).
 * And one declares the test globals (describe, it, expect) the tests use.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const pnpmDir = join(repo, 'node_modules/.pnpm')

/** The installed copy of a package, newest matching major. */
function pkgDir(name, major) {
    const prefix = name.replace('/', '+') + '@' + major
    const hit = readdirSync(pnpmDir).filter((d) => d.startsWith(prefix)).sort().pop()
    if (!hit) throw new Error(`${name}@${major} is not installed`)
    return join(pnpmDir, hit, 'node_modules', name)
}

const react = pkgDir('@types/react', '19')
const reactDom = pkgDir('@types/react-dom', '19')
const marked = pkgDir('marked', '18')

const libs = []
const add = (path, file) => libs.push({ path, content: readFileSync(file, 'utf8') })

for (const f of ['index.d.ts', 'global.d.ts', 'jsx-runtime.d.ts', 'jsx-dev-runtime.d.ts']) {
    add(`file:///node_modules/@types/react/${f}`, join(react, f))
}
for (const f of ['index.d.ts', 'client.d.ts']) {
    add(`file:///node_modules/@types/react-dom/${f}`, join(reactDom, f))
}
add('file:///node_modules/marked/index.d.ts', join(marked, 'lib/marked.d.ts'))

libs.push({
    path: 'file:///node_modules/csstype/index.d.ts',
    content: `// Stub (scripts/build-workspace-types.mjs): React uses csstype for CSSProperties only.
export interface Properties<TLength = string | 0, TTime = string> { [property: string]: TLength | TTime | string | number | undefined }
export interface PropertiesHyphen<TLength = string | 0, TTime = string> { [property: string]: TLength | TTime | string | number | undefined }
export type Property = Record<string, unknown>
`,
})
libs.push({
    path: 'file:///node_modules/vite/client.d.ts',
    content: `// Stub (scripts/build-workspace-types.mjs): what Vite adds to a project's types.
declare module '*.css' { const css: string; export default css }
declare module '*.svg' { const src: string; export default src }
declare module '*.png' { const src: string; export default src }
declare module '*.jpg' { const src: string; export default src }
declare module '*.json' { const value: any; export default value }
interface ImportMetaEnv { readonly MODE: string; readonly DEV: boolean; readonly PROD: boolean; readonly BASE_URL: string; readonly [key: string]: string | boolean | undefined }
interface ImportMeta { readonly env: ImportMetaEnv }
`,
})
// The build tooling vite.config.ts imports. The editor only needs it to type-check
// the config file itself; nothing in the app runs it.
libs.push({
    path: 'file:///node_modules/vite/index.d.ts',
    content: `// Stub (scripts/build-workspace-types.mjs): enough for vite.config.ts.
export interface UserConfig { [key: string]: unknown }
export declare function defineConfig(config: UserConfig): UserConfig
`,
})
libs.push({
    path: 'file:///node_modules/@vitejs/plugin-react/index.d.ts',
    content: `// Stub (scripts/build-workspace-types.mjs).
export default function react(options?: Record<string, unknown>): unknown
`,
})
libs.push({
    path: 'file:///node_modules/vitest/config.d.ts',
    content: `// Stub (scripts/build-workspace-types.mjs): lets vite.config.ts carry a \`test\` block.
export {}
`,
})
libs.push({
    path: 'file:///node_modules/@types/workspace-test-globals/index.d.ts',
    content: `// The test globals the starters' tests use (describe/it/expect only, by design).
declare function describe(name: string, fn: () => void): void
declare function it(name: string, fn: () => void | Promise<void>): void
declare function test(name: string, fn: () => void | Promise<void>): void
declare const expect: any
`,
})

const outDir = join(here, '../public/workspace')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const body = JSON.stringify({ generatedFrom: { react: react.split('@types+react@')[1]?.split('/')[0], marked: marked.split('marked@')[1]?.split('/')[0] }, libs })
writeFileSync(join(outDir, 'types.json'), body)
console.log(`public/workspace/types.json: ${libs.length} files, ${(body.length / 1024).toFixed(0)} KB`)
