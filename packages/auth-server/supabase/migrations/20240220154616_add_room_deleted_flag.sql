alter table "public"."rooms" add column "_deleted" boolean not null;

alter table "public"."rooms" add column "_ttl" timestamp with time zone;


