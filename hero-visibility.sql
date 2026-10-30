-- Owner-controlled reveal. No credentials or privileged keys in browser code.
create table public.directory_site_owners (
    user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.directory_site_owners enable row level security;
revoke all on public.directory_site_owners from public, anon, authenticated;
grant select on public.directory_site_owners to authenticated;
create policy "Owner can check own membership" on public.directory_site_owners
    for select to authenticated using (user_id = (select auth.uid()));

-- Resolve the existing approved owner rather than embedding a generated UUID.
insert into public.directory_site_owners(user_id)
select a.user_id from public.directory_admins a join auth.users u on u.id = a.user_id
where lower(u.email) = 'sir.omidahmadi@gmail.com';

create table public.directory_site_features (
    key text primary key check (key = 'search_hero'),
    enabled boolean not null default false
);
alter table public.directory_site_features enable row level security;
revoke all on public.directory_site_features from public, anon, authenticated;
grant select on public.directory_site_features to anon, authenticated;
grant update(enabled) on public.directory_site_features to authenticated;
create policy "Visitors can read hero visibility" on public.directory_site_features
    for select to anon, authenticated using (true);
create policy "Only owner can change hero visibility" on public.directory_site_features
    for update to authenticated
    using (exists(select 1 from public.directory_site_owners o where o.user_id = (select auth.uid())))
    with check (exists(select 1 from public.directory_site_owners o where o.user_id = (select auth.uid())));
insert into public.directory_site_features(key, enabled) values ('search_hero', false);
