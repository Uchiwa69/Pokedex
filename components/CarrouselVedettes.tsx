"use client";

// Carrousel des Pokémon vedettes, en haut de l'accueil. Il prépare les cartes puis les confie à FlexCarousel
// (composant fourni par l'utilisateur, repris tel quel).
//
// FlexCarousel affiche des IMAGES pleines : une illustration à fond transparent y apparaîtrait sur du noir.
// On fabrique donc ici une carte par Pokémon dans un canvas 2D (fond sombre, lueur de la couleur du type,
// numéro en filigrane, illustration), puis on la transforme en image (toDataURL).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FlexCarousel, { type FlexCarouselItem } from "@/components/FlexCarousel";
import type { NomType } from "@/lib/types";

type Vedette = { id: number; nom: string; nomFr: string; type: NomType };

// Les données restent en anglais (nom, type) ; le nom français ne sert qu'à l'affichage.
const VEDETTES: Vedette[] = [
  { id: 25, nom: "pikachu", nomFr: "Pikachu", type: "electric" },
  { id: 6, nom: "charizard", nomFr: "Dracaufeu", type: "fire" },
  { id: 9, nom: "blastoise", nomFr: "Tortank", type: "water" },
  { id: 3, nom: "venusaur", nomFr: "Florizarre", type: "grass" },
  { id: 150, nom: "mewtwo", nomFr: "Mewtwo", type: "psychic" },
  { id: 94, nom: "gengar", nomFr: "Ectoplasma", type: "ghost" },
  { id: 130, nom: "gyarados", nomFr: "Léviator", type: "water" },
  { id: 149, nom: "dragonite", nomFr: "Dracolosse", type: "dragon" },
  { id: 448, nom: "lucario", nomFr: "Lucario", type: "fighting" },
  { id: 143, nom: "snorlax", nomFr: "Ronflex", type: "normal" },
  { id: 133, nom: "eevee", nomFr: "Évoli", type: "normal" },
  { id: 384, nom: "rayquaza", nomFr: "Rayquaza", type: "dragon" },
];

const ARTWORK = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
// Cartes dessinées en 900 × 1200 : plus que leur taille à l'écran, pour rester nettes sous la lentille.
const LARGEUR = 900;
const HAUTEUR = 1200;
const PAS_DEFILEMENT = 240; // pixels de défilement de la page pour passer à la carte suivante

function chargerImage(adresse: string) {
  return new Promise<HTMLImageElement>((reussi, echoue) => {
    const image = new Image();
    image.crossOrigin = "anonymous"; // sans cela, le canvas refuserait de rendre son contenu (toDataURL)
    image.onload = () => reussi(image);
    image.onerror = echoue;
    image.src = adresse;
  });
}

// Dessine la carte d'un Pokémon et la renvoie sous forme d'image (adresse « data: »).
async function dessinerCarte(vedette: Vedette, couleurs: CSSStyleDeclaration) {
  const illustration = await chargerImage(`${ARTWORK}/${vedette.id}.png`);
  const toile = document.createElement("canvas");
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("canvas 2D indisponible");

  // Fond : la couleur de surface du site, puis une lueur de la couleur du type (jetons de globals.css).
  const teinte = couleurs.getPropertyValue(`--color-type-${vedette.type}`).trim() || "#ef4444";
  ctx.fillStyle = couleurs.getPropertyValue("--color-surface").trim() || "#171a21";
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  const lueur = ctx.createRadialGradient(LARGEUR / 2, HAUTEUR * 0.46, 30, LARGEUR / 2, HAUTEUR * 0.46, HAUTEUR * 0.62);
  lueur.addColorStop(0, teinte);
  lueur.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = lueur;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // Numéro en filigrane géant, comme sur les cartes de la grille.
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 285px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(vedette.id).padStart(4, "0"), LARGEUR / 2, 345);

  // L'illustration, avec une ombre douce sous elle.
  ctx.globalAlpha = 1;
  ctx.shadowColor = "rgb(0 0 0 / 0.55)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 36;
  ctx.imageSmoothingQuality = "high"; // l'illustration (475 px) est agrandie : lissage de meilleure qualité
  const cote = LARGEUR * 0.92;
  ctx.drawImage(illustration, (LARGEUR - cote) / 2, HAUTEUR * 0.5 - cote / 2 + 45, cote, cote);

  // PNG : sans perte (le WebP compressé laissait un léger flou sur les contours).
  return toile.toDataURL("image/png");
}

