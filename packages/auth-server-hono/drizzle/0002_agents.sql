CREATE TABLE "agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'mcp' NOT NULL,
	"endpoint" text,
	"allowed_collections" text[] DEFAULT '{}' NOT NULL,
	"allowed_rooms" text[] DEFAULT '{}' NOT NULL,
	"permissions" text DEFAULT 'read' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"token_hash" text,
	"token_expires_at" timestamp with time zone,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"room_id" text NOT NULL,
	"collection_key" text NOT NULL,
	"action" text NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_access_logs" ADD CONSTRAINT "agent_access_logs_agent_id_agent_configs_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_access_logs" ADD CONSTRAINT "agent_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_configs_token_hash_idx" ON "agent_configs" ("token_hash") WHERE "token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_configs_user_id_idx" ON "agent_configs" ("user_id");--> statement-breakpoint
CREATE INDEX "agent_access_logs_agent_id_idx" ON "agent_access_logs" ("agent_id");
