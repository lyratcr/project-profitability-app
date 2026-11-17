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

    it("reads a role like a person with no hours, as the executives' report does (Ion, 2026-11-17)", () => {
        // MOS-401-09, November 2026 (published model = executives' report): IT Manager planned 21 h, nobody assigned.
        const withRole: PeopleMatrix = {
            ...matrix,
            roles: [
                {
                    key: "role:IT Manager",
                    label: "IT Manager",
                    kind: "role",
                    weeks: {
                        "2026-10-04": { hours: null, planned: 15, diff: -15, variance: -1 },
                        "2026-10-11": { hours: null, planned: 0, diff: 0, variance: null },
                    },
                    total: { hours: null, planned: 21, diff: -21, variance: -1 },
                },
            ],
        };
        render(
            <PeopleWeekMatrix
                matrix={withRole}
                weeks={weeks}
                currentWeek={new Date(2026, 10, 15)}
                selectedWeek={new Date(2026, 10, 8)}
                project="MOS-401-09"
                billedThrough={new Date(2026, 10, 6)}
            />,
        );
        const row = screen.getByRole("row", { name: /IT Manager/ });
        expect(within(row).getByText("of 15")).toBeTruthy();
        expect(within(row).getByText("−15").className).toContain("is-under");
        expect(within(row).getByText("of 21")).toBeTruthy();
        expect(within(row).getByText("−21")).toBeTruthy();
        expect(within(row).getByText("−100%")).toBeTruthy();
        expect(within(row).queryByText(/^plan /)).toBeNull();
        // The week whose plan nets to 0 reads as empty.
        expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
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
