"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@repo/ui/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select";
import {
    Play, Send, Copy, Check, Maximize2, Minimize2
} from "lucide-react";
import { useTheme } from '@repo/ui/components/themeprovider';
import toast from '@repo/ui/components/ui/sonner';
import { cn } from "@repo/ui/lib/utils";
import { executeCode as runCodeOnWorker } from '@/actions/(main)/practice/execute-code.action';
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Supported languages configuration
// NOTE: These are the only languages the compiler worker supports
const SUPPORTED_LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
] as const;

// Languages supported for syntax highlighting but not execution
const DISPLAY_ONLY_LANGUAGES = [
    { value: "csharp", label: "C#" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "ruby", label: "Ruby" },
    { value: "php", label: "PHP" },
    { value: "swift", label: "Swift" },
    { value: "kotlin", label: "Kotlin" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "sql", label: "SQL" },
    { value: "json", label: "JSON" },
    { value: "yaml", label: "YAML" },
    { value: "markdown", label: "Markdown" },
    { value: "shell", label: "Shell/Bash" },
] as const;

// Combined for display purposes
const ALL_LANGUAGES = [...SUPPORTED_LANGUAGES, ...DISPLAY_ONLY_LANGUAGES];

// Type for executable languages
type ExecutableLanguage = typeof SUPPORTED_LANGUAGES[number]['value'];

// Executable languages array (for checking if we can run code)
const EXECUTABLE_LANGUAGES: readonly ExecutableLanguage[] = SUPPORTED_LANGUAGES.map(l => l.value);

const languageMap: Record<string, string> = {
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "csharp",
    go: "go",
    rust: "rust",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    html: "html",
    css: "css",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    markdown: "markdown",
    shell: "shell",
};

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    [key: string]: unknown;
}

export interface CodeEditorProps {
    /** Initial code to display. If not provided, shows placeholder comment */
    code?: string;
    /** Programming language for syntax highlighting */
    language?: string;
    /** Height of the editor */
    height?: string;
    /** Whether the editor is read-only */
    readOnly?: boolean;
    /** Callback when code changes */
    onChange?: (code: string) => void;
    /** Callback when language changes */
    onLanguageChange?: (language: string) => void;
    /** Show language selector dropdown */
    showLanguageSelector?: boolean;
    /** Show copy button */
    showCopyButton?: boolean;
    /** Show Run button */
    showRunButton?: boolean;
    /** Show Submit button */
    showSubmitButton?: boolean;
    /** Run button handler - overrides default execution logic */
    onRun?: (code: string) => void | Promise<void>;
    /** Submit button handler */
    onSubmit?: (code: string) => void | Promise<void>;
    /** Whether run is in progress (controlled) */
    isRunning?: boolean;
    /** Whether submit is in progress (controlled) */
    isSubmitting?: boolean;
    /** Allowed languages (subset of supported languages) */
    allowedLanguages?: string[];
    /** Show expand/fullscreen button */
    showExpandButton?: boolean;
    /** Additional class names */
    className?: string;
    /** Placeholder text when no code is provided */
    placeholder?: string;
    /** Enable default execution logic via Worker */
    enableExecution?: boolean;
    /** Callback when execution completes (if enableExecution is true) */
    onExecutionComplete?: (result: ExecutionResult) => void;
}

