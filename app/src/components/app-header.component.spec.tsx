import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import { ThemeContext } from "@/hooks/theme.context";
import { PAGES } from "@/lib/routes";
import { AppHeader } from "./app-header.component";

const hook = vi.hoisted(() => ({ result: undefined as unknown }));

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: () => hook.result,
}));

// Column shape exactly as returned by data-freshness.dax on the published model.
const columns = [
    { name: "[Last Synerion Date]", dataType: "DateTime" },
    { name: "[Last Revenue Date]", dataType: "DateTime" },
    { name: "[Last Refresh]", dataType: "String" },
];
const success = (rows: unknown[][]) => ({
    data: { status: "success", table: { columns, rows } },
    isLoading: false,
    error: undefined,
    refetch: async () => {},
});

const wednesday = new Date(2026, 10, 4);

function renderHeader(pageIndex = 0, today = wednesday) {
    return render(
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
            <AppHeader current={PAGES[pageIndex]} today={today} />
        </ThemeContext.Provider>,
    );
}

describe("AppHeader", () => {
    beforeEach(() => {
        hook.result = { data: undefined, isLoading: true, error: undefined, refetch: async () => {} };
    });

    it("renders a tab per page and marks the current one", () => {
        renderHeader(5);
        // Auxis PageTabs: links with the tab role; the active one is selected and the current page.
        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(6);
        expect(screen.getByRole("tab", { current: "page" })).toHaveTextContent("Projects");
        expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Projects");
        expect(screen.getByRole("tab", { name: "Effort" })).toHaveAttribute("href", "#/effort");
    });

    it("shows a loading placeholder for the data dates", () => {
        renderHeader();
        expect(screen.getByLabelText("Loading data dates")).toBeInTheDocument();
    });

    it("shows the error category instead of dates when the query fails", () => {
        hook.result = {
            data: { status: "error", error: { category: "api", message: "Forbidden" } },
            isLoading: false,
            error: "Forbidden",
            refetch: async () => {},
        };
        renderHeader();
        expect(screen.getByRole("alert")).toHaveTextContent("Data dates unavailable (api)");
    });

    it("shows the data dates and no warning when hours are current", () => {
        hook.result = success([["2026-11-03T00:00:00.000", "2026-10-30T00:00:00.000", "11/04/2026 09:14 EST"]]);
        renderHeader();
        expect(screen.getByText("Nov 3, 2026")).toBeInTheDocument();
        expect(screen.getByText("Oct 30, 2026")).toBeInTheDocument();
        expect(screen.getByText("11/04/2026 09:14 EST")).toBeInTheDocument();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("warns when hours stop before the end of the last complete week (Saturday)", () => {
        hook.result = success([["2026-10-17T00:00:00.000", "2026-10-30T00:00:00.000", "11/04/2026 09:14 EST"]]);
        renderHeader();
        expect(screen.getByRole("status")).toHaveTextContent("Hours are not current: last day loaded is Oct 17, 2026.");
    });

    it("shows em dashes when the model returns blanks", () => {
        hook.result = success([[null, null, null]]);
        renderHeader();
        expect(screen.getAllByText("—")).toHaveLength(3);
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("keeps the current filters in the tab links", () => {
        render(
            <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
                <AppHeader current={PAGES[0]} params={new URLSearchParams({ period: "m:2026-09", country: "Colombia" })} today={wednesday} />
            </ThemeContext.Provider>,
        );
        expect(screen.getByRole("tab", { name: "Yield" })).toHaveAttribute("href", "#/yield?period=m%3A2026-09&country=Colombia");
    });
});
