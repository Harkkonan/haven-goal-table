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
import { taskGraphs } from "./data/taskGraph";
import {
  decorateRows,
  getMaterialTotals,
  getNextRows,
  getProgress,
  getRowMap,
  getUnlockNames,
} from "./lib/planner";
import type { RequirementView, RowKind, RowStatus, TaskGraph } from "./types";

const STORAGE_KEY = "haven-task-table-completed";

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

function Sidebar({
  graph,
  progress,
  nextRows,
  statusFilter,
  setStatusFilter,
  kindFilter,
  setKindFilter,
}: {
  graph: TaskGraph;
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
          <h1>Haven Task Table</h1>
          <p>Plan - Calculate - Complete</p>
        </div>
      </div>

      <section className="side-section">
        <div className="section-title-row">
          <h2>Task</h2>
          <span>{progress.percent}%</span>
        </div>
        <button type="button" className="task-card is-active">
          <span className="task-icon">WB</span>
          <span>
            <strong>{graph.name}</strong>
            <small>{graph.purpose}</small>
          </span>
          <span className="task-dot" />
        </button>
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
          placeholder="Search tasks, skills, items..."
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

function LogicTable({
  rows,
  allRows,
  selectedRowId,
  setSelectedRowId,
  toggleCompleted,
}: {
  rows: RequirementView[];
  allRows: RequirementView[];
  selectedRowId: string;
  setSelectedRowId: (rowId: string) => void;
  toggleCompleted: (rowId: string) => void;
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
              <th>Task / Requirement</th>
              <th>Details</th>
              <th>Status</th>
              <th>Depends On</th>
            </tr>
          </thead>
          <tbody>
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
                  <strong>{row.quantity ?? (row.lpCost ? `${row.lpCost} LP` : "-")}</strong>
                  <span>{row.method}</span>
                </td>
                <td>
                  <StatusPill status={row.status} />
                </td>
                <td className="depends-cell">
                  {row.dependsOn.length > 0
                    ? row.dependsOn.map((id) => rowsById.get(id)?.name ?? id).join(", ")
                    : "-"}
                </td>
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
      task: graph.name,
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
          <p className="quiet-text">No direct unlocks in this task graph.</p>
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
  const [selectedTaskId] = useState(taskGraphs[0].id);
  const graph = taskGraphs.find((task) => task.id === selectedTaskId) ?? taskGraphs[0];
  const { completedIds, toggleCompleted, resetCompleted } = useCompletedRows(graph.id);
  const rows = useMemo(() => decorateRows(graph, completedIds), [completedIds, graph]);
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RowStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<RowKind | "all">("all");

  useEffect(() => {
    if (!rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(rows[0]?.id ?? "");
    }
  }, [rows, selectedRowId]);

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
        graph={graph}
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
        <section className="task-summary">
          <div>
            <span className="summary-icon">WB</span>
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
        />
      </main>
      <SummaryPanel graph={graph} rows={rows} selectedRow={selectedRow} toggleCompleted={toggleCompleted} />
    </div>
  );
}
