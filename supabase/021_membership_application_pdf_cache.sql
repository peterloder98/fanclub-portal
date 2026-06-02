-- Cached generated application PDF (faster admin preview)
-- Run after 018_membership_storage_workflow.sql

alter table public.membership_applications
  add column if not exists application_pdf_path text;
