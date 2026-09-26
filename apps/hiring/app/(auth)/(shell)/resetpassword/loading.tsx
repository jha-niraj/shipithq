// Inside the auth shell, so only the form column waits: a skeleton of the form
// (plan/auth), while the photo panel beside it stays put.
import { AuthFormSkeleton } from "@repo/ui/components/auth/auth-form";

export default function Loading() {
    return <AuthFormSkeleton fields={3} />;
}
