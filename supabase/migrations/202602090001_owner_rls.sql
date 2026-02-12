-- Ownership and RLS hardening migration.
-- Assumes auth.users is the identity source and trips.user_id stores auth user UUIDs.

alter table public.trips alter column user_id type uuid using user_id::uuid;
alter table public.trips alter column user_id set not null;

alter table public.trips enable row level security;
alter table public.places enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.flights enable row level security;
alter table public.lodgings enable row level security;

drop policy if exists "Enable all access for all users" on public.trips;
drop policy if exists "Enable all access for all users" on public.places;
drop policy if exists "Enable all access for all users" on public.lists;
drop policy if exists "Enable all access for all users" on public.list_items;
drop policy if exists "Enable all access for all users" on public.itinerary_items;
drop policy if exists "Enable all access for all users" on public.flights;
drop policy if exists "Enable all access for all users" on public.lodgings;

create policy "Trips are owner-readable"
on public.trips
for select
using (auth.uid() = user_id);

create policy "Trips are owner-writable"
on public.trips
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Places are authenticated-readable"
on public.places
for select
using (auth.role() = 'authenticated');

create policy "Places are authenticated-writable"
on public.places
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Lists are owner-readable"
on public.lists
for select
using (
  exists (
    select 1
    from public.trips t
    where t.id = lists.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Lists are owner-writable"
on public.lists
for all
using (
  exists (
    select 1
    from public.trips t
    where t.id = lists.trip_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = lists.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "List items are owner-readable"
on public.list_items
for select
using (
  exists (
    select 1
    from public.lists l
    join public.trips t on t.id = l.trip_id
    where l.id = list_items.list_id
      and t.user_id = auth.uid()
  )
);

create policy "List items are owner-writable"
on public.list_items
for all
using (
  exists (
    select 1
    from public.lists l
    join public.trips t on t.id = l.trip_id
    where l.id = list_items.list_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.lists l
    join public.trips t on t.id = l.trip_id
    where l.id = list_items.list_id
      and t.user_id = auth.uid()
  )
);

create policy "Itinerary items are owner-readable"
on public.itinerary_items
for select
using (
  exists (
    select 1
    from public.trips t
    where t.id = itinerary_items.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Itinerary items are owner-writable"
on public.itinerary_items
for all
using (
  exists (
    select 1
    from public.trips t
    where t.id = itinerary_items.trip_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = itinerary_items.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Flights are owner-readable"
on public.flights
for select
using (
  exists (
    select 1
    from public.trips t
    where t.id = flights.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Flights are owner-writable"
on public.flights
for all
using (
  exists (
    select 1
    from public.trips t
    where t.id = flights.trip_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = flights.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Lodgings are owner-readable"
on public.lodgings
for select
using (
  exists (
    select 1
    from public.trips t
    where t.id = lodgings.trip_id
      and t.user_id = auth.uid()
  )
);

create policy "Lodgings are owner-writable"
on public.lodgings
for all
using (
  exists (
    select 1
    from public.trips t
    where t.id = lodgings.trip_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = lodgings.trip_id
      and t.user_id = auth.uid()
  )
);
