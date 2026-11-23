import { Suspense } from "react";
import Link from "next/link";
import BoutonTheme from "@/components/BoutonTheme";
import LiensNavigation from "@/components/LiensNavigation";
import Navigation from "@/components/Navigation";

// En-tête du site : composant serveur. Seuls Navigation et BoutonTheme sont des composants client.
export default function EnTete() {
  return (
    <header className="sticky top-0 z-40 border-b border-bordure bg-surface">
      {/* Sur mobile le menu passe sur une 2e ligne (order-last + w-full), à partir de sm tout tient sur une ligne. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-titre text-xl font-bold text-texte">
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
          Pokédex
        </Link>

        <nav aria-label="Navigation principale" className="order-last w-full sm:order-none sm:w-auto">
          {/* Avec cacheComponents, usePathname peut suspendre sur une route dynamique (/pokemon/[nom]) :
              on met donc Navigation sous Suspense. En attendant, on affiche les mêmes liens sans lien actif. */}
          <Suspense fallback={<LiensNavigation cheminActif={null} />}>
            <Navigation />
          </Suspense>
        </nav>

        <BoutonTheme />
      </div>
    </header>
  );
}
