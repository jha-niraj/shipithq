'use client'

import { DockedRail } from '@repo/ui/components/shell/docked-rail'
import { AIPanel } from '@/components/ai/ai-panel'
import { useAIPanelStore, AI_MIN_WIDTH, AI_MAX_WIDTH } from '@/app/store/aiPanelStore'

/*
 * The ShipItHQ AI rail: the shared `DockedRail` (packages/ui, plan/hiring-app
 * HA-1) with this app's store and panel. Render it as the LAST child of the
 * flex row that holds the page, so the page narrows to make room.
 */
export function AiRail() {
    const { isOpen, close, width, setWidth, isMaximized } = useAIPanelStore()
    return (
        <DockedRail
            open={isOpen}
            onClose={close}
            width={width}
            onWidthChange={setWidth}
            minWidth={AI_MIN_WIDTH}
            maxWidth={AI_MAX_WIDTH}
            maximized={isMaximized}
            title="ShipItHQ AI"
        >
            <AIPanel />
        </DockedRail>
    )
}
