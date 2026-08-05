CREATE TYPE "public"."artwork_status" AS ENUM('in_progress', 'finished', 'exhibited', 'sold');--> statement-breakpoint
CREATE TYPE "public"."commission_stage" AS ENUM('inquiry', 'deposit_paid', 'painting', 'finished', 'delivered');--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"medium" text,
	"dimensions" text,
	"price" numeric,
	"status" "artwork_status" DEFAULT 'in_progress' NOT NULL,
	"image_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"artwork_id" uuid,
	"stage" "commission_stage" DEFAULT 'inquiry' NOT NULL,
	"deadline" date,
	"progress_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_artwork_id_unique" UNIQUE("artwork_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "exhibition_artworks" (
	"exhibition_id" uuid NOT NULL,
	"artwork_id" uuid NOT NULL,
	CONSTRAINT "exhibition_artworks_exhibition_id_artwork_id_pk" PRIMARY KEY("exhibition_id","artwork_id")
);
--> statement-breakpoint
CREATE TABLE "exhibitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gallery_name" text NOT NULL,
	"submission_deadline" date,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artwork_id" uuid NOT NULL,
	"description" text,
	"edition_size" integer NOT NULL,
	"price" numeric,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "exhibition_artworks_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "exhibition_artworks_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_editions" ADD CONSTRAINT "print_editions_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE no action ON UPDATE no action;