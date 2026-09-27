/**
 * Profile Actions Module
 * 
 * Re-exports all profile-related server actions.
 * 
 * Usage:
 * import { getUserProfile, updateUserProfile } from "@/actions/profile"
 */

export {
    getUserProfile,
    getCurrentMember,
    getCompanyDetails,
    updateUserProfile,
    changePassword,
} from "./profile.action"
