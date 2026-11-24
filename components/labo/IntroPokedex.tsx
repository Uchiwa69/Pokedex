"use client";

// PROTOTYPE (/labo/intro) — un Pokédex géant, fermé à l'arrivée : en défilant, son volet s'ouvre,
// puis on plonge dans son écran, qui devient la page du site.
// L'appareil est fait de PHOTOS (images générées par l'utilisateur, détourées, dans public/pokedex) :
//   - ouvert.webp    : le corps de l'appareil, écran noir et vide ;
//   - ferme.webp     : le volet vu de l'extérieur ;
//   - volet-dos.webp : la face intérieure du volet (la même plaque en miroir, assombrie).
// Les trois ont exactement le même cadrage : on peut donc les superposer au pixel près.
// Technique : useScroll donne l'avancement du défilement (0 → 1) et useTransform le convertit en mouvement.
// Le volet tourne autour de sa charnière (rotateY) dans un espace en perspective, comme l'écran du MacBook
// du composant d'origine (Aceternity UI) tournait autour de la sienne.

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  total: number;
  // Les premiers Pokémon de la grille : leurs illustrations forment l'aperçu affiché sur l'écran de l'appareil.
  apercu: Pokemon[];
};

// Tailles que le navigateur doit prévoir pour les photos (elles font au plus ~450 px de large à l'écran).
const TAILLES = "(min-width: 640px) 450px, 45vw";

