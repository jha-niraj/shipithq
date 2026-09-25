import {
    getTeamMembers, getPendingInvites, getTeamStats
} from "@/actions/team"
import { listCompanyRoles } from "@/actions/team/company-roles.action"
import { TeamContent } from "./team-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Team | ShipItHQ Hiring",
    description: "Manage your hiring team"
}

export default async function TeamPage() {
    const [membersResult, invitesResult, statsResult, rolesResult] = await Promise.all([
        getTeamMembers(),
        getPendingInvites(),
        getTeamStats(),
        listCompanyRoles(),
    ])

    const members = membersResult.success && membersResult.data ? membersResult.data : []
    const pendingInvites = invitesResult.success && invitesResult.data ? invitesResult.data : []
    const stats = statsResult.success && statsResult.data ? statsResult.data : null
    const roles = rolesResult.success ? rolesResult.data : null

    return (
        <TeamContent
            initialMembers={members}
            initialInvites={pendingInvites}
            stats={stats}
            // From the viewer's company role (plan/hiring-app HA-6): who may
            // invite, remove and re-role members, and whether they may touch Owners.
            canManageTeam={roles?.canManageTeam ?? false}
            viewerIsOwner={roles?.isOwner ?? false}
            roles={(roles?.roles ?? []).map((r) => ({ id: r.id, name: r.name, isOwner: r.isOwner }))}
        />
    )
}
