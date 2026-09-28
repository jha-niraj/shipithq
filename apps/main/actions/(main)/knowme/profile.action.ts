"use server";

/**
 * KnowMe Profile Server Actions
 *
 * Handles profile creation, retrieval, and management
 */

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    knowMeProfiles,
    knowMePrivacySettings,
    knowMeEmbeddingJobs,
    knowMeEmbeddings,
    users,
} from "@repo/db";
import { count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordActivity, activityKey } from "@repo/db/activity";
import type {
	KnowMeProfileBasic,
	KnowMeProfileFull,
	KnowMeProfilePublic,
	KnowMeActionResponse
} from "@/types/knowme";
import {
	generateApiKey,
	calculateNextUpdate,
	deleteNamespace
} from "@/utils/knowme";

// ============================================
// GET PROFILE ACTIONS
// ============================================

/**
 * Get current user's KnowMe profile
 */
export async function getMyKnowMeProfile(): Promise<
	KnowMeActionResponse<KnowMeProfileFull>
> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
			with: {
				user: {
					columns: {
						id: true,
						username: true,
						name: true,
						image: true,
						bio: true,
						occupation: true,
					},
				},
				personalData: {
					where: (pd, { eq }) => eq(pd.isActive, true),
					orderBy: (pd, { desc }) => [desc(pd.createdAt)],
				},
				platformConnections: {
					orderBy: (pc, { desc }) => [desc(pc.createdAt)],
				},
				privacySettings: true,
			},
		});

		if (!profile) {
			return { success: false, error: "Profile not found" };
		}

		// Two facts the profile row does not carry, and the dashboard cannot be
		// honest without: WHY the status is what it is, and whether anything is
		// actually indexed. Both are cheap single-row reads and are fetched
		// together so the page makes one round trip rather than two. See KM-9.
		const [lastJobRow, indexedRows] = await Promise.all([
			db.query.knowMeEmbeddingJobs.findFirst({
				where: eq(knowMeEmbeddingJobs.profileId, profile.id),
				orderBy: [desc(knowMeEmbeddingJobs.createdAt)],
			}),
			db
				.select({ n: count() })
				.from(knowMeEmbeddings)
				.where(eq(knowMeEmbeddings.profileId, profile.id)),
		]);

		return {
			success: true,
			data: {
				id: profile.id,
				userId: profile.userId,
				status: profile.status,
				privacy: profile.privacy,
				isPublic: profile.isPublic,
				includePersonalData: profile.includePersonalData,
				includePlatformData: profile.includePlatformData,
				includeProjects: profile.includeProjects,
				includeAssessments: profile.includeAssessments,
				updateCycleDays: profile.updateCycleDays,
				lastUpdatedAt: profile.lastUpdatedAt,
				nextScheduledUpdate: profile.nextScheduledUpdate,
				totalQuestionsAnswered: profile.totalQuestionsAnswered,
				totalSessions: profile.totalSessions,
				totalVisitors: profile.totalVisitors,
				apiEnabled: profile.apiEnabled,
				apiRateLimit: profile.apiRateLimit,
				onboardingStep: profile.onboardingStep,
				onboardingCompleted: profile.onboardingCompleted,
				createdAt: profile.createdAt,
				updatedAt: profile.updatedAt,
				user: profile.user,
				personalData: profile.personalData.map((pd) => ({
					id: pd.id,
					dataType: pd.dataType,
					title: pd.title,
					fileName: pd.fileName,
					fileUrl: pd.fileUrl,
					fileSize: pd.fileSize,
					isActive: pd.isActive,
					isIndexed: pd.isIndexed,
					createdAt: pd.createdAt,
					updatedAt: pd.updatedAt,
				})),
				platformConnections: profile.platformConnections.map((pc) => ({
					id: pc.id,
					platform: pc.platform,
					platformUsername: pc.platformUsername,
					profileUrl: pc.profileUrl,
					connectionStatus: pc.connectionStatus,
					isConnected: pc.isConnected,
					lastSyncedAt: pc.lastSyncedAt,
					nextSyncAt: pc.nextSyncAt,
					metadata: pc.metadata as Record<string, unknown> | null,
					createdAt: pc.createdAt,
				})),
				privacySettings: profile.privacySettings
					? {
						allowAnonymous: profile.privacySettings.allowAnonymous,
						allowRegisteredUsers: profile.privacySettings.allowRegisteredUsers,
						allowRecruiters: profile.privacySettings.allowRecruiters,
						shareBasicInfo: profile.privacySettings.shareBasicInfo,
						shareProjects: profile.privacySettings.shareProjects,
						shareAssessments: profile.privacySettings.shareAssessments,
						shareWorkHistory: profile.privacySettings.shareWorkHistory,
						shareEducation: profile.privacySettings.shareEducation,
						shareSalary: profile.privacySettings.shareSalary,
						shareExternalData: profile.privacySettings.shareExternalData as Record<string, boolean>,
						maxQuestionsPerSession: profile.privacySettings.maxQuestionsPerSession,
						requireAuthForSensitive: profile.privacySettings.requireAuthForSensitive,
						blockedUserIds: profile.privacySettings.blockedUserIds,
						blockedCompanies: profile.privacySettings.blockedCompanies,
					}
					: null,
				suggestedQuestions: profile.suggestedQuestions,
				welcomeMessage: profile.welcomeMessage,
				lastJob: lastJobRow
					? {
						id: lastJobRow.id,
						jobType: lastJobRow.jobType,
						status: lastJobRow.status,
						// `result.error` is what generateProfileEmbeddings writes;
						// `errorLogs` is the append-only list behind it. Prefer the
						// first and fall back to the last log line, because an
						// aborted job can have logs and no result at all.
						error:
							((lastJobRow.result as { error?: string } | null)?.error) ??
							lastJobRow.errorLogs[lastJobRow.errorLogs.length - 1] ??
							null,
						createdAt: lastJobRow.createdAt,
						completedAt: lastJobRow.completedAt,
					}
					: null,
				indexedChunks: indexedRows[0]?.n ?? 0,
			},
		};
	} catch (error) {
		console.error("Error getting KnowMe profile:", error);
		return { success: false, error: "Failed to get profile" };
	}
}

