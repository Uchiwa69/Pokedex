// Décor de la page Combat : un STADE entier dessiné en SVG et en CSS (aucune image à télécharger).
// Il est beaucoup plus grand que la zone de combat : il déborde sur presque toute la largeur de l'écran,
// et ses bords s'effacent en dégradé (mask-image) pour se fondre dans le fond du site, sans cadre.
// De l'arrière vers l'avant : trois étages de gradins en arc de cercle avec leur public (points lumineux)
// et leurs rampes de lumière, le mur du terrain, le terrain ovale avec son motif de Pokéball,
// l'emblème de l'arène suspendu au-dessus, et deux projecteurs qui balaient.
// Composant sans état ni hook, purement décoratif (aria-hidden). Les couleurs viennent des jetons du thème.
// L'emblème est un dessin ORIGINAL (un écusson ailé autour de la Pokéball du site), pas un logo officiel.

type Props = {
  // true : le décor « avance vers la caméra » (léger zoom) au moment où le combat commence.
  zoom?: boolean;
};

// Les étages du stade, du plus lointain au plus proche : des ellipses de plus en plus petites, empilées.
// On ne voit de chacune que l'anneau qui dépasse de la suivante : cela dessine des gradins en cuvette.
const ETAGES = [
  { rx: 1180, ry: 590, cy: 540, fond: "opacity-40", public: "opacity-20" },
  { rx: 1010, ry: 480, cy: 575, fond: "opacity-60", public: "opacity-30" },
  { rx: 850, ry: 380, cy: 610, fond: "opacity-80", public: "opacity-40" },
];

