import {
  pgTable, pgEnum, uuid, text, numeric, integer,
  timestamp, date, primaryKey, unique,
} from "drizzle-orm/pg-core";

export const artworkStatus = pgEnum("artwork_status", [
  "in_progress", "finished", "exhibited", "sold",
]);
export const commissionStage = pgEnum("commission_stage", [
  "inquiry", "deposit_paid", "painting", "finished", "delivered",
]);

export type ArtworkStatus = (typeof artworkStatus.enumValues)[number];
export type CommissionStage = (typeof commissionStage.enumValues)[number];

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  medium: text("medium"),
  dimensions: text("dimensions"),
  price: numeric("price"),
  status: artworkStatus("status").notNull().default("in_progress"),
  imagePath: text("image_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
});

export const commissions = pgTable("commissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  artworkId: uuid("artwork_id").references(() => artworks.id),
  stage: commissionStage("stage").notNull().default("inquiry"),
  deadline: date("deadline"),
  progressNotes: text("progress_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  unique().on(table.artworkId),
]));

export const exhibitions = pgTable("exhibitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  galleryName: text("gallery_name").notNull(),
  submissionDeadline: date("submission_deadline"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const exhibitionArtworks = pgTable("exhibition_artworks", {
  exhibitionId: uuid("exhibition_id").notNull().references(() => exhibitions.id),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
}, (table) => ([
  primaryKey({ columns: [table.exhibitionId, table.artworkId] }),
]));

export const printEditions = pgTable("print_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
  description: text("description"),
  editionSize: integer("edition_size").notNull(),
  price: numeric("price"),
  soldCount: integer("sold_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
