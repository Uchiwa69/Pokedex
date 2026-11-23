"use client";

import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import EtatVide from "@/components/EtatVide";
import { useTypesCouverts } from "@/hooks/useTypesCouverts";
import { formaterNumero } from "@/lib/conversion";
import { LONGUEUR_MAX_SURNOM, TAILLE_MAX_SACOCHE, useSacoche, useSacochePrete } from "@/stores/sacoche";

export default function ContenuSacoche() {
  const membres = useSacoche((etat) => etat.membres);
  const retirer = useSacoche((etat) => etat.retirer);
  const renommer = useSacoche((etat) => etat.renommer);
  const vider = useSacoche((etat) => etat.vider);
  const prete = useSacochePrete();
  const typesCouverts = useTypesCouverts();

  // Tant que le localStorage n'est pas relu, on ne sait pas si la sacoche est vide.
  if (!prete) {
    return <div role="status" aria-label="Chargement de la sacoche" className="h-40 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />;
  }

  if (membres.length === 0) {
    return (
      <EtatVide
        titre="La sacoche est vide"
        message={`Tu peux y ranger jusqu'à ${TAILLE_MAX_SACOCHE} Pokémon pour former ton équipe.`}
        lien={{ href: "/", libelle: "Choisir des Pokémon" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="etiquette">
          {membres.length} Pokémon sur {TAILLE_MAX_SACOCHE}
        </p>
        <button
          type="button"
          onClick={vider}
          className="bouton bouton-secondaire text-danger"
        >
          Vider la sacoche
        </button>
      </div>

      <section aria-labelledby="titre-types-couverts" className="flex flex-col gap-2">
        <h2 id="titre-types-couverts" className="etiquette">
          Types couverts
        </h2>
        <ul className="flex flex-wrap gap-2">
          {typesCouverts.map((type) => (
            <li key={type}>
              <BadgeType type={type} />
            </li>
          ))}
        </ul>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {membres.map(({ pokemon, surnom }) => (
          <li key={pokemon.nom} className="verre flex flex-col gap-4 p-4">
            <div className="flex items-center gap-4">
              <span className="relative block h-20 w-20 shrink-0">
                {pokemon.artwork && (
                  <Image src={pokemon.artwork} alt={`Illustration de ${pokemon.nomFr}`} fill sizes="80px" className="object-contain" />
                )}
              </span>
              <div className="flex flex-col gap-2">
                <p className="etiquette">N° {formaterNumero(pokemon.id).slice(1)}</p>
                <h2 className="font-titre text-xl font-semibold">{surnom}</h2>
                <Link href={`/pokemon/${pokemon.nom}`} className="text-sm font-medium text-accent underline">
                  {pokemon.nomFr}
                </Link>
              </div>
            </div>

            {/* Le surnom est validé à la sortie du champ ou avec Entrée (soumission du formulaire).
                key={surnom} : quand le store change le surnom, le champ est recréé avec la nouvelle valeur. */}
            <form
              className="flex flex-col gap-2"
              onSubmit={(evenement) => {
                evenement.preventDefault(); // pas de rechargement de la page
                const donnees = new FormData(evenement.currentTarget);
                renommer(pokemon.nom, String(donnees.get("surnom") ?? ""));
              }}
            >
              <label htmlFor={`surnom-${pokemon.nom}`} className="etiquette">
                Surnom
              </label>
              <input
                key={surnom}
                id={`surnom-${pokemon.nom}`}
                name="surnom"
                defaultValue={surnom}
                maxLength={LONGUEUR_MAX_SURNOM}
                onBlur={(evenement) => renommer(pokemon.nom, evenement.target.value)}
                autoComplete="off"
                className="min-h-11 w-full rounded-full border border-bordure bg-surface px-4 text-sm text-texte"
              />
            </form>

            <button
              type="button"
              onClick={() => retirer(pokemon.nom)}
              aria-label={`Retirer ${surnom} de la sacoche`}
              className="bouton bouton-secondaire"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
