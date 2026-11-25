"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EffetType from "@/components/EffetType";
import { arreterEclat, jouerEclat, preparerEclat } from "@/lib/effets-types/eclat";
import { GLYPHES } from "@/lib/glyphes";
import { construireAdresse } from "@/lib/recherche";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES, type NomType } from "@/lib/types";

type Props = {
  q: string;
  typeActif: NomType | null; // le type lu dans l'adresse par le serveur
  // Disposition des tuiles à partir de sm (sur téléphone, c'est toujours une ligne qui défile) :
  // « defaut » = à la suite, calées à gauche ; « centre » = centrées ; « etale » = réparties sur toute la largeur ;
  // « grille » = l'accueil : « Tous les types » seul sur sa ligne, puis les 18 types en rangées complètes.
  disposition?: keyof typeof DISPOSITIONS;
};

// Table de correspondance : les classes complètes de chaque disposition (jamais de classe fabriquée à la volée).
// liste = la <ul> ; tous = la tuile « Tous » ; tuile = une tuile de type ; disque = le rond du symbole.
const DISPOSITIONS = {
  defaut: { liste: "sm:flex-wrap", tous: "", tuile: "", disque: "" },
  centre: { liste: "sm:flex-wrap sm:justify-center", tous: "", tuile: "", disque: "" },
  // Grille de 5 colonnes, puis 10 sur grand écran. Il y a 19 tuiles (« Tous » + 18 types) : « Tous » occupe
  // deux colonnes ([&>li:first-child]:col-span-2), ce qui fait 20 cases, donc des rangées toujours complètes.
  // Chaque tuile remplit sa case ([&_a]:w-full).
  etale: { liste: "sm:grid sm:grid-cols-5 sm:[&_a]:w-full sm:[&>li:first-child]:col-span-2 lg:grid-cols-10", tous: "", tuile: "", disque: "" },
  // 18 types = 3 rangées de 6, puis 2 rangées de 9 à partir de lg : toujours symétrique.
  // « Tous » occupe une ligne entière (col-span-full) et devient une gélule centrée.
  // À partir de xl, il y a la place d'écrire le libellé À CÔTÉ du symbole (flex-row) : tuiles plus basses.
  grille: {
    liste: "sm:grid sm:grid-cols-6 lg:grid-cols-9 sm:[&>li:first-child]:col-span-full sm:[&>li:first-child]:flex sm:[&>li:first-child]:justify-center",
    tous: "sm:h-auto sm:min-h-10 sm:w-auto sm:flex-row sm:rounded-full sm:px-5 sm:py-0 sm:text-sm",
    tuile: "sm:w-full xl:flex-row xl:justify-start xl:gap-2 xl:px-2 xl:py-1.5 xl:text-sm",
    disque: "xl:size-8",
  },
};

// L'effet CSS de repli, quand l'éclat en shader n'a pas pu partir.
type Effet = { type: NomType; origine: { x: number; y: number }; numero: number };

