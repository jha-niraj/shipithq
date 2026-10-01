"use client";

import { useEffect, useRef, useId } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const CodeEditor = dynamic(() => import("@/components/main/code-editor"), { ssr: false });

// As tall as the code, not a fixed box (Niraj, 2026-10-01): about 20 px a line at the
// editor's 13 px font, its 12 px top and bottom padding and an 8 px scrollbar. Past 24
// lines it scrolls inside.
const LINE_PX = 20;
function codeBlockHeight(code: string): string {
    const lines = Math.min(24, Math.max(1, code.replace(/\n$/, "").split("\n").length));
    return `${lines * LINE_PX + 32}px`;
}

// ─── Mermaid diagram block ──────────────────
function MermaidBlock({ code }: { code: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useId();
    const mermaidId = `mermaid-${uniqueId.replace(/:/g, "")}`;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!containerRef.current) return;
            try {
                const mermaid = (await import("mermaid")).default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "dark",
                    securityLevel: "loose",
                    fontFamily: "inherit",
                    themeVariables: {
                        primaryColor: "#737373",
                        primaryTextColor: "#f5f5f5",
                        primaryBorderColor: "#525252",
                        lineColor: "#737373",
                        secondaryColor: "#262626",
                        tertiaryColor: "#171717",
                        background: "#0a0a0a",
                        mainBkg: "#171717",
                        nodeBorder: "#525252",
                        clusterBkg: "#171717",
                        titleColor: "#f5f5f5",
                        edgeLabelBackground: "#171717",
                    },
                });
                const { svg } = await mermaid.render(mermaidId, code.trim());
                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            } catch {
                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = `<pre class="text-red-400 text-xs whitespace-pre-wrap p-3">${code}</pre>`;
                }
            }
        })();
        return () => { cancelled = true; };
    }, [code, mermaidId]);

    return (
        <div
            ref={containerRef}
            className="my-4 flex justify-center overflow-x-auto rounded-lg bg-neutral-950 border border-neutral-800 p-4"
        />
    );
}

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    return (
        <div className={`text-left w-full ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const inline = !match;

                        // Handle mermaid code blocks
                        if (match && match[1] === "mermaid") {
                            return <MermaidBlock code={String(children).replace(/\n$/, "")} />;
                        }

                        return inline ? (
                            <code
                                className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-sm font-mono"
                                {...props}
                            >
                                {children}
                            </code>
                        ) : (
                            <div className="my-3 rounded-lg overflow-hidden">
                                <CodeEditor
                                    code={String(children).replace(/\n$/, "")}
                                    language={match![1]}
                                    readOnly
                                    showLanguageSelector={false}
                                    showCopyButton
                                    showRunButton={false}
                                    showSubmitButton={false}
                                    height={codeBlockHeight(String(children))}
                                    className="border border-neutral-200 dark:border-neutral-700"
                                />
                            </div>
                        );
                    },
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-6 mb-4 text-neutral-900 dark:text-white">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mt-5 mb-3 text-neutral-900 dark:text-white">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-neutral-900 dark:text-white">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-base font-semibold mt-3 mb-2 text-neutral-900 dark:text-white">
                            {children}
                        </h4>
                    ),
                    p: ({ children }) => (
                        <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 text-neutral-700 dark:text-neutral-300 ml-2">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 text-neutral-700 dark:text-neutral-300 ml-2">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="ml-2 leading-relaxed">
                            {children}
                        </li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-neutral-900 pl-4 py-2 my-4 bg-neutral-50 dark:bg-neutral-900/30 rounded-r-lg text-neutral-700 dark:text-neutral-300 italic">
                            {children}
                        </blockquote>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-neutral-900 dark:text-white">
                            {children}
                        </strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-neutral-700 dark:text-neutral-300">
                            {children}
                        </em>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-800 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-100 underline underline-offset-2"
                        >
                            {children}
                        </a>
                    ),
                    hr: () => (
                        <hr className="my-6 border-neutral-200 dark:border-neutral-800" />
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-neutral-100 dark:bg-neutral-800">
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                            {children}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default MarkdownRenderer;