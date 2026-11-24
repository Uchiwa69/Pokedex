import type { Metadata } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import EnTete from "@/components/EnTete";
import Fournisseurs from "@/components/Fournisseurs";
import HydratationStores from "@/components/HydratationStores";
import PiedDePage from "@/components/PiedDePage";
import Prechargeur3D from "@/components/labo/Prechargeur3D";
import "./globals.css";

// next/font télécharge les polices au build et les sert depuis notre site (pas de requête vers Google).
// Chaque police expose une variable CSS, reliée à Tailwind dans globals.css (@theme inline).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  // Gabarit : une page qui déclare title: "Favoris" affichera « Favoris · Pokédex ».
  title: {
    default: "Pokédex",
    template: "%s · Pokédex",
  },
  description: "Un Pokédex en Next.js : liste, fiches, favoris, sacoche et combats.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : next-themes ajoute la classe "dark" sur <html> avant l'hydratation,
    // ce qui crée une différence serveur/client attendue (sur cette balise uniquement).
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${chakra.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-fond font-sans text-texte">
        <Fournisseurs>
          {/* Relit favoris et sacoche dans le localStorage, après l'hydratation. */}
          <HydratationStores />
          {/* LOCAL UNIQUEMENT : précharge les modèles 3D des Pokémon de la sacoche. */}
          <Prechargeur3D />
          {/* Lien d'évitement : visible seulement au focus clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sur-accent"
          >
            Aller au contenu
          </a>
          <EnTete />
          <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            {children}
          </main>
          <PiedDePage />
        </Fournisseurs>
      </body>
    </html>
  );
}