/**
 * Get KnowMe profile by username (public view)
 */
/**
 * Can this viewer see a profile set to `privacy`?
 *
 * `RECRUITERS` is deliberately read as `REGISTERED`. KM-4 established that this
 * product has no recruiter identity - no role, no verification, no way to become
 * one - so enforcing the label literally would mean "nobody", and silently
 * hiding a profile its owner believes is live is the worse of the two errors.
 * "Not open to anonymous strangers" is the nearest honest reading of what the
 * option promised.
 *
 * `isPublic` is no longer consulted; it is derived from this same column in
 * `updateKnowMeProfile` so the two cannot disagree.
 */
function canView(privacy: string, isSignedIn: boolean): boolean {
	switch (privacy) {
		case "PUBLIC":
			return true;
		case "REGISTERED":
		case "RECRUITERS":
			return isSignedIn;
		case "PRIVATE":
			return false;
		default:
			// An unknown value is not a licence to publish.
			return false;
	}
}

export async function getKnowMeProfileByUsername(
	username: string
): Promise<KnowMeActionResponse<KnowMeProfilePublic>> {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.username, username),
		});

		if (!user) {
			return { success: false, error: "Profile not found" };
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, user.id),
			with: { privacySettings: true },
		});

		if (!profile) {
			return { success: false, error: "Profile not found" };
		}

		// Check if profile is accessible.
		//
		// `privacy` is read HERE, not just written. It used to be a column nothing
		// consulted: the only gate was `isPublic`, which the wizard set as
		// `privacy !== "PRIVATE"`, so *Only logged-in users* and *Only verified
		// recruiters* both resolved to "anyone at all". See KM-12.
		//
		// The owner is exempt from every setting - previewing their own public page
		// is how they check what a visitor sees.
		if (profile.status !== "ACTIVE") {
			return { success: false, error: "Profile is not public" };
		}

		const session = await getSession(headers());
		const isOwner = session?.user?.id === user.id;

		if (!isOwner && !canView(profile.privacy, !!session?.user?.id)) {
			return { success: false, error: "Profile is not public" };
		}

		return {
			success: true,
			data: {
				id: profile.id,
				user: {
					username: user.username,
					name: user.name,
					image: user.image,
					bio: user.bio,
					occupation: user.occupation,
				},
				isActive: profile.status === "ACTIVE",
				welcomeMessage: profile.welcomeMessage,
				suggestedQuestions: profile.suggestedQuestions,
				privacy: profile.privacy,
			},
		};
	} catch (error) {
		console.error("Error getting public profile:", error);
		return { success: false, error: "Failed to get profile" };
	}
}

// ============================================
// CREATE/INITIALIZE PROFILE
// ============================================

/**
 * Initialize KnowMe profile for current user
 */
export async function initializeKnowMeProfile(): Promise<
	KnowMeActionResponse<KnowMeProfileBasic>
> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		// Check if profile already exists
		const existing = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
		});

		if (existing) {
			// If onboarding is not completed, return the existing profile to resume
			if (!existing.onboardingCompleted && existing.status === "SETUP") {
				return {
					success: true,
					data: {
						id: existing.id,
						userId: existing.userId,
						status: existing.status,
						privacy: existing.privacy,
						isPublic: existing.isPublic,
						includePersonalData: existing.includePersonalData,
						includePlatformData: existing.includePlatformData,
						includeProjects: existing.includeProjects,
						includeAssessments: existing.includeAssessments,
						updateCycleDays: existing.updateCycleDays,
						lastUpdatedAt: existing.lastUpdatedAt,
						nextScheduledUpdate: existing.nextScheduledUpdate,
						totalQuestionsAnswered: existing.totalQuestionsAnswered,
						totalSessions: existing.totalSessions,
						totalVisitors: existing.totalVisitors,
						apiEnabled: existing.apiEnabled,
						apiRateLimit: existing.apiRateLimit,
						onboardingStep: existing.onboardingStep,
						onboardingCompleted: existing.onboardingCompleted,
						createdAt: existing.createdAt,
						updatedAt: existing.updatedAt,
					},
					message: "Resume onboarding",
				};
			}
			// If already completed, return error
			return { success: false, error: "Profile already exists and is active" };
		}

		// Generate API key
		const { key, hash } = generateApiKey();

		// Create profile with default settings
		const [profile] = await db.insert(knowMeProfiles).values({
			userId: session.user.id,
			status: "SETUP",
			privacy: "PUBLIC",
			isPublic: true,
			includePersonalData: true,
			includePlatformData: false,
			includeProjects: true,
			includeAssessments: true,
			includeResume: true,
			updateCycleDays: 10,
			apiKey: key,
			apiKeyHash: hash,
			apiEnabled: false,
			apiRateLimit: 100,
			onboardingStep: 1,
			onboardingCompleted: false,
			suggestedQuestions: [
				"What's your experience with React?",
				"Tell me about your projects",
				"What technologies do you know?",
				"Are you available for opportunities?",
			],
		}).returning();

		// Create default privacy settings
		await db.insert(knowMePrivacySettings).values({
			profileId: profile!.id,
		});

		revalidatePath("/knowme");

		return {
			success: true,
			data: {
				id: profile!.id,
				userId: profile!.userId,
				status: profile!.status,
				privacy: profile!.privacy,
				isPublic: profile!.isPublic,
				includePersonalData: profile!.includePersonalData,
				includePlatformData: profile!.includePlatformData,
				includeProjects: profile!.includeProjects,
				includeAssessments: profile!.includeAssessments,
				updateCycleDays: profile!.updateCycleDays,
				lastUpdatedAt: profile!.lastUpdatedAt,
				nextScheduledUpdate: profile!.nextScheduledUpdate,
				totalQuestionsAnswered: profile!.totalQuestionsAnswered,
				totalSessions: profile!.totalSessions,
				totalVisitors: profile!.totalVisitors,
				apiEnabled: profile!.apiEnabled,
				apiRateLimit: profile!.apiRateLimit,
				onboardingStep: profile!.onboardingStep,
				onboardingCompleted: profile!.onboardingCompleted,
				createdAt: profile!.createdAt,
				updatedAt: profile!.updatedAt,
			},
			message: "Profile initialized successfully",
		};
	} catch (error) {
		console.error("Error initializing KnowMe profile:", error);
		return { success: false, error: "Failed to initialize profile" };
	}
}

// ============================================
// UPDATE PROFILE
// ============================================

/**
 * Update KnowMe profile settings
 */
export async function updateKnowMeProfile(data: {
	privacy?: "PUBLIC" | "REGISTERED" | "PRIVATE";
	/** @deprecated Derived from `privacy`; passing it has no effect. */
	isPublic?: boolean;
	includePersonalData?: boolean;
	includePlatformData?: boolean;
	includeProjects?: boolean;
	includeAssessments?: boolean;
	includeResume?: boolean;
	updateCycleDays?: number;
	welcomeMessage?: string;
	suggestedQuestions?: string[];
	aiPersonality?: string;
}): Promise<KnowMeActionResponse<void>> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
		});

		if (!profile) {
			return { success: false, error: "Profile not found" };
		}

		// Calculate next update if cycle changed
		let nextScheduledUpdate = profile.nextScheduledUpdate;
		if (data.updateCycleDays && data.updateCycleDays !== profile.updateCycleDays) {
			nextScheduledUpdate = calculateNextUpdate(data.updateCycleDays);
		}

		// `isPublic` is DERIVED, never taken from the caller. Two call sites were
		// each computing it themselves from the same `privacy` value, which is one
		// copy too many for a field that decides who can read a person's profile.
		// See KM-12.
		const isPublic = data.privacy ? data.privacy !== "PRIVATE" : profile.isPublic;

		await db.update(knowMeProfiles)
			.set({
				...data,
				isPublic,
				nextScheduledUpdate,
			})
			.where(eq(knowMeProfiles.id, profile.id));

		revalidatePath("/knowme");
		revalidatePath("/knowme/settings");

		return { success: true, message: "Profile updated successfully" };
	} catch (error) {
		console.error("Error updating KnowMe profile:", error);
		return { success: false, error: "Failed to update profile" };
	}
}

