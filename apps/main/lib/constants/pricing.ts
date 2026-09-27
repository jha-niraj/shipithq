/**
 * AI API pricing constants for Pathfinder credit calculations.
 * Sources:
 * - OpenAI: https://openai.com/api/pricing (GPT-4o-mini)
 * - Exa: https://exa.ai/pricing
 * Last updated: February 2025
 */

// -----------------------------------------------------------------------------
// OPENAI (GPT-4o-mini - used for sub-goal content, verification, etc.)
// Per 1M tokens: Input $0.15, Output $0.60 (from OpenAI pricing page)
// -----------------------------------------------------------------------------
export const OPENAI_PRICING = {
    gpt4oMini: {
        inputPerMillion: 0.15,
        outputPerMillion: 0.6,
    },
} as const

// -----------------------------------------------------------------------------
// EXA AI (Answer/Search API - used for videos & documentation)
// -----------------------------------------------------------------------------
// ~$5 per 1,000 answers; we estimate ~1 call per sub-goal = $0.005 per call
export const EXA_PRICING = {
    answerPerCall: 0.005, // Approximate cost per answer call
} as const

// -----------------------------------------------------------------------------
// CREDIT CONVERSION (platform credits)
// 1 credit = base unit. Map USD cost to credits.
// Adjust this based on your credit-to-currency ratio.
// -----------------------------------------------------------------------------
export const CREDIT_RATES = {
    // 1 credit ≈ $0.01 USD (100 credits = $1)
    usdPerCredit: 0.01,
    // Or: 1 credit = X input tokens for gpt-4o-mini
    tokensPerCreditInput: 66_667,  // 1 credit ≈ 66K input tokens at $0.15/1M
    tokensPerCreditOutput: 16_667, // 1 credit ≈ 16K output tokens at $0.60/1M
} as const

// -----------------------------------------------------------------------------
// PATHFINDER-SPECIFIC COSTS
// -----------------------------------------------------------------------------
/**
 * XP granted for completing a Pathfinder goal's verification.
 *
 * Scaled by the same weighted score the credit rebate uses, so a user who
 * scrapes through gets the minimum and one who aces it gets the full base. The
 * floor exists because passing four verification sections after weeks of work
 * should never be worth nothing, however marginal the score.
 */
export const PATHFINDER_XP = {
    /** Awarded at a 100% weighted score. */
    verificationBase: 500,
    /** Floor for any pass, however low the score. */
    verificationMinimum: 100,
} as const

export const PATHFINDER_CREDITS = {
    /** Verification fixed fee (refund based on score) */
    verificationFee: 20,
    /** Block AI usage when pending cost reaches this */
    usageBlockThreshold: 10,
    /** Verification section weights: Quiz 30%, Coding 35%, Mock 35% */
    verificationWeights: {
        quiz: 0.3,
        coding: 0.35,
        mock: 0.35,
    },
} as const

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * Convert OpenAI tokens to credit cost (gpt-4o-mini).
 */
export function openaiTokensToCredits(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * OPENAI_PRICING.gpt4oMini.inputPerMillion
    const outputCost = (outputTokens / 1_000_000) * OPENAI_PRICING.gpt4oMini.outputPerMillion
    const usdTotal = inputCost + outputCost
    return Math.ceil(usdTotal / CREDIT_RATES.usdPerCredit)
}

/**
 * Convert Exa call to credit cost.
 */
export function exaCallToCredits(): number {
    const usd = EXA_PRICING.answerPerCall
    return Math.ceil(usd / CREDIT_RATES.usdPerCredit)
}