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
});
