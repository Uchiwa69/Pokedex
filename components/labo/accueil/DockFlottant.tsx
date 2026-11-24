// PROTOTYPE — cadre 4 : pas de coque. Le logo et la sacoche flottent en haut, sans barre,
// et le menu devient un « dock » en verre posé en bas de l'écran (icône + libellé), comme dans une appli.

import type { ReactNode } from "react";
import IndicateurSacoche from "@/components/IndicateurSacoche";
import { ENTREES_MENU, IconeMenu, LogoLabo } from "@/components/labo/accueil/PiecesAppareil";

export default function DockFlottant({ children }: { children: ReactNode }) {
  return (
    <div className="labo-plein-ecran fixed inset-0 z-50 overflow-y-auto bg-fond text-texte">
      {/* pb-28 : la fin de la page ne reste pas cachée derrière le dock. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-28 pt-4">
        <div className="flex items-center justify-between gap-4">
          <LogoLabo />
          <IndicateurSacoche />
        </div>
        {children}
      </div>

      {/* Le dock : fixé en bas, centré. Fond opaque + flou pour rester lisible au-dessus des cartes. */}
      <nav aria-label="Navigation (factice)" className="fixed inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <ul className="flex gap-1 rounded-full border border-bordure-verre bg-surface-pleine/85 p-1.5 shadow-carte backdrop-blur-xl">
          {ENTREES_MENU.map((entree) => (
            <li key={entree.cle}>
              <button
                type="button"
                aria-current={entree.cle === "tous" ? "page" : undefined}
                className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px] font-semibold transition-colors duration-200 sm:min-w-20 ${
                  entree.cle === "tous" ? "bg-accent text-sur-accent shadow-lueur" : "text-texte-doux hover:bg-piste hover:text-texte"
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
