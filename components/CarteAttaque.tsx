import IconeCategorie, { LIBELLES_CATEGORIES } from "@/components/IconeCategorie";
import type { Attaque } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";
import { TYPES } from "@/lib/types";

// Petite carte d'une attaque (dans le détail d'un membre de la sacoche).
// Sans hook ni état : utilisable dans un composant serveur comme dans un composant client.
export default function CarteAttaque({ attaque }: { attaque: Attaque }) {
  return (
    <div
      style={styleTeinte(attaque.type)}
      title={attaque.description || undefined}
      className="relative flex h-full flex-col gap-1 overflow-hidden rounded-2xl border border-bordure bg-surface p-3"
    >
      {/* Barre de la couleur du type sur le bord gauche */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[var(--teinte)]" />
      <p className="truncate font-titre text-sm font-semibold">{attaque.nomFr}</p>
      <p className="etiquette flex items-center gap-1">
        <IconeCategorie categorie={attaque.categorie} />
        <span className="truncate">
          {TYPES[attaque.type].libelle} · {LIBELLES_CATEGORIES[attaque.categorie]}
        </span>
      </p>
      <p className="etiquette">
        Puis. {attaque.puissance ?? "—"} · Préc. {attaque.precision ?? "—"} · PP {attaque.pp}
      </p>
    </div>
  );
}
