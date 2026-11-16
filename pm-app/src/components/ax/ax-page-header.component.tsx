import type { ReactElement, ReactNode } from "react";

interface AxPageHeaderProps {
    title: string;
    /** What the page answers. */
    purpose: string;
    /** Filter context in words ("October 2026 · BPO · All countries"). */
    context?: string;
    /** Short definitions the reader needs (what a number counts), one line each. */
    notes?: readonly string[];
    /** Right side: a page-level slicer (chips). */
    aside?: ReactNode;
}

/** Auxis page head: `display-xl` title, muted purpose, filter context and notes, optional slicer on the right. */
export function AxPageHeader({ title, purpose, context, notes = [], aside }: AxPageHeaderProps): ReactElement {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 id="page-title" className="display-xl m-0">
                    {title}
                </h1>
                <p className="body m-0 mt-1 text-muted-foreground">{purpose}</p>
                {context !== undefined && context !== "" && <p className="body-sm m-0 mt-1 text-muted-foreground">{context}</p>}
                {notes.map((n) => (
                    <p key={n} className="body-sm m-0 mt-1 text-muted-foreground">
                        {n}
                    </p>
                ))}
            </div>
            {aside}
        </header>
    );
}
