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
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-bordure bg-surface px-6 py-8 text-center">
      <h2 className="font-titre text-xl font-semibold">{titre}</h2>
      <p className="max-w-md text-sm text-texte-doux">{message}</p>
      {lien && (
        <Link
          href={lien.href}
          className="flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-sur-accent"
        >
          {lien.libelle}
        </Link>
      )}
    </div>
  );
}
