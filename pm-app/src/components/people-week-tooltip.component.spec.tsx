import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellTooltip } from "./people-week-tooltip.component";

const anchor = { left: 100, right: 160, top: 100, bottom: 140, width: 60, height: 40, x: 100, y: 100, toJSON: () => ({}) } as DOMRect;
// Alejandro Nino on APA-401-04, week of Oct 11, 2026, on the published model: 40 h billed in Project Ops, 48 h in Synerion.
const breakdown = { categories: [{ label: "Regular Time", hours: 40 }, { label: "Overtime", hours: 8 }], tasks: [{ label: "Accountant", hours: 48 }], days: {} };

describe("CellTooltip", () => {
    it("on an integrated week shows the Project Ops hours, the Synerion hours and the adjustment, then the Synerion detail", () => {
        render(
            <CellTooltip
                id="t"
                anchor={anchor}
                name="Alejandro Nino"
                period="Week Oct 11 – Oct 17, 2026 · APA-401-04"
                weekStart={new Date(2026, 9, 11)}
                value={{ hours: 40, planned: null, diff: 40, variance: 1, synerion: 48, billedVsSynerion: -8, fromProjectOps: true }}
                breakdown={breakdown}
                state="ready"
            />,
        );
        const tip = screen.getByRole("tooltip");
        expect(tip.textContent).toContain("Billed in Project Ops");
        expect(tip.textContent).toContain("Logged in Synerion48 h");
        expect(tip.textContent).toContain("Adjusted in Project Ops−8 h");
        expect(tip.textContent).toContain("Synerion detail · by pay category");
    });

    it("on a week not yet in Project Ops says the hours are Synerion's", () => {
        render(
            <CellTooltip
                id="t"
                anchor={anchor}
                name="Alejandro Nino"
                period="Week Nov 8 – Nov 14, 2026 · APA-401-04"
                weekStart={new Date(2026, 10, 8)}
                value={{ hours: 40, planned: null, diff: 40, variance: 1, synerion: 40, billedVsSynerion: 0, fromProjectOps: false }}
                breakdown={breakdown}
                state="ready"
            />,
        );
        const tip = screen.getByRole("tooltip");
        expect(tip.textContent).toContain("Logged in Synerion");
        expect(tip.textContent).not.toContain("Billed in Project Ops");
        expect(tip.textContent).toContain("By pay category");
    });
});
