"use client";

// Séquence « l'écran brûle », pilotée par le défilement : Dracaufeu crache un souffle de flammes, l'écran se
// consume comme du papier et ce qui est DERRIÈRE (children) apparaît à travers la brûlure. Placée en fin de page
// (choix de l'utilisateur) : children est alors l'écran de fin, haut d'un écran. Dans la suite, « la page » = children.
// Le dessin est fait par un shader (lib/scenes-feu/), sur un canvas transparent posé par-dessus la page.
//
// Principe : la page est « collante » (sticky) dans un conteneur plus haut qu'elle de 560 % de l'écran (un bloc vide la suit). Tant
// qu'on parcourt ce supplément, la page reste en place sous le canvas ; on mesure seulement OÙ on en est
// (de 0 à 1) et on donne ce nombre au shader. Remonter rejoue donc la séquence à l'envers. Ensuite la page
// défile normalement.
//
// Animations réduites, ou pas de WebGL : pas de séquence, la page s'affiche directement.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { preparerTexte } from "@/lib/scenes-feu/texte";

const TITRE = "Dracaufeu";

// Passe de 0 à 1 quand x va de a à b (comme smoothstep en GLSL) : sert aux fondus des textes.
function fondu(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Le shader joue le souffle de 0 à 0,4 et la désintégration de 0,4 à 1. On donne au souffle les 25 premiers
// pour cent du défilement et à la désintégration les 75 restants : elle dure plus longtemps sous la molette
// (demande de l'utilisateur), sans toucher au shader.
function allonger(parcouru: number) {
  return parcouru < 0.25 ? (parcouru / 0.25) * 0.4 : 0.4 + ((parcouru - 0.25) / 0.75) * 0.6;
}

type Props = { children: ReactNode };

export default function SequenceFeu({ children }: Props) {
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
      .then((module) => module.creerSceneFeu(elementToile))
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

        // Le texte animé : ses éléments sont repérés une fois, puis mis à jour à chaque image.
        const mettreAJourTexte = texte.current ? preparerTexte(texte.current) : null;

        function boucle() {
          // La course = ce que le conteneur a de plus haut que la page (les 560 % d'écran).
          // 0 quand la page vient de se coller en haut de l'écran, 1 quand elle va se décoller.
          const course = elementConteneur!.offsetHeight - elementPage!.offsetHeight;
          const parcouru = Math.min(1, Math.max(0, -elementConteneur!.getBoundingClientRect().top / course));
          const progression = allonger(parcouru);
          // On dessine même à la fin (progression = 1) : des braises continuent de monter derrière l'écran de fin.
          dessin.dessiner(progression);
          // Les textes : on écrit directement leur opacité, sans état React (60 rendus par seconde sinon).
          if (invite.current) invite.current.style.opacity = String(1 - fondu(0.02, 0.1, progression));
          mettreAJourTexte?.(progression);
          // Une image par rafraîchissement de l'écran : les flammes bougent même quand on ne défile pas.
          image = requestAnimationFrame(boucle);
        }
        // La boucle ne tourne que si la séquence est à l'écran (IntersectionObserver) : placée en fin de page,
        // elle ne coûte rien tant qu'on parcourt la liste.
        const guetteurVue = new IntersectionObserver(([entree]) => {
          cancelAnimationFrame(image);
          if (entree.isIntersecting) {
            // On recale le voile à chaque arrivée : la colonne a pu bouger depuis (introduction du Pokédex).
            ajuster();
            image = requestAnimationFrame(boucle);
          }
        });
        guetteurVue.observe(elementConteneur);
        setEtat("pret");

        nettoyer = () => {
          cancelAnimationFrame(image);
          window.removeEventListener("resize", ajuster);
          guetteurVue.disconnect();
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
  }, []);

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
            {/* Masque : le haut de la scène s'estompe, elle ne commence plus par un bord net sous la liste. */}
            <canvas
              ref={toile}
              aria-hidden="true"
              className="h-full w-full"
              style={{ maskImage: "linear-gradient(to bottom, transparent 4%, black 22%)" }}
            />

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

            <p ref={invite} aria-hidden="true" className="etiquette absolute inset-x-0 bottom-10 text-center">
              Faites défiler ↓
            </p>
          </div>
        )}
      </div>
      {/* Le supplément de hauteur qui sert de course à la séquence. Un bloc vide, et pas une marge intérieure
          (padding) : un élément collant ne peut glisser que dans le CONTENU de son parent. */}
      {avecSequence && <div aria-hidden="true" className="h-[560svh] motion-reduce:hidden" />}
    </div>
  );
}
