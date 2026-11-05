import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AxCardProps {
    /** Says what the visual answers ("Hours by organization"); sentence case. */
    title: string;
    /** Period and unit, or how to read the visual. */
    subtitle?: string;
    /** Right side of the head: a legend or a small control. */
    aside?: ReactNode;
    /** Grid placement only (spans); the card surface comes from `.ax-card`. */
    className?: string;
    children: ReactNode;
}

/**
 * Auxis ChartCard / DataTable frame (design-system/components/ChartCard): `section.ax-card` with the
 * `.ax-card-head` title and subtitle. Visuals inside render `chromeless`, so this is their only frame.
 */
export function AxCard({ title, subtitle, aside, className, children }: AxCardProps): ReactElement {
    return (
        <section className={cn("ax-card min-w-0", className)}>
            <div className="ax-card-head">
                <div className="min-w-0">
                    <h3 className="ax-card-title">{title}</h3>
                    {subtitle !== undefined && <p className="ax-card-sub">{subtitle}</p>}
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}
