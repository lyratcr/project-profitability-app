import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PaceToPlanEnd } from "./pace-to-plan-end.component";

const ok = (columns: string[], rows: unknown[][]) => ({
    data: { status: "success", table: { columns: columns.map((name) => ({ name, dataType: "Variant" })), rows } },
    isLoading: false,
    error: undefined,
    refetch: async () => {},
});
const paceColumns = ["[Budget]", "[ToDate]", "[Left]", "[Used]", "[Pace]", "[WeeksToEnd]", "[Needed]", "[Runout]", "[WeeksBefore]", "[PlanEnd]"];
// ALK-401-01 on the published model, pace window 2026-10-18 – 2026-11-14.
const alk = [8616.86, 6400, 2216.86, 0.7427, 150, 29.857, 74.249, "2027-02-25T00:00:00.000", 15.143, "2027-06-11T00:00:00.000"];
const history = ok(["dim_calendar[start_of_week_sun]", "[HoursToDate]"], [["2026-11-01T00:00:00.000", 6280], ["2026-11-08T00:00:00.000", 6400]]);
const asOf = new Date(2026, 10, 14);

describe("PaceToPlanEnd", () => {
    it("shows the model's values and says when the budget runs out", () => {
        render(<PaceToPlanEnd pace={ok(paceColumns, [alk]) as never} history={history as never} asOf={asOf} />);
        expect(screen.getByText("2,217")).toBeTruthy();
        expect(screen.getByText("74 h/wk")).toBeTruthy();
        expect(screen.getByText("150 h/wk")).toBeTruthy();
        expect(screen.getByRole("status").textContent).toBe("At the current pace the hours budget runs out on Feb 25, 2027, about 15 weeks before plan end.");
    });

    it("explains itself behind the ? button", () => {
        render(<PaceToPlanEnd pace={ok(paceColumns, [alk]) as never} history={history as never} asOf={asOf} />);
        expect(screen.queryByRole("region", { name: "How this works" })).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "How this works" }));
        expect(screen.getByRole("region", { name: "How this works" }).textContent).toMatch(/last 4 complete weeks/);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByRole("region", { name: "How this works" })).toBeNull();
    });

    it("has no projection for Fixed Fee projects", () => {
        const ff = [null, 19348, null, null, 172.75, 2.43, null, null, null, "2026-12-01T00:00:00.000"];
        render(<PaceToPlanEnd pace={ok(paceColumns, [ff]) as never} history={history as never} asOf={asOf} />);
        expect(screen.getByText(/no hours budget to project against/)).toBeTruthy();
        expect(screen.queryByRole("img")).toBeNull();
    });

    it("says when the plan has ended", () => {
        const ended = [3284.87, 1715.87, 1569, 0.5224, 141.24, 0, null, null, null, "2026-10-30T00:00:00.000"];
        render(<PaceToPlanEnd pace={ok(paceColumns, [ended]) as never} history={history as never} asOf={asOf} />);
        expect(screen.getByRole("status").textContent).toBe("The plan ended on Oct 30, 2026 with 1,569 hours of budget left. Hours are still being logged: 141 h/wk.");
    });
});
