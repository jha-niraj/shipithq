"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Maximize2, Minimize2, SquarePen, Upload, X } from "lucide-react";
import type { AssistantFeedback } from "@repo/db/assistant";
import { AIGlyph } from "../ui/ai-mark";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import toast from "../ui/sonner";
import { isTempId, type AIChatAttachment, type AIChatMessage, type AIChatProposal, type AIChatSummary } from "./types";
import type { AIPanelStore } from "./store";
import { createFrameParser } from "./protocol";
import { ChatMessage } from "./chat-message";
import { ChatEmptyState, type EmptyStateContent } from "./chat-empty-state";
import { ChatComposer, type ChatComposerHandle, type ComposerTag, type UseDictation } from "./chat-composer";
import { HistoryDropdown } from "./history-dropdown";
import { Shimmer, ShimmerStyles } from "../skeleton-kit";

// ─────────────────────────────────────────────────────────────────────────────
// The AI chat panel (plan/ai-chat), shared by the student app and the hiring app
// (plan/hiring-app HA-11). Header, conversation, composer - and nothing about
// WHERE it sits: it fills whatever box it is given. Placement is the app shell's
// job: a docked column on lg+, a Sheet below it.
//
// The server owns the conversation. This sends one turn at a time with the open
// chat's id to `endpoint`; the route loads the history, saves both turns, titles
// new chats and streams NDJSON frames back (./protocol). Each app passes its own
// store, endpoint and session actions.
// ─────────────────────────────────────────────────────────────────────────────

/** An app's saved-conversation actions (server actions, scoped to the signed-in person). */
export interface AIChatSessionApi {
	list: () => Promise<{ success: true; sessions: AIChatSummary[] } | { success: false; error: string }>;
	get: (id: string) => Promise<{ success: true; session: AIChatSummary; messages: AIChatMessage[] } | { success: false; notFound?: boolean; error: string }>;
	remove: (id: string) => Promise<{ success: boolean; error?: string }>;
	feedback: (messageId: string, value: AssistantFeedback | null) => Promise<{ success: boolean; error?: string }>;
}

export interface AIChatPanelProps {
	/** This app's panel store (`createAIPanelStore`). */
	useStore: AIPanelStore;
	/** The chat route: POST one turn, NDJSON frames back. */
	endpoint: string;
	sessions: AIChatSessionApi;
	/** Where documents are read (POST form "file"); null hides attaching. */
	uploadEndpoint?: string | null;
	/** Merged into every request body (the student app sends the page and its tags). */
	extraBody?: Record<string, unknown>;
	/** The page the assistant can see, named on a new chat; null names none. */
	pageTitle?: string | null;
	/** Context chips above the composer (the student app's tags). */
	tags?: ComposerTag[];
	autoTag?: ComposerTag | null;
	onRemoveTag?: (id: string) => void;
	/** Dictation for the composer's microphone; omitted, no microphone. */
	useDictation?: UseDictation;
	/** The header's name when there's no conversation yet. */
	title?: string;
	emptyState: EmptyStateContent;
	/** The reader's first name, for the greeting. */
	firstName?: string;
	placeholder?: string;
	composerLabel?: string;
	/** A monthly allowance, shown under the composer; at 0 the composer is closed with `capReachedText`. */
	usage?: { left: number; cap: number } | null;
	capReachedText?: string;
	/** Called after each turn ends (e.g. to refresh `usage`). */
	onTurnEnd?: () => void;
	/**
	 * Draws a proposal's confirm card under its message (HA-12). `saved` is false
	 * until the turn has its server id; `update` swaps in the proposal the server
	 * returned after confirm or cancel.
	 */
	renderProposal?: (args: { messageId: string; proposal: AIChatProposal; saved: boolean; update: (p: AIChatProposal) => void }) => ReactNode;
}

