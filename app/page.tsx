import BadgeType from "@/components/BadgeType";
import EtatVide from "@/components/EtatVide";
import { NOMS_TYPES } from "@/lib/types";

export default function PageAccueil() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>

      <EtatVide
        titre="La grille arrive en phase 2"
        message="Pour l'instant, la coque du site est en place : en-tête, navigation, thème clair/sombre et pied de page."
      />

      {/* Aperçu de la table TYPES : les 18 badges, traduits à l'affichage. */}
      <section aria-labelledby="titre-types" className="flex flex-col gap-4">
        <h2 id="titre-types" className="font-titre text-xl font-semibold">
          Les 18 types
        </h2>
        <ul className="flex flex-wrap gap-2">
          {NOMS_TYPES.map((type) => (
            <li key={type}>
              <BadgeType type={type} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
