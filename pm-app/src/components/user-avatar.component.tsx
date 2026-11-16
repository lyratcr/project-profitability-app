import { useContext, type ReactElement } from "react";
import { User } from "lucide-react";
import { AuthContext } from "@/hooks/auth.context";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { initials } from "@/lib/initials";
import { cell } from "@/lib/query-table";
import { userProfile, userProfileColumns } from "@/queries/shell";

/**
 * Signed-in user, top right of the PM app header (Ion, 2026-11-16, option A): the Auxis `ax-avatar` circle with the
 * user's initials, and their name and UKG job title next to it (gold.app_user_profile, filtered to the viewer's own
 * row). The Teams photo replaces the initials once the photos reach Fabric (Alejandro). While the profile loads, or
 * when a user has none, the circle shows a person icon and the email.
 */
export function UserAvatar(): ReactElement | null {
    // Read the context directly so the header still renders where there is no AuthProvider (tests, previews).
    const email = useContext(AuthContext)?.session?.user?.email ?? null;
    const config = userProfile();
    const { data } = useSemanticModelQuery({ connection: config.connection, query: email ? config.query : "" });
    if (!email) return null;

    const table = data?.status === "success" && data.table.rows.length > 0 ? data.table : null;
    const name = table ? cell(table, userProfileColumns.displayName) : null;
    const title = table ? cell(table, userProfileColumns.jobTitle) : null;
    const displayName = typeof name === "string" && name.trim() !== "" ? name.trim() : null;
    const jobTitle = typeof title === "string" && title.trim() !== "" ? title.trim() : null;

    return (
        <div className="flex items-center gap-2" title={email}>
            <span className="hidden max-w-[240px] text-right leading-tight md:block">
                <span className="block truncate text-300 font-semibold text-[var(--ink)]">{displayName ?? email}</span>
                {jobTitle && <span className="block truncate text-200 text-muted-foreground">{jobTitle}</span>}
            </span>
            <span className="ax-avatar ax-user-avatar" role="img" aria-label={`Signed in as ${displayName ?? email}`}>
                {displayName ? initials(displayName) : <User className="icon-size-200" aria-hidden="true" />}
            </span>
        </div>
    );
}
