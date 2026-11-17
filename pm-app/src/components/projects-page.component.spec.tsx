import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { monthPeriod, type FilterOptions, type FilterState } from "@/lib/filters";
import { PAGES } from "@/lib/routes";
import { defaultWeek } from "@/lib/weeks";
import { ProjectsPage } from "./projects-page.component";

const hook = vi.hoisted(() => ({ calls: [] as string[] }));

// Week columns as returned by projects-week.dax on the published model (UIP-101-01, a T&M project, 2026-10-25 – 10-31).
// Every other query stays loading.
const weekColumns = ["[Hours]", "[PlannedHours]", "[HoursVsPlan]", "[HoursVsPlanPct]", "[PlannedRevenue]", "[People]", "[NotYetBilled]"].map((name) => ({ name, dataType: "Double" }));
const weekRow = [388, 419.64, -31.64, 0.9246, 17231.24, 9, 32];

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: ({ query }: { query: string }) => {
        hook.calls.push(query);
        if (query.includes('"NotYetBilled"')) {
            return { data: { status: "success", table: { columns: weekColumns, rows: [weekRow] } }, isLoading: false, error: undefined, refetch: async () => {} };
        }
        return { data: undefined, isLoading: query !== "", error: undefined, refetch: async () => {} };
    },
}));

vi.mock("./trend-chart.component", () => ({ TrendChart: () => <div data-testid="trend" /> }));
vi.mock("./report-table.component", () => ({ ReportTable: () => <div data-testid="table" /> }));

const page = PAGES.find((p) => p.id === "projects")!;
const options: FilterOptions = { org: [], countries: [], customers: [], projects: [{ key: "UIP-101-01", name: "UIP-101-01_Managed Team RPA", pm: null }], pms: [] };

function state(now: Date, project?: string): FilterState {
    return { period: monthPeriod(2026, 10), week: defaultWeek(now), org: {}, project };
}

describe("ProjectsPage", () => {
    it("runs no query until the project list has loaded", () => {
        hook.calls = [];
        const now = new Date(2026, 10, 4, 10); // Wednesday
        render(<ProjectsPage page={page} filters={state(now)} options={null} params={new URLSearchParams()} now={now} />);
        expect(hook.calls.every((q) => q === "")).toBe(true);
    });

    it("with no project picked, covers every visible project: no project filter, the project matrix and projects by pace (Ion, 2026-11-16)", () => {
        hook.calls = [];
        const now = new Date(2026, 10, 4, 10);
        render(<ProjectsPage page={page} filters={state(now)} options={options} params={new URLSearchParams()} now={now} />);
        const run = hook.calls.filter((q) => q !== "");
        expect(run.length).toBeGreaterThan(0);
        expect(run.some((q) => /TREATAS \( \{[^}]*\}, fact_\w+\[project_key\] \)/.test(q))).toBe(false);
        expect(run.some((q) => q.includes("SUMMARIZECOLUMNS (\n        dim_project[project_key],\n        dim_project[project_name],\n        ROLLUPADDISSUBTOTAL"))).toBe(true);
        expect(run.some((q) => q.includes("dim_project[project_manager_name],"))).toBe(true);
        expect(run.some((q) => q.includes("dim_employee[employee_full_name]"))).toBe(false);
        expect(screen.getByText("Hours vs budget by project")).toBeTruthy();
        expect(screen.getByText("How is the project right now?")).toBeTruthy();
    });

    it("narrows to the PM's projects when a PM is picked", () => {
        hook.calls = [];
        const now = new Date(2026, 10, 4, 10);
        const withPm = { ...options, projects: [{ key: "UIP-101-01", name: "UIP", pm: "Ana" }, { key: "ALK-401-01", name: "ALK", pm: "Bessy" }], pms: ["Ana", "Bessy"] };
        render(<ProjectsPage page={page} filters={{ ...state(now), pm: "Bessy" }} options={withPm} params={new URLSearchParams()} now={now} />);
        const run = hook.calls.filter((q) => q !== "");
        expect(run.every((q) => !q.includes('"UIP-101-01"'))).toBe(true);
        expect(run.some((q) => q.includes('TREATAS ( { "ALK-401-01" }, fact_profitability_metrics[project_key] )'))).toBe(true);
    });

    it("shows the Monday review banner on Monday and until the Tuesday integration, not later", () => {
        const monday = new Date(2026, 10, 2, 9);
        const { unmount } = render(<ProjectsPage page={page} filters={state(monday, "UIP-101-01")} options={options} params={new URLSearchParams()} now={monday} />);
        const banner = screen.getByRole("status");
        expect(banner.textContent).toMatch(/Review last week's hours \(Sun, Oct 25 – Sat, Oct 31\)/);
        expect(within(banner).getByRole("link").getAttribute("href")).toContain("#/projects");
        unmount();

        const tuesdayLate = new Date(2026, 10, 3, 9);
        render(<ProjectsPage page={page} filters={state(tuesdayLate, "UIP-101-01")} options={options} params={new URLSearchParams()} now={tuesdayLate} />);
        expect(screen.queryByText(/Review last week's hours/)).toBeNull();
    });

    it("lays out last week and this week from the model, with the delta signed (true minus)", () => {
        const now = new Date(2026, 10, 6, 18);
        render(<ProjectsPage page={page} filters={state(now, "UIP-101-01")} options={options} params={new URLSearchParams()} now={now} />);
        const table = screen.getByRole("table", { name: "Last week and this week vs plan" });
        const row = (label: string) => within(table).getByRole("row", { name: new RegExp(`^${label}`) });
        expect(within(row("Synerion hours")).getAllByRole("cell").map((c) => c.textContent)).toEqual(["388", "388"]);
        expect(within(row("Planned hours")).getAllByRole("cell")[0].textContent).toBe("420");
        expect(within(row("Hours vs plan")).getAllByRole("cell")[0].textContent).toBe("−32");
        expect(within(row("Hours / plan")).getAllByRole("cell")[0].textContent).toBe("92%");
        expect(within(row("People who logged time")).getAllByRole("cell")[0].textContent).toBe("9");
        expect(within(table).getByText("Oct 25 – Oct 31, 2026")).toBeTruthy();
        expect(within(table).getByText("Sun, Nov 1 – Fri, Nov 6, to date")).toBeTruthy();
    });
});
