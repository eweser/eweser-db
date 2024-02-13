create table "public"."access_grants" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "owner_id" text
);


alter table "public"."access_grants" enable row level security;

CREATE UNIQUE INDEX access_grants_pkey ON public.access_grants USING btree (id);

alter table "public"."access_grants" add constraint "access_grants_pkey" PRIMARY KEY using index "access_grants_pkey";

alter table "public"."access_grants" add constraint "access_grants_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_owner_id_fkey";

grant delete on table "public"."access_grants" to "anon";

grant insert on table "public"."access_grants" to "anon";

grant references on table "public"."access_grants" to "anon";

grant select on table "public"."access_grants" to "anon";

grant trigger on table "public"."access_grants" to "anon";

grant truncate on table "public"."access_grants" to "anon";

grant update on table "public"."access_grants" to "anon";

grant delete on table "public"."access_grants" to "authenticated";

grant insert on table "public"."access_grants" to "authenticated";

grant references on table "public"."access_grants" to "authenticated";

grant select on table "public"."access_grants" to "authenticated";

grant trigger on table "public"."access_grants" to "authenticated";

grant truncate on table "public"."access_grants" to "authenticated";

grant update on table "public"."access_grants" to "authenticated";

grant delete on table "public"."access_grants" to "service_role";

grant insert on table "public"."access_grants" to "service_role";

grant references on table "public"."access_grants" to "service_role";

grant select on table "public"."access_grants" to "service_role";

grant trigger on table "public"."access_grants" to "service_role";

grant truncate on table "public"."access_grants" to "service_role";

grant update on table "public"."access_grants" to "service_role";


