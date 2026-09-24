"use client"

import { Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"

/*
 * The Explore header's "New project", built on the client side of the
 * boundary. Rendered from the (server) ExploreShell with a server-made
 * `trigger` element, the sheet's trigger hydrated as a mismatch on every
 * Explore load; the projects hub, which builds the same sheet in a client
 * component, never did (found 2026-09-24).
 */
export function NewProjectButton() {
    return (
        <ProjectGenerateSheet
            trigger={
                <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden />
                    New project
                </Button>
            }
        />
    )
}
