alter table "public"."access_grants" drop column "expires";

alter table "public"."access_grants" alter column "keep_alive_days" set data type bigint using "keep_alive_days"::bigint;

alter table "public"."access_grants" alter column "keep_alive_days" set default '1'::bigint;

