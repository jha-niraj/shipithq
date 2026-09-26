// The wire format between the chat route and the panel (NDJSON frames). It lives
// with the shared panel in @repo/ui (plan/hiring-app HA-11), so both apps' routes
// and the one panel agree; the notes on the format are there.

export { encodeFrame, createFrameParser } from "@repo/ui/components/ai-chat/protocol"
export type { ChatFrame, TextFrame, ToolFrame, ActionFrame, DoneFrame, SessionFrame, TitleFrame, ErrorFrame } from "@repo/ui/components/ai-chat/protocol"
