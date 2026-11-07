import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AxKpiCard } from "./ax-kpi-card.component";

describe("AxKpiCard", () => {
    it("shows the model's value and a neutral pill with arrow and sign for a neutral KPI", () => {
        const { container } = render(
            <AxKpiCard
                variant="spotlight"
                label="Synerion hours"
                value={271203.0566}
                format="#,0"
                change={{ value: 0.0145, format: "0.0%", comparedTo: "vs September 2026" }}
                favorable="neither"
            />,
        );
        expect(screen.getByText("271,203")).toBeInTheDocument();
        expect(screen.getByText("+1.5%")).toBeInTheDocument();
        expect(screen.getByText("vs September 2026")).toBeInTheDocument();
        const card = container.querySelector("section")!;
        expect(card).toHaveClass("ax-card", "ax-spotlight", "ax-kpi-hero");
        const pill = container.querySelector(".ax-pill")!;
        expect(pill).not.toHaveClass("ax-pill-up");
        expect(pill.querySelector("svg")).not.toBeNull();
    });

    it("colours a favourable drop as negative and keeps the minus sign", () => {
        const { container } = render(
            <AxKpiCard label="Revenue" value={100} format="#,0" change={{ value: -0.02, format: "0.0%", comparedTo: "vs last month" }} />,
        );
        expect(container.querySelector(".ax-pill")).toHaveClass("ax-pill-down");
        expect(screen.getByText("−2.0%")).toBeInTheDocument();
    });

    it("shows an em dash for a blank value and the accent bar on the focus metric", () => {
        const { container } = render(<AxKpiCard variant="accent" label="Productive share" value={null} format="0.0%" note="Regular Time" />);
        expect(screen.getByText("—")).toBeInTheDocument();
        expect(container.querySelector(".ax-kpi-accent")).not.toBeNull();
        expect(screen.getByText("Regular Time")).toBeInTheDocument();
    });
});

describe("AxKpiCard signed values", () => {
    it("shows a net value with its sign", () => {
        render(<AxKpiCard signed label="Net cross-charge hours" value={-104} format="#,0" />);
        expect(screen.getByText("−104")).toBeInTheDocument();
    });
});