/**
 * Activate KnowMe profile (after onboarding)
 */
export async function activateKnowMeProfile(): Promise<
	KnowMeActionResponse<void>
> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return {
				success: false,
				error: "Not authenticated"
			};
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
		});

		if (!profile) {
			return {
				success: false, error: "Profile not found"
			};
		}

		await db.update(knowMeProfiles)
			.set({
				status: "ACTIVE",
				onboardingCompleted: true,
				lastUpdatedAt: new Date(),
				nextScheduledUpdate: calculateNextUpdate(profile.updateCycleDays),
			})
			.where(eq(knowMeProfiles.id, profile.id));

		// The activity ledger (plan/progress PRG-3). The first activation only; the key
		// keeps a later re-activation from recording again.
		if (profile.status !== "ACTIVE") {
			await recordActivity(db, session.user.id, {
				type: "KNOWME_ACTIVATED",
				title: "Turned on KnowMe",
				description: "KnowMe - your profile is live",
				xp: 0,
				key: activityKey.knowmeActivated(profile.id),
				meta: { profileId: profile.id },
			});
		}

		revalidatePath("/knowme");

		return { success: true, message: "Profile activated successfully" };
	} catch (error) {
		console.error("Error activating KnowMe profile:", error);
		return { success: false, error: "Failed to activate profile" };
	}
}

/**
 * Update onboarding step
 */
export async function updateOnboardingStep(
	step: number
): Promise<KnowMeActionResponse<void>> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		await db.update(knowMeProfiles)
			.set({ onboardingStep: step })
			.where(eq(knowMeProfiles.userId, session.user.id));

		return { success: true };
	} catch (error) {
		console.error("Error updating onboarding step:", error);
		return { success: false, error: "Failed to update step" };
	}
}

// ============================================
// DELETE PROFILE
// ============================================

/**
 * Delete KnowMe profile and all associated data
 */
export async function deleteKnowMeProfile(): Promise<
	KnowMeActionResponse<void>
> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
		});

		if (!profile) {
			return { success: false, error: "Profile not found" };
		}

		// Vectors FIRST, rows second.
		//
		// This was a `TODO` with the call commented out below the delete, and it
		// was a privacy defect rather than a tidiness one: the cascade clears
		// `know_me_*` in Postgres, but the embedded copy of the user's personal
		// data lives in Upstash, and that is what the PUBLIC chat endpoint
		// (`/api/v1/knowme/chat`) actually queries. So "delete my profile" left
		// the user's data both present and answerable by strangers.
		//
		// Ordering matters. Vectors are removed before the rows because
		// `profile.id` IS the namespace - drop the row first and a failure here
		// leaves an orphaned namespace whose key nothing records any more. If the
		// namespace delete throws, the whole action fails and the profile is still
		// there to try again, which is the recoverable direction.
		await deleteNamespace(profile.id);

		// Cascade clears the related know_me_* rows.
		await db.delete(knowMeProfiles).where(eq(knowMeProfiles.id, profile.id));

		revalidatePath("/knowme");

		return { success: true, message: "Profile deleted successfully" };
	} catch (error) {
		console.error("Error deleting KnowMe profile:", error);
		return { success: false, error: "Failed to delete profile" };
	}
}

// ============================================
// PROFILE STATUS CHECK
// ============================================

/**
 * Check if current user has KnowMe profile
 */
export async function hasKnowMeProfile(): Promise<
	KnowMeActionResponse<{ exists: boolean; status?: string }>
> {
	try {
		const session = await getSession(headers());
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const profile = await db.query.knowMeProfiles.findFirst({
			where: eq(knowMeProfiles.userId, session.user.id),
			columns: { status: true },
		});

		return {
			success: true,
			data: {
				exists: !!profile,
				status: profile?.status,
			},
		};
	} catch (error) {
		console.error("Error checking profile:", error);
		return { success: false, error: "Failed to check profile" };
	}
}
