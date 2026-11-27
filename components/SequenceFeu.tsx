"use client";

// Séquence « l'écran brûle », pilotée par le défilement : Dracaufeu crache un souffle de flammes, l'écran se
// consume comme du papier et ce qui est DERRIÈRE (children) apparaît à travers la brûlure. Placée en fin de page
// (choix de l'utilisateur) : children est alors l'écran de fin, haut d'un écran. Dans la suite, « la page » = children.
// Le dessin est fait par un shader (lib/scenes-feu/), sur un canvas transparent posé par-dessus la page.
//
// Principe : la page est « collante » (sticky) dans un conteneur plus haut qu'elle de 360 % de l'écran (un bloc vide la suit). Tant
// qu'on parcourt ce supplément, la page reste en place sous le canvas ; on mesure seulement OÙ on en est
// (de 0 à 1) et on donne ce nombre au shader. Remonter rejoue donc la séquence à l'envers. Ensuite la page
// défile normalement.
//
// Animations réduites, ou pas de WebGL : pas de séquence, la page s'affiche directement.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fondFin } from "@/lib/pokeball/pose";
import { preparerTexte } from "@/lib/scenes-feu/texte";

const TITRE = "Dracaufeu";

// Passe de 0 à 1 quand x va de a à b (comme smoothstep en GLSL) : sert aux fondus des textes.
function fondu(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Le shader joue le souffle de 0 à 0,4 puis la désintégration. On donne au souffle les 39 premiers pour cent du
// défilement (140 % d'écran : sa durée d'origine, que l'utilisateur ne veut pas changer) et à la désintégration
// les 61 restants (220 % d'écran).
function allonger(parcouru: number) {
  // On s'arrête à 0,91 : c'est là que le dernier morceau finit de brûler. Le bas de la page tombe donc pile sur
  // la fin de la désintégration, sans molette « dans le vide » avant le pied de page.
  return parcouru < 0.39 ? (parcouru / 0.39) * 0.4 : 0.4 + ((parcouru - 0.39) / 0.61) * 0.51;
}

// Durée, en secondes, que met l'image à rattraper la molette (voir « boucle »).
const INERTIE = 0.22;

type Props = { children: ReactNode };

export default function SequenceFeu({ children }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const ecranFin = useRef<HTMLDivElement>(null);
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

        // Fluidité : une molette avance par à-coups (un cran = 100 px d'un seul coup). Au lieu de sauter à la
        // nouvelle valeur, la progression AFFICHÉE la rattrape en douceur, un peu plus à chaque image.
        let affichee = -1; // -1 = pas encore de valeur : la première image se place directement
        let precedent = 0; // heure de l'image précédente, pour connaître le temps écoulé
        let fonduHautEcrit = -1; // dernière valeur du fondu du haut écrite dans le style du canvas
        function boucle(maintenant: number) {
          // La course = ce que le conteneur a de plus haut que la page (les 360 % d'écran).
          // 0 quand la page vient de se coller en haut de l'écran, 1 quand elle va se décoller.
          const course = elementConteneur!.offsetHeight - elementPage!.offsetHeight;
          const haut = elementConteneur!.getBoundingClientRect().top;
          // Le pied de page est plus court qu'un écran : le bas de la page arrive AVANT la fin de la course. On
          // mesure donc la part de la course réellement atteignable, pour que « tout en bas » vaille bien 1.
          const defilementMax = document.documentElement.scrollHeight - window.innerHeight;
          const atteignable = Math.min(1, Math.max(0.5, (defilementMax - (haut + window.scrollY)) / course));
          const parcouru = Math.min(1, Math.max(0, -haut / course / atteignable));
          const cible = allonger(parcouru);
          const ecoule = Math.min(0.1, (maintenant - precedent) / 1000);
          precedent = maintenant;
          // 1 - exp(-temps / INERTIE) : la part de l'écart rattrapée pendant cette image (indépendante du nombre
          // d'images par seconde de l'écran).
          affichee = affichee < 0 ? cible : affichee + (cible - affichee) * (1 - Math.exp(-ecoule / INERTIE));
          const progression = affichee;
          // La Pokéball de lave : elle apparaît, ouverte, à travers la brûlure, puis se referme tout en bas de la
          // page (la capture). Les traits de lumière du shader convergent vers elle tant qu'elle est ouverte.
          fondFin.apparition = fondu(0.46, 0.62, progression);
          fondFin.ouverture = 1 - fondu(0.8, 0.9, progression);
          dessin.dessiner(progression, { fx: fondFin.fx, fy: fondFin.fy, force: fondFin.ouverture * fondFin.apparition });
          // Le fond d'astéroïdes : invisible tant que Dracaufeu occupe l'écran (le haut du canvas est en fondu
          // transparent, il s'y verrait), il s'allume quand l'écran commence à se désintégrer (0,36 dans le shader).
          fondFin.visibilite = fondu(0.38, 0.46, progression);
          // L'écran de fin (titre, bouton) apparaît en même temps : avant, il transparaissait au-dessus de Dracaufeu.
          if (ecranFin.current) ecranFin.current.style.opacity = String(fondFin.visibilite);
          fondFin.dessiner?.(true);
          // Le fondu transparent du haut du canvas ne sert qu'à l'arrivée depuis la liste : dès que la séquence
          // démarre, il se referme (sinon on voyait au travers l'écran de fin, puis les astéroïdes, derrière Dracaufeu).
          // Écrit seulement quand la valeur change (au centième près).
          const fonduHaut = Math.round((1 - fondu(0, 0.06, progression)) * 100) / 100;
          if (fonduHaut !== fonduHautEcrit) {
            fonduHautEcrit = fonduHaut;
            elementToile!.style.maskImage =
              fonduHaut > 0 ? `linear-gradient(to bottom, transparent ${4 * fonduHaut}%, black ${22 * fonduHaut}%)` : "none";
          }
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
          // Hors de la séquence, le fond d'astéroïdes est éteint.
          fondFin.visibilite = 0;
          fondFin.dessiner?.(false);
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
        {/* opacity-0 : l'écran de fin attend la désintégration (la boucle écrit ensuite son opacité). Animations
            réduites ou séquence indisponible : il est affiché tout de suite. */}
        <div ref={ecranFin} className={avecSequence ? "opacity-0 motion-reduce:opacity-100" : ""}>
          {children}
        </div>

        {avecSequence && (
          <div
            ref={voile}
            // bg-fond pendant le chargement : la page ne se montre pas avant que la séquence soit prête.
            className={`pointer-events-none absolute left-0 top-0 z-30 h-svh w-full overflow-hidden motion-reduce:hidden ${
              etat === "attente" ? "bg-fond" : ""
            }`}
          >
            {/* Masque : le haut de la scène s'estompe, elle ne commence plus par un bord net sous la liste. Il est
                retiré par la boucle dès que la séquence démarre. */}
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
      {avecSequence && <div aria-hidden="true" className="h-[360svh] motion-reduce:hidden" />}
    </div>
  );
}
