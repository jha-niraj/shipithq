import { pgTable, text, varchar, jsonb, smallint, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import type { AssistantChatMessageMeta } from "../assistant-types"

// ShipItHQ AI conversations (plan/ai-chat, AC-2). The server owns the history:
// the chat route loads it from here and saves every turn, so a chat follows the
// user across devices. Deleting a user deletes their chats; deleting a chat
// deletes its messages.

export const assistantChatSession = pgTable(
    "assistant_chat_session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        // Null until the first exchange has been titled.
        title: varchar("title", { length: 120 }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [index("idx_assistant_chat_session_user_updated").on(t.userId, t.updatedAt)],
)

export const assistantChatMessage = pgTable(
    "assistant_chat_message",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        sessionId: text("session_id").notNull().references(() => assistantChatSession.id, { onDelete: "cascade" }),
        // 'user' | 'assistant'
        role: varchar("role", { length: 16 }).notNull(),
        content: text("content").notNull(),
        metadata: jsonb("metadata").$type<AssistantChatMessageMeta>(),
        // 1 helpful, -1 not helpful, null none. Only meaningful on assistant turns.
        feedback: smallint("feedback"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_assistant_chat_message_session_created").on(t.sessionId, t.createdAt)],
)

export const assistantChatSessionRelations = relations(assistantChatSession, ({ one, many }) => ({
    user: one(users, { fields: [assistantChatSession.userId], references: [users.id] }),
    messages: many(assistantChatMessage),
}))

export const assistantChatMessageRelations = relations(assistantChatMessage, ({ one }) => ({
    session: one(assistantChatSession, { fields: [assistantChatMessage.sessionId], references: [assistantChatSession.id] }),
}))
