// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche) — renseignements sur le modèle 3D d'un Pokémon.
// GET /api/modele3d/150 → { url, roles, animations, ko }, ou null s'il n'a pas de modèle présentable.
// Le catalogue complet pèse 550 Ko : il reste sur le serveur, le navigateur ne reçoit que la ligne demandée.

import { BASE_MODELES, choisirForme, obtenirModele } from "@/lib/labo/modeles3d";
import type { InfoModele } from "@/lib/labo/prechargement3d";

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modele = obtenirModele(Number.parseInt(id, 10));
  // Seuls les modèles jugés présentables au recensement sont proposés.
  const presentable = modele !== null && (modele.etat === "anime" || modele.etat === "statique");
  const forme = presentable ? choisirForme(modele, "regular") : null;

  const info: InfoModele | null = forme
    ? { url: BASE_MODELES + forme.fichier, roles: forme.roles, animations: forme.animations, ko: forme.ko }
    : null;
  return Response.json(info);
}
