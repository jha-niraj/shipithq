"use client"

import { HarbourScreen } from "./harbour-scene"

/*
 * Signing in and registering (plan/jobs-polish JP-28): the boat arrives, sailing in from the
 * sun and coming alongside the pier. Shown from the moment the form succeeds until the next
 * page takes over, so the switch never goes blank. The mirror of `SigningOutScreen`.
 *
 *   sign in:   <SigningInScreen />                       "Welcome back" / "Taking you in"
 *   register:  <SigningInScreen title="Welcome aboard" note="Setting up your profile" />
 */
export function SigningInScreen({ title = "Welcome back", note = "Taking you in" }: { title?: string; note?: string }) {
    return <HarbourScreen mode="arriving" title={title} note={note} />
}

export default SigningInScreen
