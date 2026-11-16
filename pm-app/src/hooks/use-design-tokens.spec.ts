import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDesignTokens } from "./use-design-tokens";

describe("useDesignTokens", () => {
    afterEach(() => {
        document.documentElement.style.removeProperty("--ink");
        document.documentElement.removeAttribute("data-theme");
    });

    it("reads the tokens again when the theme attribute on <html> changes", async () => {
        document.documentElement.style.setProperty("--ink", "#272425");
        const { result } = renderHook(() => useDesignTokens(["ink"]));
        expect(result.current).toEqual(["#272425"]);

        act(() => {
            // What the theme hook does after render: the token value changes with the attribute.
            document.documentElement.style.setProperty("--ink", "#f4f1ee");
            document.documentElement.setAttribute("data-theme", "dark");
        });
        await waitFor(() => expect(result.current).toEqual(["#f4f1ee"]));
    });

    it("is null while a token is missing", () => {
        const { result } = renderHook(() => useDesignTokens(["not-a-token"]));
        expect(result.current).toBeNull();
    });
});
