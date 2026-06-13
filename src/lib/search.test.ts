import { describe, expect, it } from "vitest";
import generatedCatalog from "../data/generated/ringGoals.json";
import { mergeGoalGraphs } from "../data/taskGraph";
import { taskGraphs } from "../data/taskGraph";
import { searchTaskGraphs } from "./search";
import type { TaskGraph } from "../types";

const generatedGoals = (generatedCatalog as { goals: TaskGraph[] }).goals;

describe("task search", () => {
  it("maps tree cutting phrasing to the tree felling plan", () => {
    const [best] = searchTaskGraphs(taskGraphs, "cut 100 trees down");

    expect(best.graph.id).toBe("tree-felling-run");
    expect(best.matchedTerms.join(" ")).toContain("tree");
  });

  it("maps tiered home phrasing to Great Hall", () => {
    const [best] = searchTaskGraphs(taskGraphs, "build tier 3 home");

    expect(best.graph.id).toBe("great-hall");
  });

  it("keeps friend totem phrasing discoverable", () => {
    const [best] = searchTaskGraphs(taskGraphs, "friend spawn totem");

    expect(best.graph.id).toBe("wilderness-beacon");
  });

  it("finds core starter catalog goals", () => {
    expect(searchTaskGraphs(taskGraphs, "claim land")[0].graph.id).toBe("personal-claim");
    expect(searchTaskGraphs(taskGraphs, "build palisade")[0].graph.id).toBe("palisade");
    expect(searchTaskGraphs(taskGraphs, "cross river")[0].graph.id).toBe("starter-boat");
    expect(searchTaskGraphs(taskGraphs, "make leather")[0].graph.id).toBe("leather-production");
    expect(searchTaskGraphs(taskGraphs, "start mining")[0].graph.id).toBe("mine-hole");
  });

  it("includes the generated Ring of Brodgar goal catalog", () => {
    const mergedGoals = mergeGoalGraphs(generatedGoals);

    expect(mergedGoals.length).toBeGreaterThan(1000);
    expect(mergedGoals.some((graph) => graph.id === "ring-oven")).toBe(true);
    expect(searchTaskGraphs(mergedGoals, "build oven")[0].graph.name).toBe("Oven");
    expect(searchTaskGraphs(mergedGoals, "learn baking")[0].graph.name).toBe("Baking");
  });

  it("keeps generated wiki acquisition notes visible and linked", () => {
    const antQueen = generatedGoals.find((graph) => graph.name === "Ant Queen");
    const note = antQueen?.rows.find((row) => row.name === "Wiki Acquisition Notes");

    expect(note?.quantity).toBe("Ring of Brodgar source");
    expect(note?.method).toContain("Ant Hill");
    expect(note?.sourceUrl).toBe("https://ringofbrodgar.com/wiki/Ant_Queen");
  });

  it("expands tree product goals into planting workflows", () => {
    const mergedGoals = mergeGoalGraphs(generatedGoals);
    const plum = generatedGoals.find((graph) => graph.name === "Plum");
    const rowNames = plum?.rows.map((row) => row.name) ?? [];

    expect(rowNames).toContain("Plum Kernel");
    expect(rowNames).toContain("Treeplanter's Pot");
    expect(rowNames).toContain("Herbalist Table");
    expect(rowNames).toContain("Harvest Plum");
    expect(plum?.rows.find((row) => row.name === "Direct Ground Planting")?.required).toBe(false);
    expect(plum?.rows.some((row) => row.method === "Use Plum Tree for production")).toBe(false);
    expect(JSON.stringify(plum)).not.toMatch(/(?:requires|specific|seed[_ ]of|optional)::/i);
    expect(searchTaskGraphs(mergedGoals, "plum seed")[0].graph.name).toBe("Plum");
  });

  it("expands baked goods into ingredient preparation and oven workflows", () => {
    const bread = generatedGoals.find((graph) => graph.name === "Bread");
    const applePie = generatedGoals.find((graph) => graph.name === "Apple Pie");
    const fruitPie = generatedGoals.find((graph) => graph.name === "Fruit Pie");
    const breadRows = bread?.rows.map((row) => row.name) ?? [];
    const applePieRows = applePie?.rows.map((row) => row.name) ?? [];
    const fruitPieRows = fruitPie?.rows.map((row) => row.name) ?? [];

    expect(breadRows).toEqual(expect.arrayContaining(["Water", "Any Flour", "Make Bread Dough", "Fuel and Light Oven", "Bake Bread"]));
    expect(bread?.rows.some((row) => row.kind === "material" && row.name === "Bread Dough")).toBe(false);
    expect(bread?.rows.find((row) => row.name === "Any Flour")?.method).toContain("grind");
    expect(JSON.stringify(bread)).not.toContain("copy=");

    expect(applePieRows).toEqual(expect.arrayContaining(["Red Apple", "Butter", "Make Unbaked Apple Pie", "Bake Apple Pie"]));
    expect(fruitPieRows).toContain("Fruit or Berry");
    expect(fruitPie?.rows.find((row) => row.name === "Fruit or Berry")?.quantity).toBe("3");
  });

  it("handles cooked-food optional ingredients, station alternatives, and nested preparation", () => {
    const meatpie = generatedGoals.find((graph) => graph.name === "Meatpie");
    const roastMeat = generatedGoals.find((graph) => graph.name === "Roast Meat");
    const plumPudding = generatedGoals.find((graph) => graph.name === "Plum Pudding");
    const plumPuddingRows = plumPudding?.rows.map((row) => row.name) ?? [];

    expect(meatpie?.rows.find((row) => row.name === "Spices")?.required).toBe(false);
    expect(roastMeat?.rows.map((row) => row.name)).toContain("Fire or Fireplace");
    expect(roastMeat?.rows.find((row) => row.name === "Spices")?.required).toBe(false);
    expect(roastMeat?.rows.find((row) => row.name === "Cook Roast Meat")?.dependsOn).not.toEqual(
      expect.arrayContaining(["tool-fire-1", "tool-fireplace-2"]),
    );

    expect(plumPuddingRows).toEqual(
      expect.arrayContaining(["Cauldron", "Dried Fruit", "Brandy", "Make Batter", "Make Plum Pudding Dough", "Bake Plum Pudding"]),
    );
    expect(plumPudding?.rows.find((row) => row.name === "Dried Fruit")?.method).toContain("Dry acceptable fruit");
    expect(plumPudding?.rows.find((row) => row.name === "Brandy")?.method).toContain("Distill wine");
  });
});