export default function DecorArene({ zoom = false }: Props) {
  return (
    // -z-10 : derrière le contenu de la zone (le parent porte « isolate » pour que cela reste local).
    // w-[96vw] : presque toute la largeur de l'écran, centré, bien au-delà de la colonne du site.
    // mask-image : opaque au centre, transparent sur les bords → le stade se fond dans le fond de la page.
    // overflow-hidden : le décor agrandi par le zoom ne doit pas élargir la page (pas de défilement horizontal).
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-20 -top-28 left-1/2 -z-10 w-[96vw] max-w-[120rem] -translate-x-1/2 overflow-hidden [mask-image:radial-gradient(ellipse_62%_62%_at_50%_52%,black_55%,transparent_100%)]"
    >
      {/* Tout le décor est dans ce bloc : c'est lui qu'on agrandit pour le zoom (transform seulement).
          origin : le zoom vise le terrain, un peu sous le centre. */}
      <div className={`absolute inset-0 origin-[50%_68%] ${zoom ? "animate-zoom-arene motion-reduce:animate-none" : ""}`}>
        {/* preserveAspectRatio « slice » : le dessin remplit toute la zone, quitte à être rogné sur les côtés. */}
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <defs>
            {/* Le public : un motif de petits points répété. */}
            <pattern id="public-arene" width="16" height="11" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.6" className="fill-texte" />
              <circle cx="12" cy="9" r="1.3" className="fill-accent-bis" />
            </pattern>
            {/* Dégradé du terrain : clair au centre, sombre au bord. */}
            <radialGradient id="terrain-arene" cx="50%" cy="45%" r="60%">
              <stop offset="0%" className="[stop-color:var(--color-bordure)]" />
              <stop offset="100%" className="[stop-color:var(--color-surface-pleine)]" />
            </radialGradient>
          </defs>

          {/* Gradins : pour chaque étage, un fond, le public par-dessus, puis une rampe de lumières sur le bord
              (un trait en pointillés ronds = une rangée de lampes). */}
          {ETAGES.map((etage) => (
            <g key={etage.rx}>
              <ellipse cx="800" cy={etage.cy} rx={etage.rx} ry={etage.ry} className={`fill-surface-pleine ${etage.fond}`} />
              <ellipse cx="800" cy={etage.cy} rx={etage.rx} ry={etage.ry} fill="url(#public-arene)" className={etage.public} />
              <ellipse
                cx="800"
                cy={etage.cy}
                rx={etage.rx}
                ry={etage.ry}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="1 30"
                className="stroke-accent-bis opacity-70"
              />
            </g>
          ))}

          {/* Mur qui entoure le terrain, avec son liseré lumineux */}
          <ellipse cx="800" cy="650" rx="700" ry="290" className="fill-fond" />
          <ellipse cx="800" cy="650" rx="700" ry="290" fill="none" strokeWidth="6" className="stroke-accent opacity-50" />

          {/* Le terrain ovale et son motif de Pokéball : ligne médiane, grand rond, bouton central */}
          <ellipse cx="800" cy="672" rx="620" ry="238" fill="url(#terrain-arene)" />
          <g fill="none" strokeWidth="4" className="stroke-accent">
            <ellipse cx="800" cy="672" rx="620" ry="238" className="opacity-70" />
            <ellipse cx="800" cy="672" rx="560" ry="212" className="opacity-30" />
            <path d="M240 672h370M990 672h370" className="opacity-60" />
            <ellipse cx="800" cy="672" rx="190" ry="73" className="opacity-80" />
            <ellipse cx="800" cy="672" rx="70" ry="27" className="opacity-80" />
          </g>
        </svg>

        {/* Halo derrière l'emblème, puis l'emblème suspendu au-dessus du terrain */}
        <span className="absolute left-1/2 top-[8%] aspect-square h-[40%] -translate-x-1/2 rounded-full bg-accent opacity-25 blur-3xl" />
        <EmblemeArene className="absolute left-1/2 top-[11%] h-[30%] -translate-x-1/2 opacity-50" />

        {/* Deux projecteurs : des faisceaux en dégradé, accrochés en haut (origin-top), qui se balancent lentement.
            motion-safe : immobiles si l'utilisateur a demandé moins d'animations. */}
        <span className="absolute -top-[6%] left-[24%] h-[95%] w-[10%] origin-top bg-[linear-gradient(to_bottom,var(--color-accent-bis),transparent_80%)] opacity-25 blur-lg motion-safe:animate-projecteur" />
        <span className="absolute -top-[6%] right-[24%] h-[95%] w-[10%] origin-top bg-[linear-gradient(to_bottom,var(--color-accent),transparent_80%)] opacity-25 blur-lg [animation-direction:reverse] motion-safe:animate-projecteur" />

        {/* Lueur au-dessus du terrain */}
        <span className="absolute inset-x-[20%] top-[58%] h-[22%] bg-[radial-gradient(ellipse_at_center,var(--color-accent),transparent_70%)] opacity-20 blur-2xl" />
      </div>
    </div>
  );
}

// Emblème de l'arène : un écusson avec la Pokéball du site au centre, deux ailes et une étoile.
function EmblemeArene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className}>
      <g className="fill-none stroke-accent" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {/* Ailes : trois plumes de chaque côté */}
        <path d="M78 96C52 84 30 62 14 34c24 6 46 18 66 38M78 116C50 112 26 98 6 76c24 0 48 8 70 22M82 136c-24 2-48-6-68-22 22-4 44 0 66 10" />
        <path d="M162 96c26-12 48-34 64-62-24 6-46 18-66 38M162 116c28-4 52-18 72-40-24 0-48 8-70 22M158 136c24 2 48-6 68-22-22-4-44 0-66 10" />
        {/* Écusson */}
        <path d="M120 22l52 18v58c0 38-22 66-52 82-30-16-52-44-52-82V40z" className="fill-fond" />
        {/* Pokéball au centre de l'écusson */}
        <circle cx="120" cy="100" r="34" />
        <path d="M86 100h20M134 100h20" />
        <circle cx="120" cy="100" r="13" />
      </g>
      {/* Étoile au sommet */}
      <path d="M120 2l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" className="fill-accent-bis" />
    </svg>
  );
}