export default function CarrouselVedettes() {
  const [cartes, setCartes] = useState<FlexCarouselItem[] | null>(null);
  const [actif, setActif] = useState(0);
  const cadre = useRef<HTMLDivElement>(null);

  // Les cartes sont dessinées une fois, dans le navigateur (useEffect : canvas et images n'existent pas côté serveur).
  useEffect(() => {
    let annule = false;
    const couleurs = getComputedStyle(document.documentElement);
    Promise.all(
      VEDETTES.map(async (vedette) => ({
        src: await dessinerCarte(vedette, couleurs),
        alt: vedette.nomFr,
        title: vedette.nomFr,
        subtitle: `N° ${String(vedette.id).padStart(4, "0")}`,
      })),
    )
      .then((pretes) => {
        if (!annule) setCartes(pretes);
      })
      .catch(() => {}); // image indisponible : pas de carrousel, le reste de la page s'affiche quand même
    return () => {
      annule = true;
    };
  }, []);

  // Le carrousel tourne avec le défilement de la PAGE : une carte tous les PAS_DEFILEMENT pixels. On ne lui
  // laisse pas capturer la molette (la page resterait bloquée dessus). À la place, on lui envoie une fausse
  // frappe de touche fléchée, qu'il sait déjà traiter : le composant fourni n'est donc pas modifié.
  useEffect(() => {
    if (!cartes || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zone = cadre.current?.querySelector<HTMLElement>("[aria-roledescription='carousel']");
    if (!zone) return;
    let dernier = window.scrollY;
    let cumul = 0; // défilement accumulé depuis la dernière carte passée
    function suivre() {
      const ecart = window.scrollY - dernier;
      dernier = window.scrollY;
      // Inutile s'il est sorti de l'écran, ou si la page a sauté d'un coup (lien d'ancre, touche Fin).
      const place = zone!.getBoundingClientRect();
      if (place.bottom < 0 || place.top > window.innerHeight || Math.abs(ecart) > 400) {
        cumul = 0;
        return;
      }
      cumul += ecart;
      while (Math.abs(cumul) >= PAS_DEFILEMENT) {
        const sens = cumul > 0 ? 1 : -1;
        zone!.dispatchEvent(new KeyboardEvent("keydown", { key: sens > 0 ? "ArrowRight" : "ArrowLeft", cancelable: true }));
        cumul -= sens * PAS_DEFILEMENT;
      }
    }
    window.addEventListener("scroll", suivre, { passive: true });
    return () => window.removeEventListener("scroll", suivre);
  }, [cartes]);

  const vedette = VEDETTES[actif] ?? VEDETTES[0];

  return (
    <section aria-label="Pokémon vedettes" className="flex flex-col items-center gap-2">
      {/* Hauteur réservée dès le départ : rien ne saute quand les cartes arrivent. */}
      {/* Masque : les cartes s'estompent sur les côtés au lieu d'être coupées net au bord de la colonne. */}
      <div
        ref={cadre}
        className="relative h-[26rem] w-full sm:h-[34rem]"
        style={{ maskImage: "linear-gradient(to right, transparent, black 14%, black 86%, transparent)" }}
      >
        {cartes && (
          <FlexCarousel
            items={cartes}
            preset="liquid"
            intro="rise"
            cardHeight={0.5}
            gap={12}
            squeeze={0.2}
            focusOnClick
            captions
            fit="natural"
            radius={18}
            autoplay={false}
            // La molette continue de faire défiler la PAGE ; le carrousel suit ce défilement (voir l'effet plus haut).
            captureWheel={false}
            // Le composant pose « overscroll-contain », qui empêche la page de défiler quand la souris est sur lui.
            // On le neutralise d'ici (le ! rend la classe prioritaire), sans toucher au composant.
            className="overscroll-auto!"
            onChange={setActif}
          />
        )}
      </div>
      {/* Le carrousel est un canvas : ce lien, lui, est une vraie navigation vers la fiche du Pokémon au centre. */}
      <Link href={`/pokemon/${vedette.nom}`} className="bouton bouton-secondaire">
        Voir la fiche de {vedette.nomFr}
      </Link>
    </section>
  );
}
