import Link from "next/link";

type Props = {
  titre: string;
  message: string;
  // Lien facultatif (une navigation → un lien, pas un bouton).
  lien?: { href: string; libelle: string };
};

// Bloc affiché quand une page n'a encore rien à montrer.
export default function EtatVide({ titre, message, lien }: Props) {
  return (
    <div className="verre flex flex-col items-center gap-4 px-6 py-8 text-center">
      {/* Décor : un emplacement vide en pointillés */}
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-bordure">
        <span className="h-4 w-4 rounded-full bg-piste" />
      </span>
      <h2 className="font-titre text-xl font-semibold">{titre}</h2>
      <p className="max-w-md text-sm text-texte-doux">{message}</p>
      {lien && (
        <Link href={lien.href} className="bouton bouton-principal">
          {lien.libelle}
        </Link>
      )}
    </div>
  );
}
