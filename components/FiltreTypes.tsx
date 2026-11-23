"use client";

import { useCallback, useOptimistic, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EffetType from "@/components/EffetType";
import { GLYPHES } from "@/lib/glyphes";
import { construireAdresse } from "@/lib/recherche";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES, type NomType } from "@/lib/types";

type Props = {
  q: string;
  typeActif: NomType | null; // le type lu dans l'adresse par le serveur
};

type Effet = { type: NomType; origine: { x: number; y: number }; numero: number };

// Filtre par type : une tuile par type. Ce sont toujours de simples LIENS (l'adresse reste la source
// de vérité), mais le composant est « client » pour deux raisons :
// 1. réagir TOUT DE SUITE au clic : le type choisi est marqué actif sans attendre la réponse du serveur ;
// 2. jouer l'effet du type sur l'écran.
export default function FiltreTypes({ q, typeActif }: Props) {
  const router = useRouter();
  // useTransition : enAttente vaut true tant que le serveur n'a pas renvoyé la nouvelle liste.
  const [enAttente, demarrerTransition] = useTransition();
  // useOptimistic : pendant la transition, on affiche tout de suite le type cliqué comme actif.
  // Quand la transition se termine, React reprend tout seul la vraie valeur (typeActif, venue du serveur).
  // Si l'on clique plusieurs types à la suite, seul le dernier compte : rien ne « revient en arrière ».
  const [actifAffiche, setActifOptimiste] = useOptimistic<NomType | null>(typeActif);

  // Préchargement « à l'intention » : la liste d'un type n'est préparée que lorsque l'on s'apprête à
  // cliquer dessus (survol, focus clavier ou doigt posé), pas pour les 19 tuiles d'un coup.
  // Précharger toutes les tuiles à chaque affichage lançait 19 rendus serveur par clic.
  const [vise, setVise] = useState<NomType | "tous" | null>(null);

  const [effet, setEffet] = useState<Effet | null>(null);
  const retirerEffet = useCallback(() => setEffet(null), []);

  function choisir(type: NomType | null, evenement: MouseEvent<HTMLAnchorElement>) {
    // Ctrl+clic, clic du milieu… : on laisse le navigateur ouvrir le lien normalement (nouvel onglet).
    if (evenement.button !== 0 || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey || evenement.altKey) return;
    evenement.preventDefault();

    if (type && type !== actifAffiche) {
      // L'effet part du centre de la tuile cliquée (valable aussi au clavier, où il n'y a pas de souris).
      const zone = evenement.currentTarget.getBoundingClientRect();
      // « numero » change à chaque clic : React recrée l'effet, qui rejoue donc son animation.
      setEffet({ type, origine: { x: zone.left + zone.width / 2, y: zone.top + zone.height / 2 }, numero: Date.now() });
    }
    demarrerTransition(() => {
      setActifOptimiste(type);
      router.push(construireAdresse({ q, type, page: 1 }), { scroll: false });
    });
  }

  return (
    <nav aria-label="Filtrer par type">
      {/* Sur mobile : une seule ligne qui défile horizontalement. À partir de sm : retour à la ligne. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <li className="shrink-0">
          <Link
            href={construireAdresse({ q, type: null, page: 1 })}
            // prefetch : la liste de cette adresse est préparée AVANT le clic (elle vient d'une fonction
            // "use cache"), la navigation est donc immédiate. false = aucun préchargement.
            prefetch={vise === "tous"}
            onPointerEnter={() => setVise("tous")}
            onFocus={() => setVise("tous")}
            scroll={false}
            onClick={(evenement) => choisir(null, evenement)}
            aria-current={actifAffiche === null ? "true" : undefined}
            className={`puce-tuile h-full justify-center ${
              actifAffiche === null ? "border-transparent bg-accent text-sur-accent shadow-lueur" : "hover:bg-piste"
            }`}
          >
            Tous
          </Link>
        </li>
        {NOMS_TYPES.map((type) => {
          const actif = type === actifAffiche;
          return (
            <li key={type} className="shrink-0" style={styleTeinte(type)}>
              <Link
                href={construireAdresse({ q, type, page: 1 })}
                prefetch={vise === type}
                onPointerEnter={() => setVise(type)}
                onFocus={() => setVise(type)}
                scroll={false}
                onClick={(evenement) => choisir(type, evenement)}
                aria-current={actif ? "true" : undefined}
                className={`group puce-tuile ${
                  actif ? `border-transparent shadow-[0_0_18px_-2px_var(--teinte)] ${TYPES[type].classes}` : "hover:border-[var(--teinte)]"
                }`}
              >
                {/* Le symbole du type dans un disque, le libellé dessous. */}
                <span
                  className={`flex size-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none ${
                    actif ? "bg-black/15" : "bg-[color-mix(in_srgb,var(--teinte)_22%,transparent)]"
                  }`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-5 ${actif ? "fill-current" : "fill-[var(--teinte)]"}`}>
                    <path d={GLYPHES[type].trace} fillRule="evenodd" />
                  </svg>
                </span>
                {TYPES[type].libelle}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Fine barre en haut de l'écran tant que la nouvelle liste n'est pas arrivée. */}
      {enAttente && <span aria-hidden="true" className="barre-attente fixed inset-x-0 top-0 z-50 h-0.5 bg-accent" />}

      {effet && <EffetType key={effet.numero} type={effet.type} origine={effet.origine} surFin={retirerEffet} />}
    </nav>
  );
}
