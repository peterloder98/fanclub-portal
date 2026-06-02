-- Admin signature settings (text + optional image)
-- Run after 001_init.sql

alter table public.profiles
  add column if not exists admin_signature_text text,
  add column if not exists admin_signature_image_path text;

