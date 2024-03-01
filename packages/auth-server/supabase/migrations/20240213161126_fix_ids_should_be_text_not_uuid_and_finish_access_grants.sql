alter table "public"."access_grants" drop constraint "access_grants_owner_id_fkey";

alter table "public"."access_grants" add column "expires" timestamp with time zone not null;

alter table "public"."access_grants" add column "is_valid" boolean not null default true;

alter table "public"."access_grants" add column "jwt_id" text not null;

alter table "public"."access_grants" add column "keep_alive_days" numeric not null default '1'::numeric;

alter table "public"."access_grants" add column "requester_id" text not null;

alter table "public"."access_grants" add column "requester_type" text not null;

alter table "public"."access_grants" add column "room_ids" text[] not null;

alter table "public"."access_grants" alter column "id" drop default;

alter table "public"."access_grants" alter column "id" set data type text using "id"::text;

alter table "public"."access_grants" alter column "owner_id" set not null;

alter table "public"."rooms" alter column "id" drop default;

alter table "public"."rooms" alter column "id" set data type text using "id"::text;

alter table "public"."access_grants" add constraint "access_grants_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) not valid;

alter table "public"."access_grants" validate constraint "access_grants_owner_id_fkey";