export default function IntroPokedex({ total, apercu }: Props) {
  const zone = useRef<HTMLDivElement>(null);
  const animationsReduites = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Le défilement est découpé en deux temps, volontairement COURTS :
  //   1. de 3 % à 28 % : le volet s'ouvre et l'appareil se redresse ;
  //   2. de 30 % à 50 % : on PLONGE dans l'écran, qui grossit jusqu'à remplir toute la fenêtre.
  // Dès 50 %, la vraie page commence à monter par-dessus (voir la marge négative de la zone, plus bas) :
  // il n'y a donc aucun temps mort entre la fin de la plongée et l'arrivée du contenu.

  // Le volet pivote sur sa charnière gauche : 0° fermé, -178° rabattu à plat sur le côté.
  const voletAngle = useTransform(scrollYProgress, [0.03, 0.28], [0, -178]);
  // Volet ouvert, l'appareil est presque deux fois plus large : on le décale à droite de 44 % de sa largeur
  // (la moitié de ce que le volet ajoute à gauche) pour garder l'ensemble centré,
  // puis on le ramène au centre pour plonger droit dans l'écran.
  const appareilX = useTransform(scrollYProgress, [0.03, 0.28, 0.36], ["0%", "44%", "0%"]);
  // Il est d'abord vu légèrement de biais, puis il se redresse face à nous.
  const appareilAngle = useTransform(scrollYProgress, [0, 0.28], [-16, 0]);
  // La plongée : l'appareil grossit jusqu'à 11 fois. Son point fixe (transform-origin) est le centre de l'écran.
  const appareilTaille = useTransform(scrollYProgress, [0, 0.28, 0.3, 0.5], [0.9, 1, 1, 11]);
  // L'écran s'allume une fois le volet assez ouvert…
  const ecranOpacite = useTransform(scrollYProgress, [0.18, 0.28], [0, 1]);
  // … et son contenu s'efface DÈS LE DÉBUT de la plongée : on ne voit jamais de grosses cartes agrandies.
  const apercuOpacite = useTransform(scrollYProgress, [0.29, 0.34], [1, 0]);
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  // Animations réduites : pas d'introduction, la page commence directement par son contenu.
  if (animationsReduites) return null;

  return (
    // Zone haute de 3 écrans. -mb-[100svh] : la suite de la page REMONTE d'un écran entier par-dessus la fin de la
    // zone. Elle entre donc à l'écran juste quand la plongée se termine, au lieu d'attendre que le bloc collé
    // (un écran entier, vide à ce moment-là) ait fini de défiler. pointer-events-none : la zone ne bloque pas
    // les clics sur la page qui passe par-dessus.
    <div ref={zone} aria-hidden="true" className="pointer-events-none relative -mb-[100svh] h-[300svh]">
      {/* perspective : donne la profondeur aux rotations des enfants (sans elle, le volet s'aplatirait). */}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden [perspective:1800px]">
        {/* L'appareil : mêmes proportions que les photos (1210 × 1834). Sa hauteur est bornée par la largeur de
            l'écran (62vw) : volet ouvert, il est deux fois plus large et doit encore tenir sur un téléphone.
            origin-[52%_48.7%] : le centre de l'écran de l'appareil, point qui reste immobile pendant la plongée.
            preserve-3d : ses enfants (le volet) tournent dans le même espace 3D que lui. */}
        <motion.div
          className="relative aspect-[1210/1834] h-[min(70svh,62vw)] origin-[52%_48.7%] [transform-style:preserve-3d]"
          style={{ x: appareilX, rotateY: appareilAngle, scale: appareilTaille }}
        >
          {/* Ombre portée au sol */}
          <span className="absolute -bottom-[5%] left-[10%] h-[5%] w-[84%] rounded-[100%] bg-encre opacity-90 blur-xl" />

          {/* ---- Le corps : la photo de l'appareil ouvert ---- */}
          <Image src="/pokedex/ouvert.webp" alt="" fill sizes={TAILLES} priority className="object-contain" />

          {/* L'écran : un calque posé exactement sur la dalle noire de la photo (positions mesurées sur l'image).
              Il a la couleur de fond du site (bg-fond) : quand il remplit la fenêtre, on est déjà « dans » le site. */}
          <motion.div
            className="absolute left-[17.4%] top-[31.2%] flex h-[35%] w-[69.2%] flex-col justify-center gap-[5%] overflow-hidden rounded-[2%] bg-fond p-[4%]"
            style={{ opacity: ecranOpacite }}
          >
            {/* Aperçu miniature de la page d'accueil : son titre et ses premières cartes. */}
            <motion.div className="flex flex-col gap-[6%]" style={{ opacity: apercuOpacite }}>
              <div className="flex flex-col">
                <p className="text-[0.4rem] font-semibold uppercase tracking-widest text-texte-doux sm:text-[0.6rem]">Pokédex national</p>
                <p className="font-titre text-xs font-bold text-texte sm:text-xl">{total.toLocaleString("fr-FR")} Pokémon</p>
              </div>
              <div className="grid grid-cols-4 gap-[4%]">
                {apercu.map((pokemon) => (
                  <span key={pokemon.nom} style={styleTeinte(pokemon.types[0])} className="relative aspect-square overflow-hidden rounded-md border border-bordure-verre bg-surface">
                    <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-30" />
                    {pokemon.artwork && <Image src={pokemon.artwork} alt="" fill sizes="64px" className="object-contain p-[10%]" />}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ---- Le volet : la photo de l'appareil fermé, posée sur le corps ----
              origin-[5.6%_50%] : il tourne autour de la charnière (à 5,6 % du bord gauche de l'image). */}
          <motion.div className="absolute inset-0 origin-[5.6%_50%] [transform-style:preserve-3d]" style={{ rotateY: voletAngle }}>
            {/* Face extérieure. backface-visibility: hidden → elle disparaît dès qu'on la voit de dos. */}
            <Image src="/pokedex/ferme.webp" alt="" fill sizes={TAILLES} priority className="object-contain [backface-visibility:hidden]" />
            {/* Face intérieure : visible seulement de dos. L'image est déjà en miroir ; rotateY(180°) la remet à l'endroit. */}
            <Image src="/pokedex/volet-dos.webp" alt="" fill sizes={TAILLES} className="object-contain [backface-visibility:hidden] [transform:rotateY(180deg)]" />
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
