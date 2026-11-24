// PROTOTYPE — cadre 3 : coque rouge avec le menu sur le CÔTÉ, comme le volet d'un Pokédex ouvert.
// Grand écran : panneau vertical à gauche (icône + libellé). Mobile : barre d'icônes en bas, comme une appli.

import type { ReactNode } from "react";
import IndicateurSacoche from "@/components/IndicateurSacoche";
import { ENTREES_MENU, IconeMenu, Lentille, LogoLabo, Voyants } from "@/components/labo/accueil/PiecesAppareil";

export default function CoqueLaterale({ children }: { children: ReactNode }) {
  return (
    <div className="labo-plein-ecran fixed inset-0 z-50 flex flex-col gap-2 bg-coque p-2 text-sur-coque sm:p-3 lg:flex-row lg:gap-3">
      {/* Le volet : lentille et logo en haut, menu au milieu, sacoche en bas. */}
      <div className="flex items-center gap-3 px-1 lg:w-52 lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-6 lg:px-0 lg:py-2">
        <div className="flex items-center gap-3 lg:flex-col lg:items-start">
          <div className="flex items-center gap-3">
            <Lentille className="size-10 lg:size-14" />
            {/* Les voyants sont masqués sur mobile, où la place manque. */}
            <span className="hidden lg:block">
              <Voyants />
            </span>
          </div>
          <LogoLabo />
        </div>

        {/* Menu vertical : visible seulement à partir de lg (sur mobile, voir la barre du bas). */}
        <nav aria-label="Navigation (factice)" className="hidden lg:block">
          <ul className="flex flex-col gap-1 rounded-3xl bg-coque-sombre p-2">
            {ENTREES_MENU.map((entree) => (
              <li key={entree.cle}>
                <button
                  type="button"
                  aria-current={entree.cle === "tous" ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                    entree.cle === "tous" ? "bg-fond text-texte" : "text-sur-coque hover:bg-black/25"
                  }`}
                >
                  <IconeMenu cle={entree.cle} className="size-5" />
                  {entree.libelle}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto w-fit rounded-full bg-fond lg:ml-0 lg:mt-auto">
          <IndicateurSacoche />
        </div>
      </div>

      {/* L'écran */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-coque-sombre bg-fond text-texte">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</div>
      </div>

      {/* Mobile : le menu devient une barre d'icônes en bas de la coque. */}
      <nav aria-label="Navigation (factice)" className="lg:hidden">
        <ul className="flex justify-between gap-1 rounded-3xl bg-coque-sombre p-1">
          {ENTREES_MENU.map((entree) => (
            <li key={entree.cle} className="flex-1">
              <button
                type="button"
                aria-current={entree.cle === "tous" ? "page" : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${
                  entree.cle === "tous" ? "bg-fond text-texte" : "text-sur-coque"
                }`}
              >
                <IconeMenu cle={entree.cle} className="size-5" />
                {entree.libelle}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
