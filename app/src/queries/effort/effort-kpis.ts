import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { buildEffortQuery, EFFORT_CONNECTION, type EffortParams } from "./effort-params";
import kpisQuery from "./effort-kpis.dax?raw";

// P1 KPI cards.

export const kpiColumns = {
    hours: "[Hours]",
    hoursMoM: "[HoursMoM]",
    productiveShare: "[ProductiveShare]",
    overtime: "[Overtime]",
    timeOffHoliday: "[TimeOffHoliday]",
} as const;

const kpiMetadata: ColumnMetadataMap = {
    [kpiColumns.hours]: { name: "Hours", displayName: "Synerion hours", format: "#,0" },
    [kpiColumns.hoursMoM]: { name: "HoursMoM", displayName: "Hours vs previous month", format: "0.0%" },
    [kpiColumns.productiveShare]: { name: "ProductiveShare", displayName: "Productive share", format: "0.0%" },
    [kpiColumns.overtime]: { name: "Overtime", displayName: "Overtime hours", format: "#,0" },
    [kpiColumns.timeOffHoliday]: { name: "TimeOffHoliday", displayName: "Time off + holiday", format: "#,0" },
};

export function effortKpis(params: EffortParams = {}) {
    return { connection: EFFORT_CONNECTION, query: buildEffortQuery(kpisQuery, params), columnMetadata: kpiMetadata } as const;
}
