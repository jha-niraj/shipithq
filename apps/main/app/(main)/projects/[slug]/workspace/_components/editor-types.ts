/*
 * Real types in the workspace editor (plan/project-workspace WS-11).
 *
 * Until this, Monaco's semantic checking was OFF: it could not see React's
 * types, so every `import React` was an error and the real ones drowned. Now:
 *   - the .d.ts files come from public/workspace/types.json, generated from the
 *     versions installed in this repo (`pnpm workspace-types`), loaded once;
 *   - compiler options follow the project's own tsconfig.app.json, so turning
 *     `strict` on (sprint 1, task 1) makes the editor stricter too;
 *   - every source file is a model, not only the open tabs, so
 *     `import { APP_NAME } from './config'` resolves.
 */

type Uri = { toString(): string }
type Model = { getValue(): string; setValue(v: string): void; dispose(): void; uri: Uri; isAttachedToEditor(): boolean }
type TsDefaults = {
    addExtraLib(content: string, path: string): void
    setCompilerOptions(o: Record<string, unknown>): void
    setDiagnosticsOptions(o: Record<string, unknown>): void
}
export type MonacoLike = {
    Uri: { file(path: string): Uri }
    editor: {
        getModel(uri: Uri): Model | null
        getModels(): Model[]
        createModel(value: string, language: string, uri: Uri): Model
    }
    languages: { typescript: { typescriptDefaults: TsDefaults } }
}

let typesLoaded: Promise<boolean> | null = null

/** Adds the type definitions once per page. Resolves false if they could not load. */
export function loadWorkspaceTypes(monaco: MonacoLike): Promise<boolean> {
    typesLoaded ??= fetch('/workspace/types.json')
        .then((r) => {
            if (!r.ok) throw new Error(`types.json: ${r.status}`)
            return r.json() as Promise<{ libs: { path: string; content: string }[] }>
        })
        .then(({ libs }) => {
            const ts = monaco.languages.typescript.typescriptDefaults
            for (const lib of libs) ts.addExtraLib(lib.content, lib.path)
            return true
        })
        .catch(() => {
            typesLoaded = null // try again next time
            return false
        })
    return typesLoaded
}

/** Compiler options from the project's tsconfig.app.json; checking on only once types are in. */
export function configureCompiler(monaco: MonacoLike, appTsconfig: string | undefined, typesReady: boolean) {
    let strict = false
    try {
        strict = !!(JSON.parse(appTsconfig ?? '{}') as { compilerOptions?: { strict?: boolean } }).compilerOptions?.strict
    } catch { /* an unparseable tsconfig checks loosely */ }
    const ts = monaco.languages.typescript.typescriptDefaults
    ts.setCompilerOptions({
        target: 99, // ESNext
        module: 99, // ESNext
        moduleResolution: 2, // NodeJs: node_modules/@types/react resolves
        jsx: 4, // react-jsx
        strict,
        noEmit: true,
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        esModuleInterop: true,
        allowNonTsExtensions: true,
        skipLibCheck: true,
        isolatedModules: true,
    })
    // Without types every file is red; with them, the errors are the learner's.
    ts.setDiagnosticsOptions({ noSemanticValidation: !typesReady, noSyntaxValidation: false })
}

const languageFor = (path: string) =>
    /\.(tsx?|mts|cts)$/.test(path) ? 'typescript' : /\.(jsx?|mjs|cjs)$/.test(path) ? 'javascript' : null

/**
 * One model per source file, kept in step with the workspace's text. The model
 * a user is typing in already holds that text, so it is never overwritten; a
 * deleted file's model is disposed.
 */
export function syncProjectModels(monaco: MonacoLike, files: Record<string, string>) {
    const wanted = new Set<string>()
    for (const [path, content] of Object.entries(files)) {
        const language = languageFor(path)
        if (!language) continue
        const uri = monaco.Uri.file(path)
        wanted.add(uri.toString())
        const model = monaco.editor.getModel(uri)
        if (!model) monaco.editor.createModel(content, language, uri)
        else if (!model.isAttachedToEditor() && model.getValue() !== content) model.setValue(content)
    }
    for (const model of monaco.editor.getModels()) {
        const key = model.uri.toString()
        if (key.startsWith('file:///node_modules/')) continue
        if (languageFor(key) && !wanted.has(key) && !model.isAttachedToEditor()) model.dispose()
    }
}
