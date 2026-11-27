// Tests des fonctions pures du combat. Lancer : npm test
import { describe, expect, it } from "vitest";
import {
  ATTAQUE_SECOURS,
  aleaDegats,
  attaqueTouche,
  calculerDegats,
  calculerEfficacite,
  calculerPvMax,
  choisirAttaqueIA,
  choisirMeilleuresAttaques,
  messageEfficacite,
  noterAttaque,
  ORDRE_DU_TOUR,
  resoudreAttaque,
  type Combattant,
  type TableEfficacite,
} from "@/lib/combat";
import type { Attaque, Stats } from "@/lib/conversion";
import { NOMS_TYPES, type NomType } from "@/lib/types";

/* ---------- Données de test ---------- */

// Une table vide (tout vaut 1) dans laquelle on écrit seulement les cases utiles aux tests.
function creerTable(cases: Partial<Record<NomType, Partial<Record<NomType, number>>>>): TableEfficacite {
  const table = {} as TableEfficacite;
  for (const type of NOMS_TYPES) table[type] = {};
  return { ...table, ...cases };
}

const TABLE = creerTable({
  electric: { water: 2, flying: 2, ground: 0, grass: 0.5 },
  fire: { grass: 2, water: 0.5 },
  ground: { flying: 0, electric: 2 },
});

const STATS: Stats = { pv: 80, attaque: 100, defense: 100, attaqueSpe: 100, defenseSpe: 100, vitesse: 100 };

function creerAttaque(donnees: Partial<Attaque>): Attaque {
  return {
    id: 1,
    nom: "test",
    nomFr: "Test",
    type: "normal",
    categorie: "physique",
    puissance: 90,
    precision: 100,
    pp: 10,
    description: "",
    ...donnees,
  };
}

/* ---------- Efficacité ---------- */

describe("calculerEfficacite", () => {
  it("vaut 1 quand la table ne dit rien", () => {
    expect(calculerEfficacite(TABLE, "normal", ["fire"])).toBe(1);
  });

  it("multiplie les efficacités des deux types du défenseur", () => {
    expect(calculerEfficacite(TABLE, "electric", ["water", "flying"])).toBe(4);
    expect(calculerEfficacite(TABLE, "electric", ["water", "grass"])).toBe(1);
  });

  it("vaut 0 dès qu'un type est immunisé", () => {
    expect(calculerEfficacite(TABLE, "electric", ["water", "ground"])).toBe(0);
  });
});

describe("messageEfficacite", () => {
  it("renvoie la bonne phrase", () => {
    expect(messageEfficacite(2)).toBe("C'est super efficace !");
    expect(messageEfficacite(0.5)).toBe("Ce n'est pas très efficace…");
    expect(messageEfficacite(0)).toBe("Ça n'a aucun effet…");
    expect(messageEfficacite(1)).toBe("");
  });
});

/* ---------- Dégâts ---------- */

describe("calculerDegats", () => {
  const base = { puissance: 90, attaque: 100, defense: 100, memeType: false, efficacite: 1, alea: 1 };

  it("applique la formule du niveau 50", () => {
    // floor((22 × 90 × 1) / 50 + 2) = floor(41,6) = 41
    expect(calculerDegats(base)).toBe(41);
  });

  it("applique le bonus de même type (× 1,5) et l'efficacité", () => {
    expect(calculerDegats({ ...base, memeType: true })).toBe(61); // floor(41 × 1,5)
    expect(calculerDegats({ ...base, memeType: true, efficacite: 2 })).toBe(123);
  });

  it("tient compte du rapport attaque / défense", () => {
    expect(calculerDegats({ ...base, attaque: 200 })).toBe(81); // floor(79,2 + 2)
  });

  it("vaut 0 contre un type immunisé, et au moins 1 sinon", () => {
    expect(calculerDegats({ ...base, efficacite: 0 })).toBe(0);
    expect(calculerDegats({ ...base, puissance: 1, attaque: 1, defense: 250, efficacite: 0.25, alea: 0.85 })).toBe(1);
  });
});

describe("aleaDegats", () => {
  it("reste entre 0,85 et 1", () => {
    expect(aleaDegats(0)).toBe(0.85);
    expect(aleaDegats(1)).toBe(1);
    expect(aleaDegats(0.5)).toBeCloseTo(0.925);
  });
});

describe("calculerPvMax", () => {
  it("donne les PV au niveau 50", () => {
    expect(calculerPvMax(80)).toBe(140);
  });
});

describe("attaqueTouche", () => {
  it("ne rate jamais sans précision", () => {
    expect(attaqueTouche(null, 0.999)).toBe(true);
  });

  it("compare le hasard à la précision", () => {
    expect(attaqueTouche(85, 0.84)).toBe(true);
    expect(attaqueTouche(85, 0.85)).toBe(false);
  });
});

