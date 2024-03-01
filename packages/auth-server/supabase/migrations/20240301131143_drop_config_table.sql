revoke delete on table "public"."config" from "anon";

revoke insert on table "public"."config" from "anon";

revoke references on table "public"."config" from "anon";

revoke select on table "public"."config" from "anon";

revoke trigger on table "public"."config" from "anon";

revoke truncate on table "public"."config" from "anon";

revoke update on table "public"."config" from "anon";

revoke delete on table "public"."config" from "authenticated";

revoke insert on table "public"."config" from "authenticated";

revoke references on table "public"."config" from "authenticated";

revoke select on table "public"."config" from "authenticated";

revoke trigger on table "public"."config" from "authenticated";

revoke truncate on table "public"."config" from "authenticated";

revoke update on table "public"."config" from "authenticated";

revoke delete on table "public"."config" from "service_role";

revoke insert on table "public"."config" from "service_role";

revoke references on table "public"."config" from "service_role";

revoke select on table "public"."config" from "service_role";

revoke trigger on table "public"."config" from "service_role";

revoke truncate on table "public"."config" from "service_role";

revoke update on table "public"."config" from "service_role";

alter table "public"."config" drop constraint "config_pkey";

drop index if exists "public"."config_pkey";

drop table "public"."config";


