"use client";

// La Pokéball 3D qui accompagne la page d'accueil : à côté du titre en arrivant, elle roule vers le haut et s'efface quand
// le carrousel prend la place, puis revient tout en bas, ouverte, à travers la brûlure de Dracaufeu, et se
// referme sous « Attrapez-les tous ! ».
// Ce composant ne dessine rien : il relie le DÉFILEMENT à la pose de la Pokéball (lib/pokeball/pose.ts) avec GSAP
// ScrollTrigger. La scène 3D (components/three/ScenePokeball.tsx) lit cette pose à chaque image.
// Idée reprise du site « Rewind » d'un camarade.

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { POSES_ETROITE, POSES_LARGE, pointeur, pose } from "@/lib/pokeball/pose";

// La scène 3D n'existe que dans le navigateur (ssr: false) et son code n'est téléchargé qu'à ce moment-là.
const ScenePokeball = dynamic(() => import("./three/ScenePokeball"), { ssr: false });
// Le fond de l'écran de fin (anneau d'astéroïdes autour de la Pokéball), chargé de la même façon.
const FondAsteroides = dynamic(() => import("./FondAsteroides"), { ssr: false });

// Vrai dans le navigateur, faux pendant le rendu serveur (document n'existe pas encore) : rien à écouter.
const sansAbonnement = () => () => {};
const dansNavigateur = () => true;
const surServeur = () => false;

export default function CompagnonPokeball() {
  const calque = useRef<HTMLDivElement>(null);
  // Repère invisible posé DANS la page : son parent est la page, dont on guette la classe `fixed` (introduction).
  const ancre = useRef<HTMLSpanElement>(null);
  const client = useSyncExternalStore(sansAbonnement, dansNavigateur, surServeur);
  // « attente » : l'introduction du Pokédex 3D est à l'écran (ou on ne sait pas encore) ; « pret » : la page est
  // en place, la Pokéball peut vivre.
  const [pret, setPret] = useState(false);
  // Faux quand la Pokéball est invisible : la scène 3D est alors mise en pause.
  const [actif, setActif] = useState(true);
  // Vrai quand la scène 3D peut être préparée en coulisse (shaders, reflets), avant même la fin de l'introduction :
  // sinon cette préparation figeait la première image (150 ms) au moment précis où l'on arrive sur le site.
  const [prechauffe, setPrechauffe] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Un moment calme après le chargement (Safari ne connaît pas requestIdleCallback : simple délai).
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => setPrechauffe(true), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setPrechauffe(true), 1500);
    return () => clearTimeout(id);
  }, []);

  // 1. Attendre la fin de l'introduction. Pendant qu'elle joue, IntroPokedex met la page en « position: fixed »
  //    (classe `fixed`) ; on guette donc la classe de cet élément, notre parent.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // animations réduites : pas de Pokéball
    const page = ancre.current?.parentElement;
    if (!page) return;
    const verifier = () => setPret(!page.classList.contains("fixed"));
    verifier();
    const guetteur = new MutationObserver(verifier);
    guetteur.observe(page, { attributes: true, attributeFilter: ["class"] });
    return () => guetteur.disconnect();
  }, []);

  // 2. Relier le défilement à la pose.
  useEffect(() => {
    if (!pret) return;
    gsap.registerPlugin(ScrollTrigger);

    // Après chaque changement de pose : opacité du calque (écrite directement, sans état React), et mise en pause
    // de la 3D quand la Pokéball est invisible (setActif ne relance le rendu que si la valeur change).
    function appliquer() {
      if (calque.current) calque.current.style.opacity = String(pose.fondu);
      setActif(pose.fondu > 0.01);
    }

    // matchMedia de GSAP : les animations sont recréées avec les bonnes poses si l'écran change de catégorie.
    const media = gsap.matchMedia();
    media.add({ large: "(min-width: 768px)", etroit: "(max-width: 767px)" }, (contexte) => {
      const poses = contexte.conditions?.large ? POSES_LARGE : POSES_ETROITE;
      Object.assign(pose, poses.titre);
      appliquer();

      // scrub : l'animation n'a pas de durée propre, c'est le défilement qui l'avance (et la recule).
      // 0.8 = elle rattrape la molette en 0,8 s, pour un mouvement doux.
      // Haut de page : du titre à la sortie, sur les 360 premiers pixels de défilement.
      gsap.fromTo(
        pose,
        { ...poses.titre },
        { ...poses.sortie, ease: "none", immediateRender: false, onUpdate: appliquer, scrollTrigger: { start: 0, end: 360, scrub: 0.8 } },
      );
      // En fin de page, c'est la Pokéball de lave qui prend le relais (FondAsteroides) : celle-ci reste effacée.
    });

    // Au retour sur l'accueil, le navigateur remet la page là où on l'avait laissée APRÈS ce branchement : on
    // recalcule donc les repères à l'image suivante, sinon la Pokéball restait affichée à sa pose de départ.
    const recalage = requestAnimationFrame(() => ScrollTrigger.refresh());

    // La hauteur de la page change (recherche, filtre, pagination) : les repères de défilement sont recalculés.
    const guetteurTaille = new ResizeObserver(() => ScrollTrigger.refresh());
    guetteurTaille.observe(document.body);

    // La Pokéball se tourne légèrement vers le pointeur.
    function suivrePointeur(evenement: PointerEvent) {
      pointeur.x = (evenement.clientX / window.innerWidth) * 2 - 1;
      pointeur.y = (evenement.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", suivrePointeur, { passive: true });

    // Nettoyage : animations, repères et écouteurs sont retirés quand on quitte l'accueil.
    return () => {
      cancelAnimationFrame(recalage);
      media.revert();
      guetteurTaille.disconnect();
      window.removeEventListener("pointermove", suivrePointeur);
    };
  }, [pret]);

  return (
    <>
      {/* Le fond de l'écran de fin, derrière la Pokéball (il pose son propre calque, en -z-20). Rendu dans <body> :
          dans la page (z-10), son -z-20 restait AU-DESSUS du pied de page, qui disparaissait sous les astéroïdes. */}
      {pret && client && createPortal(<FondAsteroides />, document.body)}
      <span ref={ancre} hidden />
      {/* Calque fixe, DERRIÈRE le contenu de la page (-z-10), purement décoratif : il ne capte aucun clic et il est
          caché aux lecteurs d'écran. motion-reduce:hidden : absent en animations réduites.
          createPortal le place directement dans <body>, HORS de la page : pendant l'introduction, la page est
          agrandie par une transformation, et un calque « fixe » placé dedans prenait sa taille (gigantesque). Le
          canvas 3D était alors redimensionné à la fin de l'introduction, ce qui figeait l'écran 300 ms. */}
      {client &&
        createPortal(
          <div
            ref={calque}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 motion-reduce:hidden"
            style={{ visibility: pret && actif ? "visible" : "hidden" }}
          >
            {/* Montée dès le préchauffage (invisible tant que l'introduction joue), active une fois la page en place. */}
            {(pret || prechauffe) && <ScenePokeball actif={pret && actif} />}
          </div>,
          document.body,
        )}
    </>
  );
}
