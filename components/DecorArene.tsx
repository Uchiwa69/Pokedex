// Décor de la page Combat : une grande arène dessinée en CSS et en SVG (aucune image à télécharger).
// De l'arrière vers l'avant : le mur du fond, les gradins (points lumineux), un emblème d'arène,
// deux projecteurs qui balaient, et le terrain vu en perspective.
// Composant sans état ni hook, purement décoratif (aria-hidden). Les couleurs viennent des jetons du thème.
// L'emblème est un dessin ORIGINAL (un écusson ailé autour de la Pokéball du site), pas un logo officiel.

type Props = {
  // true : le décor « avance vers la caméra » (léger zoom) au moment où le combat commence.
  zoom?: boolean;
};

export default function DecorArene({ zoom = false }: Props) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {/* Tout le décor est dans ce bloc : c'est lui qu'on agrandit pour le zoom (transform seulement).
          origin : le zoom vise un point un peu sous le centre, là où se trouve le terrain. */}
      <div className={`absolute inset-0 origin-[50%_62%] ${zoom ? "animate-zoom-arene motion-reduce:animate-none" : ""}`}>
        {/* Mur du fond : dégradé du haut (plus clair) vers le sol (couleur du site) */}
        <span className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-surface-pleine),var(--color-fond)_72%)]" />

        {/* Gradins : une trame de petits points lumineux, qui s'efface vers le bas (masque en dégradé) */}
        <span className="absolute inset-x-0 top-0 h-3/5 bg-[radial-gradient(circle,var(--color-texte)_1px,transparent_1.6px)] [background-size:18px_13px] opacity-20 [mask-image:linear-gradient(to_bottom,black_10%,transparent)]" />

        {/* Halo derrière l'emblème, puis l'emblème lui-même */}
        <span className="absolute left-1/2 top-[4%] aspect-square h-[52%] -translate-x-1/2 rounded-full bg-accent opacity-20 blur-3xl" />
        <EmblemeArene className="absolute left-1/2 top-[7%] h-[44%] -translate-x-1/2 opacity-35" />

        {/* Deux projecteurs : des faisceaux en dégradé, accrochés en haut (origin-top), qui se balancent lentement.
            motion-safe : immobiles si l'utilisateur a demandé moins d'animations. */}
        <span className="absolute -top-[12%] left-[10%] h-[125%] w-[16%] origin-top bg-[linear-gradient(to_bottom,var(--color-accent-bis),transparent_78%)] opacity-25 blur-md motion-safe:animate-projecteur" />
        <span className="absolute -top-[12%] right-[10%] h-[125%] w-[16%] origin-top bg-[linear-gradient(to_bottom,var(--color-accent),transparent_78%)] opacity-25 blur-md [animation-direction:reverse] motion-safe:animate-projecteur" />

        {/* Le terrain : un dessin à plat, couché par rotateX dans un parent qui a une perspective.
            On voit donc un sol qui fuit vers le fond, avec ses lignes et son rond central. */}
        <div className="absolute inset-x-[-25%] bottom-0 h-[72%] [perspective:700px]">
          <svg viewBox="0 0 400 220" preserveAspectRatio="none" className="h-full w-full origin-bottom [transform:rotateX(56deg)]">
            <rect x="0" y="0" width="400" height="220" className="fill-surface-pleine" />
            {/* Bandes du terrain, une sur deux un peu plus claire */}
            {[0, 2, 4, 6].map((i) => (
              <rect key={i} x={i * 50} y="0" width="50" height="220" className="fill-texte opacity-[0.04]" />
            ))}
            <g className="fill-none stroke-accent" strokeWidth="2.5">
              {/* Bord du terrain, ligne médiane, rond central coupé en deux et son bouton : le motif d'une Pokéball */}
              <rect x="30" y="14" width="340" height="192" rx="6" className="opacity-60" />
              <path d="M30 110h132M238 110h132" className="opacity-60" />
              <circle cx="200" cy="110" r="62" className="opacity-80" />
              <circle cx="200" cy="110" r="38" className="opacity-50" />
              <circle cx="200" cy="110" r="14" className="opacity-80" />
            </g>
          </svg>
        </div>

        {/* Lueur au ras du sol, puis vignette : les bords sont assombris pour concentrer le regard au centre */}
        <span className="absolute inset-x-0 bottom-[30%] h-[18%] bg-[radial-gradient(ellipse_at_center,var(--color-accent),transparent_70%)] opacity-15 blur-2xl" />
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_45%,var(--color-fond)_100%)] opacity-80" />
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
