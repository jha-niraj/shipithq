// The exact skeleton the editor renders while its data resolves, so the route
// transition and the client's own loading state are the same picture (PRF-14).
import { ProfileEditorSkeleton } from "./_components/profile-editor/skeleton";

export default function Loading() {
    return <ProfileEditorSkeleton />;
}
