-- Membership: mobile + WhatsApp + fixed fee
-- Run after 015_membership_applications.sql

alter table public.membership_applications
  add column if not exists mobile_dial_code text,
  add column if not exists mobile_number text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_dial_code text,
  add column if not exists whatsapp_number text,
  add column if not exists fee_cents integer not null default 1500;
