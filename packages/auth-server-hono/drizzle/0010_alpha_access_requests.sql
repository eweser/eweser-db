CREATE TABLE IF NOT EXISTS "alpha_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alpha_access_requests_email_unique" UNIQUE("email")
);
