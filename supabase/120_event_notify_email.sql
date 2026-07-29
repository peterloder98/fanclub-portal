-- E-Mail bei neuen Events (Standard: aus)
insert into public.app_settings (key, value)
values ('notify_members_new_event', 'false')
on conflict (key) do nothing;
