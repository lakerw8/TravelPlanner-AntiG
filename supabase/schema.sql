-- Enable UUID extension for unique IDs
create extension if not exists "uuid-ossp";

-- 1. Trips Table
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid, -- Link to auth.users(id) (nullable for guest-created trips)
  title text not null,
  destination text, -- Main destination (e.g. "Tokyo, Japan")
  start_date date not null,
  end_date date not null,
  cover_image text,
  lat double precision,
  lng double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Places Table (Global cache of Google Places data)
create table public.places (
  id uuid default uuid_generate_v4() primary key,
  google_place_id text not null unique,
  name text not null,
  address text,
  rating numeric,
  user_ratings_total integer,
  type text, -- 'lodging', 'restaurant', etc.
  image text,
  price_level integer, -- 0-4
  website text,
  lat double precision,
  lng double precision,
  city text,
  opening_hours jsonb, -- Store structured opening hours
  details jsonb, -- Store miscellaneous details (amenities, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lists Table
create table public.lists (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. List Items
create table public.list_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.lists(id) on delete cascade not null,
  place_id uuid references public.places(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(list_id, place_id)
);

-- 5. Itinerary Items
create table public.itinerary_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  place_id uuid references public.places(id) not null,
  day_index integer not null,
  order_index integer not null default 0,
  start_time text, -- "HH:mm"
  end_time text, -- "HH:mm"
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Flights Table
create table public.flights (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  airline text,
  flight_number text,
  departure_time timestamp with time zone,
  arrival_time timestamp with time zone,
  departure_airport text,
  arrival_airport text,
  price numeric,
  confirmation_code text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Lodgings Table (Links a Place to a Trip with dates)
create table public.lodgings (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  place_id uuid references public.places(id) not null,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.trips enable row level security;
alter table public.places enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.flights enable row level security;
alter table public.lodgings enable row level security;

-- Collaborative RLS Policies
create policy "Trips are collaborative-readable" on public.trips for select using (true);
create policy "Trips are collaborative-writable" on public.trips for all using (true) with check (true);

create policy "Places are collaborative-readable" on public.places for select using (true);
create policy "Places are collaborative-writable" on public.places for all using (true) with check (true);

create policy "Lists are collaborative-readable" on public.lists for select using (true);
create policy "Lists are collaborative-writable" on public.lists for all using (true) with check (true);

create policy "List items are collaborative-readable" on public.list_items for select using (true);
create policy "List items are collaborative-writable" on public.list_items for all using (true) with check (true);

create policy "Itinerary items are collaborative-readable" on public.itinerary_items for select using (true);
create policy "Itinerary items are collaborative-writable" on public.itinerary_items for all using (true) with check (true);

create policy "Flights are collaborative-readable" on public.flights for select using (true);
create policy "Flights are collaborative-writable" on public.flights for all using (true) with check (true);

create policy "Lodgings are collaborative-readable" on public.lodgings for select using (true);
create policy "Lodgings are collaborative-writable" on public.lodgings for all using (true) with check (true);

create index if not exists itinerary_items_trip_day_order_idx
  on public.itinerary_items (trip_id, day_index, order_index);
