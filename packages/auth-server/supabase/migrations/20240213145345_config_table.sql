create table "public"."config" (
    "key" text not null,
    "value" text not null
);


alter table "public"."config" enable row level security;

CREATE UNIQUE INDEX config_pkey ON public.config USING btree (key);

alter table "public"."config" add constraint "config_pkey" PRIMARY KEY using index "config_pkey";

grant delete on table "public"."config" to "anon";

grant insert on table "public"."config" to "anon";

grant references on table "public"."config" to "anon";

grant select on table "public"."config" to "anon";

grant trigger on table "public"."config" to "anon";

grant truncate on table "public"."config" to "anon";

grant update on table "public"."config" to "anon";

grant delete on table "public"."config" to "authenticated";

grant insert on table "public"."config" to "authenticated";

grant references on table "public"."config" to "authenticated";

grant select on table "public"."config" to "authenticated";

grant trigger on table "public"."config" to "authenticated";

grant truncate on table "public"."config" to "authenticated";

grant update on table "public"."config" to "authenticated";

grant delete on table "public"."config" to "service_role";

grant insert on table "public"."config" to "service_role";

grant references on table "public"."config" to "service_role";

grant select on table "public"."config" to "service_role";

grant trigger on table "public"."config" to "service_role";

grant truncate on table "public"."config" to "service_role";

grant update on table "public"."config" to "service_role";


