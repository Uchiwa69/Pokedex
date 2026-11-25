"use client";

import { useState } from "react";
import Link from "next/link";

type Onglet = { cle: string; libelle: string; href: string };

type Props = {
  onglets: Onglet[];
  actif: string; // clé de l'onglet affiché, lue dans l'adresse par le serveur
};

// Les liens des onglets de la fiche. Ce sont toujours de simples LIENS (l'onglet actif vit dans l'adresse),
// mais le composant est « client » pour une raison : précharger un onglet quand on s'apprête à cliquer dessus.
export default function LiensOnglets({ onglets, actif }: Props) {
  // Préchargement « à l'intention » (comme le filtre par type de l'accueil) : le contenu d'un onglet
  // n'est préparé que lorsque la souris passe dessus ou qu'il reçoit le focus clavier.
  // Résultat : au clic, les attaques sont déjà là. Et on ne charge rien pour un onglet que personne n'ouvre.
  const [vise, setVise] = useState<string | null>(null);

  return (
    <nav aria-label="Onglets de la fiche">
      <ul className="flex w-fit gap-1 rounded-full border border-bordure-verre bg-surface p-1">
        {onglets.map((onglet) => (
          <li key={onglet.cle}>
            <Link
              href={onglet.href}
              // prefetch={true} : Next prépare la page de ce lien AVANT le clic. false = aucun préchargement.
              prefetch={vise === onglet.cle}
              onPointerEnter={() => setVise(onglet.cle)}
              onFocus={() => setVise(onglet.cle)}
              // scroll={false} : on reste au même endroit de la page en changeant d'onglet.
              scroll={false}
              aria-current={actif === onglet.cle ? "page" : undefined}
              className={
                actif === onglet.cle
                  ? "flex min-h-11 items-center rounded-full bg-accent-plein px-5 text-sm font-semibold text-sur-accent shadow-lueur"
                  : "flex min-h-11 items-center rounded-full px-5 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
              }
            >
              {onglet.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
