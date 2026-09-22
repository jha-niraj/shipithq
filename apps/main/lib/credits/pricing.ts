// ─────────────────────────────────────────────────────────────────────────────
// What things cost, in credits.
//
// One table, because the alternative is what this replaced: `MOCK_CREDIT_COST`
// in one action file, `QUIZ_CREDIT_COST` in another, two more in a types file,
// and no way to answer "what does the product charge for?" without grepping.
//
// The numbers themselves are a product decision, not an implementation detail -
// they are recorded with their reasoning in `plan/credits/overview.md`. Change
// them there and here together.
//
// No server-only imports in this file. It is read by client components that
// label a button with its price, and pulling `@repo/db` (or anything that
// touches `process.env`) in here would break the client bundle.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every priced operation in the product.
 *
 * A `0` means genuinely free, not "not decided yet" - see `isFree` below for why
 * that distinction has teeth.
 */
export const CREDIT_PRICES = {
    // ── Resume ───────────────────────────────────────────────────────────────
    /**
     * Parsing a resume the user uploaded. Free on purpose: it runs behind an
     * upload nobody asked for - at onboarding the user has already moved into
     * the app before it finishes - and it is what makes every paid operation
     * below work at all.
     */
    resume_parse_upload: 0,
    resume_tailor_jd: 20,
    resume_ats_score: 5,
    resume_import: 20,

    // ── Cover letter ─────────────────────────────────────────────────────────
    cover_letter_generate: 15,
    cover_letter_questions: 5,

    // ── Projects & practice (moved here unchanged) ───────────────────────────
    project_quiz: 25,
    project_mock: 30,
    practice_set: 5,
    exam_set: 10,

    // ── Module onboarding ────────────────────────────────────────────────────
    /**
     * The adaptive onboarding a user completes before a sub-module's dashboard
     * shows. Free on purpose: it is a mandatory gate nobody asked for, and
     * charging for that is the resume-parse mistake again. Decision recorded in
     * `plan/module-onboarding/overview.md`.
     */
    module_onboarding: 0,
} as const

export type PricedOperation = keyof typeof CREDIT_PRICES

/**
 * The price of an operation.
 *
 * Prefer this over reading `CREDIT_PRICES` directly: an operation name that does
 * not exist becomes a compile error here, where indexing the object with a
 * mistyped string would hand back `undefined` and charge nothing.
 */
export function priceOf(operation: PricedOperation): number {
    return CREDIT_PRICES[operation]
}

/**
 * Whether an operation costs nothing.
 *
 * Worth its own function because `reserveCredits` REJECTS an amount of `0` as
 * invalid - reserving nothing is meaningless. A caller that forwards a free
 * price straight into a reserve turns a free feature into a hard error, so every
 * charge site checks this first and skips the hold entirely.
 */
export function isFree(operation: PricedOperation): boolean {
    return CREDIT_PRICES[operation] === 0
}

/** Human-readable labels for prices shown in the UI. */
export function priceLabel(operation: PricedOperation): string | null {
    // Widened off the `as const` literal union: narrowing makes TypeScript reject
    // the singular check below as comparing against a value the union cannot hold,
    // which stops being true the moment a price of 1 is set.
    const price: number = CREDIT_PRICES[operation]
    // A free action shows nothing rather than "0 credits", which reads as broken.
    if (price === 0) return null
    return `${price} credit${price === 1 ? "" : "s"}`
}

// ── Legacy aliases ───────────────────────────────────────────────────────────
// The names the call sites already use. Kept so moving the values here is not
// also a rename across five files; new code should call `priceOf`.

export const PRACTICE_SET_CREDIT_COST = CREDIT_PRICES.practice_set
export const EXAM_SET_CREDIT_COST = CREDIT_PRICES.exam_set
export const QUIZ_CREDIT_COST = CREDIT_PRICES.project_quiz
export const MOCK_CREDIT_COST = CREDIT_PRICES.project_mock
