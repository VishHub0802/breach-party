import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  state: text("state").notNull(),
  version: integer("version").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("idx_rooms_expires_at").on(table.expiresAt)]);
