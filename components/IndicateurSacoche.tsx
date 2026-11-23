"use client";

import Link from "next/link";
import { TAILLE_MAX_SACOCHE, useSacoche } from "@/stores/sacoche";

// 6 pastilles dans l'en-tête : pleines pour les places occupées, vides pour les places libres.
export default function IndicateurSacoche() {
  // Le sélecteur renvoie un simple nombre : l'indicateur n'est re-rendu que si ce nombre change
  // (renommer un membre, par exemple, ne le touche pas).
  const nombre = useSacoche((etat) => etat.membres.length);

  return (
    <Link
      href="/sacoche"
      aria-label={`Sacoche : ${nombre} Pokémon sur ${TAILLE_MAX_SACOCHE}`}
      className="flex min-h-11 items-center gap-1 rounded-full border border-bordure-verre bg-surface px-3 hover:bg-piste"
    >
      {Array.from({ length: TAILLE_MAX_SACOCHE }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            i < nombre
              ? "h-2.5 w-2.5 rounded-full bg-linear-to-br from-accent-bis to-accent"
              : "h-2.5 w-2.5 rounded-full border border-texte-doux opacity-60"
          }
        />
      ))}
    </Link>
  );
}
