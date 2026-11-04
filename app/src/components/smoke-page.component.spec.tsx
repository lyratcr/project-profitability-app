import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import { ThemeContext } from "@/hooks/theme.context";
import { SmokePage } from "./smoke-page.component";

const hook = vi.hoisted(() => ({ result: undefined as unknown }));

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: () => hook.result,
}));

vi.mock("@microsoft/fabric-visuals", () => ({
    KpiCard: (props: { header?: { title?: string }; callout: { metric: { value: number | null } } }) => (
        <div data-testid="kpi">
            {props.header?.title}: {props.callout.metric.value === null ? "null" : String(props.callout.metric.value)}
        </div>
    ),
}));

// Column shape exactly as returned by smoke.dax on the published model.
const columns = [
    { name: "[Synerion Hours]", dataType: "Decimal" },
    { name: "[Actual Revenue]", dataType: "Double" },
    { name: "[Last Refresh]", dataType: "String" },
];

function renderPage(): ReactElement {
    return (
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
            <SmokePage />
        </ThemeContext.Provider>
    );
}

describe("SmokePage", () => {
    beforeEach(() => {
        hook.result = { data: undefined, isLoading: true, error: undefined, refetch: async () => {} };
    });

    it("shows a loading skeleton", () => {
        render(renderPage());
        expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    });

    it("shows the error category and message, never data", () => {
        hook.result = {
            data: { status: "error", error: { category: "api", message: "Forbidden" } },
            isLoading: false,
            error: "Forbidden",
            refetch: async () => {},
        };
        render(renderPage());
        expect(screen.getByRole("alert")).toHaveTextContent("api");
        expect(screen.getByRole("alert")).toHaveTextContent("Forbidden");
        expect(screen.queryByTestId("kpi")).toBeNull();
    });

    it("shows the empty state when no rows come back", () => {
        hook.result = {
            data: { status: "success", table: { columns, rows: [] } },
            isLoading: false,
            error: undefined,
            refetch: async () => {},
        };
        render(renderPage());
        expect(screen.getByText(/no data for September 2026/)).toBeInTheDocument();
    });

    it("passes the model values to the cards and keeps nulls as null", () => {
        hook.result = {
            data: { status: "success", table: { columns, rows: [[267322.2809, null, "11/04/2026 09:14 EST"]] } },
            isLoading: false,
            error: undefined,
            refetch: async () => {},
        };
        render(renderPage());
        const cards = screen.getAllByTestId("kpi");
        expect(cards[0]).toHaveTextContent("Synerion hours: 267322.2809");
        expect(cards[1]).toHaveTextContent("Actual revenue: null");
        expect(screen.getByText(/11\/04\/2026 09:14 EST/)).toBeInTheDocument();
    });
});
