// The profile surface that more than one route needs.
//
// `/profile` is the editor (`app/(main)/profile/_components/ProfileClient.tsx` and
// `profile-editor/`), `/profile/<username>` is the public one-pager
// (`app/(public)/profile/[username]/`); the sheets are in `./sheets/`. The shared
// `ProfileView` both routes once rendered, its skeleton, the old add-* sheets and
// the edit-profile modal were deleted on 2026-09-25 (plan/profile PRF-15, approved
// by Niraj) - recoverable from git history. An older tabbed generation went on
// 2026-08-27 (plan/cleanup/candidates.md, Group E).

export { ShareProfileModal } from "./modals/share-profile-modal";
