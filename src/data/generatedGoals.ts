import type { TaskGraph } from "../types";
import ringGoalCatalogUrl from "./generated/ringGoals.json?url";

type GeneratedGoalCatalog = {
  schemaVersion: number;
  source: string;
  sourceUrl: string;
  generatedAt: string;
  goalCount: number;
  goals: TaskGraph[];
};

export { ringGoalCatalogUrl };

export async function loadRingGoalCatalog(): Promise<GeneratedGoalCatalog> {
  const response = await fetch(ringGoalCatalogUrl);

  if (!response.ok) {
    throw new Error(`Failed to load Ring of Brodgar goal catalog: ${response.status}`);
  }

  return (await response.json()) as GeneratedGoalCatalog;
}
