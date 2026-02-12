-- Adds durable ordering for itinerary items.

alter table public.itinerary_items
add column if not exists order_index integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by trip_id, day_index
      order by coalesce(created_at, now()), id
    ) - 1 as new_order_index
  from public.itinerary_items
)
update public.itinerary_items target
set order_index = ranked.new_order_index
from ranked
where target.id = ranked.id
  and target.order_index is null;

alter table public.itinerary_items
alter column order_index set default 0;

alter table public.itinerary_items
alter column order_index set not null;

create index if not exists itinerary_items_trip_day_order_idx
on public.itinerary_items (trip_id, day_index, order_index);

create unique index if not exists itinerary_items_trip_day_order_unique
on public.itinerary_items (trip_id, day_index, order_index, id);
