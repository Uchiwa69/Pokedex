"use client";

import type { MouseEvent } from "react";
import { useReducedMotion } from "motion/react";
import Pokeball from "@/components/Pokeball";
import type { Pokemon } from "@/lib/conversion";
import { useEnvol } from "@/stores/envol";
import { TAILLE_MAX_SACOCHE, useSacoche } from "@/stores/sacoche";

type Props = {
  pokemon: Pokemon;
  // "complet" : bouton avec texte (fiche). "rapide" : petite Pokéball (carte de la grille).
  variante?: "complet" | "rapide";
};

// Centre d'un élément dans la fenêtre.
function centre(element: Element) {
  const zone = element.getBoundingClientRect();
  return { x: zone.left + zone.width / 2, y: zone.top + zone.height / 2 };
}

export default function BoutonSacoche({ pokemon, variante = "complet" }: Props) {
  // Un sélecteur par valeur, chacun renvoie un booléen, un nombre ou une fonction (jamais un objet créé à la volée).
  const dedans = useSacoche((etat) => etat.membres.some((m) => m.pokemon.nom === pokemon.nom));
  const nombre = useSacoche((etat) => etat.membres.length);
  const ajouter = useSacoche((etat) => etat.ajouter);
  const retirer = useSacoche((etat) => etat.retirer);
  const lancerEnvol = useEnvol((etat) => etat.lancer);
  // true si l'utilisateur a demandé moins d'animations : pas de Pokéball qui vole.
  const animationsReduites = useReducedMotion();

  // Sacoche pleine et Pokémon absent : on ne peut rien faire. Le bouton est désactivé pour
  // l'expliquer, mais la vraie protection est dans le store (ajouter refuse de toute façon).
  const bloque = nombre >= TAILLE_MAX_SACOCHE && !dedans;

  const libelle = dedans
    ? `Retirer ${pokemon.nomFr} de la sacoche`
    : bloque
      ? `Sacoche pleine (${TAILLE_MAX_SACOCHE} sur ${TAILLE_MAX_SACOCHE})`
      : `Ajouter ${pokemon.nomFr} à la sacoche`;

  function surClic(evenement: MouseEvent<HTMLButtonElement>) {
    if (dedans) {
      retirer(pokemon.nom);
      return;
    }

    // Effet d'ajout : une Pokéball part du bouton et rejoint, dans l'en-tête, l'emplacement qui va
    // être rempli (le premier libre, donc celui qui porte le numéro « nombre »).
    // On lit les positions ICI, dans le gestionnaire du clic : c'est le bon endroit pour interroger le DOM.
    const cible = document.getElementById("emplacements-sacoche")?.children[nombre];
    if (cible && !animationsReduites) {
      lancerEnvol(centre(evenement.currentTarget), centre(cible), nombre);
    }
    ajouter(pokemon);
  }

  if (variante === "rapide") {
    return (
      <button
        type="button"
        onClick={surClic}
        disabled={bloque}
        aria-pressed={dedans}
        aria-label={libelle}
        title={libelle}
        className="group flex h-10 w-10 items-center justify-center rounded-full text-texte-doux hover:bg-piste hover:text-texte disabled:opacity-40"
      >
        {/* Pokéball pleine si le Pokémon est dans la sacoche, simple contour sinon.
            Elle grossit un peu au survol (transform seulement, pas en animations réduites). */}
        <Pokeball
          vide={!dedans}
          className="h-5 w-5 transition-transform duration-200 group-hover:scale-125 group-disabled:scale-100 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={surClic}
      disabled={bloque}
      aria-pressed={dedans}
      className={`bouton disabled:opacity-60 ${dedans ? "bouton-secondaire" : "bouton-principal"}`}
    >
      <Pokeball vide={!dedans} className="h-5 w-5" />
      {dedans ? "Retirer de la sacoche" : bloque ? "Sacoche pleine (6 sur 6)" : "Ajouter à la sacoche"}
    </button>
  );
}
