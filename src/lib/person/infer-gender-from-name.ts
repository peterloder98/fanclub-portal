import type { NormalizedGender } from "@/lib/person/gender";

/** Häufige deutsche Vornamen — nur für Backfill / Testdaten, keine Garantie. */

const FEMALE_FIRST_NAMES = new Set(
  [
    "anna", "maria", "elena", "clara", "greta", "ida", "sophie", "lisa", "laura", "julia",
    "sarah", "lena", "hannah", "lea", "emily", "emilia", "mia", "lina", "nina", "paula",
    "marie", "katharina", "kathrin", "sabine", "petra", "monika", "susanne", "andrea",
    "christina", "stefanie", "stephanie", "nicole", "jessica", "melanie", "sandra",
    "barbara", "heike", "birgit", "angelika", "ursula", "ingrid", "helga", "renate",
    "karin", "martina", "silke", "anke", "ute", "kerstin", "beate", "bettina", "doris",
    "franziska", "carolin", "caroline", "theresa", "teresa", "luise", "luisa", "amelie",
    "charlotte", "frieda", "mathilda", "helene", "magdalena", "judith", "ruth", "rosa",
    "emma", "mila", "ella", "nora", "thea", "maja", "zoe", "zara", "alina", "vanessa",
    "johanna", "antonia", "victoria", "viktorija", "alexandra", "daniela", "gabriele",
    "manuela", "sonja", "tanja", "yvonne", "ramona", "corinna", "silvia", "simone",
    "annika", "annette", "astrid", "britta", "carla", "celina", "chiara", "dagmar",
    "denise", "diana", "elke", "erika", "esther", "eva", "fabienne", "fatma", "felicitas",
    "finja", "flora", "gertrud", "gisela", "hannelore", "ilse", "ines", "inga", "ingeborg",
    "irene", "iris", "isabel", "isabella", "jana", "janine", "jasmin", "jeannette",
    "jennifer", "josefine", "josephine", "karen", "karla", "karolina", "katja", "katrin",
    "kerstin", "kim", "kirsten", "klara", "konstanze", "kornelia", "kristin", "kristina",
    "larissa", "leonie", "lilly", "linda", "lore", "luana", "lucia", "lucie", "lydia",
    "madeleine", "maike", "manja", "margarete", "margot", "marianne", "marina", "marion",
    "marlene", "marta", "meike", "michaela", "miriam", "nadine", "natalie", "natascha",
    "nele", "nicola", "olivia", "patricia", "pia", "rahel", "rebecca", "regina", "rita",
    "ronja", "rosalie", "rosemarie", "sabrina", "samantha", "saskia", "selina", "selma",
    "sibylle", "sigrid", "silvana", "sina", "svenja", "sylvia", "sylvie", "tamara", "tina",
    "ulrike", "ursula", "valentina", "vera", "verena", "veronika", "waltraud", "wendy",
    "yasmin", "yasmine", "yvette",
  ].map((n) => n.toLowerCase()),
);

const MALE_FIRST_NAMES = new Set(
  [
    "peter", "ben", "david", "felix", "hannes", "jakob", "max", "paul", "lukas", "lucas",
    "jonas", "leon", "finn", "noah", "elias", "julian", "tim", "tom", "jan", "nico",
    "florian", "fabian", "daniel", "michael", "thomas", "andreas", "stefan", "stephan",
    "markus", "martin", "christian", "klaus", "hans", "jürgen", "juergen", "wolfgang",
    "helmut", "gerhard", "günter", "guenter", "horst", "dieter", "bernd", "uwe", "ralf",
    "frank", "oliver", "alexander", "alex", "tobias", "sebastian", "matthias", "marco",
    "mario", "patrick", "kevin", "dennis", "marcel", "simon", "erik", "eric", "henrik",
    "henry", "theo", "theodor", "karl", "carl", "otto", "friedrich", "wilhelm", "heinrich",
    "georg", "johann", "josef", "franz", "anton", "albert", "ernst", "herbert", "werner",
    "manfred", "heinz", "kurt", "walter", "rudolf", "robert", "richard", "harald", "norbert",
    "armin", "arne", "bastian", "benedikt", "benjamin", "bernd", "björn", "bjoern", "boris",
    "bruno", "clemens", "constantin", "darius", "dominik", "edgar", "edmund", "eduard",
    "egon", "emil", "erich", "erwin", "eugen", "fabio", "falk", "felix", "ferdinand",
    "florian", "frederik", "friedrich", "fritz", "georg", "gero", "gregor", "gunnar",
    "gustav", "hagen", "hanno", "harry", "heiko", "hendrik", "henning", "hermann", "hubert",
    "ingo", "janosch", "jens", "jerome", "jochen", "joachim", "johannes", "jonathan", "jörg",
    "joerg", "jörn", "joern", "julius", "jürgen", "kai", "karsten", "kenneth", "kilian",
    "konrad", "kurt", "lars", "lasse", "laurenz", "lennard", "lennart", "leo", "leopold",
    "lorenz", "lothar", "louis", "ludwig", "lutz", "malte", "manuel", "marc", "marcel",
    "marco", "marius", "mark", "marko", "marvin", "matteo", "matthäus", "maurice", "maxim",
    "mehmet", "mert", "michel", "milan", "mirko", "moritz", "mustafa", "nabil", "nils",
    "olaf", "oskar", "oscar", "oskar", "otmar", "pascal", "patrik", "philipp", "phillip",
    "pierre", "rainer", "ralf", "ralph", "reinhard", "rene", "rené", "richard", "robin",
    "roger", "roland", "rolf", "roman", "ronald", "ruben", "rüdiger", "ruediger", "sascha",
    "sebastian", "siegfried", "sigurd", "silvan", "sönke", "soenke", "stefan", "steffen",
    "sven", "swen", "thorsten", "till", "timo", "timon", "titus", "torben", "torsten",
    "udo", "ulrich", "valentin", "viktor", "vincent", "volker", "waldemar", "wenzel",
    "wilfried", "willi", "winfried", "xaver", "yannick", "yannik", "yusuf",
  ].map((n) => n.toLowerCase()),
);

/** Unisex — bei Treffer kein sicheres m/w. */
const UNISEX_FIRST_NAMES = new Set(
  ["alex", "andi", "chris", "jordan", "kim", "robin", "sascha", "nikola", "jule", "michel"].map(
    (n) => n.toLowerCase(),
  ),
);

export function inferGenderFromFirstName(
  firstName: string | null | undefined,
): NormalizedGender | null {
  const key = (firstName ?? "").trim().toLowerCase().split(/\s+/)[0] ?? "";
  if (!key || key.length < 2) return null;
  if (key === "mitglied") return "m";
  if (UNISEX_FIRST_NAMES.has(key)) return null;
  if (FEMALE_FIRST_NAMES.has(key)) return "w";
  if (MALE_FIRST_NAMES.has(key)) return "m";
  return null;
}
