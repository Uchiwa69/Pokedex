import type { Metadata } from "next";
import Quiz from "@/components/Quiz";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Qui est ce Pokémon ? Devine le Pokémon à partir de sa silhouette.",
};

export default function PageQuiz() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Quiz</p>
        <h1 className="font-titre text-3xl font-bold">Qui est ce Pokémon ?</h1>
      </header>
      {/* Le tirage au hasard se fait à chaque manche, dans le navigateur : composant client. */}
      <Quiz />
    </div>
  );
}
