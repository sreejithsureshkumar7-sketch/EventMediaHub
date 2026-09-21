-- EventMediaHub Supabase schema
-- Run in Supabase SQL Editor.
-- This script assumes Supabase Auth is enabled.

create extension if not exists pgcrypto;

create type public.user_role as enum ('participant', 'staff', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  role public.user_role not null default 'participant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  join_code text not null unique default upper(encode(gen_random_bytes(6), 'hex')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  cover_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_dates_valid check (ends_at > starts_at)
);

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  device_label text,
  last_seen_at timestamptz default now(),
  unique(event_id, user_id)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete set null,
  bucket text not null check (bucket in ('photos','videos')),
  object_path text not null unique,
  media_type text not null check (media_type in ('photo','video')),
  mime_type text,
  original_name text,
  size_bytes bigint,
  duration_seconds numeric,
  status text not null default 'active' check (status in ('active','flagged','deleted')),
  created_at timestamptz not null default now()
);

create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists event_members_event_idx on public.event_members(event_id);
create index if not exists event_members_user_idx on public.event_members(user_id);
create index if not exists media_event_idx on public.media(event_id);
create index if not exists media_uploaded_by_idx on public.media(uploaded_by);
create index if not exists media_created_at_idx on public.media(created_at desc);

-- New profile whenever a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper functions for RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_event_member(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = p_event and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.media enable row level security;

-- Profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Events
drop policy if exists "events_select_members_or_admin" on public.events;
create policy "events_select_members_or_admin"
on public.events for select
to authenticated
using (public.is_admin() or created_by = auth.uid() or public.is_event_member(id));

drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin"
on public.events for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "events_update_admin" on public.events;
create policy "events_update_admin"
on public.events for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin"
on public.events for delete
to authenticated
using (public.is_admin());

-- Members
drop policy if exists "members_select_member_or_admin" on public.event_members;
create policy "members_select_member_or_admin"
on public.event_members for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "members_join_self" on public.event_members;
create policy "members_join_self"
on public.event_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.is_active = true
      and e.ends_at > now()
  )
);

drop policy if exists "members_update_self_or_admin" on public.event_members;
create policy "members_update_self_or_admin"
on public.event_members for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "members_delete_self_or_admin" on public.event_members;
create policy "members_delete_self_or_admin"
on public.event_members for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Media
drop policy if exists "media_select_member_or_admin" on public.media;
create policy "media_select_member_or_admin"
on public.media for select
to authenticated
using (public.is_admin() or public.is_event_member(event_id));

drop policy if exists "media_insert_member" on public.media;
create policy "media_insert_member"
on public.media for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_event_member(event_id)
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.is_active = true
      and e.ends_at > now()
  )
);

drop policy if exists "media_update_owner_or_admin" on public.media;
create policy "media_update_owner_or_admin"
on public.media for update
to authenticated
using (uploaded_by = auth.uid() or public.is_admin())
with check (uploaded_by = auth.uid() or public.is_admin());

drop policy if exists "media_delete_owner_or_admin" on public.media;
create policy "media_delete_owner_or_admin"
on public.media for delete
to authenticated
using (uploaded_by = auth.uid() or public.is_admin());

-- Least privilege Data API grants.
revoke all on public.profiles from anon;
revoke all on public.events from anon;
revoke all on public.event_members from anon;
revoke all on public.media from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_members to authenticated;
grant select, insert, update, delete on public.media to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_event_member(uuid) to authenticated;

-- Storage buckets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 52428800, array['image/jpeg','image/png','image/webp','image/heic']),
  ('videos', 'videos', false, 524288000, array['video/mp4','video/webm','video/quicktime','video/x-m4v'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policy.
-- Object name must start with event_id/user_id.
drop policy if exists "storage_read_event_media" on storage.objects;
create policy "storage_read_event_media"
on storage.objects for select
to authenticated
using (
  bucket_id in ('photos','videos')
  and (
    public.is_admin()
    or public.is_event_member((split_part(name, '/', 1))::uuid)
  )
);

drop policy if exists "storage_insert_event_media" on storage.objects;
create policy "storage_insert_event_media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('photos','videos')
  and split_part(name, '/', 2) = auth.uid()::text
  and public.is_event_member((split_part(name, '/', 1))::uuid)
  and exists (
    select 1 from public.events e
    where e.id = (split_part(name, '/', 1))::uuid
      and e.is_active = true
      and e.ends_at > now()
  )
);

drop policy if exists "storage_delete_owner_or_admin" on storage.objects;
create policy "storage_delete_owner_or_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('photos','videos')
  and (
    public.is_admin()
    or split_part(name, '/', 2) = auth.uid()::text
  )
);

-- Realtime.
do $$
begin
  begin
    alter publication supabase_realtime add table public.media;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.event_members;
  exception when duplicate_object then null;
  end;
end $$;
