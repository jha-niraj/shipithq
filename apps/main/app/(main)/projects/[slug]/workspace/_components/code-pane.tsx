'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@repo/ui/components/themeprovider'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { EDITOR_FONTS } from './editor-fonts'
import { languageOf, type EditorSettings } from './workspace-model'

const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full items-center justify-center">
            <InlineLoader size="md" label="Loading the editor" />
        </div>
    ),
})

interface CodePaneProps {
    path: string
    /** The file's text when its model is first created. The model owns it after that. */
    initialValue: string
    readOnly: boolean
    settings: EditorSettings
    /** Called with the path of the model that ACTUALLY changed. */
    onChange: (path: string, value: string) => void
}

type MonacoLike = {
    editor: { defineTheme: (name: string, theme: Record<string, unknown>) => void; remeasureFonts: () => void }
    languages: {
        typescript: {
            typescriptDefaults: {
                setDiagnosticsOptions: (o: Record<string, boolean>) => void
                setCompilerOptions: (o: Record<string, unknown>) => void
            }
            JsxEmit: { ReactJSX: number }
        }
    }
}

type ModelLike = { uri: { path: string }; getValue: () => string; updateOptions: (o: Record<string, unknown>) => void }
type EditorLike = { getModel: () => ModelLike | null; updateOptions: (o: Record<string, unknown>) => void }

/*
 * Settings are APPLIED, not just passed as props (WS-3c step 3). Only font size
 * used to take effect: tab size is a per-MODEL option, and Monaco's indentation
 * detection overrode it from each file's contents anyway; a font change needs
 * the glyph widths remeasured or the cursor drifts off the text.
 */
function editorOptions(settings: EditorSettings) {
    return {
        fontSize: settings.fontSize,
        lineHeight: Math.round(settings.fontSize * 1.55),
        fontFamily: EDITOR_FONTS[settings.fontFamily].stack,
        fontLigatures: EDITOR_FONTS[settings.fontFamily].ligatures,
        wordWrap: (settings.wordWrap ? 'on' : 'off') as 'on' | 'off',
        minimap: { enabled: settings.minimap },
        lineNumbers: (settings.lineNumbers ? 'on' : 'off') as 'on' | 'off',
    }
}

/*
 * One Monaco model per file (the `path` prop), so each tab keeps its own undo
 * history, cursor and scroll.
 *
 * UNCONTROLLED, and that is the fix for a real bug (WS-3b step 1). This took a
 * controlled `value` as well as `path`; on a tab switch the wrapper synced the
 * value and reported the PREVIOUS file's text as a change, which the page filed
 * under the NEW tab - in dev, package.json was saved holding a test file. Now
 * each model is seeded once from `initialValue`, and every change is attributed
 * to the model it happened in, read from the editor itself, never from props.
 *
 * Types and compiler options: see editor-types.ts (WS-11).
 */
export function CodePane({ path, initialValue, readOnly, settings, onChange }: CodePaneProps) {
    const { resolvedTheme } = useTheme()
    const editorRef = useRef<EditorLike | null>(null)
    const monacoRef = useRef<MonacoLike | null>(null)

    const apply = () => {
        const editor = editorRef.current
        if (!editor) return
        editor.updateOptions(editorOptions(settings))
        editor.getModel()?.updateOptions({ tabSize: settings.tabSize, indentSize: settings.tabSize, insertSpaces: true })
        monacoRef.current?.editor.remeasureFonts()
        // A web font may still be downloading: measure again once it has
        // arrived, or the cursor sits a fraction off every character.
        const family = EDITOR_FONTS[settings.fontFamily].stack.split(',')[0]!
        void document.fonts?.load(`${settings.fontSize}px ${family}`).then(() => monacoRef.current?.editor.remeasureFonts()).catch(() => {})
    }
    // Re-applied on every settings change and on every file switch (each file
    // is its own model, and the model carries the tab size).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `apply` reads the latest settings
    useEffect(apply, [settings, path])

    const beforeMount = (monaco: MonacoLike) => {
        monacoRef.current = monaco
        monaco.editor.defineTheme('shipithq-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#000000',
                'editorGutter.background': '#000000',
                'minimap.background': '#000000',
                'editorLineNumber.foreground': '#525252',
                'editorLineNumber.activeForeground': '#a3a3a3',
                'editor.lineHighlightBackground': '#0a0a0a',
                'editor.lineHighlightBorder': '#00000000',
                'editorWidget.background': '#0a0a0a',
                'editorWidget.border': '#262626',
                'scrollbarSlider.background': '#26262699',
                'scrollbarSlider.hoverBackground': '#404040cc',
            },
        })
        // Types and compiler options are set by the workspace (editor-types.ts,
        // WS-11), which also keeps a model for every source file.
    }

    return (
        <Editor
            height="100%"
            path={path}
            defaultLanguage={languageOf(path)}
            defaultValue={initialValue}
            beforeMount={beforeMount as never}
            onMount={(editor) => { editorRef.current = editor as unknown as EditorLike; apply() }}
            onChange={() => {
                const model = editorRef.current?.getModel()
                if (model) onChange(model.uri.path, model.getValue())
            }}
            theme={resolvedTheme === 'dark' ? 'shipithq-dark' : 'light'}
            options={{
                readOnly,
                readOnlyMessage: { value: 'Provided with the task: make it pass, do not edit it.' },
                ...editorOptions(settings),
                tabSize: settings.tabSize,
                detectIndentation: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: 'line',
                padding: { top: 12 },
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
            }}
        />
    )
}
