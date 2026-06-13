import type { RequirementRow, TaskGraph } from "../types";

function normalizeSkillName(value: string) {
  return value
    .replace(/^unlock\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulSkillName(value: string | undefined) {
  return Boolean(value && !/^(none|no|unknown)$/i.test(value.trim()));
}

function uniqueNames(rows: RequirementRow[]) {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const row of rows) {
    const key = normalizeSkillName(row.name);
    if (!isUsefulSkillName(row.name) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(row.name);
  }

  return names;
}

export function getSkillPrerequisiteMap(graphs: TaskGraph[]) {
  const prerequisitesBySkill = new Map<string, string[]>();

  for (const graph of graphs) {
    const rowsById = new Map(graph.rows.map((row) => [row.id, row]));
    const skillName = normalizeSkillName(graph.name);
    const unlockRow = graph.rows.find(
      (row) => row.kind === "skill" && normalizeSkillName(row.name) === skillName && row.dependsOn.length > 0,
    );

    if (!unlockRow) {
      continue;
    }

    const prerequisites = uniqueNames(
      unlockRow.dependsOn
        .map((id) => rowsById.get(id))
        .filter((row): row is RequirementRow => row?.kind === "skill"),
    );

    if (prerequisites.length > 0) {
      prerequisitesBySkill.set(skillName, prerequisites);
    }
  }

  return prerequisitesBySkill;
}

export function getSkillPrerequisites(skillName: string, prerequisitesBySkill: Map<string, string[]>) {
  return prerequisitesBySkill.get(normalizeSkillName(skillName)) ?? [];
}
