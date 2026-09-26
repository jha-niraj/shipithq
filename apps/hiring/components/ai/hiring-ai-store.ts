"use client"

import { createAIPanelStore } from "@repo/ui/components/ai-chat/store"

/** The company AI panel's store (plan/hiring-app HA-11): the shared factory, under its own key. */
export const useHiringAIStore = createAIPanelStore("shipithq.hiring.ai-panel")
