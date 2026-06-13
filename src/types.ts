export type RowKind = "skill" | "tool" | "material" | "action" | "note";

export type RequirementRow = {
  id: string;
  kind: RowKind;
  name: string;
  order: number;
  quantity?: string;
  lpCost?: number;
  required: boolean;
  dependsOn: string[];
  unlocks?: string[];
  source: string;
  sourceUrl?: string;
  method: string;
  details: string;
};

export type TaskGraph = {
  id: string;
  name: string;
  category: string;
  purpose: string;
  aliases: string[];
  searchHints: string[];
  rows: RequirementRow[];
};

export type TaskSearchResult = {
  graph: TaskGraph;
  score: number;
  matchedTerms: string[];
};

export type RowStatus = "complete" | "ready" | "blocked" | "optional";

export type RequirementView = RequirementRow & {
  status: RowStatus;
  blockerIds: string[];
};

export type MaterialTotal = {
  name: string;
  quantity: string;
  rowId: string;
};
