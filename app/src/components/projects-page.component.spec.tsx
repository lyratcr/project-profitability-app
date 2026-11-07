import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { monthPeriod, type FilterOptions, type FilterState } from "@/lib/filters";
import { PAGES } from "@/lib/routes";
import { defaultWeek } from "@/lib/weeks";
import { ProjectsPage } from "./projects-page.component";

const hook = vi.hoisted(() => ({ calls: [] as string[] }));

// Week columns as returned by projects-week.dax on the published model (PAR-401-05, 2026-10-25 – 10-31): no plan
// rows that week, so plan hours, hours / plan and plan revenue are blank. Every other query stays loading.
const weekColumns = ["[Hours]", "[PlannedHours]", "[HoursVsPlan]", "[HoursVsPlanPct]", "[PlannedRevenue]", "[People]", "[NotYetBilled]"].map((name) => ({ name, dataType: "Double" }));
const weekRow = [13554.2354, null, 13554.2354, null, null, 350, 12426.1054];

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
const options: FilterOptions = { org: [], countries: [], customers: [], projects: [{ key: "PAR-401-05", name: "PAR-401-05 Parallon PSC" }] };

function state(now: Date, project?: string): FilterState {
    return { period: monthPeriod(2026, 10), week: defaultWeek(now), org: {}, project };
}

describe("ProjectsPage", () => {
    it("asks for a project and runs no query until one is picked", () => {
        hook.calls = [];
        const now = new Date(2026, 10, 4, 10); // Wednesday
        render(<ProjectsPage page={page} filters={state(now)} options={options} params={new URLSearchParams()} now={now} />);
        expect(screen.getByText(/Pick a project in the Project filter/)).toBeTruthy();
        expect(hook.calls.every((q) => q === "")).toBe(true);
    });

    it("shows the Monday review banner on Monday and until the Tuesday integration, not later", () => {
        const monday = new Date(2026, 10, 2, 9);
        const { unmount } = render(<ProjectsPage page={page} filters={state(monday, "PAR-401-05")} options={options} params={new URLSearchParams()} now={monday} />);
        const banner = screen.getByRole("status");
        expect(banner.textContent).toMatch(/Review last week's hours \(Sun, Oct 25 – Sat, Oct 31\)/);
        expect(within(banner).getByRole("link").getAttribute("href")).toContain("week=w%3A2026-10-25");
        unmount();

        const tuesdayLate = new Date(2026, 10, 3, 9);
        render(<ProjectsPage page={page} filters={state(tuesdayLate, "PAR-401-05")} options={options} params={new URLSearchParams()} now={tuesdayLate} />);
        expect(screen.queryByText(/Review last week's hours/)).toBeNull();
    });

    it("lays out last week and this week from the model, with a dash for blank plan values and a signed delta", () => {
        const now = new Date(2026, 10, 6, 18);
        render(<ProjectsPage page={page} filters={state(now, "PAR-401-05")} options={options} params={new URLSearchParams()} now={now} />);
        const table = screen.getByRole("table", { name: "Last week and this week vs plan" });
        const row = (label: string) => within(table).getByRole("row", { name: new RegExp(`^${label}`) });
        expect(within(row("Synerion hours")).getAllByRole("cell").map((c) => c.textContent)).toEqual(["13,554", "13,554"]);
        expect(within(row("Planned hours")).getAllByRole("cell").map((c) => c.textContent)).toEqual(["—", "—"]);
        expect(within(row("Hours vs plan")).getAllByRole("cell")[0].textContent).toBe("+13,554");
        expect(within(row("People who logged time")).getAllByRole("cell")[0].textContent).toBe("350");
        expect(within(table).getByText("Oct 25 – Oct 31, 2026")).toBeTruthy();
        expect(within(table).getByText("Sun, Nov 1 – Fri, Nov 6, to date")).toBeTruthy();
    });
});
