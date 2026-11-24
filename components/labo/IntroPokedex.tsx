"use client";

// PROTOTYPE (/labo/intro?v=pokedex) — un Pokédex géant, fermé à l'arrivée : en défilant, son volet s'ouvre,
// puis on plonge dans son écran, qui devient la page du site.
// Même technique que IntroPokeball : useScroll donne l'avancement du défilement (0 → 1) et useTransform le
// convertit en mouvement. Ici le volet tourne autour de sa charnière (rotateY) dans un espace en perspective,
// exactement comme l'écran du MacBook du composant d'origine tournait autour de la sienne (rotateX).

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Pokeball from "@/components/Pokeball";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  total: number;
  // Les premiers Pokémon de la grille : leurs illustrations forment l'aperçu affiché sur l'écran de l'appareil.
  apercu: Pokemon[];
};

export default function IntroPokedex({ total, apercu }: Props) {
  const zone = useRef<HTMLDivElement>(null);
  const animationsReduites = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Le défilement est découpé en deux temps :
  //   1. de 5 % à 45 % : le volet s'ouvre et l'appareil se redresse ;
  //   2. de 50 % à 92 % : on PLONGE dans l'écran, qui grossit jusqu'à remplir toute la fenêtre.
  // À la fin, l'écran de l'appareil EST le fond du site : la vraie page prend le relais juste dessous.
  // (C'est le principe du MacBook d'origine, dont l'écran grandissait pour devenir l'image de la page.)

  // Le volet pivote sur sa charnière gauche : 0° fermé, -178° rabattu à plat sur le côté.
  const voletAngle = useTransform(scrollYProgress, [0.05, 0.45], [0, -178]);
  // Volet ouvert, l'appareil est deux fois plus large : on le décale à droite pour le garder centré,
  // puis on le ramène au centre pour plonger droit dans l'écran.
  const appareilX = useTransform(scrollYProgress, [0.05, 0.45, 0.7], ["0%", "24%", "0%"]);
  // Il est d'abord vu légèrement de biais, puis il se redresse face à nous.
  const appareilAngle = useTransform(scrollYProgress, [0, 0.45], [-18, 0]);
  // La plongée : l'appareil grossit jusqu'à 8 fois. Son point fixe (transform-origin) est le centre de l'écran.
  const appareilTaille = useTransform(scrollYProgress, [0, 0.45, 0.5, 0.92], [0.9, 1, 1, 8]);
  // L'écran s'allume une fois le volet assez ouvert…
  const ecranOpacite = useTransform(scrollYProgress, [0.3, 0.45], [0, 1]);
  // … et son contenu s'efface pendant la plongée, pour laisser place à la vraie page.
  const apercuOpacite = useTransform(scrollYProgress, [0.62, 0.82], [1, 0]);
  // Le reflet de la vitre et l'ombre intérieure de la dalle s'effacent aussi : il ne reste que le fond uni du site.
  const vitreOpacite = useTransform(scrollYProgress, [0.5, 0.7], [1, 0]);
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // Animations réduites : pas d'introduction, la page commence directement par son contenu.
  if (animationsReduites) return null;

  return (
    // Zone haute de 3 écrans : 2 écrans de défilement pour jouer toute la séquence.
    <div ref={zone} aria-hidden="true" className="relative h-[300svh]">
      {/* perspective : donne la profondeur aux rotations des enfants (sans elle, le volet s'aplatirait). */}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden [perspective:1600px]">
        {/* L'appareil. Sa hauteur est bornée par la largeur de l'écran (62vw) : volet ouvert, il est deux fois
            plus large et doit encore tenir sur un téléphone. preserve-3d : ses enfants (le volet) tournent dans le même espace 3D que lui. */}
        <motion.div
          // origin-[50%_48%] : le centre de l'écran de l'appareil. C'est le point qui reste immobile pendant la plongée.
          className="relative aspect-[3/4] h-[min(66svh,62vw)] origin-[50%_48%] [transform-style:preserve-3d]"
          style={{ x: appareilX, rotateY: appareilAngle, scale: appareilTaille }}
        >
          {/* Ombre portée au sol */}
          <span className="absolute -bottom-[6%] left-[8%] h-[6%] w-[84%] rounded-[100%] bg-encre opacity-80 blur-xl" />

          {/* ---- Le corps : la moitié qui porte l'écran ---- */}
          <div className="absolute inset-0 flex flex-col gap-[4%] rounded-[6%] bg-linear-to-br from-coque-clair via-coque to-coque-sombre p-[6%] shadow-[inset_0_2px_0_0_var(--color-coque-clair),inset_0_-3px_0_0_var(--color-coque-sombre)]">
            {/* Rangée du haut : la lentille et les trois voyants */}
            <div className="flex items-center gap-[4%]">
              <Lentille />
              <span className="aspect-square w-[5%] rounded-full bg-pv-bas shadow-[inset_0_-1px_2px_var(--color-encre)]" />
              <span className="aspect-square w-[5%] rounded-full bg-pv-moyen shadow-[inset_0_-1px_2px_var(--color-encre)]" />
              <span className="aspect-square w-[5%] rounded-full bg-pv-haut shadow-[inset_0_-1px_2px_var(--color-encre)]" />
            </div>
            {/* L'écran : un cadre clair biseauté autour d'une dalle sombre */}
            <div className="flex flex-1 rounded-[5%] bg-linear-to-b from-balle-bas to-texte-doux p-[4%] shadow-[inset_0_0_0_1px_var(--color-encre)]">
              {/* La dalle a exactement la couleur de fond du site (bg-fond) : quand elle remplit la fenêtre,
                  on est déjà « dans » le site. */}
              <div className="relative flex flex-1 flex-col overflow-hidden rounded-[4%] bg-fond">
                {/* Ombre intérieure de la dalle (effet d'écran encastré) */}
                <motion.span className="pointer-events-none absolute inset-0 rounded-[4%] shadow-[inset_0_0_30px_var(--color-encre)]" style={{ opacity: vitreOpacite }} />
                {/* Aperçu miniature de la page d'accueil : son titre et ses premières cartes. */}
                <motion.div className="relative flex flex-1 flex-col justify-center gap-[5%] p-[7%]" style={{ opacity: ecranOpacite }}>
                  <motion.div className="flex flex-1 flex-col justify-center gap-[5%]" style={{ opacity: apercuOpacite }}>
                    <div className="flex flex-col gap-1">
                      <p className="text-[0.5rem] font-semibold uppercase tracking-widest text-texte-doux sm:text-[0.65rem]">Pokédex national</p>
                      <p className="font-titre text-sm font-bold text-texte sm:text-2xl">
                        {total.toLocaleString("fr-FR")} Pokémon
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-[5%]">
                      {apercu.map((pokemon) => (
                        <span key={pokemon.nom} style={styleTeinte(pokemon.types[0])} className="relative aspect-[4/5] overflow-hidden rounded-lg border border-bordure-verre bg-surface">
                          <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-30" />
                          {pokemon.artwork && <Image src={pokemon.artwork} alt="" fill sizes="96px" className="object-contain p-[12%]" />}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
                {/* Reflet de la vitre, en biais */}
                <motion.span
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--color-texte)_10%,transparent)_0%,transparent_35%)]"
                  style={{ opacity: vitreOpacite }}
                />
              </div>
            </div>
            {/* Commandes : la croix directionnelle, deux touches et la grille du haut-parleur */}
            <div className="flex items-center justify-between">
              <span className="relative aspect-square w-[18%]">
                <span className="absolute inset-x-[34%] inset-y-0 rounded-sm bg-encre" />
                <span className="absolute inset-x-0 inset-y-[34%] rounded-sm bg-encre" />
              </span>
              <span className="flex w-[30%] flex-col gap-[14%]">
                <span className="h-1.5 rounded-full bg-coque-sombre shadow-[inset_0_1px_2px_var(--color-encre)] sm:h-2.5" />
                <span className="h-1.5 rounded-full bg-coque-sombre shadow-[inset_0_1px_2px_var(--color-encre)] sm:h-2.5" />
              </span>
              <span className="aspect-square w-[16%] rounded-full bg-[radial-gradient(circle,var(--color-encre)_1.2px,transparent_1.6px)] [background-size:6px_6px]" />
            </div>
          </div>

          {/* ---- Le volet : il recouvre le corps, et tourne autour de son bord gauche (origin-left) ---- */}
          <motion.div className="absolute inset-0 origin-left [transform-style:preserve-3d]" style={{ rotateY: voletAngle }}>
            {/* Face extérieure. backface-visibility: hidden → elle disparaît dès qu'on la voit de dos. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6%] rounded-[6%] bg-linear-to-br from-coque-clair via-coque to-coque-sombre shadow-[inset_0_2px_0_0_var(--color-coque-clair),inset_0_-3px_0_0_var(--color-coque-sombre)] [backface-visibility:hidden]">
              {/* Rainure décorative, puis l'emblème et le nom gravés */}
              <span className="absolute inset-[5%] rounded-[5%] border border-coque-sombre opacity-70" />
              <Pokeball className="w-[38%] drop-shadow-[0_6px_10px_var(--color-coque-sombre)]" />
              <p className="font-titre text-xl font-bold uppercase tracking-[0.35em] text-sur-coque sm:text-3xl">Pokédex</p>
              {/* Reflet en biais sur toute la coque */}
              <span className="absolute inset-0 rounded-[6%] bg-[linear-gradient(125deg,color-mix(in_srgb,white_22%,transparent)_0%,transparent_30%)]" />
            </div>
            {/* Face intérieure : la même plaque, retournée (rotateY 180°), plus sombre, avec une charnière. */}
            <div className="absolute inset-0 rounded-[6%] bg-linear-to-bl from-coque to-coque-sombre [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="absolute inset-[7%] rounded-[5%] border border-coque-sombre opacity-80" />
              <span className="absolute inset-y-[12%] right-0 w-[3%] rounded-l-sm bg-coque-sombre" />
            </div>
          </motion.div>
        </motion.div>

        <motion.p className="etiquette absolute bottom-8 flex flex-col items-center gap-2" style={{ opacity: invitationOpacite }}>
          Fais défiler
          <span className="flex h-8 w-5 justify-center rounded-full border border-texte-doux pt-1.5">
            <span className="size-1 rounded-full bg-texte-doux motion-safe:animate-bounce" />
          </span>
        </motion.p>
      </div>
    </div>
  );
}

// La lentille de l'appareil : une bague claire autour d'un verre bombé, avec un reflet.
function Lentille() {
  return (
    <span className="flex aspect-square w-[16%] items-center justify-center rounded-full bg-linear-to-br from-balle-bas to-texte-doux shadow-[0_2px_4px_var(--color-coque-sombre)]">
      <span className="relative size-[76%] rounded-full bg-[radial-gradient(circle_at_32%_30%,var(--color-accent-bis),var(--color-surface-pleine)_78%)] shadow-[inset_0_-2px_4px_var(--color-encre)]">
        <span className="absolute left-[20%] top-[16%] size-[26%] rounded-full bg-balle-bas opacity-80" />
      </span>
    </span>
  );
}
