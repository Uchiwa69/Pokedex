"use client";

import { ThemeProvider } from "next-themes";

// Regroupe les « fournisseurs » (providers) qui ont besoin du navigateur.
// Le layout reste un composant serveur : il passe simplement ses enfants à ce composant client.
export default function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // pose la classe "dark" sur <html>
      defaultTheme="dark"
      // forcedTheme : UN SEUL thème, le sombre (choix de l'utilisateur). Même si un ancien choix « clair » est
      // resté dans le localStorage d'un visiteur, il est ignoré.
      forcedTheme="dark"
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  );
}
