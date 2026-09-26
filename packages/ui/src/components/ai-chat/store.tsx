"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AssistantFeedback } from "@repo/db/assistant";
import type { AIChatAction, AIChatAttachment, AIChatMessage, AIChatProposal, AIChatStep, AIChatSummary } from "./types";

// The AI panel's state (plan/ai-chat), shared by both apps' panels (plan/hiring-app
// HA-11). The message and session shapes live in ./types.

// ── Panel width ───────────────────────────────────────────────────────────────
// Bounds, not preferences: below MIN the composer and message bubbles stop being
// usable; above MAX the panel starts eating the page it is meant to assist with.
export const AI_MIN_WIDTH = 320;
export const AI_MAX_WIDTH = 900;
// 380, down from 460 (Niraj, 2026-09-22: "reduce the width default"). With the
// sidebar always expanded at 240px, 460 left a 1280px laptop a ~580px page.
export const AI_DEFAULT_WIDTH = 380;
/** The previous default. A width still at exactly this was never chosen by the user. */
const PREVIOUS_DEFAULT_WIDTH = 460;

export function clampPanelWidth(width: number): number {
	return Math.min(Math.max(width, AI_MIN_WIDTH), AI_MAX_WIDTH);
}

export interface AIPanelState {
	// Panel chrome
	isOpen: boolean;
	width: number;
	isMaximized: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
	setWidth: (width: number) => void;
	toggleMaximized: () => void;

	// ── Conversations (plan/ai-chat, AC-4) ──
	// The server owns them. `sessions` is the history list as last fetched; `messages`
	// belongs to `activeSessionId`. A null id is a new chat that has not been sent yet -
	// the route creates the row on its first turn and names it in a `session` frame.
	sessions: AIChatSummary[];
	sessionsLoaded: boolean;
	activeSessionId: string | null;
	messages: AIChatMessage[];
	loadingConversation: boolean;
	isStreaming: boolean;

	setSessions: (sessions: AIChatSummary[]) => void;
	upsertSession: (session: Partial<AIChatSummary> & { id: string }) => void;
	removeSession: (id: string) => void;
	startNewChat: () => void;
	/** Point the panel at a saved chat. Messages arrive via `setMessages`. */
	selectChat: (id: string) => void;
	setMessages: (messages: AIChatMessage[]) => void;
	setLoadingConversation: (loading: boolean) => void;
	setActiveSessionId: (id: string | null) => void;

	addUserMessage: (tempId: string, content: string, attachments?: AIChatAttachment[]) => void;
	addAssistantPlaceholder: (tempId: string) => void;
	appendToLastAssistant: (chunk: string) => void;
	replaceLastAssistant: (content: string) => void;
	addActionToLastAssistant: (action: AIChatAction) => void;
	/** Attach a proposal to the turn in flight (HA-12). */
	setProposalOnLastAssistant: (proposal: AIChatProposal) => void;
	/** A proposal changed after confirm or cancel. */
	setProposal: (messageId: string, proposal: AIChatProposal) => void;
	/** Open, close or fail a tool step on the assistant turn in flight, matched by id. */
	updateStepOnLastAssistant: (step: AIChatStep) => void;
	markLastAssistantPartial: () => void;
	/** Swap temporary ids for the ones the server saved the turns under. */
	commitIds: (map: Record<string, string>) => void;
	setFeedback: (messageId: string, value: AssistantFeedback | null) => void;
	setStreaming: (streaming: boolean) => void;
}

/** Apply `fn` to the last message when it is the assistant's turn in flight. */
function patchLastAssistant(
	messages: AIChatMessage[],
	fn: (m: AIChatMessage) => AIChatMessage,
): AIChatMessage[] {
	const last = messages[messages.length - 1];
	if (!last || last.role !== "assistant") return messages;
	return [...messages.slice(0, -1), fn(last)];
}

/**
 * One persisted panel store per app (plan/hiring-app HA-11): the student app and the
 * hiring app each keep their own width and open chat under their own `name`.
 */
