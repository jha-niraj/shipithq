/**
 * Field lengths for the Edit Profile sheet (plan/profile PRF-10). The sheet shows
 * them as counters and `saveProfileDetails` enforces them - one definition, because
 * a `"use server"` file may only export async functions.
 */
export const PROFILE_LIMITS = { name: 80, headline: 100, bio: 500, short: 120 } as const
