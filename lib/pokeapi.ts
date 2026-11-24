// Accès à la PokéAPI côté SERVEUR.
// Chaque fonction commence par "use cache" : son résultat est mis en cache (la clé du cache,
// ce sont ses arguments). cacheLife("days") : la donnée est considérée fraîche pendant des jours,
// ce qui convient très bien ici car les Pokémon ne changent pas.

import { cacheLife } from "next/cache";
import { choisirMeilleuresAttaques, type TableEfficacite } from "@/lib/combat";
import {
  aplatir,
  convertirAttaque,
  convertirEspece,
  convertirPokemon,
  convertirRelations,
  extraireApprentissages,
  extraireId,
  type Apprentissage,
  type Attaque,
  type AttaqueBrute,
  type ChaineBrute,
  type Espece,
  type EspeceBrute,
  type Pokemon,
  type PokemonBrut,
  type TypeBrut,
} from "@/lib/conversion";
import { filtrerNoms, normaliser } from "@/lib/recherche";
import { NOMS_TYPES, type NomType } from "@/lib/types";

const API = "https://pokeapi.co/api/v2";

// Le Pokédex national s'arrête au n° 1025 (au-delà, l'API liste des formes spéciales).
export const TOTAL_POKEMONS = 1025;
export const PAR_PAGE = 24;

// ---- Appels à l'API : relancés en cas d'échec passager ----
// Une page de la liste demande 24 Pokémon d'un coup. Si UN seul de ces appels échouait (connexion
// refusée, délai dépassé), toute la page tombait sur l'écran d'erreur. Un appel qui échoue pour une
// raison passagère est donc retenté, jusqu'à 3 essais.
// (Pas de file d'attente partagée entre les visites : si un rendu est interrompu en cours de route,
// sa place ne serait jamais rendue et les visites suivantes resteraient bloquées.)
const ESSAIS = 3;
const DELAI_MAX = 6000; // millisecondes avant d'abandonner un essai

const pause = (ms: number) => new Promise((resoudre) => setTimeout(resoudre, ms));

// Lit une adresse de l'API et distingue trois situations :
// - 404 → la ressource n'existe pas → on renvoie null (la page appellera notFound()) ;
// - échec passager (réseau, délai dépassé, erreur 5xx, trop de requêtes) → on retente ;
// - échec après tous les essais → on lève une erreur (captée par error.tsx).
async function lire<T>(url: string): Promise<T | null> {
  const texte = await lireTexte(url);
  return texte === null ? null : (JSON.parse(texte) as T);
}

// Même chose, mais renvoie le texte brut (utile pour un fichier qui n'est pas du JSON).
async function lireTexte(url: string): Promise<string | null> {
  for (let essai = 1; ; essai++) {
    try {
      // AbortSignal.timeout : abandonne l'essai s'il dure trop longtemps, au lieu de bloquer la page.
      const reponse = await fetch(url, { signal: AbortSignal.timeout(DELAI_MAX) });
      if (reponse.status === 404) return null;
      if (reponse.ok) return await reponse.text();
      // Une erreur 4xx (autre que 429) ne changera pas en réessayant : on arrête tout de suite.
      if (reponse.status < 500 && reponse.status !== 429) essai = ESSAIS;
      throw new Error(`Réponse ${reponse.status} pour ${url}`);
    } catch (erreur) {
      if (essai >= ESSAIS) throw erreur;
      await pause(300 * essai); // petite attente, un peu plus longue à chaque essai
    }
  }
}

// Nom français et adresse de la chaîne d'évolution d'une espèce.
export async function recupererEspece(nom: string): Promise<Espece | null> {
  "use cache";
  cacheLife("days");

  const brute = await lire<EspeceBrute>(`${API}/pokemon-species/${encodeURIComponent(nom)}`);
  return brute ? convertirEspece(brute) : null;
}

// Un Pokémon complet, ou null s'il n'existe pas.
export async function recupererPokemon(nom: string): Promise<Pokemon | null> {
  // "use cache: remote" : variante de "use cache" dont le résultat est rangé dans un cache PARTAGÉ et durable
  // de l'hébergeur. Sur Vercel, le cache ordinaire vit dans la mémoire d'une fonction qui s'éteint après
  // chaque visite : sans « remote », chaque filtre relançait ses appels à la PokéAPI.
  "use cache: remote";
  cacheLife("days");

  const brut = await lire<PokemonBrut>(`${API}/pokemon/${encodeURIComponent(nom.toLowerCase())}`);
  if (!brut) return null;

  // Le nom français n'est pas dans /pokemon mais dans /pokemon-species.
  const espece = await recupererEspece(brut.species.name);
  return convertirPokemon(brut, espece);
}

