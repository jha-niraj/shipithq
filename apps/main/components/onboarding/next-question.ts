import type { OnboardingNextResponse } from "@/types/onboarding"

/**
 * Ask the server for the next question of a run (or the finished profile).
 * The only client-side call to the model-backed route; everything else is a
 * server action. Throws with a message meant for the user.
 */
export async function fetchNextQuestion(runId: string): Promise<OnboardingNextResponse> {
    let res: Response
    try {
        res = await fetch("/api/onboarding/next", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId }),
        })
    } catch {
        throw new Error("You seem to be offline. Check your connection and try again.")
    }
    const body = (await res.json().catch(() => null)) as (OnboardingNextResponse & { error?: string }) | null
    if (!res.ok || !body) {
        throw new Error(body?.error ?? "The next question did not come through. Try again.")
    }
    return body
}
