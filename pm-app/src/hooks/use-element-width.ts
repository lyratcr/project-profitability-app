import { useEffect, useRef, useState, type RefObject } from "react";

/** Width of an element, for an SVG drawn in pixels (legible text at any width). */
export function useElementWidth(initial = 640, min = 280): [RefObject<HTMLDivElement | null>, number] {
    const ref = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(initial);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(min, Math.round(entry.contentRect.width))));
        observer.observe(el);
        return () => observer.disconnect();
    }, [min]);
    return [ref, width];
}
