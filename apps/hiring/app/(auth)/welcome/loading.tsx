// Full-page transition between onboarding and the workspace: the branded loader
// (CLAUDE.md, loading states by size), as on /onboarding.
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";

export default function Loading() {
    return <ShipItHQLoader label="Just a moment" />;
}
