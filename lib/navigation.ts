// Les liens du menu principal, partagés entre le serveur et le client.

export type LienNavigation = {
  href: string;
  libelle: string;
};

export const LIENS_NAVIGATION: LienNavigation[] = [
  { href: "/", libelle: "Tous" },
  { href: "/favoris", libelle: "Favoris" },
  { href: "/sacoche", libelle: "Sacoche" },
  { href: "/combat", libelle: "Combat" },
];

// Dit si un lien correspond à la page affichée.
// "Tous" est actif sur l'accueil ET sur les fiches /pokemon/…
export function estLienActif(href: string, chemin: string | null): boolean {
  if (chemin === null) return false;
  if (href === "/") return chemin === "/" || chemin.startsWith("/pokemon/");
  return chemin === href || chemin.startsWith(`${href}/`);
}
