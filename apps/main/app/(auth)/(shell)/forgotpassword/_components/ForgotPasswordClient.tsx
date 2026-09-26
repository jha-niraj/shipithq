"use client"

import { ForgotPasswordForm } from "@repo/ui/components/auth/password-reset";
import { emailOtp } from "@repo/auth/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function ForgotPassword() {
    return (
        <ForgotPasswordForm
            request={async (email) => {
                const { error } = await emailOtp.requestPasswordReset({ email });
                return error ? getAuthErrorMessage(error.code ?? error.message) : null;
            }}
        />
    );
}