export default function CodeEditor({
    code,
    language = "javascript",
    height = "300px",
    readOnly = false,
    onChange,
    onLanguageChange,
    showLanguageSelector = true,
    showCopyButton = true,
    showRunButton = false,
    showSubmitButton = false,
    onRun,
    onSubmit,
    isRunning: isRunningProp,
    isSubmitting: isSubmittingProp,
    allowedLanguages,
    showExpandButton = false,
    className = "",
    placeholder = "// Write your code here...",
    enableExecution = false,
    onExecutionComplete,
}: CodeEditorProps) {
    // resolvedTheme, not theme: with "system" selected, `theme` is the string
    // "system" and a dark OS got a light editor inside a dark page.
    const { resolvedTheme } = useTheme();
    const [currentLanguage, setCurrentLanguage] = useState(language);
    const [currentCode, setCurrentCode] = useState(code ?? "");
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const editorRef = useRef<unknown>(null);

    // Internal state for execution if controlled props are not provided
    const [internalIsRunning, setInternalIsRunning] = useState(false);

    // Effective state
    const isRunning = isRunningProp ?? internalIsRunning;
    const isSubmitting = isSubmittingProp ?? false;

    // Update code when prop changes
    useEffect(() => {
        if (code !== undefined) {
            setCurrentCode(code);
        }
    }, [code]);

    // Update language when prop changes
    useEffect(() => {
        setCurrentLanguage(language);
    }, [language]);

    /**
     * The editor's own black, not Monaco's `vs-dark` grey (#1e1e1e).
     *
     * The workspace around it is black, and a grey editor sitting in it reads as a
     * panel that failed to load (Niraj, 2026-09-22: "the code editor UI colour needs
     * to be black"). Only the surfaces change; the token colours are `vs-dark`'s,
     * which are already tuned for a dark ground.
     */
    const defineShipItTheme = useCallback((monaco: {
        editor: { defineTheme: (name: string, theme: Record<string, unknown>) => void }
    }) => {
        monaco.editor.defineTheme("shipithq-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#000000",
                "editorGutter.background": "#000000",
                "minimap.background": "#000000",
                "editorLineNumber.foreground": "#525252",
                "editorLineNumber.activeForeground": "#a3a3a3",
                "editor.lineHighlightBackground": "#0a0a0a",
                "editor.lineHighlightBorder": "#00000000",
                "editorWidget.background": "#0a0a0a",
                "editorWidget.border": "#262626",
                "editorSuggestWidget.background": "#0a0a0a",
                "scrollbarSlider.background": "#26262699",
                "scrollbarSlider.hoverBackground": "#404040cc",
            },
        })
    }, [])

    const handleEditorDidMount = useCallback((editor: unknown) => {
        editorRef.current = editor;
    }, []);

    const handleLanguageChange = useCallback((newLanguage: string) => {
        setCurrentLanguage(newLanguage);
        onLanguageChange?.(newLanguage);
    }, [onLanguageChange]);

    const handleCodeChange = useCallback((value: string | undefined) => {
        const newCode = value || "";
        setCurrentCode(newCode);
        onChange?.(newCode);
    }, [onChange]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(currentCode);
            setCopied(true);
            toast.success("Code copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.log("Failed to copy: " + error);
            toast.error("Failed to copy");
        }
    }, [currentCode]);

    // Execution goes through the server action, which reaches the code-execution
    // worker over a service binding (and its Cloudflare Container beyond that).
    //
    // What was here before pointed at `/api/v1/run` and `/api/v1/execution/:id`
    // on NEXT_PUBLIC_WORKER_URL and polled for a submission id. That worker has
    // no such routes and never had - it exposes one synchronous
    // `POST /api/v1/execute` - so every Run in this editor 404'd, then timed out
    // after ten seconds of polling nothing.
    const executeCode = useCallback(async () => {
        if (!EXECUTABLE_LANGUAGES.includes(currentLanguage as ExecutableLanguage)) {
            toast.error(`${currentLanguage} execution is not supported. Supported languages: JavaScript, TypeScript, Python, Java, C, C++`);
            return;
        }

        setInternalIsRunning(true);
        try {
            const result = await runCodeOnWorker(currentCode, currentLanguage as ExecutableLanguage);

            if (!result.success && result.error) {
                toast.error(result.error);
            }

            onExecutionComplete?.({
                ...result,
                output: result.stdout,
                error: result.error ?? result.stderr,
            });
        } catch (error) {
            console.error("Execution error:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to run code";
            toast.error(errorMessage);
            onExecutionComplete?.({ success: false, error: errorMessage });
        } finally {
            setInternalIsRunning(false);
        }
    }, [currentCode, currentLanguage, onExecutionComplete]);

    const handleRun = useCallback(async () => {
        if (isRunning) return;

        if (onRun) {
            await onRun(currentCode);
        } else if (enableExecution) {
            await executeCode();
        }
    }, [onRun, isRunning, currentCode, enableExecution, executeCode]);

    const handleSubmit = useCallback(async () => {
        if (onSubmit && !isSubmitting) {
            await onSubmit(currentCode);
        }
    }, [onSubmit, isSubmitting, currentCode]);

    const getMonacoLanguage = (lang: string): string => {
        return languageMap[lang] || lang;
    };

    // Check if current language can be executed
    const canExecute = EXECUTABLE_LANGUAGES.includes(currentLanguage as ExecutableLanguage);

    // Filter languages if allowedLanguages is provided, otherwise show all
    const availableLanguages = allowedLanguages
        ? ALL_LANGUAGES.filter(l => allowedLanguages.includes(l.value))
        : ALL_LANGUAGES;

    return (
        <div
            className={cn(
                "flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-black",
                isExpanded && "fixed inset-4 z-50",
                className
            )}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="h-3 w-3 rounded-full bg-neutral-900" />
                        <div className="h-3 w-3 rounded-full bg-neutral-900" />
                    </div>

                    {
                        showLanguageSelector && availableLanguages.length > 1 ? (
                            <Select
                                value={currentLanguage}
                                onValueChange={handleLanguageChange}
                                disabled={readOnly}
                            >
                                <SelectTrigger className="w-[130px] h-7 text-xs">
                                    <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        availableLanguages.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value} className="text-xs">
                                                {lang.label}
                                                {!EXECUTABLE_LANGUAGES.includes(lang.value as ExecutableLanguage) &&
                                                    <span className="ml-1 text-neutral-600 dark:text-neutral-400">(view only)</span>
                                                }
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded">
                                {ALL_LANGUAGES.find(l => l.value === currentLanguage)?.label || currentLanguage}
                            </div>
                        )
                    }
                </div>
                <div className="flex items-center gap-2">
                    {
                        showCopyButton && currentCode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-7 text-xs px-2"
                            >
                                {
                                    copied ? (
                                        <>
                                            <Check className="h-3 w-3 mr-1" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copy
                                        </>
                                    )
                                }
                            </Button>
                        )
                    }
                    {
                        showExpandButton && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {
                                    isExpanded ? (
                                        <Minimize2 className="h-3 w-3" />
                                    ) : (
                                        <Maximize2 className="h-3 w-3" />
                                    )
                                }
                            </Button>
                        )
                    }
                    {
                        showRunButton && (onRun || enableExecution) && !readOnly && canExecute && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRun}
                                disabled={isRunning || isSubmitting}
                                className="h-7 text-xs gap-1"
                            >
                                {
                                    isRunning ? (
                                        <>
                                            <InlineLoader size="sm" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-3 w-3" />
                                            Run
                                        </>
                                    )
                                }
                            </Button>
                        )
                    }
                    {
                        showSubmitButton && onSubmit && !readOnly && (
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isRunning || isSubmitting}
                                className="h-7 text-xs gap-1 bg-neutral-800 hover:bg-neutral-700"
                            >
                                {
                                    isSubmitting ? (
                                        <>
                                            <InlineLoader size="sm" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-3 w-3" />
                                            Submit
                                        </>
                                    )
                                }
                            </Button>
                        )
                    }
                </div>
            </div>
            <div style={{ height: isExpanded ? "calc(100% - 48px)" : height }}>
                <Editor
                    height="100%"
                    language={getMonacoLanguage(currentLanguage)}
                    // The placeholder is NOT the value: putting it in made Run answer
                    // "Write some code first" against text the user could see in the
                    // editor. An empty editor stays empty.
                    value={currentCode}
                    onChange={handleCodeChange}
                    beforeMount={defineShipItTheme}
                    onMount={handleEditorDidMount}
                    theme={resolvedTheme === "dark" ? "shipithq-dark" : "light"}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        formatOnType: false,
                        suggestOnTriggerCharacters: false,
                        quickSuggestions: readOnly ? false : {
                            other: "on",
                            comments: "off",
                            strings: "off",
                        },
                        acceptSuggestionOnCommitCharacter: false,
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                        folding: true,
                        renderLineHighlight: "all",
                        scrollbar: {
                            vertical: "auto",
                            horizontal: "auto",
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                        padding: {
                            top: 12,
                            bottom: 12,
                        },
                    }}
                    loading={
                        <div className="flex items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900">
                            <InlineLoader size="md" className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                    }
                />
            </div>
        </div>
    );
}