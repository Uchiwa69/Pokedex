"use client";

// Le grand titre de l'accueil, écrit avec des milliers de petits points qui se rassemblent à l'arrivée,
// s'écartent du pointeur et éclatent au clic. Le dessin est fait par ParticleText (repris tel quel de React
// Bits) ; ce composant-ci le branche sur notre site : police des titres, couleurs de nos jetons, hauteur.
//
// Accessibilité : un canvas n'est pas du texte. Le vrai titre de la page est donc un <h1> ordinaire, masqué
// à l'œil (sr-only) mais lu par les lecteurs d'écran et les moteurs de recherche ; le dessin, lui, est caché
// aux lecteurs d'écran (aria-hidden), pour que le titre ne soit pas lu deux fois.

import { useSyncExternalStore } from "react";
import ParticleText from "@/components/ParticleText";

// Un canvas ne comprend pas « var(--color-accent) » : il lui faut la vraie couleur, lue dans les styles de
// la page. useSyncExternalStore donne une valeur au serveur (qui n'a pas de page) et une autre au
// navigateur, sans erreur d'hydratation.
const sansAbonnement = () => () => {};
const lireAccent = () => getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "currentColor";

// Petit écran (moins de 640 px, le seuil « sm » de Tailwind) ? On s'abonne au changement, pour suivre un
// téléphone que l'on tourne ou une fenêtre que l'on redimensionne.
const PETIT_ECRAN = "(max-width: 639px)";
function abonnerTaille(rappel: () => void) {
  const media = window.matchMedia(PETIT_ECRAN);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}

export default function TitreParticules({ texte }: { texte: string }) {
  const accent = useSyncExternalStore(sansAbonnement, lireAccent, () => "currentColor");
  // Sur téléphone, le titre sur une seule ligne donnait des lettres trop petites pour être dessinées en
  // points : il devenait illisible. On l'écrit donc sur DEUX lignes (« Tous les » / « Pokémon »), en plus
  // gros : une zone de particules par ligne.
  const petit = useSyncExternalStore(abonnerTaille, () => window.matchMedia(PETIT_ECRAN).matches, () => false);
  const coupure = texte.lastIndexOf(" ");
  const lignes = petit && coupure > 0 ? [texte.slice(0, coupure), texte.slice(coupure + 1)] : [texte];

  return (
    <>
      <h1 className="sr-only">{texte}</h1>
      {/* font-titre + text-texte : ParticleText reprend la police et la couleur de son conteneur.
          La hauteur laisse de la place aux points qui arrivent de loin. */}
      <div aria-hidden="true" className="flex w-full flex-col font-titre text-texte">
        {lignes.map((ligne) => (
          // key = le texte de la ligne : en passant d'une à deux lignes, les zones sont recréées.
          <div key={ligne} className="h-20 w-full sm:h-44 lg:h-52">
            <ParticleText
              text={ligne}
              // min-h-0! : annule la hauteur minimale de 240 px du composant, trop haute pour un téléphone.
              className="min-h-0!"
              // Taille des lettres. Le composant la réduit tout seul si la ligne dépasse la largeur.
              fontSize={petit ? "17vw" : "clamp(2.5rem, 9vw, 6.5rem)"}
              fontWeight={700} // la plus grasse que notre police des titres (Chakra Petch) charge
              color="currentColor"
              highlightColor={accent} // les points déplacés prennent la couleur d'accent
              particleSize={petit ? 1.9 : 2.2} // taille d'un point
              density={4} // un point tous les 4 pixels du texte
              scatter={petit ? 110 : 190} // distance d'où arrivent les points
              gatherDuration={1600}
              stagger={420}
              pointerRepel={42}
              repelRadius={120}
              idleDrift={0.8}
            />
          </div>
        ))}
      </div>
    </>
  );
}
