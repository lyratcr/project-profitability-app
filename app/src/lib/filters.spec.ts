import { describe, expect, it } from "vitest";
import {
    FILTERS_PLACEHOLDER,
    ORG_OPTION_MARKERS,
    CUSTOMER_OPTION_MARKERS,
    applyCustomerToOptions,
    applyFilters,
    applyOrgToOptions,
    coercePeriod,
    daxString,
    describePeriod,
    filterArgs,
    lastCompleteMonth,
    monthPeriod,
    parsePeriod,
    periodChoices,
    readFilters,
    readOrg,
    writeFilters,
    type FilterKey,
    type FilterOptions,
} from "./filters";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const today = day(2026, 11, 4);

// Shapes and sample values as returned by the option queries on the published model.
const options: FilterOptions = {
    org: [
        ["BPO", "BOS", "POD0"],
        ["BPO", "BOS", "POD1"],
        ["BPO", "FAO", "MGMT"],
    ],
    countries: ["Colombia", "Costa Rica", "United States"],
    customers: ["\nNY Municipal Credit", "Access Corporation  "],
    projects: [
        { key: "PAR-401-01", name: "PAR-401-01 Project" },
        { key: "ZZZ-101-01", name: null },
    ],
};

describe("parsePeriod", () => {
    it("parses each kind into inclusive local days", () => {
        expect(parsePeriod("m:2026-09")).toMatchObject({ kind: "month", start: day(2026, 9, 1), end: day(2026, 9, 30) });
        expect(parsePeriod("q:2026-Q3")).toMatchObject({ kind: "quarter", start: day(2026, 7, 1), end: day(2026, 9, 30) });
        expect(parsePeriod("ytd:2026-09")).toMatchObject({ kind: "ytd", start: day(2026, 1, 1), end: day(2026, 9, 30) });
        expect(parsePeriod("r:2026-10-27..2026-11-02")).toMatchObject({ kind: "range", start: day(2026, 10, 27), end: day(2026, 11, 2) });
        expect(parsePeriod("m:2024-02")?.end).toEqual(day(2024, 2, 29));
    });

    it("rejects malformed or impossible values", () => {
        for (const bad of [null, "", "m:2026-13", "m:2026-9", "q:2026-Q5", "r:2026-11-02..2026-10-27", "r:2026-02-30..2026-03-01", "m:2026-09;DROP"]) {
            expect(parsePeriod(bad)).toBeNull();
        }
    });
});

describe("lastCompleteMonth / coercePeriod / periodChoices", () => {
    it("defaults to the last complete month before the viewer's date", () => {
        expect(lastCompleteMonth(today).token).toBe("m:2026-10");
        expect(lastCompleteMonth(day(2026, 1, 15)).token).toBe("m:2025-12");
    });

    it("forces monthly pages to a single month", () => {
        expect(coercePeriod(parsePeriod("q:2026-Q3")!, ["month"], today).token).toBe("m:2026-09");
        expect(coercePeriod(parsePeriod("ytd:2026-12")!, ["month"], today).token).toBe("m:2026-10");
        const month = monthPeriod(2026, 9);
        expect(coercePeriod(month, ["month"], today)).toBe(month);
    });

    it("lists months, quarters and YTD from January 2025 to the current month", () => {
        const months = periodChoices("month", today);
        expect(months[0].token).toBe("m:2026-11");
        expect(months.at(-1)!.token).toBe("m:2025-01");
        expect(months).toHaveLength(23);
        expect(periodChoices("quarter", today).map((p) => p.token)).toEqual([
            "q:2026-Q4", "q:2026-Q3", "q:2026-Q2", "q:2026-Q1", "q:2025-Q4", "q:2025-Q3", "q:2025-Q2", "q:2025-Q1",
        ]);
        expect(periodChoices("ytd", today).map((p) => p.token)).toEqual(["ytd:2026-10", "ytd:2025-12"]);
    });

    it("describes periods in words", () => {
        expect(describePeriod(monthPeriod(2026, 9))).toBe("September 2026");
        expect(describePeriod(parsePeriod("q:2026-Q3")!)).toBe("Q3 2026");
        expect(describePeriod(parsePeriod("ytd:2026-09")!)).toBe("YTD 2026 (Jan – Sep)");
    });
});

