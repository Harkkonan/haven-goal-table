import { describe, expect, it } from "vitest";
import { taskGraphs } from "../data/taskGraph";
import { decorateRows, getNextRows, getProgress } from "./planner";

describe("planner graph", () => {
  it("blocks dependent rows until prerequisites are completed", () => {
    const graph = taskGraphs[0];
    const rows = decorateRows(graph, []);

    expect(rows.find((row) => row.id === "carpentry")?.status).toBe("blocked");
    expect(rows.find((row) => row.id === "primitive-tools")?.status).toBe("ready");
  });

  it("surfaces the next ready rows", () => {
    const graph = taskGraphs[0];
    const rows = decorateRows(graph, ["oral-tradition", "primitive-tools", "foraging"]);
    const nextNames = getNextRows(rows).map((row) => row.name);

    expect(nextNames).toContain("Lumberjacking");
  });

  it("calculates required progress only", () => {
    const graph = taskGraphs[0];
    const rows = decorateRows(graph, ["oral-tradition", "primitive-tools"]);
    const progress = getProgress(rows);

    expect(progress.complete).toBe(2);
    expect(progress.total).toBeGreaterThan(progress.complete);
  });
});
