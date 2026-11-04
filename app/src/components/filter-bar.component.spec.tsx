import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { monthPeriod, type FilterOptions, type FilterState } from "@/lib/filters";
import { PAGES } from "@/lib/routes";
import { FilterBar } from "./filter-bar.component";

const today = new Date(2026, 10, 4);
const options: FilterOptions = {
    org: [["BPO", "BOS", "POD0"]],
    countries: ["Colombia", "Costa Rica", "United States"],
    customers: ["Access Corporation  "],
    projects: [{ key: "PAR-401-01", name: "PAR-401-01 Project" }],
};
const page = (id: string) => PAGES.find((p) => p.id === id)!;
const state: FilterState = { period: monthPeriod(2026, 10), org: {} };

function renderBar(pageId: string, overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
    const onChange = vi.fn();
    render(
        <FilterBar
            page={page(pageId)}
            state={state}
            options={options}
            optionsLoading={false}
            optionsError={undefined}
            onChange={onChange}
            today={today}
            {...overrides}
        />,
    );
    return onChange;
}

describe("FilterBar", () => {
    it("shows period, country, customer and project on Effort", () => {
        renderBar("effort");
        expect(screen.getByLabelText("Period")).toHaveValue("month");
        expect(screen.getByLabelText("Month")).toHaveValue("m:2026-10");
        expect(screen.getByLabelText("Employee country")).toBeInTheDocument();
        expect(screen.getByLabelText("Customer")).toBeInTheDocument();
        expect(screen.getByLabelText("Project")).toBeInTheDocument();
    });

    it("offers a single month and no country on Yield", () => {
        renderBar("yield");
        expect(screen.queryByLabelText("Period")).toBeNull();
        expect(screen.getByLabelText("Month")).toBeInTheDocument();
        expect(screen.queryByLabelText("Employee country")).toBeNull();
    });

    it("never offers the organization filter yet (open item #19)", () => {
        renderBar("headcount");
        expect(screen.queryByLabelText(/L1|Organization/)).toBeNull();
    });

    it("reports a country change and 'All' as undefined", () => {
        const onChange = renderBar("effort");
        fireEvent.change(screen.getByLabelText("Employee country"), { target: { value: "Costa Rica" } });
        expect(onChange).toHaveBeenLastCalledWith({ ...state, country: "Costa Rica" });
        fireEvent.change(screen.getByLabelText("Employee country"), { target: { value: "" } });
        expect(onChange).toHaveBeenLastCalledWith({ ...state, country: undefined });
    });

    it("switches the period kind to the latest complete quarter", () => {
        const onChange = renderBar("effort");
        fireEvent.change(screen.getByLabelText("Period"), { target: { value: "quarter" } });
        expect(onChange.mock.calls.at(-1)![0].period.token).toBe("q:2026-Q3");
    });

    it("disables lists while options load and reports option errors", () => {
        renderBar("effort", { options: null, optionsLoading: true });
        expect(screen.getByLabelText("Customer")).toBeDisabled();
        expect(screen.getByText("Loading filter values…")).toBeInTheDocument();
    });

    it("shows an error when the option lists fail", () => {
        renderBar("effort", { options: null, optionsError: "Forbidden" });
        expect(screen.getByRole("alert")).toHaveTextContent("Filter values unavailable");
    });
});
