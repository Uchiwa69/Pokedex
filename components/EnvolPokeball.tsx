"use client";

import { motion } from "motion/react";
import Pokeball from "@/components/Pokeball";
import { useEnvol } from "@/stores/envol";

// Taille de la Pokéball en vol (h-7 w-7 = 28 px) : sert à la centrer sur un point.
const DEMI_TAILLE = 14;
// Durée totale : deux rebonds sur place, puis le vol vers l'en-tête.
const DUREE = 1.15; // secondes
// Moment de chaque étape, de 0 (début) à 1 (fin) :
// apparition → haut du 1er rebond → sol → haut du 2e rebond → sol → arrivée dans la sacoche.
const TEMPS = [0, 0.14, 0.28, 0.39, 0.5, 1];

// La Pokéball qui rebondit sur le bouton puis file dans la sacoche de l'en-tête.
// Montée une seule fois dans le layout ; elle n'affiche rien tant qu'aucun envol n'est lancé.
// On n'anime que transform (x, y, scale, rotate), jamais la position CSS.
export default function EnvolPokeball() {
  const envol = useEnvol((etat) => etat.envol);
  const terminer = useEnvol((etat) => etat.terminer);

  if (!envol) return null;

  // Coin haut gauche de la balle au départ et à l'arrivée.
  const dx = envol.depart.x - DEMI_TAILLE;
  const dy = envol.depart.y - DEMI_TAILLE;
  const ax = envol.arrivee.x - DEMI_TAILLE;
  const ay = envol.arrivee.y - DEMI_TAILLE;

  return (
    <motion.div
      // key : un nouvel envol (numero différent) recrée l'élément, donc rejoue l'animation depuis le début.
      key={envol.numero}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 h-7 w-7"
      initial={{ x: dx, y: dy, scale: 0.3, rotate: 0 }}
      // Un tableau = une suite d'étapes (keyframes), une valeur par moment de TEMPS.
      animate={{
        x: [dx, dx, dx, dx, dx, ax],
        y: [dy, dy - 40, dy, dy - 18, dy, ay],
        scale: [0.3, 1.5, 1.5, 1.5, 1.5, 0.57], // 0.57 × 28 px = 16 px, la taille d'un emplacement
        rotate: [0, -18, 0, 14, 0, 360],
      }}
      transition={{
        duration: DUREE,
        times: TEMPS,
        // Rebonds : on ralentit en montant (easeOut), on accélère en tombant (easeIn).
        // Vol final : y part vite et x part lentement → la trajectoire est une courbe, pas une droite.
        x: { duration: DUREE, times: TEMPS, ease: ["linear", "linear", "linear", "linear", "easeIn"] },
        y: { duration: DUREE, times: TEMPS, ease: ["easeOut", "easeIn", "easeOut", "easeIn", "easeOut"] },
      }}
      // À l'arrivée : on retire la balle en vol, l'indicateur affiche la sienne avec un rebond.
      onAnimationComplete={terminer}
    >
      <Pokeball className="h-full w-full drop-shadow-[0_6px_10px_var(--color-accent)]" />
    </motion.div>
  );
}
