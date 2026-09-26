"use client";

import { ResetPasswordForm } from "@repo/ui/components/auth/password-reset";
import { emailOtp } from "@repo/auth/client";

export default function ResetPassword() {
    return (
        <ResetPasswordForm
            reset={async (email, otp, password) => {
                const { error } = await emailOtp.resetPassword({ email, otp, password });
                return error ? error.message || "Could not reset the password" : null;
            }}
            resend={async (email) => {
                const { error } = await emailOtp.requestPasswordReset({ email });
                return error ? error.message || "Could not resend the code" : null;
            }}
        />
    );
}
