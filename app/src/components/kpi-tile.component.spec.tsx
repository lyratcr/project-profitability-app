import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import { ThemeContext } from "@/hooks/theme.context";
import { KpiTile, type KpiTileProps } from "./kpi-tile.component";

const card = vi.hoisted(() => ({ props: undefined as unknown as Record<string, unknown> }));
vi.mock("@microsoft/fabric-visuals", () => ({
    KpiCard: (props: Record<string, unknown>) => {
        card.props = props;
        return null;
    },
}));

const wrap = (el: ReactElement) => <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>{el}</ThemeContext.Provider>;
const show = (props: KpiTileProps) => {
    render(wrap(<KpiTile {...props} />));
    return card.props as { header: { title: string }; callout: { metric: { value: unknown; format?: string }; change?: Record<string, unknown>; metricSubtext?: string } };
};

describe("KpiTile", () => {
    // Values as returned by the published model for September 2026.
    it("passes the measure value and format through, with a green change badge for growth", () => {
        const p = show({ title: "Synerion hours", value: 267322.2809, format: "#,0", change: { value: 0.04417, format: "0.0%", comparedTo: "vs August 2026" } });
        expect(p.header.title).toBe("Synerion hours");
        expect(p.callout.metric).toEqual({ value: 267322.2809, format: "#,0" });
        expect(p.callout.change).toEqual({ value: 0.04417, format: "0.0%", color: "var(--color-success)", icon: "▲", subtext: "vs August 2026" });
    });

    it("colors a drop red when more is better and green when less is better", () => {
        expect(show({ title: "Revenue", value: 1, change: { value: -0.027, comparedTo: "vs last month" } }).callout.change?.color).toBe("var(--color-destructive)");
        expect(show({ title: "Unbilled hours", value: 1, favorable: "decrease", change: { value: -0.1, comparedTo: "vs last month" } }).callout.change?.color).toBe("var(--color-success)");
    });

    it("keeps a blank KPI blank and says when there is nothing to compare", () => {
        const p = show({ title: "Revenue per FTE", value: null, format: "$#,0", change: { value: null, comparedTo: "vs August 2026" } });
        expect(p.callout.metric.value).toBeNull();
        expect(p.callout.change).toBeUndefined();
        expect(p.callout.metricSubtext).toBe("No comparison vs August 2026");
    });

    it("renders without a change badge when none is given", () => {
        const p = show({ title: "People with hours", value: 1605, format: "#,0" });
        expect(p.callout.change).toBeUndefined();
        expect(p.callout.metricSubtext).toBeUndefined();
    });
});
