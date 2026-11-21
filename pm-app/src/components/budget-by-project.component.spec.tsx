import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { budgetStatus, budgetTone } from "@/lib/budget-status";
import { BudgetByProject } from "./budget-by-project.component";

const columns = ["dim_project[project_key]", "dim_project[project_name]", "dim_project[project_customer]", "[Planned]", "[Billed]", "[LeftToBill]", "[Progress]", "[HoursVsPlan]"];
const ok = (rows: unknown[][]) => ({
    data: { status: "success", table: { columns: columns.map((name) => ({ name, dataType: "Variant" })), rows } },
    isLoading: false,
    error: undefined,
    refetch: async () => {},
});
// First three rows as returned by projects-budget-by-project.dax on the published model (2026-11-21, last week
// Nov 8 – 14), in the query's order; the last three are made up to cover the other statuses.
const result = ok([
    ["NUM-101-04", "NUM-101-04 Digital Transformation IA", "Numotion", 172479, 329185.26, -156706.26, 1.9086, null],
    ["EVO-401-04", "EVO-401-04 Finance Migration FAO-BOS", "Evolus", 49569, 83989.32, -34420.32, 1.6944, 12.4],
    ["CAR-402-02", "CAR-402-02_Caregility ITO MS", "Caregility", 69000, 109700, -40700, 1.5899, -8],
    ["AAA-000-01", "AAA-000-01 Near", "Customer A", 100000, 93000, 7000, 0.93, 0],
    ["BBB-000-01", "BBB-000-01 Fine", "Customer B", 100000, 40000, 60000, 0.4, null],
    ["CCC-000-01", "CCC-000-01 No plan", "Customer C", null, 5000, -5000, null, 30],
]);

describe("budgetStatus", () => {
    it("reads the model's Variance sign and % Actual", () => {
        expect(budgetStatus(100, 1.2, -20)).toBe("over");
        expect(budgetStatus(28570, 1.00001, -0.3)).toBe("near");
        expect(budgetStatus(100, 0.9, 10)).toBe("near");
        expect(budgetStatus(100, 0.89, 11)).toBe("on-track");
        expect(budgetStatus(null, null, -5000)).toBe("no-sow");
        expect(budgetStatus(0, null, 0)).toBe("no-sow");
    });
});

describe("budgetTone", () => {
    it("is red over the SOW, green with SOW left and none on the line, by the value as shown", () => {
        expect(budgetTone("left", -206480)).toBe("over");
        expect(budgetTone("left", 132)).toBe("under");
        expect(budgetTone("left", -0.3)).toBeNull();
        expect(budgetTone("progress", 1.1565)).toBe("over");
        expect(budgetTone("progress", 0.54)).toBe("under");
        expect(budgetTone("progress", 1.001)).toBeNull();
        expect(budgetTone("leftPct", -0.1565)).toBe("over");
        expect(budgetTone("leftPct", 0.46)).toBe("under");
        expect(budgetTone("leftPct", null)).toBeNull();
    });
});

describe("BudgetByProject", () => {
    it("counts the projects by status and lists the ones that need attention first, in the model's order", () => {
        render(<BudgetByProject result={result as never} weekLabel="Nov 8 – Nov 14, 2026" onPick={() => {}} />);
        const chips = screen.getByRole("group", { name: "Filter projects by status" });
        expect(within(chips).getByRole("button", { name: /Over SOW/ }).textContent).toContain("3");
        expect(within(chips).getByRole("button", { name: /Near the limit/ }).textContent).toContain("1");
        expect(within(chips).getByRole("button", { name: /On track/ }).textContent).toContain("1");
        expect(within(chips).getByRole("button", { name: /No SOW/ }).textContent).toContain("1");
        const names = screen.getAllByRole("rowheader").map((th) => th.querySelector("button")?.textContent);
        expect(names).toEqual(["NUM-101-04 Digital Transformation IA", "EVO-401-04 Finance Migration FAO-BOS", "CAR-402-02_Caregility ITO MS", "AAA-000-01 Near"]);
        expect(screen.getByText("Showing 4 of 6 projects with a plan, revenue or hours: over the SOW or near the limit")).toBeTruthy();
    });

    it("shows the model's values as they are: whole percents, money in parentheses when over, signed hours", () => {
        render(<BudgetByProject result={result as never} weekLabel="Nov 8 – Nov 14, 2026" onPick={() => {}} />);
        const row = screen.getByRole("row", { name: /EVO-401-04/ });
        const cells = within(row).getAllByRole("cell").map((td) => td.textContent);
        expect(cells).toEqual(["Over SOW", "", "169%", "$49,569", "$83,989", "($34,420)", "+12"]);
        expect(within(screen.getByRole("row", { name: /NUM-101-04/ })).getAllByRole("cell").at(-1)?.textContent).toBe("—");
        expect(within(screen.getByRole("row", { name: /CAR-402-02/ })).getAllByRole("cell").at(-1)?.textContent).toBe("−8");
    });

    it("filters by status from the chips, and shows every project on demand", () => {
        render(<BudgetByProject result={result as never} weekLabel="Nov 8 – Nov 14, 2026" onPick={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: /On track/ }));
        expect(screen.getAllByRole("rowheader")).toHaveLength(1);
        expect(screen.getByRole("row", { name: /BBB-000-01 Fine/ })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Show all 6 projects" }));
        expect(screen.getAllByRole("rowheader")).toHaveLength(6);
        expect(within(screen.getByRole("row", { name: /CCC-000-01/ })).getAllByRole("cell")[0].textContent).toBe("No SOW");
    });

    it("lists every project when none is over or near", () => {
        render(<BudgetByProject result={ok([["BBB-000-01", "BBB-000-01 Fine", "Customer B", 100000, 40000, 60000, 0.4, null]]) as never} weekLabel="w" onPick={() => {}} />);
        expect(screen.getAllByRole("rowheader")).toHaveLength(1);
        expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
    });

    it("opens a project when its name is clicked", () => {
        const onPick = vi.fn();
        render(<BudgetByProject result={result as never} weekLabel="w" onPick={onPick} />);
        fireEvent.click(screen.getByRole("button", { name: "CAR-402-02_Caregility ITO MS" }));
        expect(onPick).toHaveBeenCalledWith("CAR-402-02");
    });
});
