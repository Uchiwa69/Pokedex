// PROTOTYPE (/labo/accueil) — pièces partagées par les cadres : lentille, voyants, logo, icônes du menu.
// Le menu est FACTICE (des boutons qui ne naviguent pas) pour rester dans le labo en cliquant.

import Pokeball from "@/components/Pokeball";
import IconeSac from "@/components/IconeSac";

// La grosse lentille bleue de l'appareil : un disque en dégradé avec un reflet en haut à gauche.
export function Lentille({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-full border-4 border-balle-bas bg-[radial-gradient(circle_at_30%_30%,var(--color-balle-bas)_0%,var(--color-accent-bis)_32%,var(--color-fond)_125%)] shadow-[0_0_14px_var(--color-accent-bis)] ${className ?? ""}`}
    />
  );
}

// Les trois petits voyants (rouge, jaune, vert).
export function Voyants() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      <span className="size-2.5 rounded-full border border-balle-bas/80 bg-pv-bas" />
      <span className="size-2.5 rounded-full border border-balle-bas/80 bg-pv-moyen" />
      <span className="size-2.5 rounded-full border border-balle-bas/80 bg-pv-haut" />
    </span>
  );
}

// Le logo avec la Pokéball à la place du « O » (même dessin que dans l'en-tête du site).
export function LogoLabo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center font-titre text-xl font-bold uppercase tracking-widest ${className ?? ""}`}>
      <span className="sr-only">Pokédex</span>
      <span aria-hidden="true">P</span>
      <Pokeball className="mr-[0.1em] h-[0.9em] w-[0.9em]" />
      <span aria-hidden="true">kédex</span>
    </span>
  );
}

// Les entrées du menu, avec une icône chacune (utilisée par le panneau latéral et le dock).
export const ENTREES_MENU = [
  { cle: "tous", libelle: "Tous" },
  { cle: "favoris", libelle: "Favoris" },
  { cle: "sacoche", libelle: "Sacoche" },
  { cle: "combat", libelle: "Combat" },
  { cle: "quiz", libelle: "Quiz" },
] as const;

type CleMenu = (typeof ENTREES_MENU)[number]["cle"];

export function IconeMenu({ cle, className }: { cle: CleMenu; className?: string }) {
  if (cle === "sacoche") return <IconeSac className={className} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Tous : une grille de quatre cases */}
      {cle === "tous" && <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />}
      {/* Favoris : une étoile */}
      {cle === "favoris" && <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />}
      {/* Combat : un éclair */}
      {cle === "combat" && <path d="M13 2L4 14h6l-1 8 9-12h-6z" />}
      {/* Quiz : un point d'interrogation dans un cercle */}
      {cle === "quiz" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01" />
        </>
      )}
    </svg>
  );
}
