-- 202605200001_collaborative_rls.sql
-- Relax constraints and RLS policies to allow frictionless guest sharing and real-time collaboration.

-- 1. Make trips.user_id nullable to allow guest-created trips
ALTER TABLE public.trips ALTER COLUMN user_id DROP NOT NULL;

-- 2. Trips Policies
DROP POLICY IF EXISTS "Trips are owner-readable" ON public.trips;
DROP POLICY IF EXISTS "Trips are owner-writable" ON public.trips;
CREATE POLICY "Trips are collaborative-readable" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Trips are collaborative-writable" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- 3. Lists Policies
DROP POLICY IF EXISTS "Lists are owner-readable" ON public.lists;
DROP POLICY IF EXISTS "Lists are owner-writable" ON public.lists;
CREATE POLICY "Lists are collaborative-readable" ON public.lists FOR SELECT USING (true);
CREATE POLICY "Lists are collaborative-writable" ON public.lists FOR ALL USING (true) WITH CHECK (true);

-- 4. List Items Policies
DROP POLICY IF EXISTS "List items are owner-readable" ON public.list_items;
DROP POLICY IF EXISTS "List items are owner-writable" ON public.list_items;
CREATE POLICY "List items are collaborative-readable" ON public.list_items FOR SELECT USING (true);
CREATE POLICY "List items are collaborative-writable" ON public.list_items FOR ALL USING (true) WITH CHECK (true);

-- 5. Itinerary Items Policies
DROP POLICY IF EXISTS "Itinerary items are owner-readable" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items are owner-writable" ON public.itinerary_items;
CREATE POLICY "Itinerary items are collaborative-readable" ON public.itinerary_items FOR SELECT USING (true);
CREATE POLICY "Itinerary items are collaborative-writable" ON public.itinerary_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Flights Policies
DROP POLICY IF EXISTS "Flights are owner-readable" ON public.flights;
DROP POLICY IF EXISTS "Flights are owner-writable" ON public.flights;
CREATE POLICY "Flights are collaborative-readable" ON public.flights FOR SELECT USING (true);
CREATE POLICY "Flights are collaborative-writable" ON public.flights FOR ALL USING (true) WITH CHECK (true);

-- 7. Lodgings Policies
DROP POLICY IF EXISTS "Lodgings are owner-readable" ON public.lodgings;
DROP POLICY IF EXISTS "Lodgings are owner-writable" ON public.lodgings;
CREATE POLICY "Lodgings are collaborative-readable" ON public.lodgings FOR SELECT USING (true);
CREATE POLICY "Lodgings are collaborative-writable" ON public.lodgings FOR ALL USING (true) WITH CHECK (true);
