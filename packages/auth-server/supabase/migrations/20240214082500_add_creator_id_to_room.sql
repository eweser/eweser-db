alter table "public"."rooms" add column "creator" text not null;

alter table "public"."rooms" add constraint "rooms_creator_fkey" FOREIGN KEY (creator) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."rooms" validate constraint "rooms_creator_fkey";


