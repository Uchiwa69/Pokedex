// PROTOTYPE (branche feature/pokemon-3d-viewer) — catalogue des modèles 3D.
// Le fichier modeles3d.json est GÉNÉRÉ à partir d'un recensement des 1 025 modèles de Pokemon-3D-api
// (présence, poids, animations, défauts). Il évite d'interroger leur API à chaque visite et permet
// de décider à l'avance quels modèles sont présentables.

import donnees from "./modeles3d.json";

// - "anime"    : le modèle a ses animations d'origine (classes A et B du recensement) ;
// - "statique" : modèle correct mais sans animation utile → animation générique ;
// - "exclu"    : modèle présent mais jugé non présentable (bras en croix, raide, cassé) → repli 2D ;
// - "absent"   : aucun fichier → repli 2D.
export type EtatModele = "anime" | "statique" | "exclu" | "absent";

// Rôle d'une animation → nom du clip dans le fichier du modèle.
export type RoleAnimation = "attente" | "physique" | "speciale" | "degat" | "ko" | "koBoucle" | "marche" | "rugissement";
export type RolesAnimation = Partial<Record<RoleAnimation, string>>;

export type Forme3D = {
  forme: string; // "regular", "shiny", "mega"…
  fichier: string; // chemin relatif à la base
  ko: number;
  triangles: number;
  os: number;
  roles: RolesAnimation;
  animations: string[];
};

export type Modele3D = {
  id: number;
  nom: string;
  etat: EtatModele;
  classe: string; // A, B, C, D ou M (voir le recensement)
  fichier?: string;
  ko?: number;
  triangles?: number;
  os?: number;
  roles?: RolesAnimation;
  animations?: string[];
  defauts?: string;
  auteur?: string;
  licence?: string;
  source?: string;
  formes?: Forme3D[];
};

// Version allégée pour la liste (envoyée au navigateur) : pas besoin des noms d'animations.
export type ResumeModele = Pick<Modele3D, "id" | "nom" | "etat" | "classe">;

const catalogue = donnees as unknown as { base: string; modeles: Modele3D[] };

export const BASE_MODELES = catalogue.base;

export function obtenirModele(id: number): Modele3D | null {
  // Les modèles sont rangés par numéro : le n° 1 est à l'indice 0.
  return catalogue.modeles[id - 1] ?? null;
}

export function listerModeles(): ResumeModele[] {
  return catalogue.modeles.map(({ id, nom, etat, classe }) => ({ id, nom, etat, classe }));
}

// Compte les modèles par état, pour le bandeau d'information.
export function compterParEtat(): Record<EtatModele, number> {
  const compte: Record<EtatModele, number> = { anime: 0, statique: 0, exclu: 0, absent: 0 };
  for (const modele of catalogue.modeles) compte[modele.etat] += 1;
  return compte;
}

// La forme demandée (normale par défaut), ou null si elle n'existe pas.
export function choisirForme(modele: Modele3D, forme: string): Forme3D | null {
  if (forme !== "regular") {
    return modele.formes?.find((f) => f.forme === forme) ?? null;
  }
  if (!modele.fichier) return null;
  return {
    forme: "regular",
    fichier: modele.fichier,
    ko: modele.ko ?? 0,
    triangles: modele.triangles ?? 0,
    os: modele.os ?? 0,
    roles: modele.roles ?? {},
    animations: modele.animations ?? [],
  };
}
