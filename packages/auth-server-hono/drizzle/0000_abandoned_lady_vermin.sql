CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"name" text,
	"rooms" uuid[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"collection_key" text NOT NULL,
	"token_expiry" timestamp with time zone,
	"sync_url" text,
	"sync_base_url" text,
	"public_access" text DEFAULT 'private' NOT NULL,
	"read_access" text[] DEFAULT '{}' NOT NULL,
	"write_access" text[] DEFAULT '{}' NOT NULL,
	"admin_access" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"_deleted" boolean DEFAULT false,
	"_ttl" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"requester_id" text NOT NULL,
	"requester_type" text NOT NULL,
	"room_ids" text[] DEFAULT '{}' NOT NULL,
	"collections" text[] DEFAULT '{}' NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"keep_alive_days" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"domain" text NOT NULL,
	CONSTRAINT "apps_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;