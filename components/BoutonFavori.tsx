"use client";

import { useFavoris } from "@/stores/favoris";

type Props = {
  nom: string; // nom anglais, identifiant dans le store
  nomFr: string; // pour le libellé accessible
  // "carte" : petite icône nue posée sur une carte. "fiche" : bouton rond en verre de 44 px.
  variante?: "carte" | "fiche";
};

// Étoile « favori ». Petite feuille client : le reste de la carte reste un composant serveur.
export default function BoutonFavori({ nom, nomFr, variante = "carte" }: Props) {
  // Sélecteurs Zustand : chacun renvoie UNE seule valeur (un booléen, une fonction).
  // Le composant n'est re-rendu que si CETTE valeur change, pas à chaque changement du store.
  const estFavori = useFavoris((etat) => etat.noms.includes(nom));
  const basculer = useFavoris((etat) => etat.basculer);

  return (
    <button
      type="button"
      onClick={() => basculer(nom)}
      // aria-pressed : bouton à deux états (enfoncé ou non), annoncé par les lecteurs d'écran.
      aria-pressed={estFavori}
      aria-label={estFavori ? `Retirer ${nomFr} des favoris` : `Ajouter ${nomFr} aux favoris`}
      className={`flex items-center justify-center rounded-full hover:bg-piste ${
        variante === "fiche" ? "h-11 w-11 border border-bordure bg-surface" : "h-10 w-10"
      } ${estFavori ? "text-accent" : "text-texte-doux"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={estFavori ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
      </svg>
    </button>
  );
}
