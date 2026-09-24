// Sprint 1, task 3: Write and render markdown side by side.
import { renderMarkdown } from "../src/markdown";

describe("sprint 1, task 3", () => {
  it("renders markdown", () => {
    expect(renderMarkdown("# Title")).toContain("<h1");
    expect(renderMarkdown("some **bold** text")).toContain("<strong>bold</strong>");
  });

  it("shows a script tag as text and runs nothing", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script");
  });

  it("keeps a fenced code block exactly as written", () => {
    const html = renderMarkdown("```\n# not a heading *or emphasis*\n```");
    expect(html).toContain("<code");
    expect(html).toContain("# not a heading *or emphasis*");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<em>");
  });
});
