import query from "./user-profile.dax?raw";

/** Raw output column names of user-profile.dax. */
export const userProfileColumns = {
    displayName: "[Display Name]",
    jobTitle: "[Job Title]",
} as const;

/** Header: the signed-in user's name and job title (one row, or none when the user has no profile). */
export function userProfile() {
    return { connection: "profitmodel", query } as const;
}
