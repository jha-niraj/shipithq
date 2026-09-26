// Shapes the AI panel works with (plan/ai-chat). They live with the shared panel in
// @repo/ui (plan/hiring-app HA-11); re-exported here for this app's server actions.

export type { AIChatAction, AIChatAttachment, AIChatStep, AIChatMessage, AIChatSummary } from "@repo/ui/components/ai-chat/types"
export { isTempId } from "@repo/ui/components/ai-chat/types"
