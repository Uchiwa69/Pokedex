// Forme grise de la fiche, affichée pendant son chargement.
export default function SqueletteFiche() {
  return (
    <div
      role="status"
      aria-label="Chargement de la fiche"
      className="grid animate-pulse gap-6 motion-reduce:animate-none md:grid-cols-2"
    >
      <div className="mx-auto aspect-square w-full max-w-sm rounded-2xl bg-piste" />
      <div className="flex flex-col gap-4">
        <div className="h-4 w-16 rounded bg-piste" />
        <div className="h-9 w-2/3 rounded bg-piste" />
        <div className="h-6 w-32 rounded-full bg-piste" />
        <div className="h-16 w-full rounded-2xl bg-piste" />
        <div className="h-40 w-full rounded-2xl bg-piste" />
      </div>
    </div>
  );
}
