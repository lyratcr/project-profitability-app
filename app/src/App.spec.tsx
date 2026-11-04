import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { VisualTheme } from "@microsoft/fabric-visuals-core";
import App from "@/App";
import { ThemeContext } from "@/hooks/theme.context";

vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: () => ({ data: undefined, isLoading: true, error: undefined, refetch: async () => {} }),
}));

function renderApp() {
    return render(
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {}, theme: {} as VisualTheme }}>
            <App />
        </ThemeContext.Provider>,
    );
}

describe("App", () => {
    it("renders without throwing", () => {
        expect(() => renderApp()).not.toThrow();
    });

    it("mounts content into the document", () => {
        renderApp();
        expect(document.body).not.toBeEmptyDOMElement();
    });
});
