import type { CSSProperties } from "react";
import { STAT_MAX } from "@/lib/stats";

type Props = {
  libelle: string;
  valeur: number;
  // Position dans la liste : sert à décaler le départ de l'animation (les barres se remplissent l'une après l'autre).
  index?: number;
};

// Une ligne « libellé – valeur – barre ». La valeur est écrite en texte : la barre est donc
// purement décorative (aria-hidden) et les lecteurs d'écran lisent « Attaque 84 ».
export default function BarreStat({ libelle, valeur, index = 0 }: Props) {
  // Proportion entre 0 et 1, jamais plus de 1.
  const proportion = Math.min(valeur / STAT_MAX, 1);

  return (
    <li className="grid grid-cols-[5.5rem_2.5rem_1fr] items-center gap-2">
      <span className="etiquette">{libelle}</span>
      <span className="text-right font-titre text-sm font-semibold tabular-nums">{valeur}</span>
      <span className="h-2 overflow-hidden rounded-full bg-piste" aria-hidden="true">
        {/* La longueur dépend d'une donnée : on la passe dans une variable CSS --proportion
            (une classe Tailwind dynamique ne marcherait pas).
            scaleX + origin-left : la barre s'étire depuis la gauche ; on n'anime que transform.
            animate-remplissage va de 0 à --proportion ; sans animation (motion-reduce), la barre est directement à sa taille. */}
        <span
          className="block h-full origin-left rounded-full bg-linear-to-r from-accent to-accent-bis [transform:scaleX(var(--proportion))] animate-remplissage motion-reduce:animate-none"
          style={{ "--proportion": proportion, animationDelay: `${150 + index * 70}ms` } as CSSProperties}
        />
      </span>
    </li>
  );
}
