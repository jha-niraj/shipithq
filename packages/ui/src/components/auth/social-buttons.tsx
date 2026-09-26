"use client"

import { Button } from "../ui/button"
import { InlineLoader } from "../ui/inline-loader"
import { GitHubMark, GoogleMark } from "./brand-marks"

export type SocialProvider = "google" | "github"

const LABEL: Record<SocialProvider, string> = { google: "Google", github: "GitHub" }
const MARK: Record<SocialProvider, React.ComponentType<{ className?: string }>> = {
    google: GoogleMark,
    github: GitHubMark,
}

/**
 * The social sign-in row, shown FIRST on sign-in and register (plan/auth AUTH-1).
 *
 * Plain outline buttons with no local colour overrides: the base `Button` owns the
 * border, radius and hover in both themes. One provider spans the row and reads
 * "Continue with Google"; two sit side by side with the provider name only, since
 * the verb is obvious from the pair.
 *
 * `pending` is the provider whose redirect is in flight: it shows the inline loader
 * and every button is disabled, so a second click cannot start a second OAuth dance.
 */
export function SocialButtons({ providers, pending, disabled, onSelect }: {
    providers: SocialProvider[]
    pending?: SocialProvider | null
    disabled?: boolean
    onSelect: (provider: SocialProvider) => void
}) {
    if (!providers.length) return null
    const single = providers.length === 1

    return (
        <div className={single ? "grid" : "grid grid-cols-2 gap-3"}>
            {providers.map((p) => {
                const Mark = MARK[p]
                return (
                    <Button
                        key={p}
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full gap-2.5 px-4"
                        disabled={disabled || !!pending}
                        onClick={() => onSelect(p)}
                    >
                        {pending === p ? <InlineLoader size="sm" /> : <Mark className="size-4 shrink-0" />}
                        {single ? `Continue with ${LABEL[p]}` : LABEL[p]}
                    </Button>
                )
            })}
        </div>
    )
}
