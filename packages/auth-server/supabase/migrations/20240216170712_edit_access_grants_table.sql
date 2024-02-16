alter table "public"."access_grants" drop column "jwt_id";

alter table "public"."access_grants" add column "collections" text[] not null default '{}'::text[];

alter table "public"."access_grants" alter column "room_ids" set default '{}'::uuid[];


