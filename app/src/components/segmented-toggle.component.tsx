import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

interface SegmentedToggleProps<T extends string> {
    /** Visible label above the buttons; also the radiogroup's accessible name. */
    label: string;
    options: readonly { value: T; label: string; hint?: string }[];
    value: T;
    onChange: (value: T) => void;
}

/** A small radio group drawn as joined buttons (page-level view switches: org view, flow analysis). */
export function SegmentedToggle<T extends string>({ label, options, value, onChange }: SegmentedToggleProps<T>): ReactElement {
    return (
        <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
            <span className="text-200 leading-200 text-muted-foreground">{label}</span>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={value === o.value}
                        title={o.hint}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            "rounded-sm px-3 py-1 text-200 focus-visible:outline-2 focus-visible:outline-ring",
                            value === o.value ? "bg-brand text-on-brand" : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
