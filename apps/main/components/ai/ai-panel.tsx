"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Maximize2, Minimize2, SquarePen, Upload, X } from "lucide-react";
import { AIGlyph } from "@repo/ui/components/ui/ai-mark";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import toast from "@repo/ui/components/ui/sonner";
import type { AssistantFeedback } from "@repo/db/assistant";
import { useAIPanelStore } from "@/app/store/aiPanelStore";
import type { AIChatAttachment } from "@/lib/ai/chat-types";
import { createFrameParser } from "@/lib/ai/protocol";
import {
	deleteAssistantChat, getAssistantChat, listAssistantChats, setAssistantMessageFeedback,
} from "@/actions/(main)/ai/assistant-chat.action";
import { useContextTags, activeContextTags, removePinnedTag } from "@/components/ai/context-tags";
import { ChatMessage } from "./chat-message";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatComposer, type ChatComposerHandle } from "./chat-composer";
import { HistoryDropdown } from "./history-dropdown";

// ─────────────────────────────────────────────────────────────────────────────
// The ShipItHQ AI panel (plan/ai-chat). Header, conversation, composer - and
// nothing about WHERE it sits: it fills whatever box it is given. Placement is
// the app shell's job (`app/(main)/_components/main-shell.tsx`): a docked column
// on lg+, a Sheet below it.
//
// The server owns the conversation. This sends one turn at a time with the open
// chat's id; the route loads the history, saves both turns, titles new chats and
// streams NDJSON frames back (lib/ai/protocol.ts).
// ─────────────────────────────────────────────────────────────────────────────

/** Within this many px of the bottom, new tokens keep the view pinned there. */
const STICK_PX = 120;
/** Files over this are refused before upload; /api/ai/upload-doc refuses them too. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const tmpId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * A human-readable label for the page the user is on, so the assistant is page-aware
 * without anyone tagging anything. Pointer, not payload: only the route and title.
 */
