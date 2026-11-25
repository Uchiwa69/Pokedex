"use client";

// PROTOTYPE (branche feature/pokemon-3d-viewer) — liste des 1 025 Pokémon avec l'état de leur modèle 3D.

import { useState } from "react";
import Link from "next/link";
import type { EtatModele, ResumeModele } from "@/lib/labo/modeles3d";

const LIBELLES_ETATS: Record<EtatModele, string> = {
  anime: "Animé",
  statique: "Statique",
  exclu: "Écarté",
  absent: "Absent",
};

// Classes complètes (jamais fabriquées à la volée) pour la pastille de chaque état.
const CLASSES_ETATS: Record<EtatModele, string> = {
  anime: "bg-pv-haut text-encre",
  statique: "bg-piste text-texte",
  exclu: "bg-pv-moyen text-encre",
  absent: "border border-bordure text-texte-doux",
};

type Filtre = EtatModele | "tous";

export default function ListeModeles({ modeles, idActif }: { modeles: ResumeModele[]; idActif: number }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("anime");

  // État dérivé : la liste filtrée est recalculée à chaque rendu, pas stockée.
  const texte = recherche.trim().toLowerCase();
  const visibles = modeles.filter((modele) => {
    if (filtre !== "tous" && modele.etat !== filtre) return false;
    if (texte && !(String(modele.id) === texte || modele.nom.toLowerCase().includes(texte))) return false;
    return true;
  });

  return (
    <div className="verre flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="recherche-modele" className="etiquette">
          Nom ou numéro
        </label>
        <input
          id="recherche-modele"
          type="search"
          value={recherche}
          onChange={(evenement) => setRecherche(evenement.target.value)}
          placeholder="Dracaufeu, 150…"
          autoComplete="off"
          className="min-h-11 w-full rounded-full border border-bordure bg-surface px-4 text-sm text-texte placeholder:text-texte-doux"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="filtre-modele" className="etiquette">
          État du modèle 3D
        </label>
        <select
          id="filtre-modele"
          value={filtre}
          onChange={(evenement) => setFiltre(evenement.target.value as Filtre)}
          className="min-h-11 w-full rounded-full border border-bordure bg-surface-pleine px-4 text-sm text-texte"
        >
          <option value="anime">Animés (animations d&apos;origine)</option>
          <option value="statique">Statiques (animation générique)</option>
          <option value="exclu">Écartés (repli 2D)</option>
          <option value="absent">Absents (repli 2D)</option>
          <option value="tous">Tous</option>
        </select>
      </div>

      <p className="etiquette">{visibles.length} Pokémon</p>

      <ul className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto pr-1">
        {visibles.map((modele) => (
          <li key={modele.id}>
            <Link
              href={`/labo/3d?id=${modele.id}`}
              // prefetch={false} : sans cela, Next préchargerait les 1 025 liens visibles.
              prefetch={false}
              scroll={false}
              aria-current={modele.id === idActif ? "true" : undefined}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-full px-4 text-sm ${
                modele.id === idActif ? "bg-accent-plein font-semibold text-sur-accent" : "hover:bg-piste"
              }`}
            >
              <span className="truncate">
                N° {String(modele.id).padStart(4, "0")} · {modele.nom}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLASSES_ETATS[modele.etat]}`}>
                {LIBELLES_ETATS[modele.etat]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
