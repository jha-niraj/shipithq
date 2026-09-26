import { listRolesWithSends } from "@/actions/sends"
import { RolesContent } from "./roles-content"

export const dynamic = "force-dynamic"

/** Every role and the results it has received (plan/hiring-rounds HR-18). */
export default async function ApplicationsPage() {
    const r = await listRolesWithSends()
    if (!r.success) return <p className="p-8 text-sm text-neutral-700 dark:text-neutral-300">{r.error}</p>
    return <RolesContent roles={r.data} />
}
