"use client";

import Link from "next/link";
import IconeSac from "@/components/IconeSac";
import Pokeball from "@/components/Pokeball";
import { TAILLE_MAX_SACOCHE, useSacoche } from "@/stores/sacoche";

// Indicateur de l'en-tête : un sac, puis 6 emplacements.
// Une Pokéball par Pokémon dans la sacoche, un anneau vide pour chaque place libre.
export default function IndicateurSacoche() {
  // Le sélecteur renvoie un simple nombre : l'indicateur n'est re-rendu que si ce nombre change
  // (renommer un membre, par exemple, ne le touche pas).
  const nombre = useSacoche((etat) => etat.membres.length);

  return (
    <Link
      href="/sacoche"
      aria-label={`Sacoche : ${nombre} Pokémon sur ${TAILLE_MAX_SACOCHE}`}
      className="flex min-h-11 items-center gap-2 rounded-full border border-bordure-verre bg-surface px-3 text-texte-doux hover:bg-piste hover:text-texte"
    >
      <IconeSac className="h-5 w-5" />
      <span aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: TAILLE_MAX_SACOCHE }, (_, i) =>
          i < nombre ? (
            // Place occupée : une Pokéball, qui apparaît avec un petit fondu quand on ajoute un Pokémon
            // (motion-safe : pas d'animation si l'utilisateur a demandé des animations réduites).
            <Pokeball key={i} className="h-4 w-4 motion-safe:animate-apparition" />
          ) : (
            // Place libre : un anneau vide de la même taille, pour que rien ne bouge quand il se remplit.
            <span key={i} className="h-4 w-4 scale-85 rounded-full border border-texte-doux opacity-40" />
          ),
        )}
      </span>
    </Link>
  );
}
