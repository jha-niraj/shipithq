"use client";

import { createAIPanelStore } from "@repo/ui/components/ai-chat/store";

// The student app's AI panel store (plan/ai-chat): the shared factory in @repo/ui
// (plan/hiring-app HA-11) under this app's own storage key. The hiring app keeps
// its own store under another key.

export { AI_MIN_WIDTH, AI_MAX_WIDTH, AI_DEFAULT_WIDTH, clampPanelWidth } from "@repo/ui/components/ai-chat/store";
export type { AIChatAction, AIChatAttachment, AIChatMessage, AIChatStep, AIChatSummary } from "@repo/ui/components/ai-chat/types";

export const useAIPanelStore = createAIPanelStore("shipithq.ai-panel");
