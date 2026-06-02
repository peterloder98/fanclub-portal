-- Membership workflow: storage bucket, application user link, country code
-- Run after 017_membership_phone_whatsapp.sql

alter table public.membership_applications
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists country_code text;

create index if not exists membership_applications_user_id_idx
  on public.membership_applications(user_id);

-- Private bucket for applicant signatures (service role uploads via API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'membership-signatures',
  'membership-signatures',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- memberships.status: active | inactive | applied (Mitgliedschaft beantragt)
comment on column public.memberships.status is 'active | inactive | applied (pending admin approval after payment)';
