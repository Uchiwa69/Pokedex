// Conversion : réponse BRUTE de la PokéAPI → NOS types.
// Le reste de l'application ne connaît que nos types (Pokemon, Espece) : si l'API change,
// il n'y a que ce fichier à corriger. Ce sont des fonctions pures (pas de fetch ici).

import type { TableEfficacite } from "@/lib/combat";
import { estUnType, type NomType } from "@/lib/types";

// ---------- Nos types ----------

export type Stats = {
  pv: number;
  attaque: number;
  defense: number;
  attaqueSpe: number;
  defenseSpe: number;
  vitesse: number;
};

export type Pokemon = {
  id: number;
  nom: string; // identifiant anglais de l'API, utilisé dans l'adresse : "charizard"
  nomFr: string; // nom affiché : "Dracaufeu"
  espece: string; // nom de l'espèce dans l'API (sert à retrouver la chaîne d'évolution)
  types: NomType[]; // en anglais, traduits à l'affichage via TYPES
  taille: number; // en mètres
  poids: number; // en kilogrammes
  stats: Stats;
  artwork: string | null; // illustration officielle
  spriteFace: string | null; // GIF animé Showdown, de face
  spriteDos: string | null; // GIF animé Showdown, de dos
  cri: string | null; // adresse du fichier audio
};

export type CategorieAttaque = "physique" | "speciale" | "statut";

export type Attaque = {
  id: number;
  nom: string; // identifiant anglais : "flamethrower"
  nomFr: string; // "Lance-Flammes"
  type: NomType;
  categorie: CategorieAttaque;
  puissance: number | null; // null pour les attaques de statut
  precision: number | null; // en %, null = ne rate jamais
  pp: number;
  description: string; // en français ("" si absente)
};

// Une attaque apprise par montée de niveau : son nom et le niveau d'apprentissage.
export type Apprentissage = {
  nom: string;
  niveau: number;
};

export type Espece = {
  nomFr: string | null;
  urlEvolutions: string | null;
};

// ---------- Types bruts (seulement les champs que nous lisons) ----------

export type PokemonBrut = {
  id: number;
  name: string;
  height: number; // en décimètres
  weight: number; // en hectogrammes
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  species: { name: string };
  sprites: {
    other?: {
      "official-artwork"?: { front_default: string | null };
      showdown?: { front_default: string | null; back_default: string | null };
    };
  };
  cries?: { latest: string | null };
  // Toutes les attaques que le Pokémon peut apprendre, avec le détail par version du jeu.
  moves?: {
    move: { name: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
      version_group: { url: string };
    }[];
  }[];
};

export type AttaqueBrute = {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  type: { name: string };
  damage_class: { name: string } | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
};

export type EspeceBrute = {
  names: { name: string; language: { name: string } }[];
  evolution_chain: { url: string } | null;
};

// Un maillon de la chaîne d'évolution : une espèce, et la liste des espèces en lesquelles elle évolue.
// C'est un ARBRE : chaque maillon contient d'autres maillons (Évoli en a 8).
export type MaillonBrut = {
  species: { name: string; url: string };
  evolves_to: MaillonBrut[];
};

export type ChaineBrute = {
  chain: MaillonBrut;
};

// Réponse de /type/{nom} : contre quels types ce type est fort, faible ou sans effet (en attaque).
export type TypeBrut = {
  damage_relations: {
    double_damage_to: { name: string }[];
    half_damage_to: { name: string }[];
    no_damage_to: { name: string }[];
  };
};

// ---------- Fonctions de conversion ----------

// "mr-mime" → "Mr Mime" : nom de secours quand il n'y a pas de nom français.
export function mettreEnForme(nom: string): string {
  return nom
    .split("-")
    .map((mot) => mot.charAt(0).toUpperCase() + mot.slice(1))
    .join(" ");
}

// Cherche une statistique par son nom anglais dans le tableau brut.
function lireStat(brut: PokemonBrut, nomStat: string): number {
  const trouvee = brut.stats.find((s) => s.stat.name === nomStat);
  return trouvee ? trouvee.base_stat : 0;
}

export function convertirEspece(brute: EspeceBrute): Espece {
  const nomFr = brute.names.find((n) => n.language.name === "fr");
  return {
    nomFr: nomFr ? nomFr.name : null,
    urlEvolutions: brute.evolution_chain ? brute.evolution_chain.url : null,
  };
}

