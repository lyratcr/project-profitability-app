import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryStates, type QueryResult } from "./query-states.component";

// Column shape of a KPI query on the published model (September 2026).
const columns = [{ name: "[Synerion Hours]" }, { name: "[Synerion Hours MoM %]" }];
const result = (overrides: Partial<QueryResult>): QueryResult => ({ data: undefined, isLoading: false, error: undefined, refetch: async () => {}, ...overrides });
const success = (rows: unknown[][], isLoading = false) =>
    result({ data: { status: "success", table: { columns, rows } } as unknown as QueryResult["data"], isLoading });

describe("QueryStates", () => {
    it("shows a skeleton while the first result loads", () => {
        render(<QueryStates result={result({ isLoading: true })} shape="chart" title="Weekly hours">{() => <p>chart</p>}</QueryStates>);
        expect(screen.getByLabelText("Loading Weekly hours")).toBeInTheDocument();
        expect(screen.queryByText("chart")).toBeNull();
    });

    it("shows the error with its category and retries on demand", () => {
        const refetch = vi.fn(async () => {});
        render(
            <QueryStates
                result={result({ data: { status: "error", error: { category: "query", message: "Column 'x' not found" } } as unknown as QueryResult["data"], refetch })}
                shape="kpi"
                title="Synerion hours"
            >
                {() => <p>value</p>}
            </QueryStates>,
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Synerion hours: could not load (query).");
        expect(screen.getByRole("alert")).toHaveTextContent("Column 'x' not found");
        expect(screen.queryByText("value")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it("shows the empty message when no rows come back, never zeros", () => {
        render(<QueryStates result={success([])} shape="table" title="Hours by customer" emptyMessage="No hours for these filters.">{() => <p>table</p>}</QueryStates>);
        expect(screen.getByText("No hours for these filters.")).toBeInTheDocument();
        expect(screen.queryByText("table")).toBeNull();
    });

    it("renders the result and keeps it, marked busy, while a new filter reloads", () => {
        const { rerender } = render(
            <QueryStates result={success([[267322.2809, 0.0442]])} shape="kpi" title="Synerion hours">{(t) => <p>rows: {t.rows.length}</p>}</QueryStates>,
        );
        expect(screen.getByText("rows: 1")).toBeInTheDocument();
        rerender(<QueryStates result={success([[267322.2809, 0.0442]], true)} shape="kpi" title="Synerion hours">{(t) => <p>rows: {t.rows.length}</p>}</QueryStates>);
        expect(screen.getByText("rows: 1").parentElement).toHaveAttribute("aria-busy", "true");
    });

    it("with allowEmpty, renders the children with the empty table (one block of a composed visual)", () => {
        render(
            <QueryStates result={success([])} shape="table" title="Plan by role" allowEmpty>
                {(t) => <p>rows: {t.rows.length}</p>}
            </QueryStates>,
        );
        expect(screen.getByText("rows: 0")).toBeInTheDocument();
    });
});

