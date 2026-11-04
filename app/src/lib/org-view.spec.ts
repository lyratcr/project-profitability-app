import { describe, expect, it } from "vitest";
import { applyOrgView, readOrgView, writeOrgView } from "./org-view";

describe("org view", () => {
    it("defaults to project org and only accepts 'employee' otherwise", () => {
        expect(readOrgView(new URLSearchParams(""))).toBe("project");
        expect(readOrgView(new URLSearchParams("view=employee"))).toBe("employee");
        expect(readOrgView(new URLSearchParams("view=EMPLOYEE"))).toBe("project");
        expect(readOrgView(new URLSearchParams("view=x"))).toBe("project");
    });

    it("keeps the default out of the URL and leaves other params alone", () => {
        const params = new URLSearchParams("period=m:2026-10&l1=BPO");
        expect(writeOrgView(params, "employee").toString()).toBe("period=m%3A2026-10&l1=BPO&view=employee");
        expect(writeOrgView(new URLSearchParams("l1=BPO&view=employee"), "project").toString()).toBe("l1=BPO");
    });

    it("swaps the measure tokens for the view's org-aware measures", () => {
        const dax = '"Hours", [@Hours], "MoM", [@HoursMoM], "P", [@ProductiveShare], "H2", CALCULATE ( [@Hours] )';
        expect(applyOrgView(dax, "project")).toBe(
            '"Hours", [Synerion Hours (Project Org)_app], "MoM", [Synerion Hours (Project Org) MoM %_app], "P", [Productive Share (Project Org)_app], "H2", CALCULATE ( [Synerion Hours (Project Org)_app] )',
        );
        expect(applyOrgView(dax, "employee")).toContain("[Synerion Hours (Employee Org) MoM %_app]");
        expect(applyOrgView(dax, "employee")).not.toContain("Project Org");
    });

    it("rejects unknown tokens", () => {
        expect(() => applyOrgView("[@Revenue]", "project")).toThrow(/Unknown org-view measure token \[@Revenue\]/);
    });
});
