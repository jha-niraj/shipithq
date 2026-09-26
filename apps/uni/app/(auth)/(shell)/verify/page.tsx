"use client"

import { VerifyEmailForm } from "@repo/ui/components/auth/verify-email"
import { emailOtp } from "@repo/auth/client"

/** `verifyEmail` checks the code AND mints the session in one call. */
export default function Verify() {
    return (
        <VerifyEmailForm
            verify={async (email, otp) => {
                const { error } = await emailOtp.verifyEmail({ email, otp })
                return error ? error.message || "Invalid code" : null
            }}
            resend={async (email) => {
                const { error } = await emailOtp.sendVerificationOtp({ email, type: "email-verification" })
                return error ? error.message || "Failed to resend" : null
            }}
            next={() => "/onboarding"}
        />
    )
}
