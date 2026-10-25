import * as React from "react"

import { cn } from "../../lib/utils"

/**
 * Renders HTML written in a rich-text editor, WITH the styling that HTML implies.
 *
 * ## Why this exists rather than `prose`
 *
 * Call sites across the product render editor output as
 * `className="prose prose-sm max-w-none dark:prose-invert"`. **Every one of those classes is
 * inert: `@tailwindcss/typography` is not installed in this repo.** The only match for it anywhere
 * is a comment in `apps/docs/app/globals.css` explaining that its prose styles are hand-written
 * *rather than* the plugin.
 *
 * The consequence is quiet and easy to miss, because the markup is correct and nothing errors: an
 * `<h2>` renders at body size, `<ul>` has no bullets and no indent, `<blockquote>` has no rule, and
 * a paragraph break looks like a line break. The writer's structure is simply not shown.
 *
 * ## Why child selectors rather than a stylesheet
 *
 * Everything here is Tailwind arbitrary-variant classes on ONE element, so the component is
 * self-contained: no plugin, no global CSS, no `@layer` ordering to reason about, and it can be
 * copied into another product whole - the same property `stat-band.tsx` is kept to deliberately.
 *
 * ## Sanitising
 *
 * The caller passes raw HTML and this is `dangerouslySetInnerHTML`, so `sanitize` strips scripts,
 * `javascript:` URLs and inline event handlers before anything is set. Platform newsletters are
 * authored by Gurukul staff, but "written by staff" is not a security model - a compromised admin
 * account would otherwise script every school's browser.
 */

/** Strips scripts, `javascript:` hrefs and inline handlers. Mirrors `apps/main/lib/sanitize.ts`. */
export function sanitizeRichText(html: string): string {
	if (!html) return ""
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
		.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
		.replace(/javascript\s*:/gi, "about:")
		.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
		.replace(/\son\w+\s*=\s*[^\s>]*/gi, "")
}

/**
 * The typographic contract, as child selectors.
 *
 * Sizes step DOWN from the app's own scale rather than the browser's: an `<h1>` inside a panel is
 * a section heading, not a page title, so it must not out-rank the page heading above it. Same
 * reasoning as the `SheetTitle` default.
 */
const RICH_TEXT = [
	// Base
	"text-sm leading-relaxed text-neutral-700 dark:text-neutral-300",
	"[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",

	// Headings. Semibold is the ceiling here as everywhere else in the product.
	"[&_h1]:mb-2 [&_h1]:mt-6 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-neutral-900 dark:[&_h1]:text-white",
	"[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 dark:[&_h2]:text-white",
	"[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900 dark:[&_h3]:text-white",
	"[&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-neutral-800 dark:[&_h4]:text-neutral-100",

	// Blocks
	"[&_p]:my-3",
	"[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
	"[&_li]:my-1 [&_li]:pl-1 [&_li::marker]:text-neutral-400 dark:[&_li::marker]:text-neutral-500",
	"[&_ul_ul]:my-1 [&_ol_ol]:my-1",
	"[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-neutral-600 dark:[&_blockquote]:border-neutral-700 dark:[&_blockquote]:text-neutral-400",
	"[&_hr]:my-6 [&_hr]:border-neutral-200 dark:[&_hr]:border-neutral-800",

	// Inline
	"[&_strong]:font-semibold [&_strong]:text-neutral-900 dark:[&_strong]:text-white",
	"[&_em]:italic",
	"[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-neutral-400 hover:[&_a]:decoration-current",
	"[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-neutral-800",
	"[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-neutral-100 [&_pre]:p-4 [&_pre]:text-xs dark:[&_pre]:bg-neutral-900",
	"[&_pre_code]:bg-transparent [&_pre_code]:p-0",

	// Media and tables. `max-w-full` on the image and a scroller on the table, because editor
	// content is pasted from anywhere and a 1200px screenshot must not widen the panel.
	"[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl",
	"[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
	"[&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-neutral-800 dark:[&_th]:bg-neutral-900",
	"[&_td]:border [&_td]:border-neutral-200 [&_td]:px-2 [&_td]:py-1.5 dark:[&_td]:border-neutral-800",
].join(" ")

export interface RichTextProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Raw HTML from the editor. Sanitised here; callers must not pre-sanitise differently. */
	html: string
	/** Clamp to N lines, for a list preview. Suppresses block spacing so the clamp is honest. */
	clamp?: number
}

/** True when a stored value came from the rich editor (has tags); older rows are plain text. */
export function looksLikeHtml(value: string): boolean {
	return /<\/?(p|ul|ol|li|h[1-6]|strong|em|u|a|br|blockquote|hr)\b/i.test(value)
}

/** The visible text of a rich value - for "is it empty?" checks, SMS, CSV and one-line PDF fields. */
export function richTextToPlain(value: string): string {
	return value
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|li|h[1-6]|blockquote)>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

export function RichText({ html, clamp, className, ...props }: RichTextProps) {
	// A row written before the field went rich is plain text: keep its line breaks.
	if (html && !looksLikeHtml(html)) {
		return (
			<div {...props} className={cn(RICH_TEXT, "whitespace-pre-wrap", clamp === 1 && "line-clamp-1", clamp === 2 && "line-clamp-2", clamp === 3 && "line-clamp-3", className)}>
				{html}
			</div>
		)
	}
	return (
		<div
			{...props}
			className={cn(
				RICH_TEXT,
				// A clamped preview is a SUMMARY, not a document: block margins inside a
				// `line-clamp` count toward the clamped height, so two lines of text plus a
				// heading's margin renders as one line of text and a gap.
				clamp && "[&_*]:!my-0 [&_*]:!text-sm [&_*]:!font-normal [&_*]:!leading-snug",
				clamp === 1 && "line-clamp-1",
				clamp === 2 && "line-clamp-2",
				clamp === 3 && "line-clamp-3",
				className,
			)}
			dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
		/>
	)
}
