// PROTOTYPE C — « Barre de commande » : le plus sobre. Un titre avec le grand compteur,
// puis UNE seule barre qui réunit la recherche et les types. La grille arrive tout de suite.

import { Loupe, SymboleType, formaterNombre } from "@/components/labo/accueil/Communs";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES } from "@/lib/types";

export default function HautCommande({ total }: { total: number }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="etiquette">Pokédex national</p>
          <h1 className="font-titre text-3xl font-bold sm:text-4xl">Tous les Pokémon</h1>
        </div>
        {/* Le compteur en très grand, comme un affichage d'appareil */}
        <p className="flex items-baseline gap-2">
          <span className="bg-linear-to-r from-accent to-accent-bis bg-clip-text font-titre text-5xl font-bold leading-none text-transparent sm:text-6xl">
            {formaterNombre(total)}
          </span>
          <span className="etiquette">espèces</span>
        </p>
      </header>

      {/* La barre : recherche à gauche, types à droite. Sur mobile, les types passent sur une 2e ligne. */}
      <div className="verre flex flex-col gap-2 p-2 lg:flex-row lg:items-center lg:rounded-full">
        <div className="relative lg:w-72 lg:shrink-0">
          <Loupe className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-texte-doux" />
          <label htmlFor="recherche-labo" className="sr-only">
            Rechercher un Pokémon
          </label>
          <input
            id="recherche-labo"
            type="search"
            placeholder="Rechercher…"
            autoComplete="off"
            className="min-h-11 w-full rounded-full bg-fond/60 pl-12 pr-12 text-sm text-texte placeholder:text-texte-doux"
          />
          <kbd aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-bordure px-2 text-xs text-texte-doux">
            /
          </kbd>
        </div>

        {/* Séparateur vertical, visible seulement quand tout est sur une ligne */}
        <span aria-hidden="true" className="hidden h-6 w-px bg-bordure lg:block" />

        <nav aria-label="Filtrer par type (factice)" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] lg:justify-between">
            <li className="shrink-0">
              <button type="button" className="flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-sur-accent shadow-lueur">
                Tous
              </button>
            </li>
            {NOMS_TYPES.map((type) => (
              <li key={type} className="shrink-0" style={styleTeinte(type)}>
                {/* Symbole seul : le nom du type est dans aria-label (lecteurs d'écran) et title (infobulle). */}
                <button
                  type="button"
                  aria-label={TYPES[type].libelle}
                  title={TYPES[type].libelle}
                  className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--teinte)_18%,transparent)] transition-transform duration-200 hover:scale-110 motion-reduce:transition-none"
                >
                  <SymboleType type={type} className="size-5 fill-[var(--teinte)]" />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
