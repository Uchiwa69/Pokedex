import { Suspense } from "react";
import Link from "next/link";
import BoutonTheme from "@/components/BoutonTheme";
import IndicateurSacoche from "@/components/IndicateurSacoche";
import LiensNavigation from "@/components/LiensNavigation";
import Navigation from "@/components/Navigation";
import Pokeball from "@/components/Pokeball";

// En-tête du site : composant serveur. Seuls Navigation, BoutonTheme et IndicateurSacoche sont des composants client.
export default function EnTete() {
  return (
    // Fond de la page à 85 % + flou de ce qui défile derrière : l'en-tête se fond dans la page, un simple filet le sépare.
    // data-entete + transition-opacity : l'introduction de l'accueil masque l'en-tête en fondu (voir globals.css).
    <header data-entete className="sticky top-0 z-40 border-b border-bordure-verre bg-cadre/85 backdrop-blur-xl transition-opacity duration-300">
      {/* Sur mobile le menu passe sur une 2e ligne (order-last + w-full), à partir de lg tout tient sur une ligne. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 sm:gap-x-4 py-1.5">
        {/* aria-label : les lecteurs d'écran lisent « Pokédex » en entier, même si le « O » est un dessin.
            `group` permet à la Pokéball de réagir au survol du lien entier (group-hover). */}
        <Link
          href="/"
          aria-label="Pokédex, retour à l'accueil"
          className="group flex min-h-11 items-center font-titre text-xl font-bold uppercase tracking-widest text-texte"
        >
          <span aria-hidden="true">P</span>
          {/* Le « O » du logo : une Pokéball à la hauteur des majuscules (taille en em → suit la taille du texte).
              Elle fait un tour au survol ; on n'anime que transform, et seulement si l'utilisateur
              n'a pas demandé d'animations réduites (motion-safe). */}
          <Pokeball className="mr-[0.1em] h-[0.9em] w-[0.9em] transition-transform duration-300 motion-safe:group-hover:rotate-180 motion-safe:group-focus-visible:rotate-180" />
          <span aria-hidden="true">kédex</span>
        </Link>

        <nav aria-label="Navigation principale" className="order-last w-full lg:order-none lg:w-auto">
          {/* Avec cacheComponents, usePathname peut suspendre sur une route dynamique (/pokemon/[nom]) :
              on met donc Navigation sous Suspense. En attendant, on affiche les mêmes liens sans lien actif. */}
          <Suspense fallback={<LiensNavigation cheminActif={null} />}>
            <Navigation />
          </Suspense>
        </nav>

        {/* À droite : l'équipe (sacoche) puis le bouton de thème. */}
        <div className="flex items-center gap-2">
          <IndicateurSacoche />
          <BoutonTheme />
        </div>
      </div>
    </header>
  );
}
