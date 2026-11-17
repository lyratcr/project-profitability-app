import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RevenueProjection } from "./revenue-projection.component";

const ok = (columns: string[], rows: unknown[][]) => ({
    data: { status: "success", table: { columns: columns.map((name) => ({ name, dataType: "Variant" })), rows } },
    isLoading: false,
    error: undefined,
    refetch: async () => {},
});
const columns = ["[SOW]", "[Billed]", "[Ahead]", "[Projected]", "[VsSOW]", "[VsSOWPct]", "[AllSOW]", "[Cutoff]", "[PlanEnd]"];
// Published model, 2026-11-17 (docs/08_app_measures.md § 22), cutoff Nov 6.
const mos = [276367, 261362, 40167, 301529, 25162, 0.091, 276367, "2026-11-06T00:00:00.000", "2027-11-12T00:00:00.000"];
const apa = [142976, 10711, 107234, 117946, -25031, -0.175, 142976, "2026-11-06T00:00:00.000", "2027-07-16T00:00:00.000"];
const gotFixedFee = [null, null, null, null, null, null, 768816, "2026-11-06T00:00:00.000", "2026-12-01T00:00:00.000"];
const allProjects = [28407940, 24471638, 4886136, 29357774, 949835, 0.033, 228451631, "2026-11-06T00:00:00.000", "2029-12-01T00:00:00.000"];
const weeks = ok(
    ["dim_calendar[start_of_week_sun]", "[Week]", "[PlanWeek]", "[Cumulative]", "[PlanCum]", "[Integrated]"],
    [
        ["2026-09-13T00:00:00.000", null, 21610, null, 21610, 1],
        ["2026-11-01T00:00:00.000", 70301, 26650, 261362, 236200, 1],
        ["2026-11-08T00:00:00.000", 10640, 10640, 272002, 246840, 0],
        ["2027-11-07T00:00:00.000", 0, 0, 301529, 276367, 0],
    ],
);

describe("RevenueProjection", () => {
    it("shows the model's values and says the project goes over the SOW", () => {
        render(<RevenueProjection summary={ok(columns, [mos]) as never} weeks={weeks as never} single />);
        expect(screen.getByText("$301,529")).toBeTruthy();
        expect(screen.getByText("+$25,162")).toBeTruthy();
        expect(screen.getByText("+9%, over the SOW")).toBeTruthy();
        expect(screen.getByRole("status").textContent).toBe(
            "At this rate the project ends $25,162 over the SOW (+9%): $261,362 billed through Nov 6, 2026 plus $40,167 of Backlog ahead.",
        );
        expect(screen.getByText("Billed in Project Ops")).toBeTruthy();
    });

    it("says when the project falls short", () => {
        render(<RevenueProjection summary={ok(columns, [apa]) as never} weeks={weeks as never} single />);
        expect(screen.getByText("−$25,031")).toBeTruthy();
        expect(screen.getByRole("status").textContent).toMatch(/^At this rate the project ends \$25,031 short of the SOW \(−18%\)/);
    });

    it("doesn't project Fixed Fee projects", () => {
        render(<RevenueProjection summary={ok(columns, [gotFixedFee]) as never} weeks={weeks as never} single />);
        expect(screen.getByText(/No revenue projection for Fixed Fee projects/)).toBeTruthy();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("with several projects, says what the T&M projection leaves out", () => {
        render(<RevenueProjection summary={ok(columns, [allProjects]) as never} weeks={weeks as never} single={false} />);
        expect(screen.getByRole("status").textContent).toMatch(/^At this rate these T&M projects end \$949,835 over the SOW/);
        expect(screen.getByText(/T&M projects only: \$28,407,940 of the \$228,451,631 SOW in scope/)).toBeTruthy();
    });

    it("explains itself behind the ? button", () => {
        render(<RevenueProjection summary={ok(columns, [mos]) as never} weeks={weeks as never} single />);
        fireEvent.click(screen.getByRole("button", { name: "How this works" }));
        expect(screen.getByRole("region", { name: "How this works" }).textContent).toMatch(/billed to date plus the Backlog ahead/i);
    });
});
