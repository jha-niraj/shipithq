"use client";

import { ResetPasswordForm } from "@repo/ui/components/auth/password-reset";
import { emailOtp } from "@repo/auth/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function ResetPassword() {
    return (
        <ResetPasswordForm
            reset={async (email, otp, password) => {
                const { error } = await emailOtp.resetPassword({ email, otp, password });
                return error ? getAuthErrorMessage(error.code ?? error.message) : null;
            }}
            resend={async (email) => {
                const { error } = await emailOtp.requestPasswordReset({ email });
                return error ? getAuthErrorMessage(error.code ?? error.message) : null;
            }}
        />
    );
}
