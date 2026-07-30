-- Mitglieder-Einladung (Werben) als editierbare E-Mail-Vorlage

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'membership_referral_invite',
  'Einladung: Neues Mitglied werben',
  '{{sender_name}} hat dich in den Anni Perka Fanclub eingeladen',
  $text$Hallo {{recipient_first_name}},

ich würde mich riesig freuen, wenn du ebenfalls Teil unseres offiziellen **Anni Perka Fanclubs** wirst!

👉 **Hier kannst du dich direkt anmelden:**

**{{application_link}}**

Die Anmeldung funktioniert komplett digital und unkompliziert. Du füllst den Antrag einfach online aus, unterschreibst direkt am Bildschirm und schickst ihn mit wenigen Klicks ab – ganz ohne Ausdrucken oder Einscannen.

Als Mitglied erhältst du Zugang zu unserem neuen **digitalen Fanclub-Portal**, das wir mit viel Herzblut entwickelt haben. Dort erwarten dich unter anderem:

⭐ die **Anni-Stars** mit Ranglisten und Auszeichnungen
🎁 Freikarten für die meisten Events zu gewinnen, weitere tolle Gewinnspiele und exklusive Aktionen
💬 Community- und Chatfunktionen für den Austausch mit anderen Fans
📅 Konzerttermine mit Reiseinformationen, Hotels und vielen hilfreichen Tipps
🗳️ Umfragen und Mitmachaktionen
🛍️ (geplant!) ein eigener Fanshop und viele weitere exklusive Inhalte

Natürlich stehen vor allem die gemeinsame Freude an Annis Musik und der Austausch mit anderen Fans im Mittelpunkt.

Der Jahresbeitrag beträgt **15 €**.

Ich würde mich wirklich freuen, dich bald im Fanclub begrüßen zu dürfen!

👉 **Hier geht's noch einmal direkt zum Mitgliedsantrag:**

**{{application_link}}**

Liebe Grüße

{{sender_name}}$text$,
  null,
  'E-Mail wenn ein Mitglied jemanden zum Fanclub einlädt (persönliche Anrede, Link zum Antrag)'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
