// Server-renders assistant messages to check the markdown paths (plan/ai-chat AC-6):
// inline code stays inline, fenced code gets the code block, a table is wrapped in
// its own sideways scroller, a chart fence becomes the chart slot, bad chart JSON
// falls back to code. Run like ai-chat.ts.
import * as React from "react"
import { renderToString } from "react-dom/server"
// The app compiles JSX with Next's runtime; under plain tsx some files use the
// classic transform, which needs React in scope.
;(globalThis as { React?: typeof React }).React = React
const { ChatMessage } = await import("@/components/ai/chat-message")

let pass = 0, fail = 0
const check = (name: string, ok: boolean) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`) }
const md = [
    "Use `map` here.",
    "",
    "```cpp",
    "int main() { return 0; }",
    "```",
    "",
    "| a | b |",
    "|---|---|",
    "| 1 | 2 |",
    "",
    "```chart",
    '{"type":"bar","labels":["Mon","Tue"],"series":[{"name":"Solved","data":[3,5]}]}',
    "```",
    "",
    "```chart",
    "{not json",
    "```",
].join("\n")
const html = renderToString(
    <ChatMessage
        message={{ id: "m1", role: "assistant", content: md, createdAt: Date.now(), feedback: 1, steps: [{ id: "s", name: "get_my_practice_stats", status: "done" }], actions: [{ label: "Open DSA practice", href: "/practice/dsa" }] }}
        isStreaming={false}
        onFeedback={() => {}}
    />,
)
check("inline code renders inline", /<code class="rounded[^"]*">map<\/code>/.test(html))
check("fenced code renders as a code block with its language", html.includes(">cpp<") && html.includes("int main()"))
check("table is wrapped in its own scroller", /overflow-x-auto[^"]*"><table/.test(html))
check("valid chart fence becomes the chart slot, not code", !html.includes("&quot;type&quot;:&quot;bar&quot;") && html.includes("animate-pulse rounded-xl"))
check("invalid chart JSON falls back to a code block", html.includes("{not json"))
check("tool step and action button render", html.includes("Read your practice stats") && html.includes('href="/practice/dsa"'))
check("thumbs up shows as pressed", html.includes('aria-pressed="true"'))
const pending = renderToString(<ChatMessage message={{ id: "tmp-1", role: "assistant", content: "hi", createdAt: Date.now() }} isStreaming={false} onFeedback={() => {}} />)
check("feedback is disabled before the turn is saved", (pending.match(/disabled=""/g) ?? []).length === 2)
const typing = renderToString(<ChatMessage message={{ id: "tmp-2", role: "assistant", content: "", createdAt: Date.now() }} isStreaming onFeedback={() => {}} />)
check("empty streaming reply shows the typing dots", typing.includes('aria-label="Thinking"') && typing.includes("animate-bounce"))
const { ChatEmptyState } = await import("@/components/ai/chat-empty-state")
const docked = renderToString(<ChatEmptyState onSelect={() => {}} pageTitle="DSA Practice" wide={false} />)
check("empty state: page pill, two create cards, Explain this page first", docked.includes("DSA Practice") && (docked.match(/Start a project|Plan my DSA prep|Review my resume|Design a URL shortener/g) ?? []).length === 2 && docked.indexOf("Explain this page") < docked.indexOf("What should I practice next?"))
const wideState = renderToString(<ChatEmptyState onSelect={() => {}} pageTitle={null} wide />)
check("empty state maximized: all four cards, no page pill", (wideState.match(/Start a project|Plan my DSA prep|Review my resume|Design a URL shortener/g) ?? []).length === 4 && !wideState.includes("You&#x27;re on"))
const { HistoryDropdown } = await import("@/components/ai/history-dropdown")
const now = Date.now()
const hist = renderToString(<HistoryDropdown open onClose={() => {}} anchorRef={{ current: null }} loaded activeId="b" onSelect={() => {}} onDelete={() => {}} sessions={[
    { id: "a", title: "Graph practice", createdAt: now, updatedAt: now },
    { id: "b", title: "Resume review", createdAt: now, updatedAt: now - 3 * 86400000 },
    { id: "c", title: null, createdAt: now, updatedAt: now - 90 * 86400000 },
]} />)
check("history groups Today / Previous 7 days / Older", hist.indexOf("Today") < hist.indexOf("Graph practice") && hist.indexOf("Previous 7 days") < hist.indexOf("Resume review") && hist.indexOf("Older") < hist.indexOf("New conversation"))
check("history marks the open chat", hist.includes('aria-label="Open"'))
const { ChatComposer } = await import("@/components/ai/chat-composer")
const comp = renderToString(<ChatComposer value="" onChange={() => {}} onSubmit={() => {}} onStop={() => {}} isStreaming={false} docs={[]} uploading={0} onRemoveDoc={() => {}} onPickFiles={() => {}} tags={[{ id: "p", kind: "project", title: "My project" }]} autoTag={null} onRemoveTag={() => {}} wide={false} />)
check("composer: send disabled when empty, record and attach present", /aria-label="Send message"[^>]*disabled=""|disabled=""[^>]*aria-label="Send message"/.test(comp) && comp.includes("Record") && comp.includes("Attach a document") && comp.includes("My project"))
const streaming = renderToString(<ChatComposer value="x" onChange={() => {}} onSubmit={() => {}} onStop={() => {}} isStreaming docs={[]} uploading={0} onRemoveDoc={() => {}} onPickFiles={() => {}} tags={[]} autoTag={null} onRemoveTag={() => {}} wide={false} />)
check("composer: stop replaces send while streaming", streaming.includes("Stop the reply") && !streaming.includes("Send message"))
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