describe("readFilters / writeFilters", () => {
    it("keeps only values that exist in the model's option lists", () => {
        const params = new URLSearchParams({
            period: "m:2026-09",
            country: "Costa Rica",
            customer: "Access Corporation  ",
            project: "PAR-401-01",
            l1: "BPO",
            l2: "BOS",
            l3: "POD1",
        });
        expect(readFilters(params, today, options)).toEqual({
            period: monthPeriod(2026, 9),
            org: { l1: "BPO", l2: "BOS", l3: "POD1" },
            country: "Costa Rica",
            customer: "Access Corporation  ",
            project: "PAR-401-01",
        });
    });

    it("drops unknown values, broken hierarchy paths and bad periods", () => {
        const params = new URLSearchParams({ period: "m:2026-13", country: "Narnia", customer: 'x" ) )', project: "NOPE", l1: "BPO", l2: "XXX", l3: "POD1" });
        expect(readFilters(params, today, options)).toEqual({ period: lastCompleteMonth(today), org: { l1: "BPO" } });
    });

    it("resolves only the period while options are loading", () => {
        const params = new URLSearchParams({ period: "q:2026-Q3", country: "Costa Rica" });
        expect(readFilters(params, today, null)).toEqual({ period: parsePeriod("q:2026-Q3"), org: {} });
    });

    it("round-trips state and removes 'All' keys", () => {
        const start = new URLSearchParams({ period: "m:2026-09", country: "Colombia", other: "keep" });
        const next = writeFilters(start, { period: parsePeriod("ytd:2026-09")!, org: {}, project: "PAR-401-01" });
        expect(next.get("period")).toBe("ytd:2026-09");
        expect(next.has("country")).toBe(false);
        expect(next.get("project")).toBe("PAR-401-01");
        expect(next.get("other")).toBe("keep");
        expect(readFilters(next, today, options).project).toBe("PAR-401-01");
    });
});

describe("DAX helper", () => {
    const all = new Set<FilterKey>(["period", "org", "country", "customer", "project"]);

    it("escapes string literals", () => {
        expect(daxString('A "quoted" name')).toBe('"A ""quoted"" name"');
        expect(daxString("\nNY Municipal Credit")).toBe('"\nNY Municipal Credit"');
    });

    it("builds the period as a dim_calendar[date] range", () => {
        expect(filterArgs({ period: monthPeriod(2026, 9), org: {} }, all)).toEqual([
            "KEEPFILTERS ( DATESBETWEEN ( dim_calendar[date], DATE ( 2026, 9, 1 ), DATE ( 2026, 9, 30 ) ) )",
        ]);
    });

    it("filters customer and project on both facts (open item #1) and country on hours", () => {
        const args = filterArgs({ period: monthPeriod(2026, 9), org: {}, country: "Costa Rica", customer: "Access Corporation  ", project: "PAR-401-01" }, all);
        expect(args).toContain('KEEPFILTERS ( TREATAS ( { "Costa Rica" }, fact_profitability_metrics[employee_country] ) )');
        expect(args).toContain('KEEPFILTERS ( TREATAS ( { "Access Corporation  " }, fact_profitability_metrics[project_customer] ) )');
        expect(args).toContain('KEEPFILTERS ( TREATAS ( { "Access Corporation  " }, fact_revenue_metrics[financial_customer] ) )');
        expect(args).toContain('KEEPFILTERS ( TREATAS ( { "PAR-401-01" }, fact_profitability_metrics[project_key] ) )');
        expect(args).toContain('KEEPFILTERS ( TREATAS ( { "PAR-401-01" }, fact_revenue_metrics[project_key] ) )');
        expect(args.join("\n")).not.toMatch(/dim_project/);
    });

    it("applies the master hierarchy level by level", () => {
        const args = filterArgs({ period: monthPeriod(2026, 9), org: { l1: "BPO", l2: "BOS" } }, new Set<FilterKey>(["org"]));
        expect(args).toEqual([
            'KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) )',
            'KEEPFILTERS ( TREATAS ( { "BOS" }, dim_hierarchy_master[L2] ) )',
        ]);
    });

    it("applies only the filters the page uses", () => {
        const args = filterArgs({ period: monthPeriod(2026, 9), org: { l1: "BPO" }, country: "Colombia" }, new Set<FilterKey>(["period"]));
        expect(args).toHaveLength(1);
    });

    it("inserts filter arguments at the marker", () => {
        const query = `EVALUATE\nSUMMARIZECOLUMNS (\n    ${FILTERS_PLACEHOLDER}\n    "Hours", [Synerion Hours_app]\n)`;
        expect(applyFilters(query, ["A", "B"])).toBe('EVALUATE\nSUMMARIZECOLUMNS (\n    A,\n    B,\n    \n    "Hours", [Synerion Hours_app]\n)');
        expect(applyFilters(query, [])).toBe('EVALUATE\nSUMMARIZECOLUMNS (\n    \n    "Hours", [Synerion Hours_app]\n)');
    });

    it("refuses queries without exactly one marker", () => {
        expect(() => applyFilters("EVALUATE ROW ( \"x\", 1 )", [])).toThrow(/exactly one/);
        expect(() => applyFilters(`${FILTERS_PLACEHOLDER} ${FILTERS_PLACEHOLDER}`, [])).toThrow(/exactly one/);
    });
});

