// PROTOTYPE — cadres 1 et 2 : tout le site est affiché DANS un Pokédex.
// La coque reste fixe autour de la fenêtre ; seul l'écran (le contenu du site) défile à l'intérieur.
// ton="rouge" : coque rouge classique. ton="sombre" : coque nuit avec un liseré rouge, plus discrète.

import type { ReactNode } from "react";
import IndicateurSacoche from "@/components/IndicateurSacoche";
import { ENTREES_MENU, Lentille, LogoLabo, Voyants } from "@/components/labo/accueil/PiecesAppareil";

// Table de correspondance : les classes complètes de chaque ton (jamais de classe fabriquée à la volée).
const TONS = {
  rouge: {
    coque: "bg-coque",
    texte: "text-sur-coque",
    menu: "bg-coque-sombre",
    actif: "bg-fond text-texte",
    inactif: "text-sur-coque hover:bg-black/25",
    arete: "stroke-coque-sombre",
    ecran: "border-coque-sombre",
  },
  sombre: {
    coque: "bg-surface-pleine shadow-[inset_0_0_0_2px_var(--color-coque)]",
    texte: "text-texte",
    menu: "bg-fond",
    actif: "bg-coque text-sur-coque",
    inactif: "text-texte-doux hover:bg-piste hover:text-texte",
    arete: "stroke-coque",
    ecran: "border-bordure",
  },
} as const;

export default function CoquePokedex({ ton, children }: { ton: keyof typeof TONS; children: ReactNode }) {
  const classes = TONS[ton];

  return (
    // labo-plein-ecran : recouvre le site (dont son en-tête habituel) pour montrer une page complète.
    <div className={`labo-plein-ecran fixed inset-0 z-50 flex flex-col p-2 sm:p-3 ${classes.coque} ${classes.texte}`}>
      {/* Le haut de la coque : lentille, voyants, logo, menu, sacoche.
          Sur mobile le menu passe sur une 2e ligne (order-last + w-full). */}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-1 pb-3 sm:px-2 sm:pb-4">
        <Lentille className="size-10 sm:size-12" />
        <Voyants />
        <LogoLabo className="pl-1" />

        <nav aria-label="Navigation (factice)" className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          <ul className={`flex items-center justify-between gap-1 rounded-full p-1 sm:justify-start ${classes.menu}`}>
            {ENTREES_MENU.map((entree) => (
              <li key={entree.cle} className="flex-1 sm:flex-none">
                <button
                  type="button"
                  aria-current={entree.cle === "tous" ? "page" : undefined}
                  className={`flex min-h-9 w-full items-center justify-center rounded-full px-2 text-sm font-semibold sm:px-4 ${
                    entree.cle === "tous" ? classes.actif : classes.inactif
                  }`}
                >
                  {entree.libelle}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Le vrai indicateur de sacoche, posé sur un petit écran sombre pour rester lisible sur le rouge. */}
        <div className="ml-auto rounded-full bg-fond sm:ml-0">
          <IndicateurSacoche />
        </div>

        {/* L'arête en « marche » du haut des Pokédex : un simple trait décoratif. */}
        <svg aria-hidden="true" viewBox="0 0 100 10" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-2 w-full">
          <polyline points="0,9 26,9 30,2 100,2" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className={classes.arete} />
        </svg>
      </div>

      {/* L'écran : c'est lui qui défile. */}
      <div className={`flex-1 overflow-y-auto rounded-2xl border-2 bg-fond text-texte ${classes.ecran}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
