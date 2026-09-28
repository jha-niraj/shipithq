'use client'

import { DockedRail } from '@repo/ui/components/shell/docked-rail'
import { AIPanel } from '@/components/ai/ai-panel'
import { useAIPanelStore, AI_MIN_WIDTH, AI_MAX_WIDTH } from '@/app/store/aiPanelStore'
import { useLead } from '@/components/incidents/lead/store'
import { LeadPanel } from '@/components/incidents/lead/lead-panel'

/*
 * The ShipItHQ AI rail: the shared `DockedRail` (packages/ui, plan/hiring-app
 * HA-1) with this app's store and panel. Render it as the LAST child of the
 * flex row that holds the page, so the page narrows to make room.
 *
 * On an incident case the rail is the incident lead (plan/incidents INC-48).
 * Everywhere else it is ShipItHQ AI.
 */
export function AiRail() {
    const { isOpen, close, width, setWidth, isMaximized } = useAIPanelStore()
    const onCase = useLead((s) => s.caseSlug !== null)
    return (
        <DockedRail
            open={isOpen}
            onClose={close}
            width={width}
            onWidthChange={setWidth}
            minWidth={AI_MIN_WIDTH}
            maxWidth={AI_MAX_WIDTH}
            maximized={isMaximized}
            title={onCase ? 'The incident lead' : 'Harbor'}
        >
            {/* On a case the rail is the incident lead alone (Niraj, 2026-09-27: no second
                chat, no tab bar). Everywhere else it is Harbor. */}
            {onCase ? <LeadPanel /> : <AIPanel />}
        </DockedRail>
    )
}

