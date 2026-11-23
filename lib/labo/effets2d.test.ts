// Tests du choix des effets 2D (fonctions pures). Lancer : npm test
import { describe, expect, it } from "vitest";
import { calculerIntensite, choisirRecette, ELEMENTS } from "@/lib/labo/effets2d";
import { NOMS_TYPES } from "@/lib/types";

describe("ELEMENTS", () => {
  it("décrit les 18 types, chacun avec au moins 3 couleurs", () => {
    expect(Object.keys(ELEMENTS).sort()).toEqual([...NOMS_TYPES].sort());
    for (const type of NOMS_TYPES) expect(ELEMENTS[type].couleurs.length).toBeGreaterThanOrEqual(3);
  });
});

describe("calculerIntensite", () => {
  it("grandit avec la puissance et reste entre 0,6 et 1,4", () => {
    expect(calculerIntensite(10)).toBe(0.6);
    expect(calculerIntensite(65)).toBe(1);
    expect(calculerIntensite(250)).toBe(1.4);
    expect(calculerIntensite(40)).toBeLessThan(calculerIntensite(120));
  });

  it("vaut 0,8 pour une attaque sans puissance", () => {
    expect(calculerIntensite(null)).toBe(0.8);
  });
});

describe("choisirRecette", () => {
  it("donne à une attaque spéciale la trajectoire signature de son type", () => {
    expect(choisirRecette("fire", "speciale", 90).trajectoire).toBe("projectile");
    expect(choisirRecette("water", "speciale", 90).trajectoire).toBe("jet");
    expect(choisirRecette("electric", "speciale", 90).trajectoire).toBe("ciel");
  });

  it("transforme toute attaque physique en attaque de contact, dans les couleurs du type", () => {
    for (const type of NOMS_TYPES) {
      const recette = choisirRecette(type, "physique", 80);
      expect(recette.trajectoire).toBe("contact");
      expect(recette.couleurs).toEqual(ELEMENTS[type].couleurs);
      expect(recette.touche).toBe(true);
    }
  });

  it("fait d'une attaque de statut une aura qui ne touche pas la cible", () => {
    const recette = choisirRecette("psychic", "statut", null);
    expect(recette.trajectoire).toBe("aura");
    expect(recette.impact).toBe("aucun");
    expect(recette.touche).toBe(false);
  });

  it("reporte l'intensité calculée à partir de la puissance", () => {
    expect(choisirRecette("fire", "speciale", 65).intensite).toBe(1);
  });
});