/* ---------- Tour de jeu ---------- */

describe("resoudreAttaque", () => {
  const attaquant: Combattant = { types: ["fire"], stats: { ...STATS, attaque: 50, attaqueSpe: 150 } };
  const defenseur: Combattant = { types: ["grass"], stats: { ...STATS, defense: 150, defenseSpe: 50 } };

  it("signale une attaque ratée", () => {
    const attaque = creerAttaque({ precision: 50 });
    expect(resoudreAttaque(attaquant, defenseur, attaque, TABLE, 0.9, 1)).toEqual({ rate: true, degats: 0, efficacite: 1 });
  });

  it("utilise attaque/défense pour une attaque physique et atq. spé./déf. spé. pour une spéciale", () => {
    const physique = creerAttaque({ type: "fire", categorie: "physique" });
    const speciale = creerAttaque({ type: "fire", categorie: "speciale" });
    const degatsPhysiques = resoudreAttaque(attaquant, defenseur, physique, TABLE, 0, 1).degats;
    const degatsSpeciaux = resoudreAttaque(attaquant, defenseur, speciale, TABLE, 0, 1).degats;
    // physique : floor(22×90×(50/150)/50 + 2) = 15 → × 1,5 × 2 = 45
    expect(degatsPhysiques).toBe(45);
    // spéciale : floor(22×90×(150/50)/50 + 2) = 120 → × 1,5 × 2 = 360
    expect(degatsSpeciaux).toBe(360);
  });

  it("renvoie l'efficacité calculée", () => {
    const attaque = creerAttaque({ type: "fire" });
    expect(resoudreAttaque(attaquant, defenseur, attaque, TABLE, 0, 1).efficacite).toBe(2);
  });
});

describe("ORDRE_DU_TOUR", () => {
  it("fait jouer le joueur, puis l'adversaire (alternance stricte, sans regarder la vitesse)", () => {
    expect(ORDRE_DU_TOUR).toEqual(["joueur", "adversaire"]);
  });
});

/* ---------- Choix des attaques ---------- */

describe("choisirMeilleuresAttaques", () => {
  it("ignore les attaques de statut et sans puissance", () => {
    const attaques = [
      creerAttaque({ id: 1, categorie: "statut", puissance: null }),
      creerAttaque({ id: 2, puissance: 40 }),
    ];
    expect(choisirMeilleuresAttaques(attaques, ["normal"]).map((a) => a.id)).toEqual([2]);
  });

  it("garde au plus 4 attaques, les mieux notées d'abord, 2 par type au maximum", () => {
    const attaques = [
      creerAttaque({ id: 1, type: "fire", puissance: 120 }),
      creerAttaque({ id: 2, type: "fire", puissance: 110 }),
      creerAttaque({ id: 3, type: "fire", puissance: 100 }),
      creerAttaque({ id: 4, type: "water", puissance: 60 }),
      creerAttaque({ id: 5, type: "grass", puissance: 50 }),
      creerAttaque({ id: 6, type: "normal", puissance: 40 }),
    ];
    expect(choisirMeilleuresAttaques(attaques, ["fire"]).map((a) => a.id)).toEqual([1, 2, 4, 5]);
  });

  it("note mieux une attaque du même type que le Pokémon", () => {
    const attaque = creerAttaque({ type: "fire", puissance: 80, precision: 100 });
    expect(noterAttaque(attaque, ["fire"])).toBe(120);
    expect(noterAttaque(attaque, ["water"])).toBe(80);
  });
});

describe("choisirAttaqueIA", () => {
  const ia: Combattant = { types: ["electric"], stats: STATS };
  const cible: Combattant = { types: ["water"], stats: STATS };
  const faible = creerAttaque({ id: 1, type: "normal", puissance: 40 });
  const forte = creerAttaque({ id: 2, type: "electric", puissance: 90 });

  it("prend l'attaque la plus dangereuse quand le hasard est sous 0,7", () => {
    expect(choisirAttaqueIA([faible, forte], ia, cible, TABLE, 0.3).id).toBe(2);
  });

  it("prend une attaque au hasard sinon", () => {
    expect(choisirAttaqueIA([faible, forte], ia, cible, TABLE, 0.71).id).toBe(1);
    expect(choisirAttaqueIA([faible, forte], ia, cible, TABLE, 0.99).id).toBe(2);
  });

  it("utilise Lutte sans attaque disponible", () => {
    expect(choisirAttaqueIA([], ia, cible, TABLE, 0.1)).toBe(ATTAQUE_SECOURS);
  });
});
