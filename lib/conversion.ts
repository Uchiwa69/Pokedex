// Conversion : réponse BRUTE de la PokéAPI → NOS types.
// Le reste de l'application ne connaît que nos types (Pokemon, Espece) : si l'API change,
// il n'y a que ce fichier à corriger. Ce sont des fonctions pures (pas de fetch ici).

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
