-- Live-Session Hardening: Host-Mail-Vorlage, engere RLS, Realtime auf live_sessions

-- 1) E-Mail-Vorlage: Host-Link nur an Anni
insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'live_session_host_invite',
  'Live mit Anni — Host-Link',
  'Dein Host-Link: {{session_title}} am {{session_date}}',
  E'{{salutation}},\n\nhier ist dein persönlicher Host-Link für die Live-Session mit dem Fanclub:\n\n{{session_title}}\n{{session_date}}\n\nHost-Link (Kamera und Mikrofon im Browser freigeben):\n{{host_url}}\n\nDu kannst denselben Link mehrfach öffnen — z. B. wenn die Verbindung abbricht. Ein neuer Versand vom Vorstand ersetzt den alten Link.\n\nKalender-Eintrag:\n{{calendar_url}}\n\nViel Spaß beim Live!',
  E'<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p><p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">hier ist dein persönlicher Host-Link für die Live-Session mit dem Fanclub:</p><p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b"><strong>{{session_title}}</strong><br>{{session_date}}</p><p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Öffne zur Startzeit diesen Link und gib Kamera sowie Mikrofon im Browser frei:</p><p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center"><a href="{{host_url}}" style="display:inline-block;padding:12px 22px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Als Host beitreten</a></p><p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Du kannst denselben Link mehrfach öffnen — z. B. wenn die Verbindung abbricht. Ein neuer Versand vom Vorstand ersetzt den alten Link.</p><p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b"><a href="{{calendar_url}}">Termin im Kalender speichern</a></p>',
  'Geht nur an Anni beim Anlegen oder Erneuern des Host-Links. Platzhalter: salutation, first_name, session_title, session_date, host_url, calendar_url. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();

-- 2) Realtime: Mitglieder merken Host-Ende ohne Reload
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_sessions'
  ) then
    alter publication supabase_realtime add table public.live_sessions;
  end if;
end $$;

-- 3) Chat-Nachrichten: nur während Join-Fenster oder Grace (Admin immer)
drop policy if exists "live_session_messages_select_auth" on public.live_session_messages;
create policy "live_session_messages_select_auth"
on public.live_session_messages
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.live_sessions s
    where s.id = live_session_messages.session_id
      and (
        (
          s.status in ('scheduled', 'live')
          and now() >= s.join_opens_at
          and now() <= s.ends_at
        )
        or (
          s.status = 'ended'
          and s.grace_ends_at is not null
          and now() < s.grace_ends_at
        )
      )
  )
);

drop policy if exists "live_session_messages_insert_own" on public.live_session_messages;
create policy "live_session_messages_insert_own"
on public.live_session_messages
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.live_sessions s
    where s.id = live_session_messages.session_id
      and (
        (
          s.status in ('scheduled', 'live')
          and now() >= s.join_opens_at
          and now() <= s.ends_at
        )
        or (
          s.status = 'ended'
          and s.grace_ends_at is not null
          and now() < s.grace_ends_at
        )
      )
  )
);

-- 4) Fragen: lesbar solange Session geplant/live (auch Lobby vor Join); Admin immer
drop policy if exists "live_session_questions_select_auth" on public.live_session_questions;
create policy "live_session_questions_select_auth"
on public.live_session_questions
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.live_sessions s
    where s.id = live_session_questions.session_id
      and s.status in ('scheduled', 'live')
  )
);

drop policy if exists "live_session_questions_insert_own" on public.live_session_questions;
create policy "live_session_questions_insert_own"
on public.live_session_questions
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.live_sessions s
    where s.id = live_session_questions.session_id
      and s.status in ('scheduled', 'live')
      and now() <= s.ends_at
  )
);