type ListeBrute = {
  results: { name: string }[];
};

// Les noms (anglais) des 1 025 Pokémon, dans l'ordre du Pokédex. Une seule requête.
export async function recupererTousLesNoms(): Promise<string[]> {
  "use cache: remote"; // cache partagé : voir recupererPokemon
  cacheLife("days");

  const brute = await lire<ListeBrute>(`${API}/pokemon?limit=${TOTAL_POKEMONS}&offset=0`);
  if (!brute) throw new Error("La liste des Pokémon est introuvable.");
  return brute.results.map((r) => r.name);
}

// La même adresse /type/{nom} donne aussi la liste des Pokémon de ce type.
type PokemonsDuTypeBruts = {
  pokemon: { pokemon: { name: string; url: string } }[];
};

// Les noms des Pokémon d'un type donné (limités au Pokédex national), dans l'ordre des numéros.
export async function recupererNomsDuType(type: NomType): Promise<string[]> {
  "use cache: remote"; // cache partagé : voir recupererPokemon
  cacheLife("days");

  const brut = await lire<PokemonsDuTypeBruts>(`${API}/type/${type}`);
  if (!brut) return [];

  return brut.pokemon
    .map((entree) => ({ nom: entree.pokemon.name, id: extraireId(entree.pokemon.url) }))
    .filter((entree) => entree.id <= TOTAL_POKEMONS)
    .sort((a, b) => a.id - b.id)
    .map((entree) => entree.nom);
}

// Adresse du fichier des noms d'espèces dans toutes les langues, publié par le projet PokéAPI.
// L'API elle-même ne donne le nom français qu'espèce par espèce : il faudrait 1025 appels pour
// chercher « Dracaufeu ». Ce fichier CSV (un tableau en texte) les contient tous en un seul appel.
const NOMS_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv";
const LANGUE_FRANCAIS = "5"; // numéro du français dans les données de la PokéAPI

// Table « identifiant anglais → nom français normalisé » : { charizard: "dracaufeu", "mr-mime": "m-mime", … }.
// Sert uniquement à la recherche ; l'affichage continue d'utiliser le nom français de chaque Pokémon.
export async function recupererNomsFrancais(): Promise<Record<string, string>> {
  "use cache: remote"; // cache partagé : voir recupererPokemon
  cacheLife("days");

  try {
    const [csv, noms] = await Promise.all([lireTexte(NOMS_CSV), recupererTousLesNoms()]);
    const table: Record<string, string> = {};
    // Chaque ligne du fichier : numéro de l'espèce, numéro de la langue, nom, catégorie.
    for (const ligne of (csv ?? "").split("\n")) {
      const [numero, langue, nom] = ligne.split(",");
      const identifiant = noms[Number(numero) - 1]; // le Pokémon n° 6 est le 6e de la liste
      if (langue === LANGUE_FRANCAIS && identifiant && nom) table[identifiant] = normaliser(nom);
    }
    return table;
  } catch {
    // Fichier indisponible : la recherche continue de fonctionner sur les noms anglais.
    // On ne garde ce résultat vide que quelques minutes, pour réessayer bientôt.
    cacheLife("minutes");
    return {};
  }
}

export type ResultatListe = {
  pokemons: Pokemon[];
  total: number; // nombre total de résultats (toutes pages confondues)
  page: number; // page réellement affichée
  totalPages: number;
};

// Les Pokémon d'une page de la grille, après recherche et filtre par type.
// Les arguments ont déjà été validés par validerFiltres (lib/recherche.ts).
export async function recupererListe(q: string, type: NomType | null, page: number): Promise<ResultatListe> {
  "use cache";
  cacheLife("days");

  // 1. Point de départ : tous les noms, ou seulement ceux du type demandé.
  const noms = type ? await recupererNomsDuType(type) : await recupererTousLesNoms();

  // 2. Recherche sur les noms, anglais ou français (on ne charge pas encore les Pokémon).
  //    La table des noms français n'est lue que s'il y a bien une recherche.
  const trouves = q ? filtrerNoms(noms, q, await recupererNomsFrancais()) : noms;

  // 3. Pagination. Une page trop grande (?page=9999) est ramenée à la dernière page.
  const total = trouves.length;
  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const pageReelle = Math.min(page, totalPages);
  const debut = (pageReelle - 1) * PAR_PAGE;
  const nomsDeLaPage = trouves.slice(debut, debut + PAR_PAGE);

  // 4. Promise.all : les 24 requêtes partent EN PARALLÈLE (au lieu de l'une après l'autre).
  const pokemons = await Promise.all(nomsDeLaPage.map((nom) => recupererPokemon(nom)));

  return {
    // On retire les éventuels null, en l'expliquant à TypeScript avec une garde de type.
    pokemons: pokemons.filter((p): p is Pokemon => p !== null),
    total,
    page: pageReelle,
    totalPages,
  };
}

