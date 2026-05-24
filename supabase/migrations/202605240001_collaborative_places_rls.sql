-- 202605240001_collaborative_places_rls.sql
-- The 202605200001_collaborative_rls.sql migration relaxed RLS for every trip
-- table EXCEPT public.places, leaving it on the restrictive owner-only policies
-- from 202602090001_owner_rls.sql. That blocks anonymous (public-link) visitors
-- from adding places. This migration brings places in line with the rest so the
-- whole app is editable by anyone with the link. Idempotent.

alter table public.places enable row level security;

drop policy if exists "Enable all access for all users" on public.places;
drop policy if exists "Places are authenticated-readable" on public.places;
drop policy if exists "Places are authenticated-writable" on public.places;
drop policy if exists "Places are collaborative-readable" on public.places;
drop policy if exists "Places are collaborative-writable" on public.places;

create policy "Places are collaborative-readable" on public.places for select using (true);
create policy "Places are collaborative-writable" on public.places for all using (true) with check (true);
