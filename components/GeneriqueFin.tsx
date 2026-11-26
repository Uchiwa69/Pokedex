// Générique de fin, comme au cinéma : les crédits du projet défilent lentement de bas en haut, en fond de
// l'écran « Attrapez-les tous ! ». Composant SERVEUR : aucune ligne de JavaScript, le défilement est une animation
// CSS (classe animate-generique, définie dans app/globals.css).
// Le texte est celui du projet (ses vrais crédits), pas des paroles de chanson : celles-ci sont protégées.

type Bloc = { role: string; noms: string[] };

const BLOCS: Bloc[] = [
  { role: "Un projet de fin de cours", noms: ["Pokédex National"] },
  { role: "Données", noms: ["PokéAPI", "1 025 Pokémon, 18 types"] },
  { role: "Construit avec", noms: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Zustand"] },
  { role: "Scènes 3D", noms: ["three.js", "React Three Fiber", "drei", "GSAP", "ogl"] },
  { role: "Animations d'attaques", noms: ["Pokémon Showdown"] },
  { role: "Avec dans leur propre rôle", noms: ["Dracaufeu", "Pikachu", "Tortank", "Florizarre", "Mewtwo", "Ectoplasma"] },
  { role: "Aucun Pokémon n'a été blessé", noms: ["pendant le tournage"] },
  { role: "Merci d'avoir défilé jusqu'ici", noms: ["À bientôt dans les hautes herbes"] },
];

function Liste() {
  return (
    <div className="flex flex-col gap-10 pb-10">
      {BLOCS.map((bloc) => (
        <div key={bloc.role} className="flex flex-col gap-1">
          <p className="etiquette">{bloc.role}</p>
          {bloc.noms.map((nom) => (
            <p key={nom} className="font-titre text-lg font-semibold sm:text-xl">
              {nom}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function GeneriqueFin() {
  return (
    // Décoratif : caché aux lecteurs d'écran (ces crédits sont lisibles sur la page À propos) et sans clic.
    // Le masque efface le texte en haut et en bas, comme s'il sortait de l'ombre.
    // motion-reduce:hidden : pas de générique si le visiteur a demandé des animations réduites.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-center text-texte-doux opacity-45 motion-reduce:hidden"
      style={{ maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)" }}
    >
      {/* La liste est écrite DEUX fois : l'animation monte d'exactement une liste (la moitié du bloc), puis
          recommence. Comme la seconde liste est alors à la place de la première, la boucle ne se voit pas. */}
      <div className="animate-generique">
        <Liste />
        <Liste />
      </div>
    </div>
  );
}
