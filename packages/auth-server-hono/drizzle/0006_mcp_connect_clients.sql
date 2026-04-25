ALTER TABLE "oauth_clients"
ADD COLUMN "registration_source" text DEFAULT 'seeded' NOT NULL;
--> statement-breakpoint
ALTER TABLE "oauth_clients"
ADD COLUMN "software_id" text;
--> statement-breakpoint
ALTER TABLE "oauth_clients"
ADD COLUMN "software_version" text;
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens"
ADD COLUMN "last_used_at" timestamp with time zone;
