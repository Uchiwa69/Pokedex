"use client";

import { usePathname } from "next/navigation";
import LiensNavigation from "@/components/LiensNavigation";

// Petite feuille client : usePathname est un hook, il a donc besoin de "use client".
// Il lit le chemin de l'adresse (ex. "/favoris") pour mettre le bon lien en évidence.
export default function Navigation() {
  const chemin = usePathname();
  return <LiensNavigation cheminActif={chemin} />;
}
