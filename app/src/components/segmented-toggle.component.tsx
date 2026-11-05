import type { ReactElement } from "react";

interface SegmentedToggleProps<T extends string> {
    /** Visible label above the buttons; also the radiogroup's accessible name. */
    label: string;
    options: readonly { value: T; label: string; hint?: string }[];
    value: T;
    onChange: (value: T) => void;
}

/** A small radio group drawn as Auxis chips (page-level view switches: org view, flow analysis). */
export function SegmentedToggle<T extends string>({ label, options, value, onChange }: SegmentedToggleProps<T>): ReactElement {
    // Auxis chip slicer (design-system/components/Slicer): `.ax-label` over `.ax-chip` buttons; the pressed chip
    // takes the accent fill.
    return (
        <div role="radiogroup" aria-label={label} className="ax-slicer">
            <span className="ax-label">{label}</span>
            <div className="ax-chips">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={value === o.value}
                        aria-pressed={value === o.value}
                        title={o.hint}
                        onClick={() => onChange(o.value)}
                        className="ax-chip"
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