// Tous les Pokémon de la chaîne d'évolution d'une espèce, dans l'ordre (ex. Salamèche, Reptincel, Dracaufeu).
export async function recupererEvolutions(nomEspece: string): Promise<Pokemon[]> {
  "use cache";
  cacheLife("days");

  const espece = await recupererEspece(nomEspece);
  if (!espece || !espece.urlEvolutions) return [];

  const chaine = await lire<ChaineBrute>(espece.urlEvolutions);
  if (!chaine) return [];

  // L'arbre devient une liste de numéros, puis on charge chaque Pokémon en parallèle.
  const ids = aplatir(chaine.chain);
  const pokemons = await Promise.all(ids.map((id) => recupererPokemon(String(id))));
  return pokemons.filter((p): p is Pokemon => p !== null);
}

// Une attaque (par son nom anglais ou son numéro), ou null si elle n'existe pas.
export async function recupererAttaque(id: string): Promise<Attaque | null> {
  "use cache";
  cacheLife("days");

  const brute = await lire<AttaqueBrute>(`${API}/move/${encodeURIComponent(id)}`);
  return brute ? convertirAttaque(brute) : null;
}

// Les attaques qu'un Pokémon apprend par montée de niveau : noms et niveaux seulement.
export async function recupererApprentissages(nom: string): Promise<Apprentissage[]> {
  "use cache";
  cacheLife("days");

  const brut = await lire<PokemonBrut>(`${API}/pokemon/${encodeURIComponent(nom.toLowerCase())}`);
  return brut ? extraireApprentissages(brut) : [];
}

export type AttaqueApprise = {
  niveau: number;
  attaque: Attaque;
};

// Les mêmes attaques, complètes (nom FR, type, puissance…), triées par niveau.
// "use cache" ordinaire : c'est ce qui permet à Next de PRÉCHARGER l'onglet Attaques avant le clic
// (voir components/LiensOnglets.tsx). Le vrai travail est fait par chargerAttaquesParNiveau.
export async function recupererAttaquesParNiveau(nom: string): Promise<AttaqueApprise[]> {
  "use cache";
  cacheLife("days");

  return chargerAttaquesParNiveau(nom);
}

// "use cache: remote" : la liste complète d'un Pokémon est rangée dans le cache PARTAGÉ et durable de
// l'hébergeur (voir recupererPokemon). Sans cela, sur Vercel, chaque nouvelle fonction relançait une
// requête à la PokéAPI par attaque (une vingtaine) à la première ouverture de l'onglet.
async function chargerAttaquesParNiveau(nom: string): Promise<AttaqueApprise[]> {
  "use cache: remote";
  cacheLife("days");

  const apprentissages = await recupererApprentissages(nom);
  // Une requête par attaque, toutes lancées en parallèle.
  const attaques = await Promise.all(apprentissages.map((a) => recupererAttaque(a.nom)));

  const resultat: AttaqueApprise[] = [];
  attaques.forEach((attaque, index) => {
    if (attaque) resultat.push({ niveau: apprentissages[index].niveau, attaque });
  });
  return resultat;
}

// Les 4 meilleures attaques offensives d'un Pokémon : celles que reçoit par défaut un membre de la sacoche.
export async function recupererMeilleuresAttaques(nom: string): Promise<Attaque[]> {
  "use cache";
  cacheLife("days");

  const pokemon = await recupererPokemon(nom);
  if (!pokemon) return [];
  const apprises = await recupererAttaquesParNiveau(nom);
  return choisirMeilleuresAttaques(
    apprises.map((a) => a.attaque),
    pokemon.types,
  );
}

// La table d'efficacité complète des 18 types (18 requêtes en parallèle, mises en cache).
export async function recupererTypes(): Promise<TableEfficacite> {
  "use cache";
  cacheLife("days");

  const lignes = await Promise.all(
    NOMS_TYPES.map(async (type) => {
      const brut = await lire<TypeBrut>(`${API}/type/${type}`);
      if (!brut) throw new Error(`Type introuvable : ${type}`);
      return [type, convertirRelations(brut)] as const;
    }),
  );
  // Object.fromEntries transforme la liste de paires [type, ligne] en un objet { type: ligne }.
  return Object.fromEntries(lignes) as TableEfficacite;
}
