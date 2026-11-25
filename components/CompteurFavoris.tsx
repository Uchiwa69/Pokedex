"use client";

import { useFavoris } from "@/stores/favoris";

// Le nombre de favoris, affiché dans l'en-tête à côté du lien « Favoris ».
// Petite feuille client : le reste du menu (LiensNavigation) peut rester rendu par le serveur.
export default function CompteurFavoris() {
  // Le sélecteur renvoie UN nombre : le compteur n'est re-rendu que si ce nombre change.
  const nombre = useFavoris((etat) => etat.noms.length);

  // Aucun favori : rien à afficher. C'est aussi le cas au premier rendu, côté serveur comme côté navigateur
  // (le localStorage n'est relu qu'après l'hydratation), donc pas d'erreur d'hydratation.
  if (nombre === 0) return null;

  return (
    // Téléphone : pastille posée dans le coin du lien (absolute), pour ne pas élargir un menu déjà serré.
    // À partir de sm : elle prend place à la suite du libellé (static).
    // Pastille rouge pleine, chiffre blanc : lisible dans les deux thèmes, sur l'onglet actif comme inactif.
    <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent-plein px-1.5 text-[11px] font-semibold leading-5 text-sur-accent tabular-nums sm:static">
      {nombre}
      {/* Lu par les lecteurs d'écran après le libellé du lien : « Favoris 3 enregistrés ». */}
      <span className="sr-only"> {nombre > 1 ? "enregistrés" : "enregistré"}</span>
    </span>
  );
}
