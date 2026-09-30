"use client"

import { HarbourScreen } from "./harbour-scene"

/*
 * Signing out (plan/jobs-polish JP-27): the boat leaves harbour, sailing past the lighthouse
 * toward the setting sun. The scene is `HarbourScene` (harbour-scene.tsx), shared with the
 * sign-in and register screens and the loader, where the boat arrives instead.
 */
export function SigningOutScreen({ label = "Signing you out", note = "See you soon" }: { label?: string; note?: string }) {
    return <HarbourScreen mode="leaving" title={label} note={note} />
}

export default SigningOutScreen
