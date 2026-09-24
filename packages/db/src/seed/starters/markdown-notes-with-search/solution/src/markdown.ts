import { Marked } from "marked";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A local instance, so this setting does not leak into anything else using marked.
// marked passes raw HTML through untouched; here it becomes text.
const marked = new Marked({
  async: false,
  renderer: { html: ({ text }) => escapeHtml(text) },
});

export function renderMarkdown(source: string): string {
  return marked.parse(source) as string;
}
