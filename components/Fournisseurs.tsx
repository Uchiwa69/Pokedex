"use client";

import { ThemeProvider } from "next-themes";

// Regroupe les « fournisseurs » (providers) qui ont besoin du navigateur.
// Le layout reste un composant serveur : il passe simplement ses enfants à ce composant client.
export default function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // pose la classe "dark" sur <html> (ou la retire pour le thème clair)
      defaultTheme="dark" // première visite : thème sombre
      // enableSystem={false} : on ne suit pas le réglage clair/sombre du système, c'est le bouton de
      // l'en-tête (BoutonTheme) qui décide. Le choix est mémorisé dans le localStorage par next-themes.
      enableSystem={false}
      // Pas de fondu de toutes les couleurs au changement de thème : il se fait d'un coup, proprement.
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
