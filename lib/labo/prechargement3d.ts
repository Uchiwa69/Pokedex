// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche) — préchargement des modèles 3D de la sacoche.
// Idée : dès qu'un Pokémon entre dans la sacoche, on télécharge son modèle en arrière-plan et on le range
// dans le stockage du navigateur. Quand on ouvre la sacoche, le modèle est déjà là : pas d'attente.
// Ce fichier ne s'utilise que dans le navigateur (composants client).

import type { RolesAnimation } from "@/lib/labo/modeles3d";

export type InfoModele = {
  url: string; // adresse du fichier du modèle
  roles: RolesAnimation;
  animations: string[];
  ko: number;
};

// Nom de notre « casier » dans le Cache Storage du navigateur (l'API `caches`).
// On range les fichiers nous-mêmes : le cache ordinaire du navigateur ne les garderait que 5 minutes.
const CASIER = "pokedex-modeles-3d";

// Une seule demande par Pokémon : on garde la PROMESSE, pas le résultat. Deux appels simultanés
// partagent ainsi la même requête au lieu d'en lancer deux.
const infos = new Map<number, Promise<InfoModele | null>>();
const telechargements = new Map<number, Promise<void>>();

// Renseignements sur le modèle d'un Pokémon (null = pas de modèle présentable).
export function lireInfoModele(id: number): Promise<InfoModele | null> {
  let promesse = infos.get(id);
  if (!promesse) {
    promesse = fetch(`/api/modele3d/${id}`)
      .then((reponse) => (reponse.ok ? (reponse.json() as Promise<InfoModele | null>) : null))
      .catch(() => null);
    infos.set(id, promesse);
  }
  return promesse;
}

// Télécharge le modèle et le range dans le casier, s'il n'y est pas déjà.
export function prechargerModele(id: number): Promise<void> {
  let promesse = telechargements.get(id);
  if (!promesse) {
    promesse = (async () => {
      const info = await lireInfoModele(id);
      if (!info || !("caches" in window)) return;
      const casier = await caches.open(CASIER);
      if (!(await casier.match(info.url))) await casier.add(info.url); // add = télécharger + ranger
    })().catch(() => {
      // Échec (hors ligne, stockage plein…) : on oublie la tentative pour pouvoir réessayer plus tard.
      telechargements.delete(id);
    });
    telechargements.set(id, promesse);
  }
  return promesse;
}

export type ModeleOuvert = InfoModele & {
  adresse: string; // adresse à donner à la visionneuse
  liberer: () => void; // à appeler quand on n'en a plus besoin
};

// Prépare le modèle pour l'affichage. S'il est dans le casier, on fabrique une adresse locale (blob:)
// qui pointe vers le fichier déjà en mémoire : le chargement est alors immédiat.
export async function ouvrirModele(id: number): Promise<ModeleOuvert | null> {
  const info = await lireInfoModele(id);
  if (!info) return null;
  try {
    await prechargerModele(id); // déjà fait la plupart du temps ; sinon on attend la fin du téléchargement
    const casier = await caches.open(CASIER);
    const reponse = await casier.match(info.url);
    if (reponse) {
      const adresse = URL.createObjectURL(await reponse.blob());
      return { ...info, adresse, liberer: () => URL.revokeObjectURL(adresse) };
    }
  } catch {
    // Pas de casier disponible : on lira le fichier directement en ligne.
  }
  return { ...info, adresse: info.url, liberer: () => {} };
}
