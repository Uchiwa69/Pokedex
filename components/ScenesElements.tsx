"use client";

// Séquence « feu contre eau » pilotée par le défilement : Dracaufeu, la boule de feu, l'écran en cendres,
// puis Tortank qui le lave. Le dessin est fait par un shader (lib/scenes-elements.ts).
//
// Principe : la section est très haute (350 % de l'écran) et contient une scène « collante » (sticky) haute
// d'un écran. Pendant qu'on fait défiler la section, la scène reste en place ; on mesure seulement OÙ on en est
// (de 0 à 1) et on donne ce nombre au shader. Faire défiler vers le haut rejoue donc la séquence à l'envers.
//
// Animations réduites, ou pas de WebGL : la séquence est remplacée par les deux illustrations, immobiles.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IMAGE_DRACAUFEU, IMAGE_TORTANK } from "@/lib/scenes-elements";

// Passe de 0 à 1 quand x va de a à b (comme smoothstep en GLSL) : sert aux fondus des textes.
function fondu(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default function ScenesElements() {
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const texteFeu = useRef<HTMLDivElement>(null);
  const texteEau = useRef<HTMLDivElement>(null);
  const invite = useRef<HTMLParagraphElement>(null);
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    // Animations réduites : rien à démarrer, le CSS (motion-reduce:) affiche déjà la version fixe.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elementSection = section.current;
    const elementScene = scene.current;
    const elementToile = toile.current;
    if (!elementSection || !elementScene || !elementToile) return;

    let annule = false; // le composant a été retiré pendant le chargement
    let image = 0; // numéro de la prochaine image demandée, pour pouvoir l'annuler
    let nettoyer = () => {};

    import("@/lib/scenes-elements")
      .then((module) => module.creerSceneElements(elementToile))
      .then((dessin) => {
        if (annule) {
          dessin.liberer();
          return;
        }

        // La scène occupe toute la largeur de la fenêtre, alors que la page est dans une colonne centrée :
        // on la décale vers la gauche de la marge de la colonne. clientWidth ne compte pas la barre de
        // défilement (avec « 100vw », la page déborderait de sa largeur).
        function ajuster() {
          const largeur = document.documentElement.clientWidth;
          const hauteur = elementScene!.clientHeight;
          elementScene!.style.left = `${-elementSection!.getBoundingClientRect().left}px`;
          elementScene!.style.width = `${largeur}px`;
          dessin.redimensionner(largeur, hauteur);
        }
        ajuster();
        window.addEventListener("resize", ajuster);

        // Changement de thème : next-themes change la classe de <html>, on relit alors la couleur du fond.
        const guetteurTheme = new MutationObserver(dessin.actualiserTheme);
        guetteurTheme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        // Une image par rafraîchissement de l'écran : les flammes bougent même quand on ne défile pas.
        function boucle() {
          const cadre = elementSection!.getBoundingClientRect();
          // 0 quand le haut de la section touche le haut de l'écran, 1 quand son bas touche le bas de l'écran.
          const course = cadre.height - window.innerHeight;
          const progression = Math.min(1, Math.max(0, -cadre.top / course));
          dessin.dessiner(progression);
          // Les textes : on écrit directement leur opacité, sans état React (60 rendus par seconde sinon).
          if (invite.current) invite.current.style.opacity = String(1 - fondu(0.02, 0.1, progression));
          if (texteFeu.current) texteFeu.current.style.opacity = String(1 - fondu(0.14, 0.28, progression));
          if (texteEau.current) texteEau.current.style.opacity = String(fondu(0.86, 0.95, progression));
          image = requestAnimationFrame(boucle);
        }

        // La boucle ne tourne que si la section est à l'écran (IntersectionObserver) : aucun calcul une fois
        // qu'on est descendu dans la liste.
        const guetteurVue = new IntersectionObserver(([entree]) => {
          cancelAnimationFrame(image);
          if (entree.isIntersecting) image = requestAnimationFrame(boucle);
        });
        guetteurVue.observe(elementSection);
        setPret(true);

        nettoyer = () => {
          cancelAnimationFrame(image);
          window.removeEventListener("resize", ajuster);
          guetteurTheme.disconnect();
          guetteurVue.disconnect();
          dessin.liberer();
        };
      })
      .catch(() => {
        if (!annule) setEchec(true); // pas de WebGL, ou image indisponible : version fixe
      });

    return () => {
      annule = true;
      nettoyer();
    };
  }, []);

  return (
    <>
      {/* Version animée. motion-reduce:hidden : absente si le visiteur a demandé des animations réduites. */}
      {!echec && (
        <section ref={section} aria-labelledby="titre-elements" className="relative h-[350svh] motion-reduce:hidden">
          <h2 id="titre-elements" className="sr-only">
            Feu contre eau : Dracaufeu embrase l&apos;écran, Tortank l&apos;éteint
          </h2>
          <div className="sticky top-0 h-svh">
            <div ref={scene} className="absolute inset-y-0 left-0 w-full overflow-hidden bg-fond">
              {/* Le canvas apparaît en fondu une fois le shader et les deux images prêts. */}
              <canvas
                ref={toile}
                aria-hidden="true"
                className={`h-full w-full transition-opacity duration-500 ${pret ? "opacity-100" : "opacity-0"}`}
              />

              {/* Textes : à gauche pour Dracaufeu (il est à droite), à droite pour Tortank ; en haut sur téléphone. */}
              <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-7xl px-4 pt-32 lg:items-center lg:pt-0">
                <div ref={texteFeu} className="absolute inset-x-4 top-32 text-center lg:static lg:max-w-sm lg:text-left">
                  <p className="etiquette">N° 0006 · Feu / Vol</p>
                  <p className="font-titre text-4xl font-bold sm:text-6xl">Dracaufeu</p>
                  <p className="mt-2 text-sm text-texte-doux">Son souffle est si chaud qu&apos;il fait fondre la roche.</p>
                </div>
                <div
                  ref={texteEau}
                  style={{ opacity: 0 }}
                  className="absolute inset-x-4 top-32 text-center lg:static lg:ml-auto lg:max-w-sm lg:text-right"
                >
                  <p className="etiquette">N° 0009 · Eau</p>
                  <p className="font-titre text-4xl font-bold sm:text-6xl">Tortank</p>
                  <p className="mt-2 text-sm text-texte-doux">Les jets de ses canons percent une plaque d&apos;acier.</p>
                </div>
              </div>

              <p ref={invite} aria-hidden="true" className="etiquette pointer-events-none absolute inset-x-0 bottom-20 text-center">
                Faites défiler ↓
              </p>
              {/* Raccourci : un visiteur pressé (ou au clavier) saute la séquence. */}
              <a href="#apres-elements" className="bouton bouton-secondaire absolute bottom-6 right-4">
                Passer
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Version fixe : animations réduites (CSS) ou échec du chargement (état). */}
      <section
        aria-label="Feu contre eau"
        className={`grid-cols-2 gap-4 ${echec ? "grid" : "hidden motion-reduce:grid"}`}
      >
        <figure className="verre flex flex-col items-center gap-2 p-4">
          <Image src={IMAGE_DRACAUFEU} alt="Dracaufeu" width={320} height={320} className="h-auto w-full max-w-64" />
          <figcaption className="font-titre text-xl font-bold">Dracaufeu</figcaption>
        </figure>
        <figure className="verre flex flex-col items-center gap-2 p-4">
          <Image src={IMAGE_TORTANK} alt="Tortank" width={320} height={320} className="h-auto w-full max-w-64" />
          <figcaption className="font-titre text-xl font-bold">Tortank</figcaption>
        </figure>
      </section>

      {/* Cible du lien « Passer ». scroll-mt : l'en-tête collant ne cache pas ce qui suit. */}
      <div id="apres-elements" className="scroll-mt-28" />
    </>
  );
}
