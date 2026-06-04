export function birthdayPostBody(firstName: string, variantIndex: number): {
  title: string;
  body: string;
} {
  const name = firstName.trim() || "Fan";
  const templates = [
    {
      title: `Alles Gute, ${name}! 🎂`,
      body: `Liebe/r ${name}, wir wünschen dir heute alles Gute zu deinem Geburtstag — dein Anni Perka Fanclub.`,
    },
    {
      title: `Happy Birthday, ${name}!`,
      body: `Liebe/r ${name}, der Fanclub feiert dich heute: alles Liebe zum Geburtstag und einen wundervollen Tag!`,
    },
    {
      title: `Geburtstagsgrüße für ${name}`,
      body: `Hey ${name}, von uns aus dem Anni Perka Fanclub: herzlichen Glückwunsch und viel Freude an deinem besonderen Tag!`,
    },
    {
      title: `${name} hat Geburtstag! 🎉`,
      body: `Liebe/r ${name}, wir denken heute besonders an dich — alles Gute, Gesundheit und schöne Momente wünscht dir dein Fanclub-Team.`,
    },
    {
      title: `Für ${name} zum Geburtstag`,
      body: `Liebe/r ${name}, danke, dass du Teil der Community bist. Heute wünschen wir dir von Herzen einen tollen Geburtstag! — Anni Perka Fanclub`,
    },
  ];
  return templates[variantIndex % templates.length]!;
}
