// Full-page transition into the onboarding frame (plan/auth AUTH-14), as main's onboarding does.
import { FullScreenLoader } from "@repo/ui/components/full-screen-loader";

export default function Loading() {
    return <FullScreenLoader label="Just a moment" />;
}
