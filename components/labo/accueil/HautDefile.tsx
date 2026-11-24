// PROTOTYPE D — « Défilé » : deux bandes de Pokémon défilent lentement derrière un grand titre centré.
// La recherche est au milieu, très grande ; les types sont de petites gélules centrées dessous.

import Image from "next/image";
import Link from "next/link";
import { Loupe, SymboleType, formaterNombre } from "@/components/labo/accueil/Communs";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES } from "@/lib/types";

// Une bande : la liste est écrite DEUX fois à la suite. L'animation la décale de -50 % :
// à la fin, la 2e copie est exactement à la place de la 1re, donc la boucle ne se voit pas.
function Bande({ pokemons, inverse = false }: { pokemons: Pokemon[]; inverse?: boolean }) {
  return (
    <div className={`flex w-max gap-6 motion-safe:animate-defile ${inverse ? "[animation-direction:reverse]" : ""}`}>
      {[...pokemons, ...pokemons].map((pokemon, index) => (
        <div key={index} className="relative size-24 shrink-0 sm:size-28">
          {/* alt vide : ces images sont un décor (toute la zone est en aria-hidden). */}
          {pokemon.artwork && <Image src={pokemon.artwork} alt="" fill sizes="112px" className="object-contain" />}
        </div>
      ))}
    </div>
  );
}

export default function HautDefile({ pokemons, total }: { pokemons: Pokemon[]; total: number }) {
  const moitie = Math.ceil(pokemons.length / 2);
  // Quelques raccourcis sous la recherche : de vrais liens vers des fiches.
  const suggestions = pokemons.filter((pokemon) => ["charizard", "pikachu", "bulbasaur", "squirtle"].includes(pokemon.nom));

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl border border-bordure-verre">
        {/* Décor : deux bandes qui défilent en sens opposés, très atténuées */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-6 opacity-35">
          <Bande pokemons={pokemons.slice(0, moitie)} />
          <Bande pokemons={pokemons.slice(moitie)} inverse />
        </div>
        {/* Voile : le centre est assombri pour que le texte reste lisible (contraste). */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-fond)_25%,transparent_85%)]" />

        <div className="relative flex flex-col items-center gap-6 px-4 py-12 text-center sm:py-16">
          <header className="flex flex-col items-center gap-2">
            <p className="etiquette">Pokédex national</p>
            <h1 className="font-titre text-4xl font-bold leading-tight sm:text-6xl">
              <span className="bg-linear-to-r from-accent to-accent-bis bg-clip-text text-transparent">{formaterNombre(total)}</span> Pokémon,
              <br />
              un seul Pokédex
            </h1>
          </header>

          <div className="relative w-full max-w-xl">
            <Loupe className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-texte-doux" />
            <label htmlFor="recherche-labo" className="sr-only">
              Rechercher un Pokémon
            </label>
            <input
              id="recherche-labo"
              type="search"
              placeholder="Nom français ou anglais…"
              autoComplete="off"
              className="min-h-14 w-full rounded-full border border-accent/50 bg-surface-pleine pl-14 pr-14 text-sm text-texte shadow-lueur placeholder:text-texte-doux"
            />
            <kbd aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-bordure px-2 text-xs text-texte-doux">
              /
            </kbd>
          </div>

          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-texte-doux">
            <span className="etiquette">Essayer</span>
            {suggestions.map((pokemon) => (
              <Link
                key={pokemon.nom}
                href={`/pokemon/${pokemon.nom}`}
                className="flex min-h-9 items-center rounded-full border border-bordure bg-fond/70 px-3 font-medium text-texte hover:bg-piste"
              >
                {pokemon.nomFr}
              </Link>
            ))}
          </p>
        </div>
      </section>

      {/* Types : petites gélules centrées, sur deux lignes */}
      <nav aria-label="Filtrer par type (factice)">
        <ul className="flex flex-wrap justify-center gap-2">
          <li>
            <button type="button" className="flex min-h-9 items-center rounded-full bg-accent px-4 text-xs font-semibold text-sur-accent shadow-lueur">
              Tous
            </button>
          </li>
          {NOMS_TYPES.map((type) => (
            <li key={type} style={styleTeinte(type)}>
              <button
                type="button"
                className="flex min-h-9 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--teinte)_45%,transparent)] bg-[color-mix(in_srgb,var(--teinte)_12%,transparent)] px-3 text-xs font-semibold text-texte transition-colors duration-200 hover:border-[var(--teinte)]"
              >
                <SymboleType type={type} className="size-4 fill-[var(--teinte)]" />
                {TYPES[type].libelle}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
