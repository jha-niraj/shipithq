import type { SeedSprint } from "./types"
import realtimeCollaborationBoard from "./realtime-collaboration-board"
import jobBoardWithMatching from "./job-board-with-matching"
import observabilityMiniStack from "./observability-mini-stack"
import personalFinanceTracker from "./personal-finance-tracker"
import markdownNotesWithSearch from "./markdown-notes-with-search"
import offlineFirstDeliveryApp from "./offline-first-delivery-app"
import habitTrackerWeeklyReview from "./habit-tracker-weekly-review"
import urlShortenerWithAnalytics from "./url-shortener-with-analytics"
import expenseSplitter from "./expense-splitter"
import rateLimiterService from "./rate-limiter-service"

/**
 * The ten curated projects, by slug (plan/projects, PJ-11).
 *
 * These ARE the catalogue. Niraj, 2026-09-23: "keep the 10 only on the platform
 * and delete the rest, this list should be crisp". A project without a blueprint
 * in here is not seeded and its idea is removed, because a card that leads
 * nowhere is worse than one less card.
 */
export const BLUEPRINTS: Record<string, SeedSprint[]> = {
    "realtime-collaboration-board": realtimeCollaborationBoard,
    "job-board-with-matching": jobBoardWithMatching,
    "observability-mini-stack": observabilityMiniStack,
    "personal-finance-tracker": personalFinanceTracker,
    "markdown-notes-with-search": markdownNotesWithSearch,
    "offline-first-delivery-app": offlineFirstDeliveryApp,
    "habit-tracker-weekly-review": habitTrackerWeeklyReview,
    "url-shortener-with-analytics": urlShortenerWithAnalytics,
    "expense-splitter": expenseSplitter,
    "rate-limiter-service": rateLimiterService,
}

export type { SeedSprint, SeedTask, SeedDifficulty } from "./types"
