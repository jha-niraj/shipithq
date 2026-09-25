"use client"

// The shell's sidebar state is shared with apps/hiring (plan/hiring-app HA-1).
// Re-exported, not copied: two copies would be two React contexts, and a
// component reading one would never see the other's pin state.
export { SidebarProvider, useSidebar } from "@repo/ui/components/shell/sidebar-provider"