/** Within this many px of the bottom, new tokens keep the view pinned there. */
const STICK_PX = 120;
/** Files over this are refused before upload; the upload route refuses them too. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const tmpId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function AIChatPanel({
	useStore, endpoint, sessions: api, uploadEndpoint = null, extraBody, pageTitle = null,
	tags, autoTag = null, onRemoveTag, useDictation, title: emptyTitle = "ShipItHQ AI", emptyState, firstName,
	placeholder, composerLabel, usage = null, capReachedText = "This month's allowance is used. It resets on the 1st.", onTurnEnd, renderProposal,
}: AIChatPanelProps) {
	const {
		close, isMaximized, toggleMaximized,
		sessions, sessionsLoaded, activeSessionId, messages, loadingConversation, isStreaming,
		setSessions, upsertSession, removeSession, startNewChat, selectChat, setMessages,
		setLoadingConversation, setActiveSessionId,
		addUserMessage, addAssistantPlaceholder, appendToLastAssistant, replaceLastAssistant,
		addActionToLastAssistant, updateStepOnLastAssistant, markLastAssistantPartial, commitIds,
		setFeedback, setStreaming, setProposalOnLastAssistant, setProposal,
	} = useStore();

	const capReached = usage !== null && usage.left <= 0;

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
	const title = activeSummary?.title ?? (messages.length ? "New conversation" : emptyTitle);

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
		const r = await api.list();
		if (r.success) setSessions(r.sessions);
		else if (!useStore.getState().sessionsLoaded) setSessions([]);
	}, [setSessions, api, useStore]);

	useEffect(() => { if (!sessionsLoaded) void refreshList(); }, [sessionsLoaded, refreshList]);
	// Opening the list refreshes it quietly: a chat made in another tab should appear.
	useEffect(() => { if (historyOpen) void refreshList(); }, [historyOpen, refreshList]);

	const loadChat = useCallback(async (id: string) => {
		abortRef.current?.abort();
		selectChat(id);
		setLoadingConversation(true);
		try {
			const r = await api.get(id);
			// The user may have moved on while this loaded.
			if (useStore.getState().activeSessionId !== id) return;
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
			if (useStore.getState().activeSessionId === id) setLoadingConversation(false);
		}
	}, [selectChat, setLoadingConversation, setMessages, removeSession, startNewChat, api, useStore]);

	// Reopen the chat that was open before a reload. Its messages live on the server.
	const hydrated = useRef(false);
	useEffect(() => {
		if (hydrated.current) return;
		hydrated.current = true;
		const { activeSessionId: id, messages: current, isStreaming: streaming } = useStore.getState();
		if (id && current.length === 0 && !streaming) void loadChat(id);
	}, [loadChat, useStore]);

	const newChat = useCallback(() => {
		abortRef.current?.abort();
		startNewChat();
		setHistoryOpen(false);
		composerRef.current?.focus();
	}, [startNewChat]);

	const pickChat = useCallback((id: string) => {
		setHistoryOpen(false);
		if (id !== useStore.getState().activeSessionId) void loadChat(id);
	}, [loadChat, useStore]);

	const deleteChat = useCallback(async (id: string) => {
		removeSession(id);
		const r = await api.remove(id);
		if (!r.success && r.error !== "That chat no longer exists.") {
			toast.error(r.error ?? "Could not delete that chat.");
			void refreshList();
		}
	}, [removeSession, refreshList, api]);

	const rate = useCallback(async (messageId: string, value: AssistantFeedback | null) => {
		const previous = useStore.getState().messages.find((m) => m.id === messageId)?.feedback ?? null;
		setFeedback(messageId, value);
		const r = await api.feedback(messageId, value);
		if (!r.success) {
			setFeedback(messageId, previous);
			toast.error(r.error ?? "Could not save your feedback.");
		}
	}, [setFeedback, api, useStore]);

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
		if (!uploadEndpoint) return;
		if (file.size > MAX_FILE_BYTES) {
			toast.error(`${file.name} is over 10MB.`);
			return;
		}
		setUploading((n) => n + 1);
		try {
			const form = new FormData();
			form.append("file", file);
			const res = await fetch(uploadEndpoint, { method: "POST", body: form });
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
	}, [uploadEndpoint]);
	const attachFiles = useCallback((files: File[]) => { for (const f of files) void attachFile(f); }, [attachFile]);

	// ── Send ────────────────────────────────────────────────────────────────────
	const send = useCallback(async (text: string) => {
		const content = text.trim();
		// An attachment alone is a valid turn - "here, read this".
		if ((!content && pendingDocs.length === 0) || useStore.getState().isStreaming || uploading > 0 || capReached) return;

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
		let chatId = useStore.getState().activeSessionId;

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...extraBody,
					sessionId: chatId,
					content,
					...(docs.length ? { attachments: docs } : {}),
				}),
				signal: controller.signal,
			});

			if (!res.ok || !res.body) {
				const detail = (await res.json().catch(() => null)) as { error?: string } | null;
				if (res.status === 403 || res.status === 429) {
					// Refused before any work (a limit, a permission, a live round): the
					// turn never happened, so take it back and put the text back to resend.
					useStore.getState().setMessages(useStore.getState().messages.filter((m) => m.id !== userTmp && m.id !== replyTmp));
					setInput(content);
					setPendingDocs(docs);
					toast.error(detail?.error ?? "That can't be sent right now.");
				} else if (res.status === 404 && chatId) {
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
							if (useStore.getState().activeSessionId !== frame.id) setActiveSessionId(frame.id);
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
						case "proposal":
							setProposalOnLastAssistant(frame.proposal);
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
			onTurnEnd?.();
		}
	}, [
		pendingDocs, uploading, capReached, endpoint, extraBody, onTurnEnd, useStore, addUserMessage, addAssistantPlaceholder, setStreaming,
		removeSession, setActiveSessionId, replaceLastAssistant, upsertSession, appendToLastAssistant,
		updateStepOnLastAssistant, addActionToLastAssistant, markLastAssistantPartial, commitIds,
	]);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	// ── Drag and drop, anywhere on the panel ────────────────────────────────────
	// A depth counter, because dragenter/dragleave fire for every child crossed.
	const dropHandlers = {
		onDragEnter: (e: React.DragEvent) => {
			if (!uploadEndpoint || !e.dataTransfer.types.includes("Files")) return;
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
			if (!isStreaming && uploadEndpoint) attachFiles(Array.from(e.dataTransfer.files));
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
					<ChatEmptyState onSelect={(p) => void send(p)} pageTitle={pageTitle} wide={wide} disabled={isStreaming || capReached} content={emptyState} firstName={firstName} />
				) : (
					<div className={cn("space-y-1 py-4", wide && "mx-auto w-full max-w-3xl")}>
						{messages.map((m, i) => (
							<Fragment key={m.id}>
								<ChatMessage
									message={m}
									isStreaming={isStreaming && i === lastIndex && m.role === "assistant"}
									onFeedback={(id, value) => void rate(id, value)}
								/>
								{m.proposal && renderProposal?.({ messageId: m.id, proposal: m.proposal, saved: !isTempId(m.id), update: (p) => setProposal(m.id, p) })}
							</Fragment>
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
				onPickFiles={uploadEndpoint ? attachFiles : undefined}
				tags={tags}
				autoTag={autoTag}
				onRemoveTag={onRemoveTag}
				wide={wide}
				useDictation={useDictation}
				placeholder={placeholder}
				label={composerLabel}
				disabledReason={capReached ? capReachedText : null}
				footnote={usage ? `${usage.left} of ${usage.cap} left this month` : null}
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
			<ShimmerStyles />
			{[0, 1].map((i) => (
				<div key={i} className="space-y-5">
					<div className="flex justify-end">
						<Shimmer className="h-10 w-3/5 rounded-2xl rounded-tr-none" delay={i * 0.08} />
					</div>
					<div className="flex gap-2">
						<Shimmer className="h-6 w-6 shrink-0 rounded-full" delay={i * 0.08 + 0.04} />
						<Shimmer className="h-24 flex-1 rounded-2xl rounded-tl-none" delay={i * 0.08 + 0.04} />
					</div>
				</div>
			))}
		</div>
	);
}

export default AIChatPanel;
