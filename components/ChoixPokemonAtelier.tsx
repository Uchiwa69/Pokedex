"use client";

// Première étape de l'atelier : choisir le Pokémon dont on veut créer la carte.
// Un champ de recherche propose des Pokémon (même route /api/recherche que le choix des adversaires du combat),
// et les cartes déjà créées sont rappelées dessous. Chaque proposition est un LIEN vers /atelier?pokemon=… :
// le Pokémon choisi vit dans l'adresse, c'est le serveur qui charge ensuite ses données.

import { useRef, useState } from "react";
import Link from "next/link";
import { useRappelTemporise } from "@/hooks/useRappelTemporise";
import { mettreEnForme, type Pokemon } from "@/lib/conversion";
import { estUnNumero } from "@/lib/recherche";
import { TYPES } from "@/lib/types";
import { useCartes } from "@/stores/cartes";

type Props = {
  choisi: string | null; // nom anglais du Pokémon en cours ("charizard"), ou null si aucun
};

export const adresseAtelier = (nom: string) => `/atelier?pokemon=${encodeURIComponent(nom)}`;

export default function ChoixPokemonAtelier({ choisi }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<Pokemon[]>([]);
  // Numéro de la dernière recherche lancée : une réponse plus ancienne, arrivée en retard, est ignorée.
  const derniereRecherche = useRef(0);

  // Les cartes déjà créées (le sélecteur renvoie l'objet du store tel quel, sans en fabriquer un nouveau).
  const cartes = useCartes((etat) => etat.cartes);
  const nomsDesCartes = Object.keys(cartes);

  // Debounce de 250 ms : on attend une pause dans la frappe avant d'interroger le serveur.
  const chercher = useRappelTemporise(async (texte: string) => {
    const numero = ++derniereRecherche.current;
    // Moins de 2 lettres : rien à chercher, sauf si c'est un numéro (« 6 »).
    if (texte.trim().length < 2 && !estUnNumero(texte)) {
      setSuggestions([]);
      return;
    }
    try {
      const reponse = await fetch(`/api/recherche?q=${encodeURIComponent(texte.trim())}`);
      const trouves = reponse.ok ? ((await reponse.json()) as Pokemon[]) : [];
      if (numero === derniereRecherche.current) setSuggestions(trouves);
    } catch {
      if (numero === derniereRecherche.current) setSuggestions([]);
    }
  }, 250);

  // Après un choix : on vide le champ et les propositions.
  function refermer() {
    derniereRecherche.current++;
    setSuggestions([]);
    if (champ.current) champ.current.value = "";
  }

  return (
    <section aria-labelledby="titre-choix" className="verre flex flex-col gap-4 p-4 sm:p-6">
      <h2 id="titre-choix" className="font-titre text-xl font-semibold">
        {choisi ? "Changer de Pokémon" : "Choisis un Pokémon"}
      </h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="recherche-atelier" className="etiquette">
          Rechercher un Pokémon
        </label>
        <input
          ref={champ}
          id="recherche-atelier"
          type="search"
          autoComplete="off"
          onChange={(evenement) => chercher(evenement.target.value)}
          placeholder="Nom ou numéro : Dracaufeu, pikachu, 25…"
          className="min-h-12 w-full rounded-full border border-bordure bg-surface px-5 text-sm text-texte placeholder:text-texte-doux"
        />
        {suggestions.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Pokémon trouvés">
            {suggestions.map((pokemon) => (
              <li key={pokemon.nom}>
                <Link
                  href={adresseAtelier(pokemon.nom)}
                  onClick={refermer}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-bordure bg-surface px-4 py-2 hover:bg-piste"
                >
                  <span className="truncate font-titre text-sm font-semibold">
                    <span className="etiquette mr-2">N° {String(pokemon.id).padStart(4, "0")}</span>
                    {pokemon.nomFr}
                  </span>
                  <span className="etiquette shrink-0">{pokemon.types.map((type) => TYPES[type].libelle).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Les cartes déjà créées, pour y revenir d'un clic. */}
      {nomsDesCartes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="etiquette">Mes cartes</p>
          <ul className="flex flex-wrap gap-2">
            {nomsDesCartes.map((nom) => {
              const actif = nom === choisi;
              return (
                <li key={nom}>
                  <Link
                    href={adresseAtelier(nom)}
                    aria-current={actif ? "true" : undefined}
                    className={`flex min-h-11 items-center rounded-full border px-4 text-sm ${
                      actif ? "border-transparent bg-accent font-semibold text-sur-accent shadow-lueur" : "border-bordure bg-surface text-texte hover:bg-piste"
                    }`}
                  >
                    {/* Le surnom donné à la carte, ou à défaut le nom du Pokémon. */}
                    {cartes[nom].surnom.trim() || cartes[nom].nomPokemon || mettreEnForme(nom)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