export function createAIPanelStore(name: string) {
	return create<AIPanelState>()(
	persist(
		(set) => ({
			isOpen: false,
			width: AI_DEFAULT_WIDTH,
			isMaximized: false,

			open: () => set({ isOpen: true }),
			close: () => set({ isOpen: false, isMaximized: false }),
			toggle: () => set((s) => ({ isOpen: !s.isOpen, isMaximized: s.isOpen ? false : s.isMaximized })),
			setWidth: (width) => set({ width: clampPanelWidth(width) }),
			toggleMaximized: () => set((s) => ({ isMaximized: !s.isMaximized })),

			sessions: [],
			sessionsLoaded: false,
			activeSessionId: null,
			messages: [],
			loadingConversation: false,
			isStreaming: false,

			setSessions: (sessions) => set({ sessions, sessionsLoaded: true }),
			upsertSession: (session) =>
				set((s) => {
					const existing = s.sessions.find((x) => x.id === session.id);
					const now = Date.now();
					const merged: AIChatSummary = {
						title: null,
						createdAt: now,
						...existing,
						...session,
						updatedAt: session.updatedAt ?? now,
					};
					// Most recent first, like the server's order.
					return { sessions: [merged, ...s.sessions.filter((x) => x.id !== session.id)] };
				}),
			removeSession: (id) =>
				set((s) => ({
					sessions: s.sessions.filter((x) => x.id !== id),
					// Deleting the open chat leaves a fresh one, not a panel pointed at nothing.
					...(s.activeSessionId === id ? { activeSessionId: null, messages: [] } : {}),
				})),
			startNewChat: () => set({ activeSessionId: null, messages: [], loadingConversation: false }),
			selectChat: (id) => set({ activeSessionId: id, messages: [] }),
			setMessages: (messages) => set({ messages }),
			setLoadingConversation: (loadingConversation) => set({ loadingConversation }),
			setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

			addUserMessage: (tempId, content, attachments) =>
				set((s) => ({
					messages: [
						...s.messages,
						{
							id: tempId,
							role: "user" as const,
							content,
							createdAt: Date.now(),
							...(attachments?.length ? { attachments } : {}),
						},
					],
				})),

			addAssistantPlaceholder: (tempId) =>
				set((s) => ({
					messages: [...s.messages, { id: tempId, role: "assistant" as const, content: "", createdAt: Date.now() }],
				})),

			appendToLastAssistant: (chunk) =>
				set((s) => ({ messages: patchLastAssistant(s.messages, (m) => ({ ...m, content: m.content + chunk })) })),

			replaceLastAssistant: (content) =>
				set((s) => ({ messages: patchLastAssistant(s.messages, (m) => ({ ...m, content })) })),

			/**
			 * Attach a control to the assistant message in flight.
			 *
			 * Deduped by href: a tool round can re-run within one turn, and two identical
			 * "Open cover letter" buttons under one reply is a bug the user has to reason
			 * about ("did it make two?").
			 */
			addActionToLastAssistant: (action) =>
				set((s) => ({
					messages: patchLastAssistant(s.messages, (m) => {
						const existing = m.actions ?? [];
						if (existing.some((a) => a.href === action.href)) return m;
						return { ...m, actions: [...existing, action] };
					}),
				})),

			setProposalOnLastAssistant: (proposal) =>
				set((s) => ({ messages: patchLastAssistant(s.messages, (m) => ({ ...m, proposal })) })),

			setProposal: (messageId, proposal) =>
				set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, proposal } : m)) })),

			updateStepOnLastAssistant: (step) =>
				set((s) => ({
					messages: patchLastAssistant(s.messages, (m) => {
						const steps = m.steps ?? [];
						const i = steps.findIndex((x) => x.id === step.id);
						if (i === -1) return { ...m, steps: [...steps, step] };
						const prev = steps[i]!;
						const next = { ...prev, status: step.status, summary: step.summary ?? prev.summary };
						return { ...m, steps: [...steps.slice(0, i), next, ...steps.slice(i + 1)] };
					}),
				})),

			markLastAssistantPartial: () =>
				set((s) => ({
					messages: patchLastAssistant(s.messages, (m) => ({
						...m,
						partial: true,
						// A step still "running" when the turn stopped will never finish.
						steps: m.steps?.map((x) => (x.status === "running" ? { ...x, status: "error" as const } : x)),
					})),
				})),

			commitIds: (map) =>
				set((s) => ({ messages: s.messages.map((m) => (map[m.id] ? { ...m, id: map[m.id]! } : m)) })),

			setFeedback: (messageId, value) =>
				set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)) })),

			setStreaming: (isStreaming) => set({ isStreaming }),
		}),
		{
			name,
			storage: createJSONStorage(() => localStorage),
			// v1: the default width changed. A stored width equal to the old default
			// was the default, not a choice, so it moves to the new one; a width the
			// user dragged to is kept.
			// v2: conversations moved to the database (plan/ai-chat, AC-4). The old
			// local `sessions` array is dropped; the app is not in production, so
			// there is nothing to import.
			version: 2,
			migrate: (persisted, version) => {
				const state = (persisted ?? {}) as { width?: number; sessions?: unknown; activeSessionId?: unknown };
				if (version < 1 && (state.width === undefined || state.width === PREVIOUS_DEFAULT_WIDTH)) {
					state.width = AI_DEFAULT_WIDTH;
				}
				if (version < 2) {
					delete state.sessions;
					// A local id was never a server id.
					state.activeSessionId = null;
				}
				return state as never;
			},
			// `isOpen`/`isStreaming` are deliberately NOT persisted: reopening the app
			// into a panel you don't remember opening is disorienting, and a persisted
			// `isStreaming: true` would leave the composer permanently disabled after a
			// refresh mid-response.
			// The open chat's id is kept so a reload reopens it; its messages are
			// fetched from the server, never stored here.
			partialize: (s) => ({
				width: s.width,
				activeSessionId: s.activeSessionId,
			}),
		},
	),
);
}

/** The hook a panel store factory returns. */
export type AIPanelStore = ReturnType<typeof createAIPanelStore>
