CREATE TABLE IF NOT EXISTS "federated_principals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"server_domain" text NOT NULL,
	"remote_user_id" text NOT NULL,
	"access_level" text NOT NULL,
	"invited_by" uuid,
	"invite_status" text DEFAULT 'pending' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "federated_principals" ADD CONSTRAINT "federated_principals_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "federated_principals" ADD CONSTRAINT "federated_principals_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "federated_principals" ADD CONSTRAINT "federated_principals_room_server_user_unique" UNIQUE("room_id","server_domain","remote_user_id");