function buildPageContext(pathname: string): { route: string; title: string } {
	let title = "";
	if (typeof document !== "undefined" && document.title) {
		title = document.title.replace(/\s*[|\-]\s*ShipItHQ.*$/i, "").trim();
	}
	if (!title) {
		const readable = pathname
			.split("/")
			.filter(Boolean)
			// Drop id-like segments (cuid, uuid, numeric) for a cleaner label.
			.filter((s) => !/^[0-9]+$/.test(s) && !/^(c[a-z0-9]{20,}|[0-9a-f-]{16,})$/i.test(s));
		title = readable
			.map((s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
			.join(" › ") || "Home";
	}
	return { route: pathname || "/", title };
}

export function AIPanel() {
	const {
		close, isMaximized, toggleMaximized,
		sessions, sessionsLoaded, activeSessionId, messages, loadingConversation, isStreaming,
		setSessions, upsertSession, removeSession, startNewChat, selectChat, setMessages,
		setLoadingConversation, setActiveSessionId,
		addUserMessage, addAssistantPlaceholder, appendToLastAssistant, replaceLastAssistant,
		addActionToLastAssistant, updateStepOnLastAssistant, markLastAssistantPartial, commitIds,
		setFeedback, setStreaming,
	} = useAIPanelStore();

	const pathname = usePathname();
	const page = useMemo(() => buildPageContext(pathname), [pathname]);
	const tagState = useContextTags();
	const activeTags = useMemo(() => activeContextTags(tagState), [tagState]);

	const [input, setInput] = useState("");
	const [historyOpen, setHistoryOpen] = useState(false);
	const [pendingDocs, setPendingDocs] = useState<AIChatAttachment[]>([]);
	// A COUNT, not a boolean: a multi-file drop uploads several at once.
	const [uploading, setUploading] = useState(0);
	const [dragging, setDragging] = useState(false);
	const dragDepth = useRef(0);
	const [isMobile, setIsMobile] = useState(false);

	const titleRef = useRef<HTMLButtonElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const composerRef = useRef<ChatComposerHandle>(null);
	const abortRef = useRef<AbortController | null>(null);
	const stickRef = useRef(true);

	const wide = isMaximized && !isMobile;
	const activeSummary = sessions.find((s) => s.id === activeSessionId) ?? null;
	const title = activeSummary?.title ?? (messages.length ? "New conversation" : "ShipItHQ AI");

	useEffect(() => {
		const mq = window.matchMedia("(max-width: 1023px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	// The shell mounts this only while the panel is open, so mounting IS opening.
	useEffect(() => {
		const t = setTimeout(() => composerRef.current?.focus(), 250);
		return () => clearTimeout(t);
	}, []);

	// A closed panel must not keep writing into a conversation nobody is looking at.
	useEffect(() => () => abortRef.current?.abort(), []);

	// ── Loading chats ───────────────────────────────────────────────────────────
	const refreshList = useCallback(async () => {
		const r = await listAssistantChats();
		if (r.success) setSessions(r.sessions);
		else if (!useAIPanelStore.getState().sessionsLoaded) setSessions([]);
	}, [setSessions]);

	useEffect(() => { if (!sessionsLoaded) void refreshList(); }, [sessionsLoaded, refreshList]);
	// Opening the list refreshes it quietly: a chat made in another tab should appear.
	useEffect(() => { if (historyOpen) void refreshList(); }, [historyOpen, refreshList]);

	const loadChat = useCallback(async (id: string) => {
		abortRef.current?.abort();
		selectChat(id);
		setLoadingConversation(true);
		try {
			const r = await getAssistantChat(id);
			// The user may have moved on while this loaded.
			if (useAIPanelStore.getState().activeSessionId !== id) return;
			if (r.success) {
				stickRef.current = true;
				setMessages(r.messages);
			} else if (r.notFound) {
				// Deleted elsewhere: fall back to a fresh chat rather than an empty shell.
				removeSession(id);
				startNewChat();
			} else {
				toast.error(r.error);
			}
		} finally {
			if (useAIPanelStore.getState().activeSessionId === id) setLoadingConversation(false);
		}
	}, [selectChat, setLoadingConversation, setMessages, removeSession, startNewChat]);

	// Reopen the chat that was open before a reload. Its messages live on the server.
	const hydrated = useRef(false);
	useEffect(() => {
		if (hydrated.current) return;
		hydrated.current = true;
		const { activeSessionId: id, messages: current, isStreaming: streaming } = useAIPanelStore.getState();
		if (id && current.length === 0 && !streaming) void loadChat(id);
	}, [loadChat]);

	const newChat = useCallback(() => {
		abortRef.current?.abort();
		startNewChat();
		setHistoryOpen(false);
		composerRef.current?.focus();
	}, [startNewChat]);

	const pickChat = useCallback((id: string) => {
		setHistoryOpen(false);
		if (id !== useAIPanelStore.getState().activeSessionId) void loadChat(id);
	}, [loadChat]);

	const deleteChat = useCallback(async (id: string) => {
		removeSession(id);
		const r = await deleteAssistantChat(id);
		if (!r.success && r.error !== "That chat no longer exists.") {
			toast.error(r.error ?? "Could not delete that chat.");
			void refreshList();
		}
	}, [removeSession, refreshList]);

	const rate = useCallback(async (messageId: string, value: AssistantFeedback | null) => {
		const previous = useAIPanelStore.getState().messages.find((m) => m.id === messageId)?.feedback ?? null;
		setFeedback(messageId, value);
		const r = await setAssistantMessageFeedback(messageId, value);
		if (!r.success) {
			setFeedback(messageId, previous);
			toast.error(r.error ?? "Could not save your feedback.");
		}
	}, [setFeedback]);

	// ── Scrolling ───────────────────────────────────────────────────────────────
	// Follow new tokens only while the reader is at the bottom. Scrolling up to read
	// an earlier answer must not be yanked back down by the one streaming in.
	const viewport = () => scrollRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]") ?? null;
	useEffect(() => {
		const el = viewport();
		if (!el) return;
		const onScroll = () => {
			stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
		};
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [messages.length === 0, loadingConversation]);
	useEffect(() => {
		const el = viewport();
		if (el && stickRef.current) el.scrollTop = el.scrollHeight;
	}, [messages]);

	// ── Attachments ─────────────────────────────────────────────────────────────
	/** Extraction happens on the server and nothing is stored there; the text that
	 *  comes back travels with the next message and is saved with it. */
	const attachFile = useCallback(async (file: File) => {
		if (file.size > MAX_FILE_BYTES) {
			toast.error(`${file.name} is over 10MB.`);
			return;
		}
		setUploading((n) => n + 1);
		try {
			const form = new FormData();
			form.append("file", file);
			const res = await fetch("/api/ai/upload-doc", { method: "POST", body: form });
			const data = (await res.json()) as AIChatAttachment | { error: string };
			if (!res.ok || "error" in data) {
				toast.error("error" in data ? data.error : "Could not read that file.");
				return;
			}
			setPendingDocs((docs) => [...docs, data]);
			if (data.truncated) toast.success(`Attached ${data.name} (long - read the first part).`);
		} catch {
			toast.error("Could not read that file.");
		} finally {
			setUploading((n) => Math.max(0, n - 1));
		}
	}, []);
	const attachFiles = useCallback((files: File[]) => { for (const f of files) void attachFile(f); }, [attachFile]);

	// ── Send ────────────────────────────────────────────────────────────────────
	const send = useCallback(async (text: string) => {
		const content = text.trim();
		// An attachment alone is a valid turn - "here, read this".
		if ((!content && pendingDocs.length === 0) || useAIPanelStore.getState().isStreaming || uploading > 0) return;

		const docs = pendingDocs;
		setInput("");
		setPendingDocs([]);
		setHistoryOpen(false);
		const userTmp = tmpId();
		const replyTmp = tmpId();
		addUserMessage(userTmp, content, docs.length ? docs : undefined);
		addAssistantPlaceholder(replyTmp);
		setStreaming(true);
		stickRef.current = true;

		const controller = new AbortController();
		abortRef.current = controller;
		let chatId = useAIPanelStore.getState().activeSessionId;

		try {
			const res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: chatId,
					content,
					attachments: docs,
					page,
					// What the user pinned, plus whatever page they are on.
					tags: activeTags,
				}),
				signal: controller.signal,
			});

			if (!res.ok || !res.body) {
				const detail = (await res.json().catch(() => null)) as { error?: string } | null;
				if (res.status === 404 && chatId) {
					// The chat was deleted in another tab. Say so, and let the next
					// message start a new one.
					removeSession(chatId);
					setActiveSessionId(null);
					replaceLastAssistant("This conversation was deleted elsewhere. Send your message again to start a new one.");
				} else {
					replaceLastAssistant(detail?.error ?? "Something went wrong. Please try again.");
				}
				return;
			}

			// NDJSON frames. The parser is incremental because a chunk boundary lands
			// anywhere, including the middle of a frame.
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			const parse = createFrameParser();
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				for (const frame of parse(decoder.decode(value, { stream: true }))) {
					switch (frame.t) {
						case "session":
							chatId = frame.id;
							if (useAIPanelStore.getState().activeSessionId !== frame.id) setActiveSessionId(frame.id);
							upsertSession({ id: frame.id });
							break;
						case "text":
							appendToLastAssistant(frame.v);
							break;
						case "tool":
							updateStepOnLastAssistant({
								id: frame.id,
								name: frame.name,
								status: frame.phase === "call" ? "running" : frame.phase === "error" ? "error" : "done",
								...(frame.summary ? { summary: frame.summary } : {}),
							});
							break;
						case "action":
							// The href was written by a tool, never the model - but this is the
							// code that navigates, so it checks anyway. Internal paths only.
							if (frame.href.startsWith("/") && !frame.href.startsWith("//")) {
								addActionToLastAssistant({ label: frame.label, href: frame.href, ...(frame.kind ? { kind: frame.kind } : {}) });
							}
							break;
						case "title":
							if (chatId) upsertSession({ id: chatId, title: frame.v });
							break;
						case "error":
							appendToLastAssistant(`\n\n_${frame.message}_`);
							markLastAssistantPartial();
							break;
						case "done": {
							const ids: Record<string, string> = {};
							if (frame.userMessageId) ids[userTmp] = frame.userMessageId;
							if (frame.messageId) ids[replyTmp] = frame.messageId;
							commitIds(ids);
							break;
						}
						// Unknown frames are ignored: a newer server can stream to an older tab.
					}
				}
			}
		} catch (error: unknown) {
			if (error instanceof DOMException && error.name === "AbortError") {
				// A stop is not an error. The server keeps what streamed; so does the panel.
				markLastAssistantPartial();
			} else {
				replaceLastAssistant("The assistant couldn't be reached. Please try again.");
			}
		} finally {
			if (abortRef.current === controller) abortRef.current = null;
			setStreaming(false);
		}
	}, [
		pendingDocs, uploading, page, activeTags, addUserMessage, addAssistantPlaceholder, setStreaming,
		removeSession, setActiveSessionId, replaceLastAssistant, upsertSession, appendToLastAssistant,
		updateStepOnLastAssistant, addActionToLastAssistant, markLastAssistantPartial, commitIds,
	]);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	// ── Drag and drop, anywhere on the panel ────────────────────────────────────
	// A depth counter, because dragenter/dragleave fire for every child crossed.
	const dropHandlers = {
		onDragEnter: (e: React.DragEvent) => {
			if (!e.dataTransfer.types.includes("Files")) return;
			e.preventDefault();
			dragDepth.current += 1;
			setDragging(true);
		},
		onDragOver: (e: React.DragEvent) => {
			if (e.dataTransfer.types.includes("Files")) e.preventDefault();
		},
		onDragLeave: () => {
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) setDragging(false);
		},
		onDrop: (e: React.DragEvent) => {
			e.preventDefault();
			dragDepth.current = 0;
			setDragging(false);
			if (!isStreaming) attachFiles(Array.from(e.dataTransfer.files));
		},
	};

	const lastIndex = messages.length - 1;

	return (
		<div className="relative flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-950" {...dropHandlers}>
			{dragging && (
				<div className="pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-400 bg-neutral-50/95 backdrop-blur-sm dark:border-neutral-500 dark:bg-neutral-900/95">
					<Upload className="h-7 w-7 text-neutral-700 dark:text-neutral-300" aria-hidden />
					<p className="text-sm font-semibold text-neutral-900 dark:text-white">Drop to attach</p>
					<p className="text-xs text-neutral-600 dark:text-neutral-400">PDF, Word, text or CSV, up to 10MB</p>
				</div>
			)}

			{/* Header: what you are looking at (opens history), then actions. */}
			<header className="relative flex shrink-0 items-center gap-1 border-b border-neutral-200 p-2 dark:border-neutral-800">
				<button
					ref={titleRef}
					type="button"
					onClick={() => setHistoryOpen((v) => !v)}
					aria-expanded={historyOpen}
					aria-haspopup="dialog"
					title="Your conversations"
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
				>
					<AIGlyph size={20} className="text-neutral-900 dark:text-white" />
					<span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{title}</span>
					<ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform dark:text-neutral-400", historyOpen && "rotate-180")} aria-hidden />
				</button>
				<div className="ml-auto flex shrink-0 items-center gap-0.5">
					<HeaderAction label="New chat" onClick={newChat}>
						<SquarePen className="h-3.5 w-3.5" />
					</HeaderAction>
					{!isMobile && (
						<HeaderAction label={isMaximized ? "Restore panel" : "Maximize panel"} onClick={toggleMaximized}>
							{isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
						</HeaderAction>
					)}
					<HeaderAction label="Close" onClick={close}>
						<X className="h-4 w-4" />
					</HeaderAction>
				</div>
				<HistoryDropdown
					open={historyOpen}
					onClose={() => setHistoryOpen(false)}
					anchorRef={titleRef}
					sessions={sessions}
					loaded={sessionsLoaded}
					activeId={activeSessionId}
					onSelect={pickChat}
					onDelete={(id) => void deleteChat(id)}
				/>
			</header>

			{/* Conversation. `reflow` pins it to vertical-only: a wide descendant scrolls
				inside its own box (see chat-markdown.tsx) instead of widening the rail. */}
			<ScrollArea
				ref={scrollRef}
				reflow
				className={cn(
					"min-h-0 min-w-0 flex-1",
					// Radix's content wrapper is a shrink-to-fit table with no usable
					// height; a full-height flex column lets the empty state sit centred
					// and still scroll when it is taller than the panel.
					messages.length === 0 && "[&_[data-radix-scroll-area-viewport]>div]:!flex [&_[data-radix-scroll-area-viewport]>div]:!min-h-full [&_[data-radix-scroll-area-viewport]>div]:!flex-col",
				)}
			>
				{loadingConversation && messages.length === 0 ? (
					<ConversationSkeleton />
				) : messages.length === 0 ? (
					<ChatEmptyState onSelect={(p) => void send(p)} pageTitle={page.title} wide={wide} disabled={isStreaming} />
				) : (
					<div className={cn("space-y-1 py-4", wide && "mx-auto w-full max-w-3xl")}>
						{messages.map((m, i) => (
							<ChatMessage
								key={m.id}
								message={m}
								isStreaming={isStreaming && i === lastIndex && m.role === "assistant"}
								onFeedback={(id, value) => void rate(id, value)}
							/>
						))}
					</div>
				)}
			</ScrollArea>

			<ChatComposer
				ref={composerRef}
				value={input}
				onChange={setInput}
				onSubmit={() => void send(input)}
				onStop={stop}
				isStreaming={isStreaming}
				docs={pendingDocs}
				uploading={uploading}
				onRemoveDoc={(id) => setPendingDocs((d) => d.filter((x) => x.id !== id))}
				onPickFiles={attachFiles}
				tags={activeTags}
				autoTag={tagState.auto}
				onRemoveTag={removePinnedTag}
				wide={wide}
			/>
		</div>
	);
}

function HeaderAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
		>
			{children}
		</button>
	);
}

/** The shape of a conversation while one loads: a user bubble, a reply, another pair. */
function ConversationSkeleton() {
	return (
		<div className="space-y-5 px-4 py-5" aria-label="Loading conversation">
			{[0, 1].map((i) => (
				<div key={i} className="space-y-5">
					<div className="flex justify-end">
						<div className="h-10 w-3/5 animate-pulse rounded-2xl rounded-tr-none bg-neutral-200 dark:bg-neutral-800" />
					</div>
					<div className="flex gap-2">
						<div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
						<div className="h-24 flex-1 animate-pulse rounded-2xl rounded-tl-none bg-neutral-100 dark:bg-neutral-800/70" />
					</div>
				</div>
			))}
		</div>
	);
}

export default AIPanel;
