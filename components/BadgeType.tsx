import { TYPES, type NomType } from "@/lib/types";

// Pastille colorée d'un type. La donnée reste en anglais ("fire") ;
// la traduction ("Feu") et les classes viennent de la table TYPES.
export default function BadgeType({ type }: { type: NomType }) {
  const info = TYPES[type];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${info.classes}`}>
      {info.libelle}
    </span>
  );
}
