import { TYPES, type NomType } from "@/lib/types";

type Props = {
  type: NomType;
  // Version compacte pour les cartes de la grille, où deux badges doivent tenir sur une ligne.
  petit?: boolean;
};

// Pastille colorée d'un type. La donnée reste en anglais ("fire") ;
// la traduction ("Feu") et les classes viennent de la table TYPES.
export default function BadgeType({ type, petit = false }: Props) {
  const info = TYPES[type];
  return (
    <span
      className={`inline-flex min-w-0 items-center rounded-full font-semibold ${
        petit ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      } ${info.classes}`}
    >
      {/* truncate : si la place manque vraiment, le libellé est coupé proprement au lieu de déborder. */}
      <span className="truncate">{info.libelle}</span>
    </span>
  );
}
