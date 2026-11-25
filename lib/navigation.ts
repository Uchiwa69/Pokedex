// Les liens du menu principal, partagés entre le serveur et le client.

// Nom de l'icône affichée à côté du libellé (dessinée dans components/IconeNavigation.tsx).
export type NomIcone = "grille" | "etoile" | "sac" | "eclair" | "question" | "carte";

export type LienNavigation = {
  href: string;
  libelle: string;
  icone: NomIcone;
};

export const LIENS_NAVIGATION: LienNavigation[] = [
  { href: "/", libelle: "Tous", icone: "grille" },
  { href: "/favoris", libelle: "Favoris", icone: "etoile" },
  { href: "/sacoche", libelle: "Sacoche", icone: "sac" },
  { href: "/combat", libelle: "Combat", icone: "eclair" },
  { href: "/quiz", libelle: "Quiz", icone: "question" },
  { href: "/atelier", libelle: "Atelier", icone: "carte" },
];

// Dit si un lien correspond à la page affichée.
// "Tous" est actif sur l'accueil ET sur les fiches /pokemon/…
export function estLienActif(href: string, chemin: string | null): boolean {
  if (chemin === null) return false;
  if (href === "/") return chemin === "/" || chemin.startsWith("/pokemon/");
  return chemin === href || chemin.startsWith(`${href}/`);
}