// Filtre par type : une tuile par type. Ce sont toujours de simples LIENS (l'adresse reste la source
// de vérité), mais le composant est « client » pour deux raisons :
// 1. réagir TOUT DE SUITE au clic : le type choisi est marqué actif sans attendre la réponse du serveur ;
// 2. jouer l'effet du type sur l'écran.
export default function FiltreTypes({ q, typeActif, disposition = "defaut" }: Props) {
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
  // Même idée pour l'éclat : dès qu'une tuile est visée, on prépare son shader (téléchargement de three.js
  // la première fois, puis compilation), pour qu'il parte sans attente au clic.
  function viser(type: NomType) {
    setVise(type);
    preparerEclat(type);
  }

  // Numéro du dernier clic : sert à reconnaître, après une courte attente, si un clic plus récent est arrivé.
  const dernierClic = useRef(0);

  const [effet, setEffet] = useState<Effet | null>(null);
  const retirerEffet = useCallback(() => setEffet(null), []);
  // Quand on quitte l'accueil (clic sur un Pokémon pendant l'effet), Next ne détruit pas la page : il la
  // met en veille et la réaffiche telle quelle au retour. Sans ce nettoyage, l'effet resté en mémoire
  // rejouait ses symboles au retour, et l'éclat continuait par-dessus la fiche.
  // La fonction renvoyée par useEffect est appelée à la mise en veille comme à la destruction.
  useEffect(() => {
    return () => {
      setEffet(null);
      arreterEclat();
    };
  }, []);

  function choisir(type: NomType | null, evenement: MouseEvent<HTMLAnchorElement>) {
    // Ctrl+clic, clic du milieu… : on laisse le navigateur ouvrir le lien normalement (nouvel onglet).
    if (evenement.button !== 0 || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey || evenement.altKey) return;
    evenement.preventDefault();

    if (type && type !== actifAffiche) {
      // L'effet part du centre de la tuile cliquée (valable aussi au clavier, où il n'y a pas de souris).
      const zone = evenement.currentTarget.getBoundingClientRect();
      const origine = { x: zone.left + zone.width / 2, y: zone.top + zone.height / 2 };
      // L'effet est l'éclat en shader du type, entre 0,8 et 1,5 s. S'il ne peut pas partir (premier clic
      // trop rapide, pas de WebGL, animations réduites), on joue à la place l'effet CSS (EffetType).
      const eclatParti = jouerEclat(type, origine, Math.min(Math.max(GLYPHES[type].duree, 800), 1500));
      // « numero » change à chaque clic : React recrée l'effet, qui rejoue donc son animation.
      setEffet(eclatParti ? null : { type, origine, numero: Date.now() });
    }
    const adresse = construireAdresse({ q, type, page: 1 });
    const numero = ++dernierClic.current;
    const dejaEnAttente = enAttente;
    demarrerTransition(async () => {
      setActifOptimiste(type);
      // Clics en rafale : si une liste est déjà en route, on attend un court instant. Si un autre clic
      // arrive entre-temps, celui-ci est abandonné : le serveur n'est appelé que pour le DERNIER type choisi,
      // au lieu d'une fois par clic. Un clic isolé, lui, part tout de suite.
      if (dejaEnAttente) {
        await new Promise((suite) => setTimeout(suite, 140));
        if (numero !== dernierClic.current) return;
      }
      // Après un « await », il faut rouvrir une transition pour que la navigation en fasse partie.
      demarrerTransition(() => router.push(adresse, { scroll: false }));
    });
  }

  return (
    <nav aria-label="Filtrer par type">
      {/* Sur mobile : une seule ligne qui défile horizontalement. À partir de sm : retour à la ligne. */}
      <ul className={`-mx-4 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:overflow-visible sm:px-0 ${DISPOSITIONS[disposition].liste}`}>
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
            className={`puce-tuile h-full justify-center ${DISPOSITIONS[disposition].tous} ${
              // Actif : rouge plein, texte blanc. Le « ! » (important) passe devant le fond teinté de puce-tuile.
              actifAffiche === null ? "border-transparent bg-accent-plein! text-sur-accent shadow-lueur" : ""
            }`}
          >
            Tous
            {/* « les types » n'est écrit que dans la grille de l'accueil, où la tuile est une large gélule. */}
            {disposition === "grille" && <span className="hidden sm:inline">les types</span>}
          </Link>
        </li>
        {NOMS_TYPES.map((type) => {
          const actif = type === actifAffiche;
          return (
            <li key={type} className="shrink-0" style={styleTeinte(type)}>
              <Link
                href={construireAdresse({ q, type, page: 1 })}
                prefetch={vise === type}
                onPointerEnter={() => viser(type)}
                onFocus={() => viser(type)}
                scroll={false}
                onClick={(evenement) => choisir(type, evenement)}
                aria-current={actif ? "true" : undefined}
                className={`group puce-tuile ${DISPOSITIONS[disposition].tuile} ${
                  // Actif : la tuile est remplie de la couleur du type (classes de la table TYPES, avec un texte
                  // contrasté), entourée d'un halo de la même teinte. Le style en ligne l'emporte sur le fond
                  // teinté de puce-tuile ; la table TYPES donne la couleur du texte.
                  actif ? `border-transparent shadow-[0_0_0_2px_var(--color-fond),0_0_0_4px_var(--teinte)] ${TYPES[type].classes}` : ""
                }`}
                style={actif ? { backgroundColor: "var(--teinte)" } : undefined}
              >
                {/* Le symbole du type dans un disque PLEIN de la couleur du type (classes de la table TYPES) :
                    bien plus lisible au repos qu'un disque translucide. Le libellé est dessous (ou à côté). */}
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none ${DISPOSITIONS[disposition].disque} ${
                    actif ? "bg-black/15" : TYPES[type].classes
                  }`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
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