describe("org-dependent option lists", () => {
    const query = `VAR _h = CALCULATETABLE ( DISTINCT ( t[c] ) ${ORG_OPTION_MARKERS.hours.marker} )
VAR _r = CALCULATETABLE ( DISTINCT ( u[c] ) ${ORG_OPTION_MARKERS.revenue.marker} )`;

    it("reads the org only along a valid L1 > L2 > L3 path", () => {
        expect(readOrg(new URLSearchParams({ l1: "BPO", l2: "BOS", l3: "POD1" }), options.org)).toEqual({ l1: "BPO", l2: "BOS", l3: "POD1" });
        expect(readOrg(new URLSearchParams({ l1: "BPO", l2: "MGMT" }), options.org)).toEqual({ l1: "BPO" });
        expect(readOrg(new URLSearchParams({ l2: "BOS" }), options.org)).toEqual({});
    });

    it("removes the markers when no org is selected", () => {
        expect(applyOrgToOptions(query, {})).toBe("VAR _h = CALCULATETABLE ( DISTINCT ( t[c] )  )\nVAR _r = CALCULATETABLE ( DISTINCT ( u[c] )  )");
    });

    it("filters hours on project org and revenue on financial org, level by level", () => {
        const out = applyOrgToOptions(query, { l1: "BPO", l2: "BOS" });
        expect(out).toContain('t[c] ) , KEEPFILTERS ( TREATAS ( { "BPO" }, fact_profitability_metrics[project_L1] ) ), KEEPFILTERS ( TREATAS ( { "BOS" }, fact_profitability_metrics[project_L2] ) ) )');
        expect(out).toContain('u[c] ) , KEEPFILTERS ( TREATAS ( { "BPO" }, fact_revenue_metrics[financial_L1] ) ), KEEPFILTERS ( TREATAS ( { "BOS" }, fact_revenue_metrics[financial_L2] ) ) )');
        expect(out).not.toMatch(/dim_hierarchy_master/);
    });

    it("escapes org values and refuses queries without both markers", () => {
        expect(applyOrgToOptions(query, { l1: 'A"B' })).toContain('{ "A""B" }');
        expect(() => applyOrgToOptions("EVALUATE x", {})).toThrow(/exactly one/);
    });
});

describe("customer-dependent project list", () => {
    const query = `A ${CUSTOMER_OPTION_MARKERS.hours.marker} B ${CUSTOMER_OPTION_MARKERS.revenue.marker} C`;

    it("removes the markers without a customer", () => {
        expect(applyCustomerToOptions(query, undefined)).toBe("A  B  C");
    });

    it("filters hours on project_customer and revenue on financial_customer, escaped", () => {
        expect(applyCustomerToOptions(query, 'Walk-On"s')).toBe(
            'A , KEEPFILTERS ( TREATAS ( { "Walk-On""s" }, fact_profitability_metrics[project_customer] ) ) B , KEEPFILTERS ( TREATAS ( { "Walk-On""s" }, fact_revenue_metrics[financial_customer] ) ) C',
        );
    });

    it("refuses queries without both markers", () => {
        expect(() => applyCustomerToOptions("EVALUATE x", "A")).toThrow(/exactly one/);
    });
});
