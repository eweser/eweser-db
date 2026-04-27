ALTER TABLE "agent_configs" ADD COLUMN "read_allowed_collections" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN "read_allowed_rooms" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN "write_allowed_collections" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN "write_allowed_rooms" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN "write_allowed_folder_ids" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN "write_allowed_path_prefixes" text[] DEFAULT '{}' NOT NULL;
