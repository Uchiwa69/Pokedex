import { ViewTransition, type CSSProperties } from "react";
import Image from "next/image";
import { formaterMesure, type Pokemon } from "@/lib/conversion";
import { TYPES } from "@/lib/types";

// Copie « à plat » de la face de la carte holographique, en HTML et CSS, rendue par le SERVEUR.
// Elle est affichée tout de suite, à l'endroit exact où la carte 3D apparaîtra : quand la 3D est prête,
// elle prend sa place sans que l'image change (avant, on voyait d'abord l'illustration seule, puis la carte).
// C'est aussi l'affichage de repli quand la 3D n'est pas disponible sur l'appareil.
//
// Toutes les positions reprennent celles du dessin de lib/carte3d.ts, qui travaille sur 720 × 1000 px.
// Elles sont converties en « cqw » (1 cqw = 1 % de la largeur de la carte, grâce à @container) :
// la copie garde ainsi les bonnes proportions quelle que soit sa taille à l'écran.
const LARGEUR_DESSIN = 720;
function u(pixels: number): string {
  return `${(pixels / LARGEUR_DESSIN) * 100}cqw`;
}

// Où se trouve la ligne de base d'un texte (en part de sa taille) quand line-height vaut 1 :
// sert à poser un texte à la même hauteur que le fillText du canvas. Valeurs propres à chaque police.
const BASE_TITRE = 0.84; // Chakra Petch
const BASE_ETIQUETTE = 0.9; // police du système

// Position d'une « étiquette » (petites capitales blanches de 32 px) dont la ligne de base est à y.
function styleEtiquette(y: number): CSSProperties {
  return { top: u(y - 32 * BASE_ETIQUETTE), fontSize: u(32), letterSpacing: u(3) };
}

export default function CarteStatique({ pokemon }: { pokemon: Pokemon }) {
  const numero = String(pokemon.id).padStart(4, "0");
  // Le canvas réduit le nom tant qu'il dépasse 600 px. Ici on ne peut pas mesurer le texte : on estime sa
  // largeur (environ 0,55 × la taille par lettre) et on retient la plus grande taille qui tient, de 4 en 4.
  const tailleNom = Math.max(40, Math.min(96, Math.floor(600 / (0.55 * pokemon.nomFr.length) / 4) * 4));

  return (
    // 87,9 % de la hauteur de la zone : c'est la place qu'occupe la carte 3D vue de face (mesurée sur des captures).
    // Les arrondis sont donnés en % de la largeur / de la hauteur pour rester des quarts de cercle.
    <div className="@container relative mx-auto aspect-[720/1000] h-[87.9%] overflow-hidden rounded-[7.2%/5.2%] bg-linear-to-br from-carte-haut to-fond font-bold text-carte-texte">
      {/* Voile de la couleur du type, du coin haut gauche vers le centre */}
      <span aria-hidden="true" className="voile-carte absolute inset-0 opacity-45" />
      {/* Grille fine de 40 px */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-accent)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-accent)_1px,transparent_1px)] opacity-[0.04]"
        style={{ backgroundSize: `${u(40)} ${u(40)}` }}
      />
      {/* Liseré intérieur de la teinte */}
      <span aria-hidden="true" className="absolute border-solid border-[var(--teinte)]" style={{ inset: u(19), borderRadius: u(38), borderWidth: u(6) }} />

      {/* Bandeau sombre du haut, puis numéro et types */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 bg-linear-to-b from-carte-ombre/75 to-transparent" style={{ height: u(170) }} />
      <p className="absolute [font-family:system-ui,sans-serif] uppercase leading-none" style={{ ...styleEtiquette(100), left: u(60) }}>
        N° {numero}
      </p>
      <p className="absolute [font-family:system-ui,sans-serif] uppercase leading-none" style={{ ...styleEtiquette(100), right: u(60) }}>
        {pokemon.types.map((type) => TYPES[type].libelle).join(" · ")}
      </p>

      {/* Numéro en filigrane */}
      <span
        aria-hidden="true"
        className="absolute font-titre leading-none text-texte opacity-5"
        style={{ right: u(50), top: u(340 - 220 * BASE_TITRE), fontSize: u(220) }}
      >
        {numero}
      </span>

      {/* Halo diffus derrière l'illustration, puis halo net au sol */}
      <span
        aria-hidden="true"
        className="halo-carte absolute rounded-full opacity-55"
        style={{ left: u(60), top: u(170), width: u(600), height: u(600) }}
      />
      <span aria-hidden="true" className="absolute rounded-[100%] bg-[var(--teinte)] opacity-70" style={{ left: u(190), top: u(698), width: u(340), height: u(44) }} />

      {pokemon.artwork && (
        <div className="absolute" style={{ left: u(100), top: u(200), width: u(520), height: u(520) }}>
          {/* Même nom que sur la carte de la grille → transition partagée de l'image entre les deux pages. */}
          <ViewTransition name={`artwork-${pokemon.id}`} share="morph" default="none">
            <Image
              src={pokemon.artwork}
              alt={`Illustration de ${pokemon.nomFr}`}
              fill
              sizes="(min-width: 640px) 220px, 190px"
              loading="eager"
              className="object-contain"
            />
          </ViewTransition>
        </div>
      )}

      {/* Bandeau sombre du bas, puis nom et mesures */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent via-carte-ombre/80 via-45% to-carte-ombre/90"
        style={{ height: u(280) }}
      />
      {/* aria-hidden : le nom est déjà le titre h1 de la page, on ne le fait pas lire deux fois. */}
      <p aria-hidden="true" className="absolute whitespace-nowrap font-titre leading-none" style={{ left: u(60), top: u(862 - tailleNom * BASE_TITRE), fontSize: u(tailleNom) }}>
        {pokemon.nomFr}
      </p>
      <p aria-hidden="true" className="absolute [font-family:system-ui,sans-serif] uppercase leading-none" style={{ ...styleEtiquette(926), left: u(60) }}>
        {formaterMesure(pokemon.taille, "m")} · {formaterMesure(pokemon.poids, "kg")}
      </p>
    </div>
  );
}
