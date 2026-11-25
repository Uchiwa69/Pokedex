"use client";

import Link from "next/link";
import IconeSac from "@/components/IconeSac";
import Pokeball from "@/components/Pokeball";
import { useEnvol } from "@/stores/envol";
import { TAILLE_MAX_SACOCHE, useSacoche } from "@/stores/sacoche";

// Indicateur de l'en-tête : un sac, puis 6 emplacements.
// Une Pokéball par Pokémon dans la sacoche, un anneau vide pour chaque place libre.
export default function IndicateurSacoche() {
  // Le sélecteur renvoie un simple nombre : l'indicateur n'est re-rendu que si ce nombre change
  // (renommer un membre, par exemple, ne le touche pas).
  const nombre = useSacoche((etat) => etat.membres.length);
  // Emplacement visé par une Pokéball encore en vol (null s'il n'y en a pas) : il reste vide
  // jusqu'à son arrivée, sinon la balle apparaîtrait dans la sacoche avant d'y être entrée.
  const enVol = useEnvol((etat) => etat.envol?.emplacement ?? null);
  // Emplacement où une Pokéball vient d'arriver : il joue un petit rebond.
  const dernierArrive = useEnvol((etat) => etat.dernierArrive);

  return (
    <Link
      href="/sacoche"
      // Le libellé reprend le texte affiché (« 2/6 ») : un utilisateur de commande vocale peut dire ce qu'il voit.
      aria-label={`Sacoche : ${nombre}/${TAILLE_MAX_SACOCHE} Pokémon`}
      className="flex min-h-11 items-center gap-2 rounded-full border border-bordure-verre bg-surface px-2.5 sm:px-3 text-texte-doux transition-colors hover:bg-piste hover:text-texte"
    >
      <IconeSac className="h-5 w-5" />
      {/* Le nombre en clair (« 2/6 ») : plus rapide à lire que de compter les Pokéballs.
          aria-hidden : le lien a déjà un aria-label complet. tabular-nums : chiffres de même largeur. */}
      <span aria-hidden="true" className="hidden text-sm font-semibold tabular-nums text-texte sm:inline">
        {nombre}/{TAILLE_MAX_SACOCHE}
      </span>
      {/* id : BoutonSacoche retrouve ici l'emplacement vers lequel envoyer la Pokéball. */}
      <span id="emplacements-sacoche" aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: TAILLE_MAX_SACOCHE }, (_, i) =>
          i < nombre && i !== enVol ? (
            // Place occupée : une Pokéball. Celle qui vient d'arriver rebondit
            // (motion-safe : pas d'animation si l'utilisateur a demandé des animations réduites).
            <Pokeball key={i} className={i === dernierArrive ? "h-4 w-4 motion-safe:animate-rebond" : "h-4 w-4"} />
          ) : (
            // Place libre : un anneau vide de la même taille, pour que rien ne bouge quand il se remplit.
            <span key={i} className="h-4 w-4 scale-85 rounded-full border border-texte-doux opacity-60" />
          ),
        )}
      </span>
    </Link>
  );
}
