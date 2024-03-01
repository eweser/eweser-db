alter table "public"."access_grants" drop constraint "access_grants_owner_id_fkey";

alter table "public"."rooms" drop constraint "rooms_creator_fkey";

alter table "public"."users" drop constraint "users_auth_id_fkey";

alter table "public"."access_grants" drop column "owner_id";

alter table "public"."rooms" drop column "creator";

alter table "public"."rooms" drop column "public";

alter table "public"."rooms" add column "public_access" text not null default 'private'::text;

alter table "public"."rooms" alter column "id" set default gen_random_uuid();

alter table "public"."rooms" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."users" drop column "auth_id";

alter table "public"."users" add column "rooms" uuid[] not null;

alter table "public"."users" alter column "id" set data type uuid using "id"::uuid;