export function convertirPokemon(brut: PokemonBrut, espece: Espece | null): Pokemon {
  return {
    id: brut.id,
    nom: brut.name,
    nomFr: espece?.nomFr ?? mettreEnForme(brut.name),
    espece: brut.species.name,
    // On trie par emplacement (slot) : le premier type est le type principal.
    types: [...brut.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name)
      .filter(estUnType),
    // Unités : l'API donne des décimètres et des hectogrammes → mètres et kilogrammes.
    taille: brut.height / 10,
    poids: brut.weight / 10,
    stats: {
      pv: lireStat(brut, "hp"),
      attaque: lireStat(brut, "attack"),
      defense: lireStat(brut, "defense"),
      attaqueSpe: lireStat(brut, "special-attack"),
      defenseSpe: lireStat(brut, "special-defense"),
      vitesse: lireStat(brut, "speed"),
    },
    // ?. et ?? : ces champs peuvent manquer pour certains Pokémon → null plutôt qu'un plantage.
    artwork: brut.sprites.other?.["official-artwork"]?.front_default ?? null,
    spriteFace: brut.sprites.other?.showdown?.front_default ?? null,
    spriteDos: brut.sprites.other?.showdown?.back_default ?? null,
    cri: brut.cries?.latest ?? null,
  };
}

// 25 → "#0025"
export function formaterNumero(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

// "https://pokeapi.co/api/v2/pokemon-species/4/" → 4
export function extraireId(url: string): number {
  const morceaux = url.split("/").filter((morceau) => morceau !== "");
  return Number(morceaux[morceaux.length - 1]);
}

// Fonction RÉCURSIVE : transforme l'arbre des évolutions en une simple liste de numéros.
// Elle prend le maillon courant, puis s'appelle elle-même sur chacune de ses évolutions.
// La récursion s'arrête toute seule quand evolves_to est vide (flatMap sur [] renvoie []).
// Exemple : Salamèche → Reptincel → Dracaufeu donne [4, 5, 6].
export function aplatir(maillon: MaillonBrut): number[] {
  return [extraireId(maillon.species.url), ...maillon.evolves_to.flatMap(aplatir)];
}

// 0.7 → "0,7 m" (virgule française)
export function formaterMesure(valeur: number, unite: string): string {
  return `${valeur.toLocaleString("fr-FR")} ${unite}`;
}

// Table de correspondance : catégorie de l'API → notre catégorie.
const CATEGORIES: Record<string, CategorieAttaque> = {
  physical: "physique",
  special: "speciale",
  status: "statut",
};

export function convertirAttaque(brute: AttaqueBrute): Attaque {
  const nomFr = brute.names.find((n) => n.language.name === "fr");

  // Plusieurs descriptions françaises existent (une par jeu) : on prend la plus récente, la dernière.
  const descriptionsFr = brute.flavor_text_entries.filter((d) => d.language.name === "fr");
  const derniere = descriptionsFr[descriptionsFr.length - 1];

  return {
    id: brute.id,
    nom: brute.name,
    nomFr: nomFr ? nomFr.name : mettreEnForme(brute.name),
    type: estUnType(brute.type.name) ? brute.type.name : "normal",
    categorie: CATEGORIES[brute.damage_class?.name ?? ""] ?? "statut",
    puissance: brute.power,
    precision: brute.accuracy,
    pp: brute.pp ?? 0,
    // Les descriptions contiennent des retours à la ligne du jeu : on les remplace par des espaces.
    description: derniere ? derniere.flavor_text.replace(/\s+/g, " ").trim() : "",
  };
}

// Attaques apprises par MONTÉE DE NIVEAU, dans la version la plus récente du jeu où le Pokémon existe,
// triées par niveau.
export function extraireApprentissages(brut: PokemonBrut): Apprentissage[] {
  // 1. On aplatit : une ligne par (attaque, version du jeu), en ne gardant que la montée de niveau.
  const lignes = (brut.moves ?? []).flatMap((entree) =>
    entree.version_group_details
      .filter((detail) => detail.move_learn_method.name === "level-up")
      .map((detail) => ({
        nom: entree.move.name,
        niveau: detail.level_learned_at,
        version: extraireId(detail.version_group.url), // plus le numéro est grand, plus le jeu est récent
      })),
  );
  if (lignes.length === 0) return [];

  // 2. On ne garde que la version la plus récente.
  const versionRecente = Math.max(...lignes.map((ligne) => ligne.version));
  const recentes = lignes.filter((ligne) => ligne.version === versionRecente);

  // 3. Tri par niveau, puis une seule ligne par attaque (la première, donc le niveau le plus bas).
  recentes.sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom));
  const dejaVues = new Set<string>();
  const resultat: Apprentissage[] = [];
  for (const ligne of recentes) {
    if (dejaVues.has(ligne.nom)) continue;
    dejaVues.add(ligne.nom);
    resultat.push({ nom: ligne.nom, niveau: ligne.niveau });
  }
  return resultat;
}

// Une ligne de la table d'efficacité : pour UN type d'attaque, le multiplicateur contre chaque type
// de défenseur (2, 0.5 ou 0). Les types absents valent 1.
export function convertirRelations(brut: TypeBrut): TableEfficacite[NomType] {
  const ligne: TableEfficacite[NomType] = {};
  const relations = brut.damage_relations;
  for (const { name } of relations.double_damage_to) if (estUnType(name)) ligne[name] = 2;
  for (const { name } of relations.half_damage_to) if (estUnType(name)) ligne[name] = 0.5;
  for (const { name } of relations.no_damage_to) if (estUnType(name)) ligne[name] = 0;
  return ligne;
}
