// /invite is a whole-page wait (the route and then the invitation lookup), so
// the branded loader rather than a skeleton - the same one its Suspense
// fallback shows, so nothing swaps between the two.
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";

export default function Loading() {
    return <ShipItHQLoader />;
}
