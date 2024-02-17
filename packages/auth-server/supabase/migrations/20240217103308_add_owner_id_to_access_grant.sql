alter table "public"."access_grants" add column "owner_id" uuid;

alter table "public"."access_grants" add constraint "access_grants_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_owner_id_fkey";


