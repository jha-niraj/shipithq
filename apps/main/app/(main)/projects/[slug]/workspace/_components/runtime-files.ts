/*
 * The boundary between a Vite project and Sandpack's client bundler
 * (plan/project-workspace WS-4). Pure, so it is tested on its own - see
 * runtime.tsx for why the client bundler and not Sandpack's Vite template.
 */

// Tests ARE sent (WS-5): "Check task" runs them in this same sandbox, and the
// app never imports them, so they cost the preview nothing.
export const excluded = (path: string) =>
    path === '/vite.config.ts' || path === '/tsconfig.node.json' || path === '/index.html'
    || path === '/package.json' || path === '/tsconfig.json'

/*
 * Vite's root tsconfig.json is only project references ("files": [] and no
 * compilerOptions); the app is compiled with tsconfig.app.json. A bundler that
 * reads tsconfig.json would find no `jsx` setting, so the runtime gets one built
 * from the app's compiler options.
 */
export function runtimeTsconfig(appTsconfig: string | undefined): string {
    let compilerOptions: Record<string, unknown> = { jsx: 'react-jsx', target: 'ES2022', module: 'ESNext', strict: false }
    try {
        const parsed = JSON.parse(appTsconfig ?? '{}') as { compilerOptions?: Record<string, unknown> }
        if (parsed.compilerOptions) {
            const { tsBuildInfoFile: _t, types: _types, ...rest } = parsed.compilerOptions
            compilerOptions = { ...compilerOptions, ...rest }
        }
    } catch { /* keep the defaults above */ }
    return JSON.stringify({ compilerOptions, include: ['src'] }, null, 2)
}

export function runtimePackageJson(projectPackageJson: string | undefined): { deps: Record<string, string>; code: string } {
    let deps: Record<string, string> = { react: '^18.3.1', 'react-dom': '^18.3.1' }
    try {
        const parsed = JSON.parse(projectPackageJson ?? '{}') as { dependencies?: Record<string, string> }
        if (parsed.dependencies && Object.keys(parsed.dependencies).length > 0) deps = parsed.dependencies
    } catch { /* an unparseable package.json keeps React and nothing else */ }
    return { deps, code: JSON.stringify({ main: '/src/main.tsx', dependencies: deps }, null, 2) }
}

/** The bundler's page: the project's index.html without Vite's module script. */
export function runtimeIndexHtml(projectIndexHtml: string | undefined): string {
    const html = projectIndexHtml ?? '<!doctype html><html><body><div id="root"></div></body></html>'
    return html.replace(/<script\b[^>]*type=["']module["'][^>]*>\s*<\/script>/gi, '')
}

export function toSandpackFiles(files: Record<string, string>): Record<string, { code: string; hidden?: boolean }> {
    const out: Record<string, { code: string; hidden?: boolean }> = {}
    for (const [path, code] of Object.entries(files)) {
        if (!excluded(path)) out[path] = { code }
    }
    out['/public/index.html'] = { code: runtimeIndexHtml(files['/index.html']), hidden: true }
    out['/package.json'] = { code: runtimePackageJson(files['/package.json']).code, hidden: true }
    out['/tsconfig.json'] = { code: runtimeTsconfig(files['/tsconfig.app.json']), hidden: true }
    return out
}
