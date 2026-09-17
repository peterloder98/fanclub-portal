-- Entfernt die versehentlich im Fanclub-Portal gebaute Anni/Management-Abrechnung.
-- Fanclub-Buchhaltung und browse_only / is_hidden bleiben unangetastet.
-- Storage-Objekte nicht per DELETE auf storage.objects entfernen (protect_delete).

drop policy if exists "anni_mgmt_docs_select" on storage.objects;
drop policy if exists "anni_mgmt_docs_insert" on storage.objects;
drop policy if exists "anni_mgmt_docs_update" on storage.objects;
drop policy if exists "anni_mgmt_docs_delete" on storage.objects;

do $$
begin
  perform storage.empty_bucket('anni-management-docs');
  perform storage.delete_bucket('anni-management-docs');
exception
  when others then
    null;
end $$;

drop table if exists public.anni_mgmt_job_lines cascade;
drop table if exists public.anni_mgmt_jobs cascade;
drop table if exists public.anni_mgmt_pool_payouts cascade;
drop table if exists public.anni_mgmt_month_settlements cascade;
drop table if exists public.anni_mgmt_income_types cascade;

drop function if exists public.is_anni_management_finance_user();

drop index if exists public.profiles_is_management_idx;

alter table public.profiles
  drop column if exists is_management;
