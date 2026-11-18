import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RevenueByPerson } from "./revenue-by-person.component";

const ok = (columns: string[], rows: unknown[][]) => ({
    data: { status: "success", table: { columns: columns.map((name) => ({ name, dataType: "Variant" })), rows } },
    isLoading: false,
    error: undefined,
    refetch: async () => {},
});
const peopleColumns = [
    "dim_employee[employee_number]",
    "dim_employee[employee_full_name]",
    "[BilledToDate]",
    "[BacklogToDate]",
    "[ExecToDate]",
    "[Billed]",
    "[Backlog]",
    "[Exec]",
    "[ShareToDate]",
    "[Share]",
];
// MOS-401-09, published model 2026-11-17.
const people = ok(peopleColumns, [
    ["1348", "Iliak Herrera", 24974, 32200, 0.776, 24974, 64975, 0.384, 0.096, 0.096],
    ["1257", "Erick Angulo", 22387, 16000, 1.399, 22387, 16600, 1.349, 0.086, 0.086],
    ["X1", "Javier Alvarado", 11200, null, 1, 11200, null, 1, 0.043, 0.043],
    ["X2", "Gustavo Cervantes", null, 14400, 0, null, 14940, 0, null, null],
]);
const roles = ok(["fact_revenue_metrics[resource_role]", "[BacklogToDate]", "[Backlog]"], [["IT Manager", 13800, 14922]]);
const summaryColumns = ["[SOW]", "[Billed]", "[Ahead]", "[Projected]", "[VsSOW]", "[VsSOWPct]", "[AllSOW]", "[Cutoff]", "[PlanEnd]"];
const tm = ok(summaryColumns, [[276367, 261362, 40167, 301529, 25162, 0.091, 276367, "2026-11-06T00:00:00.000", "2027-11-12T00:00:00.000"]]);
const fixedFee = ok(summaryColumns, [[null, null, null, null, null, null, 768816, "2026-11-06T00:00:00.000", "2026-12-01T00:00:00.000"]]);

describe("RevenueByPerson", () => {
    it("draws a tile per person billed, with the model's % to date, and switches to the whole project", () => {
        render(<RevenueByPerson people={people as never} roles={roles as never} summary={tm as never} single />);
        const iliak = screen.getByRole("listitem", { name: /Iliak Herrera/ });
        expect(iliak.getAttribute("aria-label")).toBe("Iliak Herrera: $24,974 billed (10% of billed), 78% of a $32,200 Backlog");
        expect(screen.getByRole("listitem", { name: /Javier Alvarado/ }).getAttribute("aria-label")).toMatch(/no Backlog of their own/);
        expect(screen.queryByRole("listitem", { name: /Gustavo Cervantes/ })).toBeNull();
        expect(screen.getByText(/Billed in Project Ops through Nov 6, 2026 vs each person's Backlog to the same date/i)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Whole project" }));
        expect(screen.getByRole("listitem", { name: /Iliak Herrera/ }).getAttribute("aria-label")).toBe("Iliak Herrera: $24,974 billed (10% of billed), 38% of a $64,975 Backlog");
        expect(screen.getByText("Share of billed")).toBeTruthy();
    });

    it("lists roles and people planned but not billed yet", () => {
        render(<RevenueByPerson people={people as never} roles={roles as never} summary={tm as never} single />);
        expect(screen.getByText("IT Manager · role · $13,800 planned")).toBeTruthy();
        expect(screen.getByText("Gustavo Cervantes · $14,400 planned")).toBeTruthy();
    });

    it("shows the Fixed Fee note instead of the treemap", () => {
        render(<RevenueByPerson people={people as never} roles={roles as never} summary={fixedFee as never} single />);
        expect(screen.getByText(/No revenue by person for Fixed Fee projects/)).toBeTruthy();
        expect(screen.queryByRole("list", { name: "Revenue billed by person" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Whole project" })).toBeNull();
    });

    it("asks for one project in the aggregated view (no names there)", () => {
        render(<RevenueByPerson people={people as never} roles={roles as never} summary={tm as never} single={false} />);
        expect(screen.getByText(/Pick one project to see who billed its revenue/)).toBeTruthy();
        expect(screen.queryByRole("listitem")).toBeNull();
    });
});
