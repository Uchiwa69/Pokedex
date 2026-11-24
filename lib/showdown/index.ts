// Point d'entrée des animations d'attaques reprises de Pokémon Showdown.
// Ce module est lourd (environ 600 attaques décrites) : la page Combat ne l'importe qu'au démarrage
// d'un combat, avec import("@/lib/showdown"), pour ne pas alourdir le reste du site.

import { BattleMoveAnims } from "./animations-attaques";
import { BattleEffects } from "./effets";
import { definirImages, Lutin, SceneShowdown, type DonneesImage, type Point, type TableAnimations } from "./scene";

// Les fichiers repris de Showdown ne sont pas typés : on leur donne ici le type attendu par notre adaptateur.
const ANIMATIONS = BattleMoveAnims as unknown as TableAnimations;
definirImages(BattleEffects as Record<string, DonneesImage>);

// Showdown identifie une attaque par son nom anglais sans tiret ni espace : "fire-punch" (PokéAPI) → "firepunch".
export function identifiantShowdown(nom: string): string {
  return nom.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// true si Showdown a une mise en scène pour cette attaque.
export function aUneAnimation(nom: string): boolean {
  return typeof ANIMATIONS[identifiantShowdown(nom)]?.anim === "function";
}

type Options = {
  nom: string; // nom anglais de l'attaque ("flamethrower")
  arene: HTMLElement; // le cadre de l'arène : on y cherche les deux Pokémon
  calqueEffets: HTMLElement;
  calqueFond: HTMLElement;
  attaquant: "joueur" | "adversaire";
};

// Centre d'un élément, en pixels par rapport à un cadre.
function centre(element: Element, cadre: DOMRect): Point {
  const zone = element.getBoundingClientRect();
  return { x: zone.left - cadre.left + zone.width / 2, y: zone.top - cadre.top + zone.height / 2 };
}

// Joue l'animation Showdown d'une attaque dans l'arène. Renvoie true si elle a été jouée,
// false s'il n'y en a pas (ou en cas de problème) : l'appelant utilise alors l'effet par type du site.
export async function jouerAnimation({ nom, arene, calqueEffets, calqueFond, attaquant }: Options): Promise<boolean> {
  const animation = ANIMATIONS[identifiantShowdown(nom)];
  // Chaque socle porte deux repères (voir components/SocleEquipe.tsx) : data-lutin="x" et data-lutin="y".
  const trouver = (cote: string, axe: string) => arene.querySelector<HTMLElement>(`[data-cote="${cote}"] [data-lutin="${axe}"]`);
  const joueurX = trouver("joueur", "x");
  const adversaireX = trouver("adversaire", "x");
  if (typeof animation?.anim !== "function" || !joueurX || !adversaireX) return false;

  const cadre = calqueEffets.getBoundingClientRect();
  const scene = new SceneShowdown({
    calqueEffets,
    calqueFond,
    proche: centre(joueurX, cadre), // le joueur est le Pokémon « proche »
    loin: centre(adversaireX, cadre),
    // Une unité Showdown vaut 0,8 pixel quand la boîte du sprite fait 96 px (sa taille sur ordinateur),
    // et proportionnellement moins sur un petit écran : les effets gardent la bonne taille par rapport aux Pokémon.
    unite: (joueurX.getBoundingClientRect().width / 96) * 0.8,
  });
  const image = (element: HTMLElement) => element.querySelector("img")?.currentSrc;
  const lutinJoueur = new Lutin(scene, joueurX, trouver("joueur", "y"), false, image(joueurX));
  const lutinAdversaire = new Lutin(scene, adversaireX, trouver("adversaire", "y"), true, image(adversaireX));

  try {
    // L'animation programme d'un coup tous ses effets (avec leurs retards) ; il reste à attendre la fin.
    animation.anim(scene, attaquant === "joueur" ? [lutinJoueur, lutinAdversaire] : [lutinAdversaire, lutinJoueur]);
    await new Promise((resoudre) => setTimeout(resoudre, scene.dureeTotale + 80));
    return true;
  } catch {
    return false; // une animation qui échoue ne doit jamais bloquer le combat
  } finally {
    scene.nettoyer();
  }
}
