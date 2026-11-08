import { useEffect, useState } from "react";
import { readTokens } from "@/lib/design-tokens";

/**
 * Design-system token values (lib/design-tokens.ts), read again whenever the theme on <html> changes. The theme
 * hook sets `data-theme` in an effect after render, so reading during render would return the previous theme's
 * values; a MutationObserver on the attribute catches the change once it lands. Null until the tokens resolve.
 */
export function useDesignTokens(names: readonly string[]): string[] | null {
    const key = names.join(",");
    const [values, setValues] = useState<string[] | null>(() => readTokens(names));

    useEffect(() => {
        const list = key.split(",");
        const read = () =>
            setValues((prev) => {
                const next = readTokens(list);
                return prev && next && prev.join() === next.join() ? prev : next;
            });
        read();
        if (typeof MutationObserver === "undefined") return;
        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
        return () => observer.disconnect();
    }, [key]);

    return values;
}
