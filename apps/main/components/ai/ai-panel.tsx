"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@repo/auth/client";
import { AIChatPanel, type AIChatSessionApi } from "@repo/ui/components/ai-chat/ai-chat-panel";
import { useAIPanelStore } from "@/app/store/aiPanelStore";
import { useDictation } from "@/hooks/useDictation";
import {
	deleteAssistantChat, getAssistantChat, listAssistantChats, setAssistantMessageFeedback,
} from "@/actions/(main)/ai/assistant-chat.action";
import { useContextTags, activeContextTags, removePinnedTag } from "@/components/ai/context-tags";
import { EMPTY_STATE } from "@/components/ai/empty-state-content";

// ─────────────────────────────────────────────────────────────────────────────
// The ShipItHQ AI panel (plan/ai-chat): the shared `AIChatPanel` (@repo/ui,
// plan/hiring-app HA-11) with this app's store, route, conversations, the page
// the student is on, their pinned context tags, Sarvam dictation and the
// launcher's suggestions. Placement is the shell's job (ai-rail.tsx).
// ─────────────────────────────────────────────────────────────────────────────

const SESSIONS: AIChatSessionApi = {
	list: listAssistantChats,
	get: getAssistantChat,
	remove: deleteAssistantChat,
	feedback: setAssistantMessageFeedback,
};

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
	const pathname = usePathname();
	const page = useMemo(() => buildPageContext(pathname), [pathname]);
	const tagState = useContextTags();
	const activeTags = useMemo(() => activeContextTags(tagState), [tagState]);
	const extraBody = useMemo(() => ({ page, tags: activeTags }), [page, activeTags]);
	const { data: session } = useSession();
	const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "";

	return (
		<AIChatPanel
			useStore={useAIPanelStore}
			endpoint="/api/ai/chat"
			sessions={SESSIONS}
			uploadEndpoint="/api/ai/upload-doc"
			extraBody={extraBody}
			pageTitle={page.title}
			tags={activeTags}
			autoTag={tagState.auto}
			onRemoveTag={removePinnedTag}
			useDictation={useDictation}
			title="ShipItHQ AI"
			emptyState={EMPTY_STATE}
			firstName={firstName}
		/>
	);
}

export default AIPanel;
