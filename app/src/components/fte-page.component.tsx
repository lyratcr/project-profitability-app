import { useMemo, type ReactElement } from "react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { describeFilterContext } from "@/lib/filter-context";
import {
    dateRangeArg,
    describeMonthComparison,
    describePeriod,
    filterArgs,
    monthWindow,
    TREND_MONTHS,
    type FilterKey,
    type FilterOptions,
    type FilterState,
} from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import {
    FTE_TOP_CUSTOMERS,
    fteByCustomer,
    fteByCustomerColumns,
    fteByProjectOrgMonth,
    fteByProjectOrgMonthColumns,
    fteKpiColumns,
    fteKpis,
    ftePeople,

} from "@/queries/fte";
import { AxCard } from "./ax/ax-card.component";
import { AxKpiCard } from "./ax/ax-kpi-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { QueryStates } from "./query-states.component";
import { ReportTable } from "./report-table.component";

interface FtePageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
}

const CUSTOMER_SPEC: MatrixSpec = {
    levels: [fteByCustomerColumns.customer, fteByCustomerColumns.project],
    flags: [fteByCustomerColumns.isCustomerTotal, fteByCustomerColumns.isProjectTotal],
    values: [
        { raw: fteByCustomerColumns.fte, header: "FTE" },
        { raw: fteByCustomerColumns.headcount, header: "People" },
    ],
    blankLabel: "(none)",
};
const CUSTOMER_FORMATS = ["#,0.0", "#,0"] as const;

const MONTH_SPEC: MatrixSpec = {
    levels: [fteByProjectOrgMonthColumns.l1, fteByProjectOrgMonthColumns.l2, fteByProjectOrgMonthColumns.l3],
    flags: [fteByProjectOrgMonthColumns.isL1Total, fteByProjectOrgMonthColumns.isL2Total, fteByProjectOrgMonthColumns.isL3Total],
    value: fteByProjectOrgMonthColumns.fte,
    pivot: fteByProjectOrgMonthColumns.month,
    pivotSort: fteByProjectOrgMonthColumns.monthNumber,
    blankLabel: "(no org)",
};

/**
 * P3 FTE Overview (build plan 3.3, docs/05_app_design.md § 3): how the people are allocated. Allocation FTE
 * (open item #6, closed): a person counts 1, split across projects by their share of the week's hours, in the
 * last Sunday–Saturday week with hours in the period. The org filter maps to the employee org.
 */
export function FtePage({ page, filters, options }: FtePageProps): ReactElement {
    const applies = useMemo(() => new Set<FilterKey>(page.filters), [page.filters]);
    // Wait for the filter lists, so unvalidated org, customer and project filters never reach a query.
    const ready = options !== null;
    // People detail only with a customer or a project selected (Ion, 2026-11-04).
    const peopleScope = filters.project !== undefined || filters.customer !== undefined;

    const args = useMemo(() => filterArgs(filters, applies), [filters, applies]);
    const months = useMemo(() => {
        const window = monthWindow(filters.period.end);
        const rest = filterArgs(filters, new Set([...applies].filter((k) => k !== "period")));
        return { window, args: [dateRangeArg(window.start, window.end), ...rest] };
    }, [filters, applies]);

    const kpis = fteKpis({ filters: args });
    const byCustomer = fteByCustomer({ filters: args });
    const byMonth = fteByProjectOrgMonth({ filters: months.args });
    const people = ftePeople({ filters: args });

    const kpiResult = useSemanticModelQuery({ connection: kpis.connection, query: ready ? kpis.query : "" });
    const customerResult = useSemanticModelQuery({ connection: byCustomer.connection, query: ready ? byCustomer.query : "" });
    const monthResult = useSemanticModelQuery({ connection: byMonth.connection, query: ready ? byMonth.query : "" });
    const peopleResult = useSemanticModelQuery({ connection: people.connection, query: ready && peopleScope ? people.query : "" });

    const context = describeFilterContext(page, filters, options);
    const periodText = describePeriod(filters.period);
    const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
    const selection = filters.project
        ? (options?.projects.find((p) => p.key === filters.project)?.name ?? filters.project)
        : filters.customer?.trim();

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <AxPageHeader
                title={page.title}
                purpose={page.purpose}
                context={context}
                notes={[
                    "Allocation FTE: each person counts 1, split across projects by their share of the week's hours, in the last Sunday–Saturday week with hours. Organization filters use the employee's home org.",
                ]}
            />

            {/* KPI row: allocated FTE is the hero (spotlight); headcount is the comparison. */}
            <QueryStates result={kpiResult} shape="kpi" title="Allocated FTE">
                {(table) => (
                    <div className="grid grid-cols-1 gap-grid sm:grid-cols-2">
                        <AxKpiCard
                            variant="spotlight"
                            label={`Allocated FTE · last week · ${periodText}`}
                            value={numberCell(table, fteKpiColumns.fte)}
                            format="#,0.0"
                            change={{ value: numberCell(table, fteKpiColumns.fteMoM), format: "0.0%", comparedTo: describeMonthComparison(filters.period) }}
                            favorable="neither"
                        />
                        <AxKpiCard label="Headcount" value={numberCell(table, fteKpiColumns.headcount)} format="#,0" note="People who logged time that week" />
                    </div>
                )}
            </QueryStates>

            <AxCard title="FTE by customer and project" subtitle={`${periodText} · top ${FTE_TOP_CUSTOMERS} customers by FTE · FTE and people`}>
                <QueryStates result={customerResult} shape="table" title="FTE by customer and project">
                    {(table) => (
                        <HierarchyMatrix
                            chromeless
                            table={table}
                            spec={CUSTOMER_SPEC}
                            rowHeader="Customer › project"
                            format={CUSTOMER_FORMATS}
                            title="FTE by customer and project"
                        />
                    )}
                </QueryStates>
                <p className="caption m-0 mt-3 text-muted-foreground">
                    People = who logged time there; someone split across projects counts in each but adds less than 1 FTE.
                </p>
            </AxCard>

            <AxCard
                title="FTE by project org and month"
                subtitle={`Where the work is billed · last ${TREND_MONTHS} months · ${monthLabel.format(months.window.start)} – ${monthLabel.format(months.window.end)} · each month's last week with hours`}
            >
                <QueryStates result={monthResult} shape="table" title="FTE by project org and month">
                    {(table) => (
                        <HierarchyMatrix
                            chromeless
                            table={table}
                            spec={MONTH_SPEC}
                            rowHeader="Project org"
                            format="#,0.0"
                            valueWidth={120}
                            title="FTE by project org and month"
                            expandFirstLevel
                        />
                    )}
                </QueryStates>
            </AxCard>

            <AxCard
                title={peopleScope ? `People on ${selection ?? "the selection"}` : "People"}
                subtitle={
                    peopleScope
                        ? `${periodText} · most hours first · time allocation = share of all the person's hours in the period · FTE = last week with hours`
                        : "Who works on a customer or project, and how much of their time it takes"
                }
            >
                {peopleScope ? (
                    <QueryStates result={peopleResult} shape="table" title="People" emptyMessage="Nobody logged time on this selection in the period.">
                        {(table) => (
                            <ReportTable chromeless table={table} columnMetadata={people.columnMetadata} title={`People on ${selection ?? "the selection"}`} />
                        )}
                    </QueryStates>
                ) : (
                    <p className="body m-0 text-muted-foreground">Select a customer or a project in the filters to see the people.</p>
                )}
            </AxCard>
        </section>
    );
}
