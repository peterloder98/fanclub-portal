-- Antrag-Bestätigung: klarer Überweisungsblock (Betrag, Empfänger, IBAN, BIC, Bank, VWZ)
-- Code-Fallback in src/lib/email/render-template.ts ist maßgeblich für den Versand.

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_application_received',
  'Antrag eingegangen (an Antragsteller/in)',
  'Bestätigung nach Absenden des Mitgliedschaftsantrags inkl. Überweisungsdaten und PDF-Anhang.',
  'Dein Antrag – Anni Perka Fanclub',
  $text${{salutation}},

dein Antrag als neues Mitglied für den Anni Perka Fanclub ist eingegangen.

Bitte denke an die Überweisung des Mitgliedsbeitrages auf unser Fanclubkonto:

Betrag:              {{fee_eur}}
Empfänger:           {{bank_account_holder}}
IBAN:                {{bank_iban}}
BIC:                 {{bank_bic}}
Bank:                {{bank_name}}
Verwendungszweck:    {{bank_reference}}

Bitte den Verwendungszweck exakt so übernehmen — dann können wir deinen Eingang schnell zuordnen.

Sobald der Betrag eingegangen ist, schalten wir dich für die Fanclub App als Benutzer frei und fügen dich in die WhatsApp-Gruppe des Fanclubs hinzu.$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">dein Antrag als neues Mitglied für den Anni Perka Fanclub ist eingegangen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Bitte denke an die Überweisung des Mitgliedsbeitrages auf unser Fanclubkonto:</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 1em;font-size:15px;line-height:1.55;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
  <tr><td colspan="2" style="padding:12px 14px 6px;font-size:14px;font-weight:700;color:#0b1f3a">Überweisung Mitgliedsbeitrag</td></tr>
  <tr><td style="padding:5px 16px 5px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">Betrag</td><td style="padding:5px 0;color:#0b1f3a;vertical-align:top;font-weight:600">{{fee_eur}}</td></tr>
  <tr><td style="padding:5px 16px 5px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">Empfänger</td><td style="padding:5px 0;color:#0b1f3a;vertical-align:top;font-weight:600">{{bank_account_holder}}</td></tr>
  <tr><td style="padding:5px 16px 5px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">IBAN</td><td style="padding:5px 0;color:#0b1f3a;vertical-align:top;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:0.02em">{{bank_iban}}</td></tr>
  <tr><td style="padding:5px 16px 5px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">BIC</td><td style="padding:5px 0;color:#0b1f3a;vertical-align:top;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px">{{bank_bic}}</td></tr>
  <tr><td style="padding:5px 16px 5px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">Bank</td><td style="padding:5px 0;color:#0b1f3a;vertical-align:top;font-weight:500">{{bank_name}}</td></tr>
  <tr><td style="padding:5px 16px 12px 14px;color:#64748b;vertical-align:top;white-space:nowrap;width:9.5rem">Verwendungszweck</td><td style="padding:5px 14px 12px 0;color:#0b1f3a;vertical-align:top;font-weight:600">{{bank_reference}}</td></tr>
</table>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Bitte den Verwendungszweck <strong>exakt so</strong> übernehmen — dann können wir deinen Eingang schnell zuordnen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Sobald der Betrag eingegangen ist, schalten wir dich für die Fanclub App als Benutzer frei und fügen dich in die WhatsApp-Gruppe des Fanclubs hinzu.</p>$html$
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  updated_at = now();
