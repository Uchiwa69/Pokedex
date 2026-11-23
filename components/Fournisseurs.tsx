"use client";

import { ThemeProvider } from "next-themes";

// Regroupe les « fournisseurs » (providers) qui ont besoin du navigateur.
// Le layout reste un composant serveur : il passe simplement ses enfants à ce composant client.
export default function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class" // pose la classe "dark" sur <html>
      defaultTheme="system" // suit le thème du système par défaut…
      enableSystem // …et le choix de l'utilisateur est mémorisé dans le localStorage
    >
      {children}
    </ThemeProvider>
  );
}
