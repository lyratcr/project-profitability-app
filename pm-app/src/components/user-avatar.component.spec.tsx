import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OpaqueSession } from "@microsoft/rayfin-auth";
import { AuthContext, type AuthContextValue } from "@/hooks/auth.context";
import { initials } from "@/lib/initials";
import { UserAvatar } from "./user-avatar.component";

const hook = vi.hoisted(() => ({ result: undefined as unknown, queries: [] as string[] }));
vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: (q: { query: string }) => {
        hook.queries.push(q.query);
        return hook.result;
    },
}));

const auth = (email: string | null): AuthContextValue => ({
    session: (email ? { isAuthenticated: true, isAnonymous: false, user: { id: "1", email } } : null) as unknown as OpaqueSession | null,
    isAuthenticated: email !== null,
    isLoading: false,
    error: null,
    signIn: () => {},
    isSigningIn: false,
    signInError: null,
});

// Column shape of user-profile.dax on the published model (2026-11-16).
const profile = (rows: unknown[][]) => ({
    data: { status: "success", table: { columns: [{ name: "[Display Name]" }, { name: "[Job Title]" }], rows } },
    isLoading: false,
});

describe("UserAvatar", () => {
    beforeEach(() => {
        hook.result = { data: undefined, isLoading: true };
        hook.queries = [];
    });

    it("shows the user's initials, name and job title from the model", () => {
        hook.result = profile([["Iliak Herrera", "Program Manager Sr."]]);
        render(
            <AuthContext.Provider value={auth("iherrera@auxis.com")}>
                <UserAvatar />
            </AuthContext.Provider>,
        );
        expect(screen.getByRole("img", { name: "Signed in as Iliak Herrera" })).toHaveTextContent("IH");
        expect(screen.getByText("Iliak Herrera")).toBeInTheDocument();
        expect(screen.getByText("Program Manager Sr.")).toBeInTheDocument();
    });

    it("falls back to the email and a person icon while loading or without a profile", () => {
        hook.result = profile([]);
        render(
            <AuthContext.Provider value={auth("fcalderon2@auxis.com")}>
                <UserAvatar />
            </AuthContext.Provider>,
        );
        expect(screen.getByRole("img", { name: "Signed in as fcalderon2@auxis.com" })).toBeInTheDocument();
        expect(screen.getByText("fcalderon2@auxis.com")).toBeInTheDocument();
    });

    it("renders nothing and runs no query without a session", () => {
        const { container } = render(<UserAvatar />);
        expect(container).toBeEmptyDOMElement();
        expect(hook.queries.every((q) => q === "")).toBe(true);
    });

    it("builds initials from the first two words", () => {
        expect(initials("Adan Rivera")).toBe("AR");
        expect(initials("  Ion  San Lee ")).toBe("IS");
    });
});
