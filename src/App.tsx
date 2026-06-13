import {
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Download,
  ExternalLink,
  Filter,
  Hammer,
  ListTree,
  RotateCcw,
  Search,
  ShieldQuestion,
  Sparkles,
  Table2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadRingGoalCatalog } from "./data/generatedGoals";
import { mergeGoalGraphs, taskGraphs as initialGoalGraphs } from "./data/taskGraph";
import {
  decorateRows,
  getMaterialTotals,
  getNextRows,
  getProgress,
  getRowMap,
  getUnlockNames,
} from "./lib/planner";
import { searchTaskGraphs } from "./lib/search";
import { getSkillPrerequisiteMap, getSkillPrerequisites } from "./lib/skillPrerequisites";
import type { RequirementView, RowKind, RowStatus, TaskGraph, TaskSearchResult } from "./types";

const STORAGE_KEY = "haven-goal-table-completed";

const statusLabels: Record<RowStatus, string> = {
  complete: "Complete",
  ready: "Ready",
  blocked: "Blocked",
  optional: "Optional",
};

const kindLabels: Record<RowKind, string> = {
  skill: "Skill",
  tool: "Tool",
  material: "Material",
  action: "Action",
  note: "Note",
};

const kindIcons: Record<RowKind, typeof BookOpen> = {
  skill: BookOpen,
  tool: Hammer,
  material: Boxes,
  action: ClipboardCheck,
  note: ShieldQuestion,
};

function readCompleted(): Record<string, string[]> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function useCompletedRows(taskId: string) {
  const [allCompleted, setAllCompleted] = useState<Record<string, string[]>>(() => readCompleted());
  const completedIds = allCompleted[taskId] ?? [];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allCompleted));
  }, [allCompleted]);

  const toggleCompleted = (rowId: string) => {
    setAllCompleted((current) => {
      const taskCompleted = new Set(current[taskId] ?? []);
      if (taskCompleted.has(rowId)) {
        taskCompleted.delete(rowId);
      } else {
        taskCompleted.add(rowId);
      }

      return {
        ...current,
        [taskId]: [...taskCompleted],
      };
    });
  };

  const resetCompleted = () => {
    setAllCompleted((current) => ({
      ...current,
      [taskId]: [],
    }));
  };

  return { completedIds, toggleCompleted, resetCompleted };
}

function AppMark() {
  return (
    <div className="app-mark" aria-hidden="true">
      <ListTree size={24} />
    </div>
  );
}

function StatusPill({ status }: { status: RowStatus }) {
  return <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>;
}

function KindBadge({ kind }: { kind: RowKind }) {
  const Icon = kindIcons[kind];
  return (
    <span className={`kind-badge kind-${kind}`}>
      <Icon size={15} />
      {kindLabels[kind]}
    </span>
  );
}

