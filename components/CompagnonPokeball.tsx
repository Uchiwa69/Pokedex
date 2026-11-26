"use client";

// La Pokéball 3D qui accompagne la page d'accueil : à côté du titre en arrivant, elle roule vers le haut et s'efface quand
// le carrousel prend la place, puis revient tout en bas, ouverte, à travers la brûlure de Dracaufeu, et se
// referme sous « Attrapez-les tous ! ».
// Ce composant ne dessine rien : il relie le DÉFILEMENT à la pose de la Pokéball (lib/pokeball/pose.ts) avec GSAP
// ScrollTrigger. La scène 3D (components/three/ScenePokeball.tsx) lit cette pose à chaque image.
// Idée reprise du site « Rewind » d'un camarade.

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { POSES_ETROITE, POSES_LARGE, pointeur, pose } from "@/lib/pokeball/pose";

// La scène 3D n'existe que dans le navigateur (ssr: false) et son code n'est téléchargé qu'à ce moment-là.
const ScenePokeball = dynamic(() => import("./three/ScenePokeball"), { ssr: false });

export default function CompagnonPokeball() {
  const calque = useRef<HTMLDivElement>(null);
  // « attente » : l'introduction du Pokédex 3D est à l'écran (ou on ne sait pas encore) ; « pret » : la page est
  // en place, la Pokéball peut vivre.
  const [pret, setPret] = useState(false);
  // Faux quand la Pokéball est invisible : la scène 3D est alors mise en pause.
  const [actif, setActif] = useState(true);

  // 1. Attendre la fin de l'introduction. Pendant qu'elle joue, IntroPokedex met la page en « position: fixed »
  //    (classe `fixed`) ; on guette donc la classe de cet élément, notre parent.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // animations réduites : pas de Pokéball
    const page = calque.current?.parentElement;
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

      // Fin de page : une suite d'étapes posées sur la séquence de Dracaufeu ([data-sequence]), de son début
      // jusqu'au bas de la page. Les positions (0.55, 0.85) sont des fractions de ce trajet.
      gsap
        .timeline({ onUpdate: appliquer, scrollTrigger: { trigger: "[data-sequence]", start: "top top", end: "max", scrub: 0.8 } })
        .fromTo(pose, { ...poses.entree }, { ...poses.ouverte, ease: "none", immediateRender: false, duration: 0.25 }, 0.55)
        .to(pose, { ...poses.fermee, ease: "none", duration: 0.15 }, 0.85);
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
    // Calque fixe, DERRIÈRE le contenu de la page (-z-10), purement décoratif : il ne capte aucun clic et il est
    // caché aux lecteurs d'écran. motion-reduce:hidden : absent en animations réduites.
    <div
      ref={calque}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 motion-reduce:hidden"
      style={{ visibility: pret && actif ? "visible" : "hidden" }}
    >
      {pret && <ScenePokeball actif={actif} />}
    </div>
  );
}
