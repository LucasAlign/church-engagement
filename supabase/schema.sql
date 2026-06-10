-- Schema for the Church Engagement dashboard.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- Each app collection is stored as a table of jsonb documents keyed by id,
-- matching the shapes in src/data/db.js. The app seeds the sample data
-- automatically on its first load against an empty database.
--
-- NOTE: the policies below allow full read/write to anyone holding the anon
-- key (the app has no login yet). Tighten these when authentication is added.

do $$
declare
  t text;
begin
  foreach t in array array[
    'churches', 'contacts', 'interactions', 'tasks', 'giving_records',
    'ministry_engagements', 'care_communities', 'advocates', 'connections',
    'impact_reports', 'church_notes', 'app_users'
  ] loop
    execute format('create table if not exists public.%I (id text primary key, data jsonb not null)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open access" on public.%I', t);
    execute format('create policy "open access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
