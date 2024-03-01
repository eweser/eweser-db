create
or replace function public.handle_new_user () returns trigger as $$
  declare
  _auth_server_url text;
begin
  SELECT value INTO _auth_server_url FROM public.config WHERE key ='auth_server_url';

  insert into public.users(id, auth_id, email)
  values (_auth_server_url||'|'||cast(new.id as text), new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create
or replace trigger on_auth_user_created
after
  insert on auth.users for each row
execute
  procedure public.handle_new_user ();
