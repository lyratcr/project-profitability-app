import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PeopleMatrix } from "@/lib/people-week";
import { PeopleWeekMatrix } from "./people-week-matrix.component";

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: () => ({ data: undefined, isLoading: false, error: undefined, refetch: async () => {} }),
}));

// Alejandro Nino on APA-401-04 (published model, 2026-11-16): billed in Project Ops vs logged in Synerion.
const matrix: PeopleMatrix = {
    people: [
        {
            key: "C1031",
            label: "Alejandro Nino",
            kind: "person",
            weeks: {
                "2026-10-04": { hours: 40, planned: 40, diff: 0, variance: 0 },
                "2026-10-11": { hours: 40, planned: 48, diff: -8, variance: -0.1667 },
            },
            total: { hours: 80, planned: 88, diff: -8, variance: -0.0909 },
        },
    ],
    roles: [],
    services: null,
    project: null,
};
const weeks = [new Date(2026, 9, 4), new Date(2026, 9, 11), new Date(2026, 10, 8)];

describe("PeopleWeekMatrix", () => {
    it("in reconcile mode marks any difference amber, a match neutral, and the weeks not in Project Ops yet", () => {
        render(
            <PeopleWeekMatrix
                matrix={matrix}
                weeks={weeks}
                currentWeek={new Date(2026, 10, 15)}
                selectedWeek={new Date(2026, 10, 8)}
                project="APA-401-04"
                billedThrough={new Date(2026, 10, 6)}
                mode="reconcile"
            />,
        );
        const row = screen.getByRole("row", { name: /Alejandro Nino/ });
        const pills = within(row).getAllByText(/^(0|−8|−9%)$/);
        expect(pills.find((p) => p.textContent === "−8")?.className).toContain("is-diff");
        expect(pills.find((p) => p.textContent === "0")?.className).toContain("is-even");
        expect(screen.getByText("Not in Project Ops")).toBeTruthy();
    });

    it("in budget mode keeps red over / green under and says Synerion for weeks not integrated", () => {
        render(
            <PeopleWeekMatrix
                matrix={matrix}
                weeks={weeks}
                currentWeek={new Date(2026, 10, 15)}
                selectedWeek={new Date(2026, 10, 8)}
                project="APA-401-04"
                billedThrough={new Date(2026, 10, 6)}
            />,
        );
        const row = screen.getByRole("row", { name: /Alejandro Nino/ });
        expect(within(row).getAllByText("−8")[0].className).toContain("is-under");
        expect(screen.getByText("Synerion")).toBeTruthy();
    });
});
