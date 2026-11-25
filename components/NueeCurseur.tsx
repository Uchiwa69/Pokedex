"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import SwarmCursor from "@/components/SwarmCursor";

// Une nuée de petits points lumineux derrière le contenu de l'en-tête et du pied de page.
// Elle se promène seule, suit le pointeur, entoure le lien survolé et éclate au clic.
// Le moteur (components/SwarmCursor.tsx) vient de React Bits et n'est pas modifié : ce composant ne fait que
// le régler pour le site (couleurs du thème, quantité de points adaptée à une bande étroite, animations réduites).
//
// NOTION DU COURS : ce composant est client, mais ses `children` restent des composants SERVEUR.
// EnTete et PiedDePage (serveur) lui passent leur contenu déjà rendu : "use client" ne « contamine » pas les enfants.

// Réglages par zone. Une table plutôt que des props libres : les deux bandes n'ont pas la même hauteur.
// Sur le site de React Bits la nuée a tout l'écran (800 points, rayon 90) ; ici elle vit dans une bande
// de 60 à 100 px de haut, d'où moins de points et un rayon plus petit, sinon elle déborde et se fait couper.
const REGLAGES = {
  entete: { nombre: 260, rayon: 44, taille: 2.2 },
  pied: { nombre: 320, rayon: 56, taille: 2.4 },
};

const REQUETE_REDUIT = "(prefers-reduced-motion: reduce)";

// --- Lire les animations réduites (même méthode que dans IntroPokedex) ---
// useSyncExternalStore : React s'abonne à une source extérieure (ici une media query) et se re-rend quand elle
// change. Côté serveur, la 3e fonction donne la valeur de départ : pas d'erreur d'hydratation.
function abonnerReduit(prevenir: () => void) {
  const requete = window.matchMedia(REQUETE_REDUIT);
  requete.addEventListener("change", prevenir);
  return () => requete.removeEventListener("change", prevenir);
}
const lireReduit = () => window.matchMedia(REQUETE_REDUIT).matches;
const reduitServeur = () => false;

// --- Lire les couleurs du thème ---
// Le canvas WebGL ne comprend pas var(--color-accent) : on lit la VALEUR des jetons sur <html>.
// On renvoie une seule chaîne (« couleur|couleur ») : useSyncExternalStore compare les valeurs avec Object.is,
// un objet recréé à chaque lecture provoquerait un re-rendu sans fin.
const abonnerCouleurs = () => () => {}; // le thème est sombre uniquement : les jetons ne changent jamais
function lireCouleurs() {
  const styles = getComputedStyle(document.documentElement);
  return `${styles.getPropertyValue("--color-accent").trim()}|${styles.getPropertyValue("--color-accent-bis").trim()}`;
}
const couleursServeur = () => "|";

export default function NueeCurseur({ zone, children }: { zone: keyof typeof REGLAGES; children: ReactNode }) {
  const reduit = useSyncExternalStore(abonnerReduit, lireReduit, reduitServeur);
  const [accent, accentBis] = useSyncExternalStore(abonnerCouleurs, lireCouleurs, couleursServeur).split("|");
  const reglages = REGLAGES[zone];

  return (
    <SwarmCursor
      count={reglages.nombre}
      spread={reglages.rayon}
      size={reglages.taille}
      swirl={0.6}
      clickEffect="burst"
      // Points de la couleur d'accent ; ils virent au cyan quand ils vont vite ou au clic.
      // Chaîne vide (rendu serveur) → SwarmCursor prend sa couleur par défaut, le temps de l'hydratation.
      color={accent}
      accentColor={accentBis}
      // Animations réduites : la nuée n'est pas dessinée du tout (le contenu, lui, est toujours là).
      enabled={!reduit}
    >
      {children}
    </SwarmCursor>
  );
}
