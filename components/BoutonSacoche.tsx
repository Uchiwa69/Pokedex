"use client";

import type { Pokemon } from "@/lib/conversion";
import { TAILLE_MAX_SACOCHE, useSacoche } from "@/stores/sacoche";

type Props = {
  pokemon: Pokemon;
  // "complet" : bouton avec texte (fiche). "rapide" : petite icône (carte de la grille).
  variante?: "complet" | "rapide";
};

export default function BoutonSacoche({ pokemon, variante = "complet" }: Props) {
  // Un sélecteur par valeur, chacun renvoie un booléen ou une fonction (jamais un objet créé à la volée).
  const dedans = useSacoche((etat) => etat.membres.some((m) => m.pokemon.nom === pokemon.nom));
  const pleine = useSacoche((etat) => etat.membres.length >= TAILLE_MAX_SACOCHE);
  const ajouter = useSacoche((etat) => etat.ajouter);
  const retirer = useSacoche((etat) => etat.retirer);

  // Sacoche pleine et Pokémon absent : on ne peut rien faire. Le bouton est désactivé pour
  // l'expliquer, mais la vraie protection est dans le store (ajouter refuse de toute façon).
  const bloque = pleine && !dedans;

  const libelle = dedans
    ? `Retirer ${pokemon.nomFr} de la sacoche`
    : bloque
      ? `Sacoche pleine (${TAILLE_MAX_SACOCHE} sur ${TAILLE_MAX_SACOCHE})`
      : `Ajouter ${pokemon.nomFr} à la sacoche`;

  function surClic() {
    if (dedans) retirer(pokemon.nom);
    else ajouter(pokemon);
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
        className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-piste disabled:opacity-40 ${
          dedans ? "text-accent" : "text-texte-doux"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Sac */}
          <path d="M6 8h12l1 12H5L6 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          {/* Coche si le Pokémon est dedans, sinon un « + » */}
          {dedans ? <path d="M9 14l2 2 4-4" /> : <path d="M12 12v4M10 14h4" />}
        </svg>
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
      {dedans ? "Retirer de la sacoche" : bloque ? "Sacoche pleine (6 sur 6)" : "Ajouter à la sacoche"}
    </button>
  );
}