function getTaskCode(graph: TaskGraph) {
  return graph.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getDetailPrimary(row: RequirementView) {
  if (row.quantity) {
    return row.quantity;
  }

  if (row.lpCost) {
    return `${row.lpCost} LP`;
  }

  if (row.kind === "note" && row.sourceUrl) {
    return "Source note";
  }

  return "-";
}

function CompletionButton({
  row,
  onToggle,
}: {
  row: RequirementView;
  onToggle: (rowId: string) => void;
}) {
  const complete = row.status === "complete";
  const Icon = complete ? CheckCircle2 : Circle;

  return (
    <button
      type="button"
      className={`complete-toggle ${complete ? "is-complete" : ""}`}
      onClick={() => onToggle(row.id)}
      aria-label={`${complete ? "Clear" : "Mark"} ${row.name}`}
    >
      <Icon size={18} />
    </button>
  );
}

function dependencyKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function DependsCell({
  row,
  rowsById,
  skillPrerequisitesByName,
}: {
  row: RequirementView;
  rowsById: Map<string, RequirementView>;
  skillPrerequisitesByName: Map<string, string[]>;
}) {
  const dependencyNames = row.dependsOn.map((id) => rowsById.get(id)?.name ?? id);
  const skillPrerequisiteNames = row.kind === "skill" ? getSkillPrerequisites(row.name, skillPrerequisitesByName) : [];
  const skillPrerequisiteKeys = new Set(skillPrerequisiteNames.map(dependencyKey));
  const planOnlyDependencies = dependencyNames.filter((name) => !skillPrerequisiteKeys.has(dependencyKey(name)));
  const hasSkillPrerequisites = skillPrerequisiteNames.length > 0;
  const hasPlanDependencies = planOnlyDependencies.length > 0;

  if (!hasSkillPrerequisites && dependencyNames.length === 0) {
    return <td className="depends-cell">-</td>;
  }

  return (
    <td className="depends-cell">
      {hasSkillPrerequisites ? (
        <span className="skill-prereq-line">
          <strong>Skill prereqs: </strong>
          {skillPrerequisiteNames.join(", ")}
        </span>
      ) : null}
      {hasPlanDependencies ? (
        <span>
          {hasSkillPrerequisites ? <strong>Plan deps: </strong> : null}
          {planOnlyDependencies.join(", ")}
        </span>
      ) : null}
    </td>
  );
}

function Sidebar({
  graphs,
  selectedTaskId,
  onSelectTask,
  progress,
  nextRows,
  statusFilter,
  setStatusFilter,
  kindFilter,
  setKindFilter,
}: {
  graphs: TaskGraph[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  progress: ReturnType<typeof getProgress>;
  nextRows: RequirementView[];
  statusFilter: RowStatus | "all";
  setStatusFilter: (status: RowStatus | "all") => void;
  kindFilter: RowKind | "all";
  setKindFilter: (kind: RowKind | "all") => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <AppMark />
        <div>
          <h1>Haven Goal Table</h1>
          <p>Plan - Calculate - Complete</p>
        </div>
      </div>

      <section className="side-section">
        <div className="section-title-row">
          <h2>Goals</h2>
          <span>{progress.percent}%</span>
        </div>
        <div className="task-list">
          {graphs.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`task-card ${task.id === selectedTaskId ? "is-active" : ""}`}
              onClick={() => onSelectTask(task.id)}
            >
              <span className="task-icon">{getTaskCode(task)}</span>
              <span>
                <strong>{task.name}</strong>
                <small>{task.category}</small>
              </span>
              {task.id === selectedTaskId ? <span className="task-dot" /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="side-section">
        <div className="section-title-row">
          <h2>Filters</h2>
          <Filter size={15} />
        </div>
        <label className="select-label">
          State
          <span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RowStatus | "all")}>
              <option value="all">All states</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
              <option value="optional">Optional</option>
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
        <label className="select-label">
          Type
          <span>
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as RowKind | "all")}>
              <option value="all">All types</option>
              <option value="skill">Skills</option>
              <option value="tool">Tools</option>
              <option value="material">Materials</option>
              <option value="action">Actions</option>
              <option value="note">Notes</option>
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
      </section>

      <section className="side-section">
        <div className="section-title-row">
          <h2>Next Ready</h2>
          <Sparkles size={15} />
        </div>
        <div className="next-list">
          {nextRows.length > 0 ? (
            nextRows.map((row) => (
              <div key={row.id} className="next-card">
                <KindBadge kind={row.kind} />
                <strong>{row.name}</strong>
                <small>{row.method}</small>
              </div>
            ))
          ) : (
            <div className="next-card muted-card">
              <strong>No ready rows</strong>
              <small>Clear blockers or reset the plan.</small>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

function TopBar({
  graph,
  query,
  setQuery,
  progress,
  resetCompleted,
}: {
  graph: TaskGraph;
  query: string;
  setQuery: (query: string) => void;
  progress: ReturnType<typeof getProgress>;
  resetCompleted: () => void;
}) {
  return (
    <header className="topbar">
      <div className="task-select">
        <span>{graph.name}</span>
        <ChevronDown size={18} />
      </div>
      <label className="search-box">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search goals, aliases, skills, items..."
        />
      </label>
      <div className="progress-pack">
        <span>Overall Progress</span>
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <strong>{progress.percent}%</strong>
        </div>
      </div>
      <button type="button" className="icon-button" onClick={resetCompleted} aria-label="Reset plan">
        <RotateCcw size={18} />
      </button>
    </header>
  );
}

function TaskSearchPanel({
  query,
  results,
  selectedTaskId,
  onSelectTask,
}: {
  query: string;
  results: TaskSearchResult[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  if (!query.trim()) {
    return null;
  }

  const strongestScore = results[0]?.score ?? 0;
  const visibleResults = results.filter((result) => result.score >= Math.max(18, strongestScore * 0.35)).slice(0, 3);

  return (
    <section className="search-results-panel">
      <div className="search-results-heading">
        <div>
          <Table2 size={18} />
          <h2>Goal Matches</h2>
        </div>
        <span>{visibleResults.length} found</span>
      </div>
      {visibleResults.length > 0 ? (
        <div className="search-result-grid">
          {visibleResults.map((result) => (
            <button
              type="button"
              key={result.graph.id}
              className={`search-result-card ${result.graph.id === selectedTaskId ? "is-current" : ""}`}
              onClick={() => onSelectTask(result.graph.id)}
            >
              <span className="task-icon">{getTaskCode(result.graph)}</span>
              <span className="result-main">
                <strong>{result.graph.name}</strong>
                <small>{result.graph.purpose}</small>
                <span className="match-tags">
                  {result.matchedTerms.length > 0
                    ? result.matchedTerms.slice(0, 4).map((term) => <em key={term}>{term}</em>)
                    : result.graph.aliases.slice(0, 2).map((term) => <em key={term}>{term}</em>)}
                </span>
              </span>
              <span className="result-score">{result.graph.id === selectedTaskId ? "Open" : "Open plan"}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-search">
          <strong>No goal match yet</strong>
          <span>The current table still filters by the text you entered.</span>
        </div>
      )}
    </section>
  );
}

function LogicTable({
  rows,
  allRows,
  selectedRowId,
  setSelectedRowId,
  toggleCompleted,
  skillPrerequisitesByName,
}: {
  rows: RequirementView[];
  allRows: RequirementView[];
  selectedRowId: string;
  setSelectedRowId: (rowId: string) => void;
  toggleCompleted: (rowId: string) => void;
  skillPrerequisitesByName: Map<string, string[]>;
}) {
  const rowsById = useMemo(() => getRowMap(allRows), [allRows]);

  return (
    <div className="table-shell">
      <div className="table-header">
        <div>
          <h2>Logic Table</h2>
          <p>{rows.length} visible rows</p>
        </div>
        <div className="legend">
          <span className="line-key" />
          Dependency
          <span className="line-key optional-key" />
          Optional
        </div>
      </div>

      <div className="logic-table-wrap">
        <table className="logic-table">
          <thead>
            <tr>
              <th className="check-col" />
              <th>#</th>
              <th>Type</th>
              <th>Goal / Requirement</th>
              <th>Details</th>
              <th>Status</th>
              <th>Depends On</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  No rows match the current filters.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`${selectedRowId === row.id ? "selected-row" : ""} row-${row.status}`}
                onClick={() => setSelectedRowId(row.id)}
              >
                <td className="check-col">
                  <CompletionButton row={row} onToggle={toggleCompleted} />
                </td>
                <td className="order-cell">
                  <span className="dependency-stem" />
                  {row.order}
                </td>
                <td>
                  <KindBadge kind={row.kind} />
                </td>
                <td>
                  <div className="requirement-name">
                    <strong>{row.name}</strong>
                    {!row.required ? <span>Optional</span> : null}
                  </div>
                </td>
                <td className="detail-cell">
                  <strong>{getDetailPrimary(row)}</strong>
                  <span>{row.method}</span>
                  {row.sourceUrl ? (
                    <a
                      className="inline-source-link"
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open source
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </td>
                <td>
                  <StatusPill status={row.status} />
                </td>
                <DependsCell row={row} rowsById={rowsById} skillPrerequisitesByName={skillPrerequisitesByName} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryPanel({
  graph,
  rows,
  selectedRow,
  toggleCompleted,
}: {
  graph: TaskGraph;
  rows: RequirementView[];
  selectedRow: RequirementView;
  toggleCompleted: (rowId: string) => void;
}) {
  const rowsById = useMemo(() => getRowMap(rows), [rows]);
  const blockers = selectedRow.blockerIds.map((id) => rowsById.get(id)).filter(Boolean) as RequirementView[];
  const unlocks = getUnlockNames(selectedRow, rows);
  const materialTotals = getMaterialTotals(rows);
  const progress = getProgress(rows);
  const [copied, setCopied] = useState(false);

  const copyMaterials = async () => {
    const text = materialTotals.map((item) => `${item.name}: ${item.quantity}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const exportPlan = () => {
    const plan = {
      goal: graph.name,
      exportedAt: new Date().toISOString(),
      rows: rows.map(({ status, blockerIds, ...row }) => ({
        ...row,
        status,
        blockers: blockerIds.map((id) => rowsById.get(id)?.name ?? id),
      })),
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${graph.id}-plan.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="inspector">
      <section className="inspector-card selected-detail">
        <div className="detail-heading">
          <KindBadge kind={selectedRow.kind} />
          <StatusPill status={selectedRow.status} />
        </div>
        <h2>{selectedRow.name}</h2>
        <p>{selectedRow.details}</p>
        <button type="button" className="primary-action" onClick={() => toggleCompleted(selectedRow.id)}>
          {selectedRow.status === "complete" ? "Clear Complete" : "Mark Complete"}
        </button>
      </section>

      <section className="inspector-card">
        <h3>Blockers</h3>
        {blockers.length > 0 ? (
          <ul className="compact-list">
            {blockers.map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-text">None</p>
        )}
      </section>

      <section className="inspector-card">
        <h3>Unlocks</h3>
        {unlocks.length > 0 ? (
          <ul className="tag-list">
            {unlocks.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="quiet-text">No direct unlocks in this goal graph.</p>
        )}
      </section>

      <section className="inspector-card">
        <div className="section-title-row">
          <h3>Materials</h3>
          <button type="button" className="mini-button" onClick={copyMaterials}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ul className="compact-list material-list">
          {materialTotals.map((item) => {
            const row = rowsById.get(item.rowId) as RequirementView | undefined;
            return (
              <li key={item.rowId}>
                <span>{item.name}</span>
                <strong className={row?.status === "complete" ? "done-text" : ""}>{item.quantity}</strong>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="inspector-card">
        <h3>Completion</h3>
        <div className="progress-track inspector-progress">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="quiet-text">
          {progress.complete} / {progress.total} required rows complete
        </p>
      </section>

      <section className="inspector-card source-card">
        <h3>Source</h3>
        <a href={selectedRow.sourceUrl} target="_blank" rel="noreferrer">
          {selectedRow.source}
          <ExternalLink size={14} />
        </a>
        <button type="button" className="secondary-action" onClick={exportPlan}>
          <Download size={16} />
          Export JSON
        </button>
      </section>
    </aside>
  );
}

export function App() {
  const [graphs, setGraphs] = useState(initialGoalGraphs);
  const [selectedTaskId, setSelectedTaskId] = useState(initialGoalGraphs[0].id);
  const graph = graphs.find((task) => task.id === selectedTaskId) ?? graphs[0] ?? initialGoalGraphs[0];
  const { completedIds, toggleCompleted, resetCompleted } = useCompletedRows(graph.id);
  const rows = useMemo(() => decorateRows(graph, completedIds), [completedIds, graph]);
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RowStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<RowKind | "all">("all");
  const taskSearchResults = useMemo(() => searchTaskGraphs(graphs, query), [graphs, query]);
  const skillPrerequisitesByName = useMemo(() => getSkillPrerequisiteMap(graphs), [graphs]);

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSelectedRowId("");
    setStatusFilter("all");
    setKindFilter("all");
    setQuery("");
  };

  useEffect(() => {
    if (!rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(rows[0]?.id ?? "");
    }
  }, [rows, selectedRowId]);

  useEffect(() => {
    let cancelled = false;

    loadRingGoalCatalog()
      .then((catalog) => {
        if (!cancelled) {
          setGraphs(mergeGoalGraphs(catalog.goals));
        }
      })
      .catch((error: unknown) => {
        console.warn("Ring of Brodgar generated goal catalog could not be loaded.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = rows.filter((row) => {
    const haystack = `${row.name} ${row.method} ${row.details} ${row.source}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesKind = kindFilter === "all" || row.kind === kindFilter;
    return matchesQuery && matchesStatus && matchesKind;
  });

  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const progress = getProgress(rows);
  const nextRows = getNextRows(rows);

  return (
    <div className="app-frame">
      <Sidebar
        graphs={graphs}
        selectedTaskId={selectedTaskId}
        onSelectTask={handleSelectTask}
        progress={progress}
        nextRows={nextRows}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        kindFilter={kindFilter}
        setKindFilter={setKindFilter}
      />
      <main className="workspace">
        <TopBar
          graph={graph}
          query={query}
          setQuery={setQuery}
          progress={progress}
          resetCompleted={resetCompleted}
        />
        <TaskSearchPanel
          query={query}
          results={taskSearchResults}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
        />
        <section className="task-summary">
          <div>
            <span className="summary-icon">{getTaskCode(graph)}</span>
          </div>
          <div>
            <h2>{graph.name}</h2>
            <p>{graph.purpose}</p>
          </div>
          <div className="summary-stats">
            <span>
              <strong>{rows.filter((row) => row.kind === "skill").length}</strong>
              Skills
            </span>
            <span>
              <strong>{rows.filter((row) => row.kind === "material").length}</strong>
              Materials
            </span>
            <span>
              <strong>{rows.filter((row) => row.status === "blocked").length}</strong>
              Blocked
            </span>
          </div>
        </section>
        <LogicTable
          rows={visibleRows}
          allRows={rows}
          selectedRowId={selectedRow.id}
          setSelectedRowId={setSelectedRowId}
          toggleCompleted={toggleCompleted}
          skillPrerequisitesByName={skillPrerequisitesByName}
        />
      </main>
      <SummaryPanel graph={graph} rows={rows} selectedRow={selectedRow} toggleCompleted={toggleCompleted} />
    </div>
  );
}
