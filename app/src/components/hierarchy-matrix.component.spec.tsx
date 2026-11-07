import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import { ThemeContext } from "@/hooks/theme.context";
import { HierarchyMatrix } from "./hierarchy-matrix.component";

const grid = vi.hoisted(() => ({ props: undefined as unknown as Record<string, unknown> }));
vi.mock("@microsoft/fabric-datagrid", () => ({
    DataGrid: (props: Record<string, unknown>) => {
        grid.props = props;
        return null;
    },
}));

// Real rows from the published model: Synerion hours by employee L1 > L2 for September 2026.
const table = {
    columns: ["fact_profitability_metrics[employee_L1]", "fact_profitability_metrics[employee_L2]", "[IsL1Total]", "[IsL2Total]", "[Hours]"].map((name) => ({ name })),
    rows: [
        [null, null, true, true, 267322.2809],
        ["BPO", null, false, true, 173551.7796],
        ["BPO", "BOS", false, false, 53015.4513],
    ],
} as unknown as QueryTable;
const spec = {
    levels: ["fact_profitability_metrics[employee_L1]", "fact_profitability_metrics[employee_L2]"],
    flags: ["[IsL1Total]", "[IsL2Total]"],
    value: "[Hours]",
};

describe("HierarchyMatrix", () => {
    it("feeds the grid tree rows, formatted cells and the model's grand total", () => {
        render(
            <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
                <HierarchyMatrix table={table} spec={spec} rowHeader="Organization (employee)" format="#,0" title="Hours by organization" expandFirstLevel />
            </ThemeContext.Provider>,
        );
        const p = grid.props as {
            data: { _id: string; label: string; c0: number; _expanded?: boolean; _children?: { label: string; c0: number }[] }[];
            columns: { id: string; header: string; cellRenderer?: (v: unknown) => string }[];
            grandTotals: { position: string; data: { rows: unknown[][]; columns: { name: string; format?: string }[] } };
            header: { title: string };
        };
        expect(p.header.title).toBe("Hours by organization");
        expect(p.columns.map((c) => [c.id, c.header])).toEqual([["label", "Organization (employee)"], ["c0", "Value"]]);
        expect(p.data).toHaveLength(1);
        expect(p.data[0]).toMatchObject({ _id: "BPO", label: "BPO", c0: 173551.7796, _expanded: true });
        expect(p.data[0]).not.toHaveProperty("depth");
        expect(p.data[0]._children![0]).toMatchObject({ label: "BOS", c0: 53015.4513 });
        expect(p.columns[1].cellRenderer!(173551.7796)).toBe("173,552");
        expect(p.columns[1].cellRenderer!(null)).toBe("");
        expect(p.grandTotals.position).toBe("bottom");
        expect(p.grandTotals.data.rows).toEqual([["Total", 267322.2809]]);
        expect(p.grandTotals.data.columns[1]).toEqual({ name: "c0", format: "#,0" });
    });

    it("fixes the value column widths only when asked, so pivoted months stay readable", () => {
        const renderWith = (valueWidth?: number) =>
            render(
                <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
                    <HierarchyMatrix table={table} spec={spec} rowHeader="Org" title="t" valueWidth={valueWidth} />
                </ThemeContext.Provider>,
            );
        renderWith(120);
        let cols = (grid.props as { columns: { id: string; width?: number }[] }).columns;
        expect(cols.map((c) => [c.id, c.width])).toEqual([["label", 180], ["c0", 120]]);
        renderWith(undefined);
        cols = (grid.props as { columns: { id: string; width?: number }[] }).columns;
        expect(cols.every((c) => c.width === undefined)).toBe(true);
    });

    it("renders share bars and signed deltas only in the columns asked for", () => {
        const t = {
            columns: ["L1", "[IsL1Total]", "[Hours]", "[Share]", "[MoM]"].map((name) => ({ name })),
            rows: [
                [null, true, 271203, 1, 0.0048],
                ["BPO", false, 169978, 0.627, -0.0202],
            ],
        } as unknown as QueryTable;
        const values = [
            { raw: "[Hours]", header: "Hours" },
            { raw: "[Share]", header: "Share" },
            { raw: "[MoM]", header: "MoM" },
        ];
        render(
            <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
                <HierarchyMatrix
                    chromeless
                    table={t}
                    spec={{ levels: ["L1"], flags: ["[IsL1Total]"], values }}
                    rowHeader="Org"
                    format={["#,0", "0.0%", "0.0%"]}
                    barColumns={[1]}
                    deltaColumns={[2]}
                    title="t"
                />
            </ThemeContext.Provider>,
        );
        const p = grid.props as { columns: { id: string; cellRenderer?: (v: unknown) => unknown }[]; header?: unknown; chromeless?: boolean };
        expect(p.chromeless).toBe(true);
        expect(p.header).toBeUndefined();
        expect(p.columns[1].cellRenderer!(169978)).toBe("169,978");
        const share = render(<>{p.columns[2].cellRenderer!(0.627) as ReactNode}</>);
        expect(share.container.querySelector(".ax-bar > span")).toHaveStyle({ width: "62.7%" });
        const delta = render(<>{p.columns[3].cellRenderer!(-0.0202) as ReactNode}</>);
        expect(delta.container.textContent).toBe("−2.0%");
    });
});
