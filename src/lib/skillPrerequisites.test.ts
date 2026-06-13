import { describe, expect, it } from "vitest";
import generatedCatalog from "../data/generated/ringGoals.json";
import { mergeGoalGraphs } from "../data/taskGraph";
import type { TaskGraph } from "../types";
import { getSkillPrerequisiteMap, getSkillPrerequisites } from "./skillPrerequisites";

const generatedGoals = (generatedCatalog as { goals: TaskGraph[] }).goals;

describe("skill prerequisites", () => {
  it("builds prerequisite hints from generated skill goals", () => {
    const prerequisitesBySkill = getSkillPrerequisiteMap(mergeGoalGraphs(generatedGoals));

    expect(getSkillPrerequisites("Hunting", prerequisitesBySkill)).toEqual(["Foraging"]);
    expect(getSkillPrerequisites("Metal Working", prerequisitesBySkill)).toEqual(["Stone Working", "Firecrafts"]);
  });

  it("does not expose placeholder prerequisite names", () => {
    const prerequisitesBySkill = getSkillPrerequisiteMap(mergeGoalGraphs(generatedGoals));

    expect(getSkillPrerequisites("Firecrafts", prerequisitesBySkill)).toEqual([]);
  });
});
