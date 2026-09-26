import { pgTable, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"

/*
 * A company's document library for its AI (plan/hiring-app HA-13): a JD, a
 * hiring policy. The file sits privately in R2 under `company-docs/<company>/`
 * and is only ever served through a short signed URL; its text is read once on
 * upload and kept here for the AI. Never shown to students.
 */

export const companyDocFolders = pgTable(
    "company_doc_folder",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_company_doc_folder_company").on(t.companyId)],
)

export const companyDocuments = pgTable(
    "company_document",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        /** Null: in the library's root. Deleting a folder keeps its files. */
        folderId: text("folder_id").references(() => companyDocFolders.id, { onDelete: "set null" }),
        name: text("name").notNull(),
        r2Key: text("r2_key").notNull(),
        mimeType: text("mime_type"),
        sizeBytes: integer("size_bytes"),
        /** The extracted text the AI reads, capped. */
        text: text("text").notNull(),
        chars: integer("chars").notNull().default(0),
        truncated: boolean("truncated").notNull().default(false),
        uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_company_document_company").on(t.companyId, t.createdAt)],
)

export const companyDocumentsRelations = relations(companyDocuments, ({ one }) => ({
    folder: one(companyDocFolders, { fields: [companyDocuments.folderId], references: [companyDocFolders.id] }),
    company: one(companies, { fields: [companyDocuments.companyId], references: [companies.id] }),
}))
