import type { MaterialTotal, RequirementRow, RequirementView, RowStatus, TaskGraph } from "../types";

export function getRowMap(rows: RequirementRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

export function getStatus(row: RequirementRow, completed: Set<string>): RowStatus {
  if (completed.has(row.id)) {
    return "complete";
  }

  if (!row.required) {
    return "optional";
  }

  return row.dependsOn.every((dependency) => completed.has(dependency)) ? "ready" : "blocked";
}

export function decorateRows(graph: TaskGraph, completedIds: string[]): RequirementView[] {
  const completed = new Set(completedIds);

  return graph.rows
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((row) => ({
      ...row,
      status: getStatus(row, completed),
      blockerIds: row.dependsOn.filter((dependency) => !completed.has(dependency)),
    }));
}

export function getNextRows(rows: RequirementView[]) {
  return rows.filter((row) => row.status === "ready").slice(0, 3);
}

export function getProgress(rows: RequirementView[]) {
  const requiredRows = rows.filter((row) => row.required);
  const completeRows = requiredRows.filter((row) => row.status === "complete");
  return {
    complete: completeRows.length,
    total: requiredRows.length,
    percent: requiredRows.length === 0 ? 0 : Math.round((completeRows.length / requiredRows.length) * 100),
  };
}

export function getMaterialTotals(rows: RequirementView[]): MaterialTotal[] {
  return rows
    .filter((row) => row.kind === "material" && row.quantity)
    .map((row) => ({
      name: row.name,
      quantity: row.quantity ?? "",
      rowId: row.id,
    }));
}

export function getUnlockNames(row: RequirementRow, rows: RequirementRow[]) {
  const rowsById = getRowMap(rows);
  return (row.unlocks ?? []).map((id) => rowsById.get(id)?.name ?? id);
}
