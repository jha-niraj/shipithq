import { listCompanyRoles } from "@/actions/team/company-roles.action"
import { RolesEditor } from "./_components/roles-editor"

// Roles (plan/hiring-app HA-7): the company's own roles and what each may do.
// Replaces the old page, which edited a per-member permissions list that no
// action ever checked.
export default async function RolesPage() {
    const result = await listCompanyRoles()
    if (!result.success) {
        return (
            <div className="page-frame px-page py-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{result.error}</p>
            </div>
        )
    }
    return <RolesEditor data={result.data} />
}
