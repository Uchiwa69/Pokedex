// Animation du texte posé à côté de Dracaufeu (components/ScenesElements.tsx), liée au défilement.
// Adapté du code fourni avec les shaders (généré avec Gemini) : le titre est découpé en lettres ; celles de
// droite, les plus proches de la gueule, rougissent, s'élèvent et se dispersent avant celles de gauche. Les
// autres blocs (étiquette, description, chiffres) chauffent puis partent en cendres l'un après l'autre.
// On n'écrit que transform, opacity et filter : le navigateur n'a jamais à recalculer la mise en page.

function borner(v: number) {
  return Math.max(0, Math.min(1, v));
}

// Passe de 0 à 1 quand x va de a à b (comme smoothstep en GLSL).
function fondu(a: number, b: number, x: number) {
  const t = borner((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// Repère une fois pour toutes les éléments à animer (attributs data-bloc et data-lettre), puis renvoie la
// fonction à appeler à chaque image avec la progression (0 → 1).
export function preparerTexte(racine: HTMLElement) {
  const blocs = Array.from(racine.querySelectorAll<HTMLElement>("[data-bloc]"));
  const lettres = Array.from(racine.querySelectorAll<HTMLElement>("[data-lettre]"));
  const dernier = Math.max(1, lettres.length - 1);

  return function mettreAJourTexte(progression: number) {
    // À la fin, tout est parti en cendres : on masque le bloc entier.
    if (progression >= 0.92) {
      racine.style.opacity = "0";
      return;
    }
    racine.style.opacity = "1";

    // 1. Étiquette, description, chiffres : montée en chaleur, puis dispersion, chacun avec un léger retard.
    for (const bloc of blocs) {
      const ordre = Number(bloc.dataset.bloc);
      const debut = 0.34 + ordre * 0.045;
      const t = fondu(debut, debut + 0.24, progression);
      const chaleur = fondu(0.08, 0.28, progression) * (1 - t);
      const dx = t * (ordre % 2 === 0 ? -18 : 14);
      bloc.style.opacity = String(1 - t);
      bloc.style.transform = `translate3d(${dx.toFixed(2)}px, ${(-t * 42).toFixed(2)}px, 0) scale(${(1 + chaleur * 0.02 - t * 0.06).toFixed(3)})`;
      bloc.style.filter = `blur(${(t * 10).toFixed(2)}px) brightness(${(1 + chaleur * 0.55).toFixed(2)})`;
    }

    // 2. Le titre, lettre par lettre : la fin du mot (« feu », à droite) brûle avant le début (« Dra »).
    lettres.forEach((lettre, i) => {
      const debut = 0.28 + (1 - i / dernier) * 0.18;
      const t = fondu(debut, debut + 0.22, progression);
      const picChaleur = Math.sin(borner((progression - (debut - 0.12)) / 0.25) * Math.PI);
      // Direction d'envol propre à chaque lettre, toujours la même (pas de hasard : la séquence est rejouable).
      const angle = ((i * 73) % 100) / 100 - 0.5;
      const dx = angle * 90 * t;
      const dy = -t * (65 + (i % 3) * 18);
      lettre.style.opacity = String(1 - t);
      lettre.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) rotate(${(angle * 48 * t).toFixed(1)}deg) scale(${(1 + picChaleur * 0.12 - t * 0.35).toFixed(3)})`;
      lettre.style.filter = `blur(${(t * 9).toFixed(2)}px) sepia(${borner(picChaleur * 0.9 + t).toFixed(2)}) brightness(${(1 + picChaleur * 1.4).toFixed(2)})`;
    });
  };
}
