ALTER TABLE "twoFactor" RENAME TO "two_factor";
--> statement-breakpoint
ALTER TABLE "two_factor" RENAME CONSTRAINT "twoFactor_user_id_users_id_fk" TO "two_factor_user_id_users_id_fk";
