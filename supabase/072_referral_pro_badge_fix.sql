-- Werbeprofi: Beschreibung & Schwellen (Einladungen + Neumitglieder ab Gold)

update public.achievement_definitions
set
  description = 'Versendete Einladungs-E-Mails über „Neues Mitglied werben“. Ab Gold zusätzlich freigeschaltete Neumitglieder (Antrag eingereicht und vom Vorstand bestätigt).',
  bronze_threshold = 5,
  silver_threshold = 10,
  gold_threshold = 15,
  platinum_threshold = 20
where slug = 'referral_pro';
