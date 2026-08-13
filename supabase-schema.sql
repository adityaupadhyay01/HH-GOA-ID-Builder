-- =========================================================================
-- HH GOA 2026 BUILDER ID — SUPABASE SCHEMA
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE: builder_cards
-- Stores metadata about each generated card. No auth required to insert.
-- ---------------------------------------------------------------------
create table if not exists public.builder_cards (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  stack          text[] default '{}',
  role           text,
  builder_title  text,
  image_url      text,
  session_id     text,
  created_at     timestamptz default now()
);

alter table public.builder_cards enable row level security;

-- Anyone (anonymous) can INSERT a new card record.
create policy "Anon can insert builder cards"
  on public.builder_cards
  for insert
  to anon
  with check (true);

-- Allow anonymous uploads into the builder-cards bucket only.
create policy "Anon can upload to builder-cards"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'builder-cards');

-- Allow public read access so downloaded/shared links resolve.
create policy "Public can read builder-cards"
  on storage.objects
  for select
  to public
  using (bucket_id = 'builder-cards');

-- Intentionally no update/delete policy for anon — uploads are write-once
-- from the browser's perspective.

-- =========================================================================
-- NOTES
-- - This entire schema is optional. The generator works fully offline
--   (photo upload, canvas render, PNG download) without any of this.
-- - Only ever put the "anon" public key in frontend code (config.js).
--   Never expose the service_role key to the browser.
-- =========================================================================
