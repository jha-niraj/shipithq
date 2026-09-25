// Full-page transition: there is no content shape to preview here, so the branded
// whole-page loader is the honest fallback (CLAUDE.md, loading states by size).
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";

export default function Loading() {
    return <ShipItHQLoader label="Just a moment" />;
}
