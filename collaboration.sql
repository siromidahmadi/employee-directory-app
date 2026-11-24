-- Miguel Arias chat + Kassandra Vera scheduling, moved to the owner's project.
create schema if not exists directory_private;
revoke all on schema directory_private from public;
grant usage on schema directory_private to authenticated;

create table public.directory_chat_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 employee_id uuid not null unique references public.employees(id) on delete cascade,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.directory_chat_members enable row level security;
-- Internal membership lookup avoids recursive RLS; never exposed as a public RPC.
create function directory_private.is_chat_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.directory_chat_members m join auth.users u on u.id=m.user_id
  where m.user_id=auth.uid() and m.active and (u.banned_until is null or u.banned_until<now())
 );
$$;
revoke all on function directory_private.is_chat_member() from public,anon;
grant execute on function directory_private.is_chat_member() to authenticated;
create policy "Chat members can find active participants" on public.directory_chat_members for select to authenticated
using ((select directory_private.is_chat_member()) and (active or exists(select 1 from public.directory_site_owners o where o.user_id=(select auth.uid()))));
create policy "Owner can revoke other chat memberships" on public.directory_chat_members for update to authenticated
using (user_id<>(select auth.uid()) and exists(select 1 from public.directory_site_owners o where o.user_id=(select auth.uid())))
with check (user_id<>(select auth.uid()) and exists(select 1 from public.directory_site_owners o where o.user_id=(select auth.uid())));
grant select on public.directory_chat_members to authenticated;
grant update(active) on public.directory_chat_members to authenticated;
grant all on public.directory_chat_members to service_role;

create table public.directory_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.directory_chat_members(user_id),
 recipient_id uuid not null references public.directory_chat_members(user_id),
 body text not null check(length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check(sender_id<>recipient_id)
);
alter table public.directory_messages enable row level security;
create index directory_messages_sender_recipient_created on public.directory_messages(sender_id,recipient_id,created_at desc);
create index directory_messages_recipient_created on public.directory_messages(recipient_id,created_at desc);
create policy "Participants read their messages" on public.directory_messages for select to authenticated
using ((select directory_private.is_chat_member()) and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid())));
create policy "Members send as themselves to active members" on public.directory_messages for insert to authenticated
with check ((select directory_private.is_chat_member()) and sender_id=(select auth.uid()) and read_at is null and exists(select 1 from public.directory_chat_members m where m.user_id=recipient_id and m.active));
create policy "Recipients mark their messages read" on public.directory_messages for update to authenticated
using ((select directory_private.is_chat_member()) and recipient_id=(select auth.uid()))
with check ((select directory_private.is_chat_member()) and recipient_id=(select auth.uid()));
grant select on public.directory_messages to authenticated;
grant insert(sender_id,recipient_id,body) on public.directory_messages to authenticated;
grant update(read_at) on public.directory_messages to authenticated;
grant all on public.directory_messages to service_role;

create table public.directory_meetings (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.directory_chat_members(user_id),
 guest_id uuid not null references public.directory_chat_members(user_id),
 start_at timestamptz not null,
 end_at timestamptz not null,
 created_at timestamptz not null default now(),
 check(organizer_id<>guest_id),
 check(end_at=start_at+interval '1 hour'),
 unique(organizer_id,guest_id,start_at)
);
alter table public.directory_meetings enable row level security;
create index directory_meetings_guest_start on public.directory_meetings(guest_id,start_at);
create policy "Participants read their meetings" on public.directory_meetings for select to authenticated
using ((select directory_private.is_chat_member()) and (organizer_id=(select auth.uid()) or guest_id=(select auth.uid())));
create policy "Members schedule their own meetings" on public.directory_meetings for insert to authenticated
with check ((select directory_private.is_chat_member()) and organizer_id=(select auth.uid()) and start_at>now() and exists(select 1 from public.directory_chat_members m where m.user_id=guest_id and m.active));
create policy "Organizer can cancel a meeting" on public.directory_meetings for delete to authenticated
using ((select directory_private.is_chat_member()) and organizer_id=(select auth.uid()));
grant select,delete on public.directory_meetings to authenticated;
grant insert(organizer_id,guest_id,start_at,end_at) on public.directory_meetings to authenticated;
grant all on public.directory_meetings to service_role;

-- Only the existing owner is enrolled automatically. No former intern is enrolled.
insert into public.directory_chat_members(user_id,employee_id)
select o.user_id,e.id from public.directory_site_owners o cross join public.employees e
where lower(e.email)='aomid6362@gmail.com';
alter publication supabase_realtime add table public.directory_messages, public.directory_meetings;
