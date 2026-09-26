"use client"

import { DockedRail } from "@repo/ui/components/shell/docked-rail"
import { AI_MAX_WIDTH, AI_MIN_WIDTH } from "@repo/ui/components/ai-chat/store"
import { HiringAIPanel } from "./hiring-ai-panel"
import { useHiringAIStore } from "./hiring-ai-store"

/*
 * The company AI rail (plan/hiring-app HA-11): the shared `DockedRail` with this
 * app's store and panel, the same placement as the student app's. The shell
 * renders it only for members with "use AI".
 */
export function HiringAIRail() {
    const { isOpen, close, width, setWidth, isMaximized } = useHiringAIStore()
    return (
        <DockedRail
            open={isOpen}
            onClose={close}
            width={width}
            onWidthChange={setWidth}
            minWidth={AI_MIN_WIDTH}
            maxWidth={AI_MAX_WIDTH}
            maximized={isMaximized}
            title="Company AI"
        >
            <HiringAIPanel />
        </DockedRail>
    )
}

export default HiringAIRail
