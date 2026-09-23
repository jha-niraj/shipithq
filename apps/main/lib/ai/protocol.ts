// ─────────────────────────────────────────────────────────────────────────────
// The wire format between the chat route and the panel.
//
// NDJSON: one JSON object per line. Ported from the Orbital chat in synchq, which
// has been running this shape in production - the alternative (SSE) buys nothing
// here and costs a parser on both ends.
//
// The route used to answer in PLAIN TEXT, and its comment said so proudly: "the
// client stays a plain text reader and never has to understand tool framing".
// That is exactly why the agent looked like it was doing nothing. Tool rounds ran
// to completion BEFORE the first byte was sent, so the user watched a still
// spinner for however long the database work took, then prose appeared with no
// indication that anything had been looked up. Framing is the whole point: it is
// what lets the panel show "Reading your projects…" while it happens.
//
// Frames are additive. A client that does not recognise a `t` must ignore it
// rather than fail, so a newer server can stream to an older tab.
// ─────────────────────────────────────────────────────────────────────────────

/** A token of the assistant's prose. */
export interface TextFrame {
    t: "text";
    v: string;
}

/**
 * A step in the agent's work.
 *
 * `call` opens a step, `result` closes it, `error` marks it failed. They are
 * matched by `id`, because tool calls in one round run concurrently and finish
 * out of order.
 */
export interface ToolFrame {
    t: "tool";
    phase: "call" | "result" | "error";
    id: string;
    name: string;
    /** A human sentence from the tool itself, preferred over the generic label. */
    summary?: string;
}

/**
 * Something the agent MADE, offered as a control rather than described in prose.
 *
 * When a tool creates a thing that lives at a URL - a cover letter, a resume draft - the
 * reply saying "I've written it, you can find it under AI Tools" is a worse answer than a
 * button that opens it. The model cannot be trusted to render a correct link in markdown
 * (it does not know the id until the tool returns, and it will cheerfully invent a path), so
 * the action is emitted by the ROUTE from the tool's own return value and never passes
 * through the model at all.
 *
 * `href` is always an internal path. The panel refuses anything else - see the note there.
 */
export interface ActionFrame {
    t: "action";
    label: string;
    href: string;
    /** Free-form; the panel picks an icon from it. Unknown kinds get a neutral one. */
    kind?: string;
}

/** The turn ended cleanly. Carries the ids the server gave the two turns it saved, so
 *  the panel can swap its temporary ids for them (feedback needs the real one). Either
 *  may be absent if saving failed; the reply is still shown. */
export interface DoneFrame {
    t: "done";
    messageId?: string;
    userMessageId?: string;
}

/** The conversation this turn belongs to. First frame of every response: a turn sent
 *  without a session id creates one, and the panel learns its id here. */
export interface SessionFrame {
    t: "session";
    id: string;
}

/** The conversation's title, sent once after its first exchange is titled. */
export interface TitleFrame {
    t: "title";
    v: string;
}

/**
 * Something failed after the response had already started.
 *
 * A mid-stream failure cannot change the status code, so it has to travel in
 * band or the user gets a silently truncated answer.
 */
export interface ErrorFrame {
    t: "error";
    message: string;
}

export type ChatFrame = TextFrame | ToolFrame | ActionFrame | DoneFrame | ErrorFrame | SessionFrame | TitleFrame;

/** Serialise one frame for the wire. The trailing newline is the delimiter. */
export function encodeFrame(frame: ChatFrame): string {
    return JSON.stringify(frame) + "\n";
}

/**
 * Incremental NDJSON parser.
 *
 * A chunk boundary lands anywhere, including the middle of a frame, so the
 * partial tail has to be carried into the next read. Reading a stream by
 * `JSON.parse`-ing each chunk works right up until a message is long enough to
 * split, which is exactly when it matters.
 */
export function createFrameParser(): (chunk: string) => ChatFrame[] {
    let buffer = "";
    return (chunk: string): ChatFrame[] => {
        buffer += chunk;
        const lines = buffer.split("\n");
        // The last element is either "" (chunk ended on a delimiter) or a partial
        // frame. Either way it is not ready to parse.
        buffer = lines.pop() ?? "";
        const frames: ChatFrame[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                frames.push(JSON.parse(trimmed) as ChatFrame);
            } catch {
                // A malformed line is not worth killing the stream over - the rest
                // of the reply is still useful.
            }
        }
        return frames;
    };
}
