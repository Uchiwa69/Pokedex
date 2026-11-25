"use client";

// Séquence d'ouverture « la page brûle », pilotée par le défilement : Dracaufeu crache un souffle de flammes,
// l'écran se consume comme du papier et la VRAIE page (children) apparaît à travers la brûlure.
// Le dessin est fait par un shader (lib/scenes-feu/), sur un canvas transparent posé par-dessus la page.
//
// Principe : la page est « collante » (sticky) dans un conteneur plus haut qu'elle de 250 % de l'écran (un bloc vide la suit). Tant
// qu'on parcourt ce supplément, la page reste en place sous le canvas ; on mesure seulement OÙ on en est
// (de 0 à 1) et on donne ce nombre au shader. Remonter rejoue donc la séquence à l'envers. Ensuite la page
// défile normalement.
//
// Animations réduites, ou pas de WebGL : pas de séquence, la page s'affiche directement.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { VarianteFeu } from "@/lib/scenes-feu";
import { preparerTexte } from "@/lib/scenes-feu/texte";

const TITRE = "Dracaufeu";

// Passe de 0 à 1 quand x va de a à b (comme smoothstep en GLSL) : sert aux fondus des textes.
function fondu(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type Props = { variante: VarianteFeu; children: ReactNode };

export default function ScenesElements({ variante, children }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const voile = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const texte = useRef<HTMLDivElement>(null);
  const invite = useRef<HTMLParagraphElement>(null);
  // « attente » : le voile est opaque (couleur du fond) le temps de charger ; « pret » : le shader dessine ;
  // « echec » : pas de WebGL ou image indisponible, la séquence est retirée.
  const [etat, setEtat] = useState<"attente" | "pret" | "echec">("attente");

  useEffect(() => {
    // Animations réduites : rien à démarrer, le CSS (motion-reduce:) a déjà retiré la séquence.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elementConteneur = conteneur.current;
    const elementPage = page.current;
    const elementVoile = voile.current;
    const elementToile = toile.current;
    if (!elementConteneur || !elementPage || !elementVoile || !elementToile) return;

    let annule = false; // le composant a été retiré pendant le chargement
    let image = 0; // numéro de la prochaine image demandée, pour pouvoir l'annuler
    let nettoyer = () => {};

    import("@/lib/scenes-feu")
      .then((module) => module.creerSceneFeu(elementToile, variante))
      .then((dessin) => {
        if (annule) {
          dessin.liberer();
          return;
        }

        // Le voile occupe toute la largeur de la fenêtre, alors que la page est dans une colonne centrée :
        // on le décale vers la gauche de la marge de la colonne. clientWidth ne compte pas la barre de
        // défilement (avec « 100vw », la page déborderait de sa largeur).
        function ajuster() {
          const largeur = document.documentElement.clientWidth;
          elementVoile!.style.left = `${-elementPage!.getBoundingClientRect().left}px`;
          elementVoile!.style.width = `${largeur}px`;
          dessin.redimensionner(largeur, elementVoile!.clientHeight);
        }
        ajuster();
        window.addEventListener("resize", ajuster);

        // Changement de thème : next-themes change la classe de <html>, on relit alors la couleur du fond.
        const guetteurTheme = new MutationObserver(dessin.actualiserTheme);
        guetteurTheme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        // Le texte animé : ses éléments sont repérés une fois, puis mis à jour à chaque image.
        const mettreAJourTexte = texte.current ? preparerTexte(texte.current) : null;

        let fini = false; // la séquence est terminée : le voile est caché et on ne dessine plus
        function boucle() {
          // La course = ce que le conteneur a de plus haut que la page (les 250 % d'écran).
          // 0 quand la page vient de se coller en haut de l'écran, 1 quand elle va se décoller.
          const course = elementConteneur!.offsetHeight - elementPage!.offsetHeight;
          const progression = Math.min(1, Math.max(0, -elementConteneur!.getBoundingClientRect().top / course));
          if (progression >= 1) {
            // Tout a brûlé : le canvas serait transparent, autant le cacher et ne plus rien calculer.
            if (!fini) elementVoile!.style.visibility = "hidden";
            fini = true;
          } else {
            if (fini) elementVoile!.style.visibility = "visible";
            fini = false;
            dessin.dessiner(progression);
            // Les textes : on écrit directement leur opacité, sans état React (60 rendus par seconde sinon).
            if (invite.current) invite.current.style.opacity = String(1 - fondu(0.02, 0.1, progression));
            mettreAJourTexte?.(progression);
          }
          // Une image par rafraîchissement de l'écran : les flammes bougent même quand on ne défile pas.
          image = requestAnimationFrame(boucle);
        }
        image = requestAnimationFrame(boucle);
        setEtat("pret");

        nettoyer = () => {
          cancelAnimationFrame(image);
          window.removeEventListener("resize", ajuster);
          guetteurTheme.disconnect();
          dessin.liberer();
        };
      })
      .catch(() => {
        if (!annule) setEtat("echec");
      });

    return () => {
      annule = true;
      nettoyer();
    };
  }, [variante]);

  // Bouton « Passer » : on saute à la fin de la course (la page est alors entièrement dégagée).
  function passer() {
    const elementConteneur = conteneur.current;
    const elementPage = page.current;
    if (!elementConteneur || !elementPage) return;
    const course = elementConteneur.offsetHeight - elementPage.offsetHeight;
    window.scrollTo({ top: elementConteneur.getBoundingClientRect().top + window.scrollY + course });
  }

  const avecSequence = etat !== "echec";

  return (
    <div ref={conteneur} data-sequence>
      <div ref={page} className={avecSequence ? "sticky top-0 motion-reduce:static" : ""}>
        {children}

        {avecSequence && (
          <div
            ref={voile}
            // bg-fond pendant le chargement : la page ne se montre pas avant que la séquence soit prête.
            className={`pointer-events-none absolute left-0 top-0 z-30 h-svh w-full overflow-hidden motion-reduce:hidden ${
              etat === "attente" ? "bg-fond" : ""
            }`}
          >
            <canvas ref={toile} aria-hidden="true" className="h-full w-full" />

            {/* Texte : à gauche (Dracaufeu est à droite) ; en haut sur téléphone. Il chauffe puis part en cendres
                avec la page (lib/scenes-feu/texte.ts) : data-bloc = ordre de départ, data-lettre = une lettre. */}
            <div className="absolute inset-0 mx-auto flex max-w-7xl px-4 lg:items-center">
              <div ref={texte} className="absolute inset-x-4 top-28 text-center lg:static lg:max-w-md lg:text-left">
                <p data-bloc="0" className="etiquette text-accent">N° 0006 · Feu / Vol</p>
                <p className="font-titre text-5xl font-bold tracking-tight sm:text-7xl">
                  {/* Les lecteurs d'écran lisent le mot entier ; les lettres séparées ne sont que décor. */}
                  <span className="sr-only">{TITRE}</span>
                  {Array.from(TITRE, (lettre, i) => (
                    <span key={i} data-lettre aria-hidden="true" className="inline-block origin-bottom">
                      {lettre}
                    </span>
                  ))}
                </p>
                <p data-bloc="2" className="mt-3 text-sm text-texte-doux sm:text-base">
                  Son souffle brûlant peut faire fondre la roche. Quand il s&apos;emporte, la flamme au bout de sa queue vire
                  au blanc incandescent.
                </p>
                <p
                  data-bloc="3"
                  className="mt-4 hidden flex-wrap justify-center gap-x-5 gap-y-1 border-t border-accent/30 pt-3 text-sm text-texte-doux sm:flex lg:justify-start"
                >
                  <span>
                    Taille : <strong className="text-texte">1,7 m</strong>
                  </span>
                  <span>
                    Poids : <strong className="text-texte">90,5 kg</strong>
                  </span>
                  <span>
                    Talent : <strong className="text-texte">Brasier</strong>
                  </span>
                </p>
              </div>
            </div>

            <p ref={invite} aria-hidden="true" className="etiquette absolute inset-x-0 bottom-20 text-center">
              Faites défiler ↓
            </p>
            {/* Raccourci : un visiteur pressé (ou au clavier) saute la séquence. C'est une action : un <button>. */}
            <button type="button" onClick={passer} className="bouton bouton-secondaire pointer-events-auto absolute bottom-6 right-4">
              Passer
            </button>
          </div>
        )}
      </div>
      {/* Le supplément de hauteur qui sert de course à la séquence. Un bloc vide, et pas une marge intérieure
          (padding) : un élément collant ne peut glisser que dans le CONTENU de son parent. */}
      {avecSequence && <div aria-hidden="true" className="h-[250svh] motion-reduce:hidden" />}
    </div>
  );
}
