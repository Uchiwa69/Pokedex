"use client";

import { ThemeProvider } from "next-themes";

// Regroupe les « fournisseurs » (providers) qui ont besoin du navigateur.
// Le layout reste un composant serveur : il passe simplement ses enfants à ce composant client.
export default function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // pose la classe "dark" sur <html>
      // Le site n'a plus qu'un thème, le sombre (choix de l'utilisateur). forcedTheme l'impose à tout le
      // monde, quels que soient le réglage du système et un ancien choix mémorisé dans le navigateur.
      forcedTheme="dark"
    >
      {children}
    </ThemeProvider>
  );
}
